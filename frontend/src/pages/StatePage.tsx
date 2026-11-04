import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Landmark, Map as MapIcon, MapPin, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StateMap } from '@/components/india/StateMap';
import { LocationCard } from '@/components/location/LocationCard';
import { Badge, Button, cn, EmptyState, ErrorState, Glass, Input, Segmented, Skeleton, SkeletonList, SourceBadge, Stat } from '@/components/ui';
import { useConfig } from '@/hooks/useConfig';
import { indiaPlaceToSelection } from '@/hooks/useOpenOnMap';
import { api } from '@/lib/api';
import { compactNumber, formatPopulation, typeLabel } from '@/lib/format';
import type { IndiaPlace } from '@/lib/schemas';
import { useMap } from '@/stores/map';

export default function StatePage() {
  const { code = '' } = useParams();
  const upper = code.toUpperCase();
  const [params, setParams] = useSearchParams();
  const districtId = params.get('district') ?? '';
  const [dq, setDq] = useState('');
  const [pq, setPq] = useState('');
  const [sort, setSort] = useState<'population' | 'name'>('population');
  const [focus, setFocus] = useState<IndiaPlace | null>(null);
  const { data: config } = useConfig();
  const navigate = useNavigate();
  const { setFocusState, fitBbox } = useMap();

  const detail = useQuery({ queryKey: ['state', upper], queryFn: () => api.state(upper), staleTime: Infinity, retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2 });
  const places = useQuery({
    queryKey: ['places', upper, districtId, sort],
    queryFn: () => api.places(upper, { district: districtId || undefined, sort, limit: 2000 }),
    enabled: detail.isSuccess,
    staleTime: Infinity,
  });

  const st = detail.data?.data.state;
  const districts = detail.data?.data.districts ?? [];
  const district = districts.find((d) => d.id === districtId) ?? null;
  const dName = useMemo(() => Object.fromEntries(districts.map((d) => [d.id, d.name])), [districts]);
  const shownDistricts = districts.filter((d) => d.name.toLowerCase().includes(dq.toLowerCase()));
  const items = (places.data?.data.items ?? []).filter((p) => !pq || p.name.toLowerCase().includes(pq.toLowerCase()));

  const pickDistrict = (id: string) => {
    setFocus(null);
    setParams((p) => { if (id) p.set('district', id); else p.delete('district'); return p; }, { replace: true });
  };

  if (detail.isError) {
    return (
      <div className="mx-auto max-w-3xl pt-6">
        <Glass>
          <ErrorState error={detail.error} onRetry={(detail.error as { status?: number }).status === 404 ? undefined : () => detail.refetch()} title="State not found" />
          <div className="pb-8 text-center"><Link to="/india" className="text-sm font-medium text-brand-600 dark:text-brand-300">← Back to all states & UTs</Link></div>
        </Glass>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 pt-1 text-[13px] text-muted">
        <Link to="/india" className="inline-flex items-center gap-1 hover:text-[rgb(var(--fg))]"><ArrowLeft className="h-3.5 w-3.5" /> India</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {st ? <button onClick={() => pickDistrict('')} className="hover:text-[rgb(var(--fg))]">{st.name}</button> : <Skeleton className="h-3 w-24" />}
        {district && <><ChevronRight className="h-3.5 w-3.5" /><span className="text-[rgb(var(--fg))]">{district.name}</span></>}
      </nav>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {st ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={st.type === 'state' ? 'brand' : 'violet'}>{typeLabel(st.type)}</Badge>
                <Badge>ISO {st.source_ids?.iso_3166_2 ?? `IN-${st.code}`}</Badge>
                {detail.data && <SourceBadge local fromCache={detail.data.fromCache} cachedAt={detail.data.cachedAt} />}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{district ? `${district.name} district` : st.name}</h1>
              {st.capital && !district && <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted"><Landmark className="h-4 w-4" /> Capital: {st.capital}</p>}
              {district && <p className="mt-1 text-[15px] text-muted">{st.name}{district.census_2011_code ? ` · Census 2011 code ${district.census_2011_code}` : ''}</p>}
            </>
          ) : (
            <div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-9 w-72" /></div>
          )}
        </div>
        {st && (
          <div className="flex gap-2">
            <Button variant="glass" icon={<MapIcon className="h-4 w-4" />} onClick={() => { setFocusState(st.code); const b = district?.bbox ?? st.bbox; if (b) fitBbox(b); navigate('/map'); }}>Open in world map</Button>
          </div>
        )}
      </header>

      {st && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Districts" value={district ? '—' : st.district_count} hint="Census 2011" />
          <Stat label="Places" value={compactNumber(district ? district.place_count : st.place_count)} hint="in dataset" />
          <Stat label="Largest" icon={<Users className="h-3.5 w-3.5" />} value={<span className="text-base">{places.data?.data.items.slice().sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0]?.name ?? '—'}</span>} hint="by GeoNames population" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,400px)]">
        {/* Districts */}
        <Glass className="flex max-h-[70vh] flex-col p-3 lg:max-h-[calc(100dvh-16rem)]">
          <h2 className="px-2 pb-2 pt-1 text-sm font-semibold">Districts {districts.length > 0 && <span className="font-normal text-muted">({districts.length})</span>}</h2>
          <Input value={dq} onChange={(e) => setDq(e.target.value)} placeholder="Filter districts" aria-label="Filter districts" leading={<Search className="h-4 w-4" />} className="h-10" />
          <ul className="mt-2 flex-1 overflow-y-auto scroll-thin">
            {detail.isPending && <SkeletonList rows={6} />}
            {!detail.isPending && (
              <li>
                <button onClick={() => pickDistrict('')} className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm', !districtId ? 'bg-brand-600 text-white' : 'surface-hover')}>
                  <span>All districts</span>
                </button>
              </li>
            )}
            {shownDistricts.map((d) => (
              <li key={d.id}>
                <button onClick={() => pickDistrict(d.id)} className={cn('flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm', d.id === districtId ? 'bg-brand-600 text-white' : 'surface-hover')}>
                  <span className="truncate">{d.name}</span>
                  <span className={cn('shrink-0 text-[12px] tabular-nums', d.id === districtId ? 'text-white/80' : 'text-muted')}>{d.place_count}</span>
                </button>
              </li>
            ))}
            {!detail.isPending && shownDistricts.length === 0 && <li className="px-3 py-4 text-[13px] text-muted">No district matches “{dq}”.</li>}
          </ul>
        </Glass>

        {/* Map + places */}
        <div className="space-y-4">
          <Glass className="h-[340px] overflow-hidden p-0 sm:h-[420px]">
            {st ? (
              <StateMap code={upper} bbox={st.bbox} places={places.data?.data.items ?? []} district={district} focus={focus} onPickPlace={setFocus} onPickDistrict={pickDistrict} />
            ) : (
              <Skeleton className="h-full w-full rounded-none" />
            )}
          </Glass>
          <Glass className="p-3">
            <div className="flex flex-col gap-2 px-1 pb-2 sm:flex-row sm:items-center">
              <h2 className="whitespace-nowrap text-sm font-semibold">Cities & towns {places.data && <span className="font-normal text-muted">({places.data.data.total})</span>}</h2>
              <div className="flex flex-1 items-center gap-2 sm:justify-end">
                <div className="w-full sm:w-56"><Input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Filter places" aria-label="Filter places" className="h-9" /></div>
                <Segmented size="sm" label="Sort places" value={sort} onChange={setSort} options={[{ value: 'population', label: 'Size' }, { value: 'name', label: 'A–Z' }]} />
              </div>
            </div>
            {places.isPending ? (
              <SkeletonList rows={6} />
            ) : places.isError ? (
              <ErrorState compact error={places.error} onRetry={() => places.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                title={pq ? 'No matching places' : 'No places in the dataset here'}
                description={pq ? 'Try a different spelling.' : 'This district has no settlements in the GeoNames ≥500 / CSC data. That reflects dataset coverage, not the real world.'}
                icon={<MapPin className="h-5 w-5" />}
              />
            ) : (
              <ul className="max-h-[420px] divide-y hairline overflow-y-auto scroll-thin">
                {items.slice(0, 400).map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setFocus(p)} className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left', focus?.id === p.id ? 'bg-brand-500/10' : 'surface-hover')}>
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', p.is_capital ? 'bg-rose-500' : 'bg-brand-500')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name} {p.is_capital && <Badge tone="red" className="ml-1">Capital</Badge>}</span>
                        <span className="block truncate text-[12px] text-muted">{dName[p.district_id]} · {formatPopulation(p.population)}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
                {items.length > 400 && <li className="px-2 py-3 text-[12px] text-muted">Showing 400 of {items.length}. Pick a district or filter to narrow down.</li>}
              </ul>
            )}
          </Glass>
        </div>

        {/* Detail */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {focus ? (
            <Glass strong className="max-h-[80vh] overflow-hidden lg:max-h-[calc(100dvh-3rem)]" key={focus.id}>
              <LocationCard sel={indiaPlaceToSelection(focus, { district: dName[focus.district_id], state: st?.name })} config={config} onClose={() => setFocus(null)} onNearby={() => undefined} />
            </Glass>
          ) : (
            <Glass className="hidden lg:block">
              <EmptyState title="Select a place" description="Click a city in the list or on the map to see coordinates, directions, weather and what’s nearby." icon={<MapPin className="h-5 w-5" />} />
            </Glass>
          )}
        </div>
      </div>
    </div>
  );
}
