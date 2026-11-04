import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Crosshair, Globe2, Loader2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounced } from '@/hooks';
import { indiaPlaceToSelection } from '@/hooks/useOpenOnMap';
import { api, type Cached } from '@/lib/api';
import { addHistory, listHistory } from '@/lib/db';
import { formatPopulation } from '@/lib/format';
import { formatCoords, parseCoordinates } from '@/lib/geo';
import type { SearchResponse } from '@/lib/schemas';
import { useMap } from '@/stores/map';
import { useSettings } from '@/stores/settings';
import { cn, EmptyState, ErrorState, Glass, IconButton, SourceBadge } from '../ui';

/**
 * World search follows the Nominatim policy: a request is sent ONLY when the
 * user submits (Enter / button). While typing, suggestions come from the local
 * India dataset on our own backend, which has no third-party rate limits.
 */
export function SearchPanel() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [focused, setFocused] = useState(false);
  const [world, setWorld] = useState<Cached<SearchResponse> | null>(null);
  const { select, setResults, fitBbox } = useMap();
  const { geocodeLang, restrictSearchToIndia } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmitted = useRef<string>('');
  const dq = useDebounced(q.trim(), 200);

  const local = useQuery({
    queryKey: ['india-search', dq],
    queryFn: ({ signal }) => api.indiaSearch(dq, undefined, signal),
    enabled: focused && dq.length >= 2 && !parseCoordinates(dq),
    staleTime: 60_000,
  });
  const recent = useQuery({ queryKey: ['history', 'search'], queryFn: () => listHistory('search'), enabled: focused && !q });

  const searchMut = useMutation({
    mutationFn: (term: string) => api.search(term, { lang: geocodeLang, country: restrictSearchToIndia ? 'in' : undefined }),
    onSuccess: (res, term) => {
      setWorld(res);
      setResults(res.data.results);
      addHistory({ kind: 'search', label: term }).catch(() => undefined);
      const rs = res.data.results;
      if (rs.length === 1) {
        const r = rs[0];
        select({ kind: 'search', lat: r.lat, lon: r.lon, name: r.name, address: r.display_name, ref: r.id, bbox: r.bbox });
      } else if (rs.length > 1) {
        const lats = rs.map((r) => r.lat);
        const lons = rs.map((r) => r.lon);
        fitBbox([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]);
      }
    },
  });

  const submit = (term = q.trim()) => {
    if (!term) return;
    const coords = parseCoordinates(term);
    if (coords) {
      select({ kind: 'point', ...coords, zoom: 15 });
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (term.length < 2) return;
    // Avoid re-sending an identical query (also deduplicated by the server cache).
    if (term === lastSubmitted.current && searchMut.isPending) return;
    lastSubmitted.current = term;
    setParams((p) => { p.set('q', term); return p; }, { replace: true });
    searchMut.mutate(term);
    setFocused(false);
    inputRef.current?.blur();
  };

  // Deep link: /map?q=… runs one search on load; /map?lat=&lon= selects a point.
  useEffect(() => {
    const initial = params.get('q');
    const lat = parseFloat(params.get('lat') ?? '');
    const lon = parseFloat(params.get('lon') ?? '');
    if (initial) submit(initial);
    else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      select({ kind: 'point', lat, lon, name: params.get('name') ?? undefined, zoom: parseInt(params.get('z') ?? '15', 10) || 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    setQ('');
    setWorld(null);
    setResults([]);
    searchMut.reset();
    setParams((p) => { p.delete('q'); return p; }, { replace: true });
    inputRef.current?.focus();
  };

  const coords = parseCoordinates(q);
  const showDropdown = focused && (q.length > 0 || (recent.data?.length ?? 0) > 0);
  const showResults = !focused && (searchMut.isPending || searchMut.isError || world);

  return (
    <div className="pointer-events-auto w-full max-w-md">
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="glass-strong flex h-14 items-center gap-2 rounded-full pl-4 pr-1.5"
      >
        <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => e.key === 'Escape' && inputRef.current?.blur()}
          placeholder="Search any place, or paste coordinates"
          aria-label="Search places worldwide"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[rgb(var(--muted))]"
        />
        {q && <IconButton type="button" label="Clear search" variant="ghost" size="sm" onClick={clear}><X className="h-4 w-4" /></IconButton>}
        <button type="submit" aria-label="Search" disabled={searchMut.isPending || q.trim().length < 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50">
          {searchMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
        </button>
      </form>

      {showDropdown && (
        <Glass strong className="mt-2 max-h-[55vh] overflow-y-auto rounded-3xl p-2 scroll-thin animate-fade-in">
          {coords && (
            <DropItem icon={<Crosshair className="h-4 w-4" />} label={`Go to ${formatCoords(coords)}`} sub="Coordinates" onPick={() => submit()} />
          )}
          {!coords && q.trim().length >= 2 && (
            <DropItem icon={<Globe2 className="h-4 w-4" />} label={`Search the world for “${q.trim()}”`} sub="Press Enter · OpenStreetMap Nominatim" onPick={() => submit()} />
          )}
          {!q && recent.data?.slice(0, 6).map((h) => (
            <DropItem key={h.id} icon={<Clock className="h-4 w-4" />} label={h.label} sub="Recent search" onPick={() => { setQ(h.label); submit(h.label); }} />
          ))}
          {local.data && (local.data.places.length > 0 || local.data.states.length > 0) && (
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">India dataset · instant</div>
          )}
          {local.data?.states.map((s) => (
            <DropItem key={s.code} icon={<MapPin className="h-4 w-4" />} label={s.name} sub={s.type === 'state' ? 'State' : 'Union Territory'} onPick={() => { if (s.bbox) fitBbox(s.bbox); useMap.getState().setFocusState(s.code); }} />
          ))}
          {local.data?.places.slice(0, 8).map((p) => (
            <DropItem key={p.id} icon={<MapPin className="h-4 w-4" />} label={p.name} sub={`${p.state_code} · ${formatPopulation(p.population)}`} onPick={() => { setQ(p.name); select(indiaPlaceToSelection(p)); useMap.getState().setFocusState(p.state_code); }} />
          ))}
          {local.isFetching && !local.data && <p className="px-3 py-2 text-[13px] text-muted">Looking in the India dataset…</p>}
        </Glass>
      )}

      {showResults && (
        <Glass strong className="mt-2 max-h-[50vh] overflow-y-auto rounded-3xl p-2 scroll-thin animate-fade-up">
          {searchMut.isPending && <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Searching OpenStreetMap…</p>}
          {searchMut.isError && <ErrorState compact error={searchMut.error} onRetry={() => submit(lastSubmitted.current)} />}
          {world && !searchMut.isPending && !searchMut.isError && (
            <>
              <div className="flex items-center justify-between px-3 pb-1 pt-1.5">
                <span className="text-[12px] font-medium text-muted">{world.data.results.length} result{world.data.results.length === 1 ? '' : 's'} for “{world.data.query}”</span>
                <SourceBadge fromCache={world.fromCache || world.data.cached} cachedAt={world.cachedAt ?? (world.data.cached ? world.data.fetched_at : undefined)} label="Nominatim" />
              </div>
              {world.data.results.length === 0 ? (
                <EmptyState title="No places found" description="Check the spelling, add a city or state, or try fewer words." icon={<Search className="h-5 w-5" />} className="py-6" />
              ) : (
                world.data.results.map((r) => (
                  <DropItem
                    key={r.id}
                    icon={<MapPin className="h-4 w-4" />}
                    label={r.name}
                    sub={r.display_name}
                    meta={r.type ?? undefined}
                    onPick={() => select({ kind: 'search', lat: r.lat, lon: r.lon, name: r.name, address: r.display_name, ref: r.id, bbox: r.bbox })}
                  />
                ))
              )}
              <p className="px-3 pb-1 pt-2 text-[11px] text-muted">© OpenStreetMap contributors · results cached to respect Nominatim limits</p>
            </>
          )}
        </Glass>
      )}
    </div>
  );
}

function DropItem({ icon, label, sub, meta, onPick }: { icon: React.ReactNode; label: string; sub?: string; meta?: string; onPick: () => void }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onPick} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left surface-hover')}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black/[0.05] text-muted dark:bg-white/[0.07]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
      </span>
      {meta && <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] capitalize text-muted dark:bg-white/[0.07]">{meta.replace(/_/g, ' ')}</span>}
    </button>
  );
}
