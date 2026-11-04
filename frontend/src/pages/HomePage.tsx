import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Compass, Crosshair, Database, Download, Globe2, Keyboard, Map as MapIcon, MapPin, Ruler, Search, ShieldCheck, Star, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, ErrorState, Glass, Kbd, Skeleton, SourceBadge, Stat } from '@/components/ui';
import { useGeolocation, useInstallPrompt } from '@/hooks';
import { useStates } from '@/hooks/useConfig';
import { useOpenOnMap } from '@/hooks/useOpenOnMap';
import { api } from '@/lib/api';
import { listHistory } from '@/lib/db';
import { compactNumber, timeAgo } from '@/lib/format';
import { formatCoords, parseCoordinates } from '@/lib/geo';
import { useSaved } from '@/stores/saved';
import { toast } from '@/stores/toast';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function HomePage() {
  const navigate = useNavigate();
  const openOnMap = useOpenOnMap();
  const [q, setQ] = useState('');
  const coverage = useQuery({ queryKey: ['coverage'], queryFn: api.coverage, staleTime: 10 * 60_000 });
  const states = useStates();
  const saved = useSaved((s) => s.items);
  const history = useQuery({ queryKey: ['history'], queryFn: () => listHistory() });
  const geo = useGeolocation();
  const install = useInstallPrompt();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    const c = parseCoordinates(t);
    if (c) openOnMap({ kind: 'point', ...c, zoom: 15 });
    else navigate(`/map?q=${encodeURIComponent(t)}`);
  };
  const locate = async () => {
    const pos = await geo.locate();
    if (pos) openOnMap({ kind: 'gps', lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your location', zoom: 15 });
    else toast('Location unavailable', { tone: 'error', description: geo.error ?? undefined }, 7000);
  };

  const c = coverage.data?.data;
  const topStates = [...(states.data?.data ?? [])].sort((a, b) => b.place_count - a.place_count).slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero */}
      <Glass strong className="relative overflow-hidden rounded-4xl p-6 sm:p-10 animate-fade-up">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand-400/40 to-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300/30 to-emerald-300/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-muted">{greeting()} 👋</p>
          <h1 className="mt-1 max-w-2xl font-display text-[34px] font-bold leading-[1.08] sm:text-5xl">
            Where do you want to <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">go next?</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted">Search anywhere on Earth, explore every Indian state and union territory, and keep your favourite spots — even offline.</p>
          <form onSubmit={submit} role="search" className="mt-6 flex max-w-2xl items-center gap-2 rounded-full bg-white/90 p-1.5 pl-5 shadow-lift ring-1 ring-black/5 dark:bg-white/[0.08] dark:ring-white/10">
            <Search className="h-5 w-5 shrink-0 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" placeholder="Try “Hampi”, “Leh Palace” or 15.335, 76.46" className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[rgb(var(--muted))]" />
            <Button type="submit" variant="primary" size="lg" className="shrink-0" icon={<ArrowRight className="h-4 w-4" />}>
              <span className="hidden sm:inline">Search</span>
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="glass" icon={<Crosshair className="h-4 w-4" />} loading={geo.status === 'locating'} onClick={locate}>Use my location</Button>
            <Button size="sm" variant="glass" icon={<MapIcon className="h-4 w-4" />} onClick={() => navigate('/map')}>Open world map</Button>
            <Button size="sm" variant="glass" icon={<Compass className="h-4 w-4" />} onClick={() => navigate('/india')}>Explore India</Button>
            <span className="hidden items-center gap-1.5 text-[12px] text-muted md:inline-flex"><Keyboard className="h-3.5 w-3.5" /> Press <Kbd>Ctrl K</Kbd> anywhere</span>
          </div>
          {geo.status === 'denied' && <p className="mt-3 text-[13px] text-amber-700 dark:text-amber-300">Location access is blocked. Enable it in your browser’s site settings, or just search instead.</p>}
        </div>
      </Glass>

      {/* India at a glance */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          icon={<Database className="h-5 w-5" />}
          title="India at a glance"
          subtitle="From the validated local dataset — no network needed once cached"
          action={coverage.data && <SourceBadge local fromCache={coverage.data.fromCache} cachedAt={coverage.data.cachedAt} />}
        >
          {coverage.isPending ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          ) : coverage.isError ? (
            <ErrorState compact error={coverage.error} onRetry={() => coverage.refetch()} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="States" value={c!.states} hint={`of ${c!.expected.states} official`} />
                <Stat label="Union Territories" value={c!.union_territories} hint={`of ${c!.expected.union_territories} official`} />
                <Stat label="Districts" value={c!.districts} hint="Census 2011 boundaries" />
                <Stat label="Cities & towns" value={compactNumber(c!.places)} hint="GeoNames + CSC" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                {c!.complete_state_list ? <Badge tone="green"><ShieldCheck className="h-3 w-3" /> All 28 states & 8 UTs present</Badge> : <Badge tone="red">State list incomplete</Badge>}
                <span>Dataset v{c!.manifest?.version} · imported {c!.last_import?.imported_at ? timeAgo(c!.last_import.imported_at) : '—'}</span>
                <Link to="/about" className="font-medium text-brand-600 hover:underline dark:text-brand-300">Coverage & sources →</Link>
              </div>
            </>
          )}
        </Card>

        <Card icon={<Star className="h-5 w-5" />} title="Saved places" subtitle={`${saved.length} on this device`} action={<Link to="/saved" className="text-[13px] font-medium text-brand-600 dark:text-brand-300">All</Link>}>
          {saved.length === 0 ? (
            <EmptyState className="py-4" title="Nothing saved yet" description="Tap any spot on the map and press Save." icon={<Star className="h-5 w-5" />} />
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {saved.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button onClick={() => openOnMap({ kind: 'saved', lat: s.lat, lon: s.lon, name: s.name, ref: s.id, address: s.address ?? undefined })} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left surface-hover">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color ?? '#f59e0b' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="block truncate text-[12px] text-muted">{s.collection ?? s.address ?? formatCoords(s)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" icon={<Compass className="h-5 w-5" />} title="Explore states & UTs" subtitle="Most-covered in the dataset" action={<Link to="/india" className="text-[13px] font-medium text-brand-600 dark:text-brand-300">All 36</Link>}>
          {states.isPending ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          ) : states.isError ? (
            <ErrorState compact error={states.error} onRetry={() => states.refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {topStates.map((s) => (
                <Link key={s.code} to={`/india/${s.code}`} className="group rounded-2xl bg-black/[0.03] p-3 transition hover:-translate-y-0.5 hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-muted">{s.code}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-[12px] text-muted">{s.place_count} places · {s.district_count} districts</div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card icon={<Globe2 className="h-5 w-5" />} title="Recent activity">
          {(history.data ?? []).length === 0 ? (
            <EmptyState className="py-4" title="No recent activity" description="Your searches and viewed places appear here. Stored only on this device." />
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {history.data!.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => (h.kind === 'search' ? navigate(`/map?q=${encodeURIComponent(h.label)}`) : h.lat != null && h.lon != null && openOnMap({ kind: 'point', lat: h.lat, lon: h.lon, name: h.label, address: h.sublabel }))}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left surface-hover"
                  >
                    {h.kind === 'search' ? <Search className="h-4 w-4 shrink-0 text-muted" /> : <MapPin className="h-4 w-4 shrink-0 text-muted" />}
                    <span className="min-w-0 flex-1 truncate text-sm">{h.label}</span>
                    <span className="shrink-0 text-[11px] text-muted">{timeAgo(h.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Features */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <Globe2 className="h-5 w-5" />, t: 'World search', d: 'OpenStreetMap geocoding, cached and rate-limited fairly.' },
          { icon: <Ruler className="h-5 w-5" />, t: 'Measure & coordinates', d: 'DD / DMS / Plus Codes, distances and sun times.' },
          { icon: <WifiOff className="h-5 w-5" />, t: 'Works offline', d: 'App shell, India data and viewed places stay available.' },
          { icon: <ShieldCheck className="h-5 w-5" />, t: 'Private by default', d: 'Location is used only when you ask. Saved places stay on device.' },
        ].map((f) => (
          <Glass key={f.t} className="p-4">
            <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">{f.icon}</div>
            <h3 className="text-sm font-semibold">{f.t}</h3>
            <p className="mt-0.5 text-[13px] text-muted">{f.d}</p>
          </Glass>
        ))}
      </div>

      {(install.canInstall || install.isIOS) && !install.installed && (
        <Glass className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Download className="h-5 w-5" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Install Locate U</h3>
            <p className="text-[13px] text-muted">{install.canInstall ? 'Add it to your home screen for a full-screen, app-like experience.' : 'On iPhone/iPad: tap Share → “Add to Home Screen”.'}</p>
          </div>
          {install.canInstall && <Button variant="primary" onClick={install.install}>Install app</Button>}
        </Glass>
      )}
    </div>
  );
}
