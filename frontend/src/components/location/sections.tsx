import { useQuery } from '@tanstack/react-query';
import {
  Accessibility, Banknote, BedDouble, BookOpen, Building2, Bus, Clock, Droplets, ExternalLink, Fuel, Landmark,
  MapPin, Navigation, Phone, Pill, Shield, Sunrise, Sunset, Trees, Trophy, Utensils, Wind,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { formatDistance, sunTimes, type LatLon } from '@/lib/geo';
import type { AppConfig, NearbyItem, NearestPlace } from '@/lib/schemas';
import { useMap } from '@/stores/map';
import { useSettings } from '@/stores/settings';
import { cn, EmptyState, ErrorState, Section, Skeleton, SkeletonList, SourceBadge } from '../ui';

const WX_EMOJI = (code?: number | null, day = true) => {
  if (code == null) return '·';
  if (code === 0) return day ? '☀️' : '🌙';
  if (code <= 2) return day ? '🌤️' : '☁️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️';
  if (code <= 77 || code === 85 || code === 86) return '🌨️';
  return '⛈️';
};

export function WeatherSection({ p }: { p: LatLon }) {
  const q = useQuery({ queryKey: ['weather', p.lat.toFixed(2), p.lon.toFixed(2)], queryFn: () => api.weather(p.lat, p.lon), staleTime: 15 * 60_000, retry: 1 });
  return (
    <Section title="Weather" action={q.data && <SourceBadge fromCache={q.data.fromCache || q.data.data.cached} cachedAt={q.data.cachedAt ?? (q.data.data.cached ? q.data.data.fetched_at : undefined)} label="Open-Meteo" />}>
      {q.isPending ? (
        <div className="space-y-2"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-20 w-full rounded-2xl" /></div>
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => q.refetch()} title="Weather unavailable" />
      ) : (
        (() => {
          const w = q.data.data.data;
          const c = w.current;
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 p-4">
                <div className="text-4xl" aria-hidden>{WX_EMOJI(c.code, c.is_day)}</div>
                <div className="flex-1">
                  <div className="font-display text-3xl font-semibold tabular-nums">{c.temperature != null ? `${Math.round(c.temperature)}°C` : '—'}</div>
                  <div className="text-[13px] text-muted">{c.summary}{c.feels_like != null && ` · feels ${Math.round(c.feels_like)}°`}</div>
                </div>
                <div className="space-y-1 text-right text-[12px] text-muted">
                  {c.humidity != null && <div className="flex items-center justify-end gap-1"><Droplets className="h-3.5 w-3.5" />{c.humidity}%</div>}
                  {c.wind_speed != null && <div className="flex items-center justify-end gap-1"><Wind className="h-3.5 w-3.5" />{Math.round(c.wind_speed)} km/h</div>}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {w.daily.slice(0, 7).map((d) => (
                  <div key={d.date} className="rounded-xl bg-black/[0.03] px-0.5 py-2 dark:bg-white/[0.04]" title={`${d.summary}${d.precip_prob != null ? ` · ${d.precip_prob}% rain` : ''}`}>
                    <div className="text-[11px] font-medium text-muted">{new Date(d.date + 'T00:00').toLocaleDateString([], { weekday: 'short' })}</div>
                    <div className="my-0.5 text-lg" aria-hidden>{WX_EMOJI(d.code)}</div>
                    <div className="text-[12px] font-semibold tabular-nums">{d.t_max != null ? Math.round(d.t_max) : '–'}°</div>
                    <div className="text-[11px] tabular-nums text-muted">{d.t_min != null ? Math.round(d.t_min) : '–'}°</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted">{w.attribution}. Forecasts are model estimates.</p>
            </div>
          );
        })()
      )}
    </Section>
  );
}

export function SunSection({ p, tz }: { p: LatLon; tz?: string }) {
  const t = sunTimes(new Date(), p.lat, p.lon);
  const timeZone = tz ?? (p.lat > 6 && p.lat < 37.5 && p.lon > 68 && p.lon < 97.5 ? 'Asia/Kolkata' : undefined);
  let local = '';
  try {
    local = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone });
  } catch {
    local = '';
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <Mini icon={<Sunrise className="h-4 w-4 text-amber-500" />} label="Sunrise" value={t.sunrise ? formatTime(t.sunrise, timeZone) : t.dayLengthMin === 1440 ? 'Polar day' : 'Polar night'} />
      <Mini icon={<Sunset className="h-4 w-4 text-orange-500" />} label="Sunset" value={t.sunset ? formatTime(t.sunset, timeZone) : '—'} />
      <Mini icon={<Clock className="h-4 w-4 text-brand-500" />} label={timeZone ? 'Local time' : 'Your time'} value={local || '—'} hint={timeZone ? timeZone.replace('_', ' ') : 'Timezone unknown'} />
    </div>
  );
}

export function Mini({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{icon}{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
      {hint && <div className="truncate text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export function IndiaContext({ near, fromCache }: { near: NearestPlace[]; fromCache?: boolean }) {
  const units = useSettings((s) => s.units);
  if (!near.length) return null;
  const top = near[0];
  return (
    <Section title="India dataset" action={<SourceBadge local label="GeoNames · DataMeet" fromCache={fromCache} />}>
      <div className="rounded-2xl bg-violet-500/[0.06] p-3">
        <p className="text-sm">
          Nearest listed settlement: <b>{top.place.name}</b> ({formatDistance(top.distance_km, units)}) in{' '}
          <Link className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-300" to={`/india/${top.place.state_code}?district=${encodeURIComponent(top.place.district_id)}`}>
            {top.district} district
          </Link>
          , <Link className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-300" to={`/india/${top.place.state_code}`}>{top.state}</Link>.
        </p>
        <p className="mt-1 text-[11px] text-muted">District per Census 2011 boundaries. Newer districts may not be shown separately.</p>
      </div>
    </Section>
  );
}

const NEARBY_ICONS: Record<string, ReactNode> = {
  hospital: <Building2 className="h-3.5 w-3.5" />, pharmacy: <Pill className="h-3.5 w-3.5" />, police: <Shield className="h-3.5 w-3.5" />,
  atm: <Banknote className="h-3.5 w-3.5" />, fuel: <Fuel className="h-3.5 w-3.5" />, toilets: <Accessibility className="h-3.5 w-3.5" />,
  transit: <Bus className="h-3.5 w-3.5" />, attraction: <Landmark className="h-3.5 w-3.5" />, worship: <Landmark className="h-3.5 w-3.5" />,
  food: <Utensils className="h-3.5 w-3.5" />, stay: <BedDouble className="h-3.5 w-3.5" />, park: <Trees className="h-3.5 w-3.5" />, sports: <Trophy className="h-3.5 w-3.5" />,
};

export function NearbySection({ p, config, onShow }: { p: LatLon; config?: AppConfig; onShow: (items: NearbyItem[]) => void }) {
  const cats = config?.nearby_categories ?? [];
  const [cat, setCat] = useState<string | null>(null);
  const [radius, setRadius] = useState(2000);
  const units = useSettings((s) => s.units);
  const flyTo = useMap((s) => s.flyTo);
  const q = useQuery({
    queryKey: ['nearby', p.lat.toFixed(3), p.lon.toFixed(3), cat, radius],
    queryFn: async () => {
      const r = await api.nearby(p.lat, p.lon, cat!, radius);
      onShow(r.data.data);
      return r;
    },
    enabled: !!cat,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  if (!config?.features.nearby) return null;
  return (
    <Section title="Nearby essentials" action={q.data && <SourceBadge fromCache={q.data.fromCache || q.data.data.cached} cachedAt={q.data.cachedAt} label="OSM Overpass" />}>
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCat(cat === c.id ? null : c.id); if (cat === c.id) onShow([]); }}
            aria-pressed={cat === c.id}
            className={cn('chip border transition', cat === c.id ? 'border-brand-600 bg-brand-600 text-white' : 'hairline surface-hover')}
          >
            {NEARBY_ICONS[c.id]} {c.label}
          </button>
        ))}
      </div>
      {cat && (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] text-muted">
            Within
            {[1000, 2000, 5000].map((r) => (
              <button key={r} onClick={() => setRadius(r)} className={cn('rounded-full px-2 py-0.5', radius === r ? 'bg-black/10 font-semibold text-[rgb(var(--fg))] dark:bg-white/15' : 'hover:bg-black/5 dark:hover:bg-white/10')}>
                {formatDistance(r / 1000, units)}
              </button>
            ))}
          </div>
          {q.isPending ? (
            <SkeletonList rows={3} />
          ) : q.isError ? (
            <ErrorState compact error={q.error} onRetry={() => q.refetch()} title="Nearby search failed" />
          ) : q.data.data.data.length === 0 ? (
            <EmptyState className="py-5" title="Nothing mapped here" description="OpenStreetMap has no matching features in this radius. That doesn’t mean none exist — try a larger radius." icon={<MapPin className="h-5 w-5" />} />
          ) : (
            <ul className="space-y-1">
              {q.data.data.data.slice(0, 25).map((it) => (
                <li key={it.id} className="flex items-start gap-3 rounded-2xl p-2 surface-hover">
                  <button onClick={() => flyTo(it.lat, it.lon, 17)} className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300" aria-label={`Show ${it.name ?? 'feature'} on map`}>
                    {NEARBY_ICONS[cat]}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name ?? <span className="italic text-muted">Unnamed {it.kind?.replace(/_/g, ' ')}</span>}</div>
                    <div className="flex flex-wrap gap-x-2 text-[12px] text-muted">
                      <span>{formatDistance(it.distance_km, units)}</span>
                      {it.kind && <span className="capitalize">{it.kind.replace(/_/g, ' ')}</span>}
                      {it.opening_hours && <span title="Opening hours as mapped in OSM — verify before visiting">⏱ {it.opening_hours}</span>}
                    </div>
                    {(it.phone || it.website) && (
                      <div className="mt-1 flex gap-3 text-[12px]">
                        {it.phone && <a className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-300" href={`tel:${it.phone.split(';')[0]}`}><Phone className="h-3 w-3" />Call</a>}
                        {it.website && /^https?:\/\//.test(it.website) && <a className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-300" href={it.website} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" />Website</a>}
                      </div>
                    )}
                  </div>
                  <a className="shrink-0 rounded-full p-2 text-muted hover:bg-black/5 dark:hover:bg-white/10" aria-label="Directions" href={`https://www.openstreetmap.org/directions?route=;${it.lat},${it.lon}`} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted">Community-mapped OpenStreetMap data. No ratings, prices or availability are shown because none are verified.</p>
        </div>
      )}
    </Section>
  );
}

export function WikiSection({ p }: { p: LatLon }) {
  const q = useQuery({ queryKey: ['wiki', p.lat.toFixed(3), p.lon.toFixed(3)], queryFn: () => api.wikiNearby(p.lat, p.lon), staleTime: 60 * 60_000, retry: 1 });
  return (
    <Section title="Learn about the area" action={q.data && <SourceBadge fromCache={q.data.fromCache || q.data.data.cached} cachedAt={q.data.cachedAt} label="Wikipedia" />}>
      {q.isPending ? (
        <SkeletonList rows={2} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => q.refetch()} title="Wikipedia unavailable" />
      ) : q.data.data.data.length === 0 ? (
        <p className="text-[13px] text-muted">No geotagged Wikipedia articles within 10 km.</p>
      ) : (
        <ul className="space-y-2">
          {q.data.data.data.slice(0, 5).map((a) => (
            <li key={a.title}>
              <a href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-2xl p-2 surface-hover">
                {a.thumbnail ? (
                  <img src={a.thumbnail} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-black/[0.05] text-muted dark:bg-white/[0.07]"><BookOpen className="h-5 w-5" /></span>
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{a.title}</span>
                  {a.extract && <span className="line-clamp-2 text-[12px] text-muted">{a.extract}</span>}
                </span>
              </a>
            </li>
          ))}
          <li className="px-2 text-[11px] text-muted">Text from Wikipedia, CC BY-SA 4.0.</li>
        </ul>
      )}
    </Section>
  );
}

