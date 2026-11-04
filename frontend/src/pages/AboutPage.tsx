import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Database, ExternalLink, Info, Keyboard, Scale, Server } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, ErrorState, Kbd, SkeletonList, SourceBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

export default function AboutPage() {
  const cov = useQuery({ queryKey: ['coverage'], queryFn: api.coverage, staleTime: 10 * 60_000 });
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, retry: 0 });
  const [showAll, setShowAll] = useState(false);
  const c = cov.data?.data;
  const v = c?.last_import?.validation as
    | { assignment?: Record<string, number>; csc_state_mismatches?: number; places_input?: number; excluded_polygons?: { district: string; reason: string }[]; reorganisation_rules?: { from: string; to: string }[] }
    | undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Data, sources & about</h1>
        <p className="mt-1 text-[15px] text-muted">What Locate U knows, where it comes from, and what it doesn’t cover.</p>
      </header>

      <Card icon={<Database className="h-5 w-5" />} title="India dataset coverage" action={cov.data && <SourceBadge local fromCache={cov.data.fromCache} cachedAt={cov.data.cachedAt} />}>
        {cov.isPending ? (
          <SkeletonList rows={4} />
        ) : cov.isError ? (
          <ErrorState compact error={cov.error} onRetry={() => cov.refetch()} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {c!.complete_state_list ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> {c!.states} states + {c!.union_territories} UTs (official list complete)</Badge> : <Badge tone="red">State list incomplete</Badge>}
              <Badge>{c!.districts} district polygons</Badge>
              <Badge>{c!.places.toLocaleString()} populated places</Badge>
              <Badge>{c!.places_by_source.geonames.toLocaleString()} GeoNames · {c!.places_by_source.csc_only} CSC-only</Badge>
            </div>
            {c!.manifest && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-[13px]">
                <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" /> Coverage limits</div>
                <p>{c!.manifest.coverage_note}</p>
              </div>
            )}
            {v && (
              <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                <div><dt className="text-muted">Inside a polygon</dt><dd className="font-semibold tabular-nums">{v.assignment?.point_in_polygon?.toLocaleString()}</dd></div>
                <div><dt className="text-muted">Snapped ≤ 8 km</dt><dd className="font-semibold tabular-nums">{v.assignment?.snapped_to_nearest}</dd></div>
                <div><dt className="text-muted">Dropped (outside)</dt><dd className="font-semibold tabular-nums">{v.assignment?.unassigned_dropped}</dd></div>
                <div><dt className="text-muted">Source state mismatches</dt><dd className="font-semibold tabular-nums">{v.csc_state_mismatches}</dd></div>
              </dl>
            )}
            {v?.reorganisation_rules && (
              <p className="text-[12px] text-muted">
                Reconciliation applied: Census-2011 districts moved to Telangana (2014) and Ladakh (2019); Dadra & Nagar Haveli and Daman & Diu merged (2020). Rules: {v.reorganisation_rules.length} district transfers.
                {v.excluded_polygons?.length ? ` Excluded: ${v.excluded_polygons.map((e) => `“${e.district}” (${e.reason})`).join(', ')}.` : ''}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-muted">
                  <tr><th className="py-2 pr-3">State / UT</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3 text-right">Districts</th><th className="py-2 text-right">Places</th></tr>
                </thead>
                <tbody className="divide-y hairline">
                  {c!.per_state.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, showAll ? undefined : 10).map((s) => (
                    <tr key={s.code}>
                      <td className="py-1.5 pr-3"><Link to={`/india/${s.code}`} className="font-medium hover:underline">{s.name}</Link></td>
                      <td className="py-1.5 pr-3 text-muted">{s.type === 'state' ? 'State' : 'UT'}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{s.districts}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.places}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setShowAll((x) => !x)} className="mt-2 text-[13px] font-medium text-brand-600 dark:text-brand-300">{showAll ? 'Show fewer' : `Show all ${c!.per_state.length}`}</button>
            </div>
          </div>
        )}
      </Card>

      <Card icon={<Scale className="h-5 w-5" />} title="Sources & licences">
        <ul className="space-y-3">
          {(c?.manifest?.sources ?? []).map((s) => (
            <li key={s.id} className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold hover:underline">{s.name} <ExternalLink className="h-3.5 w-3.5" /></a>
                <Badge tone="brand">{s.license}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-muted">{s.attribution}</p>
              <p className="mt-1 text-[11px] text-muted">
                Retrieved {s.retrieved_at ? new Date(s.retrieved_at).toLocaleDateString() : 'n/a'}{s.data_snapshot ? ` · data snapshot ${s.data_snapshot}` : ''}{s.sha256 ? ` · sha256 ${s.sha256.slice(0, 12)}…` : ''}
              </p>
            </li>
          ))}
          {[
            ['OpenStreetMap tiles & data', 'ODbL 1.0 · © OpenStreetMap contributors', 'https://www.openstreetmap.org/copyright'],
            ['Nominatim geocoding', 'Usage policy: ≤1 req/s, caching, no autocomplete', 'https://operations.osmfoundation.org/policies/nominatim/'],
            ['Overpass API (nearby essentials)', 'ODbL data · fair-use public instance', 'https://wiki.openstreetmap.org/wiki/Overpass_API'],
            ['Open-Meteo (weather)', 'CC BY 4.0 · free for non-commercial use', 'https://open-meteo.com/en/terms'],
            ['Wikipedia (place articles)', 'CC BY-SA 4.0', 'https://en.wikipedia.org/wiki/Wikipedia:Copyrights'],
          ].map(([n, l, u]) => (
            <li key={n} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
              <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold hover:underline">{n} <ExternalLink className="h-3.5 w-3.5" /></a>
              <span className="text-[12px] text-muted">{l}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card icon={<Info className="h-5 w-5" />} title="Known limitations">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-muted">
          <li>Districts are Census 2011 boundaries; India has created many districts since (e.g. Andhra Pradesh and Telangana reorganised theirs in 2016–2022).</li>
          <li>Places are settlements with ≥ 500 people in GeoNames plus CSC cities — villages and small hamlets are mostly missing.</li>
          <li>No satellite imagery: it requires a separately licensed provider.</li>
          <li>Map tiles are not available offline. The app shell, India data you’ve opened and places you’ve viewed are.</li>
          <li>Public Nominatim, Overpass and Open-Meteo instances are shared community services with limits — self-host or use a commercial plan before heavy production use.</li>
          <li>No hotels booking, reviews, prices, transport schedules or AI planning yet — those are future stages and will never be invented.</li>
        </ul>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card icon={<Keyboard className="h-5 w-5" />} title="Keyboard shortcuts">
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between"><span>Search & commands</span><span><Kbd>Ctrl</Kbd> <Kbd>K</Kbd> or <Kbd>/</Kbd></span></li>
            <li className="flex justify-between"><span>Close details / dialogs</span><Kbd>Esc</Kbd></li>
            <li className="flex justify-between"><span>Navigate results</span><span><Kbd>↑</Kbd> <Kbd>↓</Kbd> <Kbd>Enter</Kbd></span></li>
            <li className="flex justify-between"><span>Jump to coordinates</span><span className="text-muted">type “17.38, 78.48”</span></li>
          </ul>
        </Card>
        <Card icon={<Server className="h-5 w-5" />} title="System status">
          {health.isPending ? (
            <SkeletonList rows={2} />
          ) : health.isError ? (
            <ErrorState compact error={health.error} onRetry={() => health.refetch()} title="Backend unreachable" />
          ) : (
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">API</dt><dd><Badge tone={health.data.status === 'ok' ? 'green' : 'amber'}>{health.data.status}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Version</dt><dd>{health.data.version} · {health.data.env}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Database</dt><dd>{health.data.database.dialect}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Dataset imported</dt><dd>{c?.last_import?.imported_at ? timeAgo(c.last_import.imported_at) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">API docs</dt><dd><a className="text-brand-600 hover:underline dark:text-brand-300" href="/api/docs" target="_blank" rel="noreferrer">/api/docs</a></dd></div>
            </dl>
          )}
        </Card>
      </div>
      <p className="pb-4 text-center text-[12px] text-muted">Locate U · Stage 1 foundation · Made for travellers in India 🇮🇳</p>
    </div>
  );
}
