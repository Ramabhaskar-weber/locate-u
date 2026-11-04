import { useQuery } from '@tanstack/react-query';
import { Bike, Car, Check, ChevronDown, Copy, Footprints, MapPin, Navigation, Share2, Star, TrainFront, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { copyText } from '@/hooks';
import { api } from '@/lib/api';
import { directionsLinks, geoUri, osmLink, shareLink, type DirectionsMode } from '@/lib/directions';
import { addHistory } from '@/lib/db';
import { formatPopulation } from '@/lib/format';
import { bearing, compass, formatCoords, formatDistance, haversineKm, isRoughlyInIndia, plusCode, type CoordFormat } from '@/lib/geo';
import type { AppConfig, NearbyItem, NearestPlace } from '@/lib/schemas';
import { useMap, type Selection } from '@/stores/map';
import { useSaved } from '@/stores/saved';
import { useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { Badge, cn, ErrorState, IconButton, Section, Segmented, Skeleton, SourceBadge } from '../ui';
import { IndiaContext, Mini, NearbySection, SunSection, WeatherSection, WikiSection } from './sections';
import { SaveDialog } from './SaveDialog';

const KIND_LABEL: Record<Selection['kind'], string> = {
  search: 'Search result', point: 'Dropped pin', gps: 'Your location', india: 'India dataset', saved: 'Saved place',
};

export function LocationCard({ sel, config, onClose, onNearby }: { sel: Selection; config?: AppConfig; onClose: () => void; onNearby: (items: NearbyItem[]) => void }) {
  const { coordFormat, units, geocodeLang, set: setSettings } = useSettings();
  const user = useMap((s) => s.user);
  const savedItem = useSaved((s) => (sel.kind === 'saved' ? s.items.find((i) => i.id === sel.ref) : s.findNear(sel.lat, sel.lon)));
  const removeSaved = useSaved((s) => s.remove);
  const restoreSaved = useSaved((s) => s.restore);
  const [saveOpen, setSaveOpen] = useState(false);
  const [dirOpen, setDirOpen] = useState(false);
  const [mode, setMode] = useState<DirectionsMode>('driving');
  const [copied, setCopied] = useState<string | null>(null);

  // Reverse geocode pins and GPS positions (explicit user action, throttled + cached server-side).
  const needsReverse = sel.kind === 'point' || sel.kind === 'gps' || (sel.kind === 'saved' && !sel.address);
  const rev = useQuery({
    queryKey: ['reverse', sel.lat.toFixed(5), sel.lon.toFixed(5), geocodeLang],
    queryFn: () => api.reverse(sel.lat, sel.lon, { lang: geocodeLang }),
    enabled: needsReverse,
    staleTime: Infinity,
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ['place', sel.ref],
    queryFn: () => api.placeDetail(sel.ref!),
    enabled: sel.kind === 'india' && !!sel.ref,
    staleTime: Infinity,
  });
  const nearestQ = useQuery({
    queryKey: ['nearest', sel.lat.toFixed(4), sel.lon.toFixed(4)],
    queryFn: () => api.nearest(sel.lat, sel.lon, 3),
    enabled: !needsReverse && sel.kind !== 'india' && isRoughlyInIndia(sel),
    staleTime: Infinity,
  });

  const revResult = rev.data?.data.result;
  const title =
    sel.name && sel.name !== 'Your location' ? sel.name : revResult?.name ?? (sel.kind === 'gps' ? 'Your location' : rev.isPending && needsReverse ? 'Finding address…' : 'Dropped pin');
  const address = sel.address ?? revResult?.display_name ?? (detail.data ? `${detail.data.data.district.name} district, ${detail.data.data.state.name}` : undefined);

  const near: NearestPlace[] = useMemo(() => {
    if (detail.data) return [{ place: detail.data.data.place, district: detail.data.data.district.name, state: detail.data.data.state.name, distance_km: 0 }];
    return rev.data?.data.nearest_india_places ?? nearestQ.data ?? [];
  }, [detail.data, rev.data, nearestQ.data]);

  useEffect(() => {
    if (sel.kind !== 'gps' && title && !/Finding|Dropped/.test(title)) {
      addHistory({ kind: 'view', label: title, sublabel: address, lat: sel.lat, lon: sel.lon, ref: sel.ref ?? `${sel.lat.toFixed(4)},${sel.lon.toFixed(4)}` }).catch(() => undefined);
    }
  }, [title, address, sel]);

  const distKm = user ? haversineKm(user, sel) : null;
  const copy = async (text: string, what: string) => {
    if (await copyText(text)) {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } else toast('Copy failed', { tone: 'error' });
  };
  const share = async () => {
    const url = shareLink(sel, 15, title);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} · Locate U`, text: address ?? formatCoords(sel), url });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy(url, 'link');
    toast('Link copied', { tone: 'success', description: 'Anyone with the link sees this spot on the map.' });
  };
  const unsave = async () => {
    if (!savedItem) return;
    const removed = await removeSaved(savedItem.id);
    if (removed) toast('Removed from saved', { action: { label: 'Undo', run: () => restoreSaved(removed) } });
  };

  const links = directionsLinks(sel, null, mode, title);
  const linksFromMe = user ? directionsLinks(sel, user, mode, title) : null;

  return (
    <article className="flex h-full flex-col" aria-label={`Details for ${title}`}>
      <header className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-lift">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{KIND_LABEL[sel.kind]}</Badge>
            {sel.kind === 'india' && detail.data?.data.place.is_capital && <Badge tone="amber">Capital</Badge>}
            {rev.data && <SourceBadge local={rev.data.data.provider === 'local-fallback'} fromCache={rev.data.fromCache || rev.data.data.cached} cachedAt={rev.data.cachedAt ?? (rev.data.data.cached ? rev.data.data.fetched_at : undefined)} label={rev.data.data.provider === 'local-fallback' ? 'Local fallback' : 'Nominatim'} />}
            {detail.data && <SourceBadge local fromCache={detail.data.fromCache} cachedAt={detail.data.cachedAt} />}
          </div>
          <h2 className="text-xl font-semibold leading-tight">{title}</h2>
          {address ? <p className="mt-1 text-[13px] leading-snug text-muted">{address}</p> : rev.isPending && needsReverse ? <Skeleton className="mt-2 h-3.5 w-4/5" /> : null}
          {rev.data?.data.provider === 'local-fallback' && <p className="mt-1 text-[12px] text-amber-700 dark:text-amber-300">Address lookup is unavailable — showing the nearest place from the local India dataset.</p>}
        </div>
        <IconButton label="Close details" variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></IconButton>
      </header>

      <div className="grid grid-cols-4 gap-2 px-5 pb-4">
        <ActionBtn label={savedItem ? 'Saved' : 'Save'} active={!!savedItem} onClick={() => (savedItem ? unsave() : setSaveOpen(true))} icon={<Star className={cn('h-5 w-5', savedItem && 'fill-current')} />} />
        <ActionBtn label="Directions" active={dirOpen} onClick={() => setDirOpen((o) => !o)} icon={<Navigation className="h-5 w-5" />} />
        <ActionBtn label="Share" onClick={share} icon={<Share2 className="h-5 w-5" />} />
        <ActionBtn label={copied === 'coords' ? 'Copied' : 'Copy'} onClick={() => copy(formatCoords(sel, coordFormat), 'coords')} icon={copied === 'coords' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-5 pb-6 scroll-thin">
        {dirOpen && (
          <Section title="Directions">
            <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
              <Segmented
                size="sm"
                label="Travel mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'driving', label: 'Drive', icon: <Car className="h-3.5 w-3.5" /> },
                  { value: 'walking', label: 'Walk', icon: <Footprints className="h-3.5 w-3.5" /> },
                  { value: 'cycling', label: 'Cycle', icon: <Bike className="h-3.5 w-3.5" /> },
                  { value: 'transit', label: 'Transit', icon: <TrainFront className="h-3.5 w-3.5" /> },
                ]}
              />
              <ul className="mt-3 space-y-1">
                {(linksFromMe ?? links).map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium surface-hover">
                      <span>Open in {l.label}{l.note && <span className="block text-[11px] font-normal text-muted">{l.note}</span>}</span>
                      <ChevronDown className="h-4 w-4 -rotate-90 text-muted" />
                    </a>
                  </li>
                ))}
                <li>
                  <a href={geoUri(sel, title)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium surface-hover">
                    <span>Open in a maps app on this device</span>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-muted" />
                  </a>
                </li>
              </ul>
              <p className="mt-2 text-[11px] text-muted">
                {user ? 'Starting from your current location.' : 'Your origin is chosen in the maps app — your location is not shared.'} Routes are calculated by the external app.
              </p>
            </div>
          </Section>
        )}

        <Section title="Location" action={
          <Segmented size="sm" label="Coordinate format" value={coordFormat} onChange={(v: CoordFormat) => setSettings({ coordFormat: v })} options={[{ value: 'dd', label: 'DD' }, { value: 'dms', label: 'DMS' }, { value: 'ddm', label: 'DDM' }]} />
        }>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => copy(formatCoords(sel, coordFormat), 'coords')} className="col-span-2 rounded-2xl bg-black/[0.03] p-3 text-left transition hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]" title="Copy coordinates">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Coordinates (WGS84)</div>
              <div className="mt-1 font-mono text-[14px] font-medium tabular-nums">{formatCoords(sel, coordFormat)}</div>
            </button>
            <button onClick={() => copy(plusCode(sel.lat, sel.lon), 'plus')} className="rounded-2xl bg-black/[0.03] p-3 text-left transition hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]" title="Copy Plus Code">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{copied === 'plus' ? 'Copied ✓' : 'Plus Code'}</div>
              <div className="mt-1 font-mono text-[14px] font-medium">{plusCode(sel.lat, sel.lon)}</div>
            </button>
            {distKm != null ? (
              <Mini icon={<Navigation className="h-3.5 w-3.5" />} label="From you" value={formatDistance(distKm, units)} hint={`${compass(bearing(user!, sel))} · straight line`} />
            ) : (
              <a href={osmLink(sel)} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-black/[0.03] p-3 text-left transition hover:bg-black/[0.06] dark:bg-white/[0.04]">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted">View on</div>
                <div className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-300">OpenStreetMap ↗</div>
              </a>
            )}
          </div>
          <div className="mt-2"><SunSection p={sel} /></div>
        </Section>

        {detail.isError && <ErrorState compact error={detail.error} onRetry={() => detail.refetch()} />}
        {detail.data && (
          <Section title="About this place">
            <div className="grid grid-cols-2 gap-2">
              <Mini icon={null} label="Population" value={formatPopulation(detail.data.data.place.population)} hint="GeoNames estimate" />
              <Mini icon={null} label="District" value={detail.data.data.district.name} hint={`${detail.data.data.state.name}`} />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Source IDs: {Object.entries(detail.data.data.place.sources).map(([k, v]) => `${k} ${v}`).join(' · ')}
              {detail.data.data.place.assignment === 'nearest' && ' · district assigned to nearest boundary (point lies on coastline/edge)'}
            </p>
            {detail.data.data.nearby.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[12px] font-medium text-muted">Nearby towns in the dataset</div>
                <div className="flex flex-wrap gap-1.5">
                  {detail.data.data.nearby.map((n) => (
                    <button key={n.place.id} className="chip border hairline surface-hover" onClick={() => useMap.getState().select({ kind: 'india', lat: n.place.lat, lon: n.place.lon, name: n.place.name, ref: n.place.id, stateCode: n.place.state_code, zoom: 12 })}>
                      {n.place.name} <span className="text-muted">{formatDistance(n.distance_km, units)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {near.length > 0 && sel.kind !== 'india' && <IndiaContext near={near} fromCache={rev.data?.fromCache} />}
        {rev.isError && <ErrorState compact error={rev.error} onRetry={() => rev.refetch()} title="Address lookup failed" />}

        {savedItem?.note && (
          <Section title="Your note"><p className="whitespace-pre-wrap rounded-2xl bg-amber-500/[0.08] p-3 text-sm">{savedItem.note}</p></Section>
        )}

        {config?.features.weather && <WeatherSection p={sel} />}
        <NearbySection p={sel} config={config} onShow={onNearby} />
        {config?.features.wikipedia && <WikiSection p={sel} />}
      </div>

      <SaveDialog open={saveOpen} onClose={() => setSaveOpen(false)} initial={{ name: title.replace('Finding address…', 'Dropped pin'), lat: sel.lat, lon: sel.lon, address, source: sel.kind === 'search' ? 'search' : sel.kind === 'india' ? 'india' : sel.kind === 'gps' ? 'gps' : 'map', source_ref: sel.ref }} />
    </article>
  );
}

function ActionBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn('flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-medium transition active:scale-95', active ? 'bg-brand-600 text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]')}>
      {icon}
      {label}
    </button>
  );
}

