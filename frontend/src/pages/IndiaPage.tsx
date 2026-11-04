import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpDown, Compass, Landmark, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CascadeSelector } from '@/components/india/CascadeSelector';
import { Badge, Card, EmptyState, ErrorState, Glass, Input, Segmented, Skeleton, SourceBadge } from '@/components/ui';
import { useStates } from '@/hooks/useConfig';
import { indiaPlaceToSelection, useOpenOnMap } from '@/hooks/useOpenOnMap';
import { api } from '@/lib/api';
import { typeLabel } from '@/lib/format';
import { useMap } from '@/stores/map';

type Filter = 'all' | 'state' | 'union_territory';
type Sort = 'name' | 'places' | 'districts';

export default function IndiaPage() {
  const states = useStates();
  const coverage = useQuery({ queryKey: ['coverage'], queryFn: api.coverage, staleTime: 10 * 60_000 });
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const openOnMap = useOpenOnMap();
  const { fitBbox, setFocusState } = useMap();

  const list = useMemo(() => {
    let l = [...(states.data?.data ?? [])];
    if (filter !== 'all') l = l.filter((s) => s.type === filter);
    if (q.trim()) l = l.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase() === q.toLowerCase() || (s.capital ?? '').toLowerCase().includes(q.toLowerCase()));
    l.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'places' ? b.place_count - a.place_count : b.district_count - a.district_count));
    return l;
  }, [states.data, filter, sort, q]);

  const all = states.data?.data ?? [];
  const nStates = all.filter((s) => s.type === 'state').length;
  const nUts = all.filter((s) => s.type === 'union_territory').length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">India explorer</h1>
          <p className="mt-1 text-[15px] text-muted">All {nStates || 28} states and {nUts || 8} union territories, with districts and cities from documented open datasets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {states.data && <SourceBadge local fromCache={states.data.fromCache} cachedAt={states.data.cachedAt} />}
          {coverage.data?.data.complete_state_list && <Badge tone="green"><ShieldCheck className="h-3 w-3" /> Validated 28 + 8</Badge>}
        </div>
      </header>

      <Card icon={<Compass className="h-5 w-5" />} title="Find a place" subtitle="Drill down from state to district to city or town — instant, from the local dataset">
        <CascadeSelector
          onShow={({ state, district, place }) => {
            if (!state) return;
            setFocusState(state.code);
            if (place) openOnMap(indiaPlaceToSelection(place, { district: district?.name, state: state.name }));
            else if (district) navigate(`/india/${state.code}?district=${encodeURIComponent(district.id)}`);
            else navigate(`/india/${state.code}`);
          }}
        />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-72"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, code or capital" aria-label="Filter states" leading={<Search className="h-4 w-4" />} /></div>
        <Segmented label="Type" value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${all.length || 36}` }, { value: 'state', label: `States ${nStates || 28}` }, { value: 'union_territory', label: `UTs ${nUts || 8}` }]} />
        <div className="flex items-center gap-2 sm:ml-auto">
          <ArrowUpDown className="h-4 w-4 text-muted" />
          <Segmented size="sm" label="Sort" value={sort} onChange={setSort} options={[{ value: 'name', label: 'A–Z' }, { value: 'places', label: 'Places' }, { value: 'districts', label: 'Districts' }]} />
        </div>
      </div>

      {states.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      ) : states.isError ? (
        <Glass><ErrorState error={states.error} onRetry={() => states.refetch()} /></Glass>
      ) : list.length === 0 ? (
        <Glass><EmptyState title="No states match" description={`Nothing matches “${q}”. Clear the filter to see all 36.`} icon={<Search className="h-5 w-5" />} /></Glass>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s, i) => (
            <li key={s.code} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              <Glass className="group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 font-mono text-sm font-bold text-white shadow-lift">{s.code}</div>
                  <Badge tone={s.type === 'state' ? 'brand' : 'violet'}>{typeLabel(s.type)}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold leading-tight">{s.name}</h2>
                {s.capital && <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted"><Landmark className="h-3.5 w-3.5" /> {s.capital}</p>}
                <div className="mt-3 flex gap-4 text-[13px]">
                  <span><b className="tabular-nums">{s.district_count}</b> <span className="text-muted">districts*</span></span>
                  <span><b className="tabular-nums">{s.place_count}</b> <span className="text-muted">places</span></span>
                </div>
                <div className="mt-4 flex gap-2 pt-1">
                  <Link to={`/india/${s.code}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-600 text-[13px] font-medium text-white transition hover:bg-brand-700">
                    Explore <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => { setFocusState(s.code); if (s.bbox) fitBbox(s.bbox); navigate('/map'); }}
                    className="inline-flex h-9 items-center justify-center rounded-full bg-black/[0.05] px-4 text-[13px] font-medium transition hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                  >
                    Map
                  </button>
                </div>
              </Glass>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-muted">
        * District counts follow Census 2011 boundaries (DataMeet, CC BY 4.0) reconciled to today’s states/UTs. Districts created since 2011 are not shown separately.
        Places are GeoNames settlements (population ≥ 500) and CSC cities — not every village. <Link to="/about" className="text-brand-600 hover:underline dark:text-brand-300">Full coverage report</Link>.
      </p>
    </div>
  );
}
