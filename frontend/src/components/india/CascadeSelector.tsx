import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStates } from '@/hooks/useConfig';
import { api } from '@/lib/api';
import { formatPopulation } from '@/lib/format';
import type { District, IndiaPlace, IndiaState } from '@/lib/schemas';
import { Button, Select, SourceBadge } from '../ui';

export interface CascadeValue {
  state?: IndiaState;
  district?: District;
  place?: IndiaPlace;
}

/** State/UT → district → city/town selectors backed by the local dataset. */
export function CascadeSelector({ initialState, initialDistrict, onChange, onShow, compact }: {
  initialState?: string;
  initialDistrict?: string;
  onChange?: (v: CascadeValue) => void;
  onShow?: (v: CascadeValue) => void;
  compact?: boolean;
}) {
  const states = useStates();
  const [stateCode, setStateCode] = useState(initialState ?? '');
  const [districtId, setDistrictId] = useState(initialDistrict ?? '');
  const [placeId, setPlaceId] = useState('');
  useEffect(() => setStateCode(initialState ?? ''), [initialState]);
  useEffect(() => setDistrictId(initialDistrict ?? ''), [initialDistrict]);

  const detail = useQuery({ queryKey: ['state', stateCode], queryFn: () => api.state(stateCode), enabled: !!stateCode, staleTime: Infinity });
  const places = useQuery({
    queryKey: ['places', stateCode, districtId, 'name'],
    queryFn: () => api.places(stateCode, { district: districtId, sort: 'name', limit: 2000 }),
    enabled: !!stateCode && !!districtId,
    staleTime: Infinity,
  });

  const state = states.data?.data.find((s) => s.code === stateCode);
  const district = detail.data?.data.districts.find((d) => d.id === districtId);
  const place = places.data?.data.items.find((p) => p.id === placeId);
  useEffect(() => {
    onChange?.({ state, district, place });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.code, district?.id, place?.id]);

  const sts = states.data?.data ?? [];
  return (
    <div className={compact ? 'space-y-3' : 'grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end'}>
      <Select
        label="State / Union Territory"
        value={stateCode}
        disabled={states.isPending}
        onChange={(e) => { setStateCode(e.target.value); setDistrictId(''); setPlaceId(''); }}
      >
        <option value="">{states.isPending ? 'Loading…' : states.isError ? 'Could not load' : `Choose one of ${sts.length}`}</option>
        <optgroup label="States (28)">{sts.filter((s) => s.type === 'state').map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</optgroup>
        <optgroup label="Union Territories (8)">{sts.filter((s) => s.type === 'union_territory').map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</optgroup>
      </Select>
      <Select
        label="District"
        value={districtId}
        disabled={!stateCode || detail.isPending}
        onChange={(e) => { setDistrictId(e.target.value); setPlaceId(''); }}
      >
        <option value="">{!stateCode ? 'Choose a state first' : detail.isPending ? 'Loading districts…' : `All ${detail.data?.data.districts.length ?? 0} districts`}</option>
        {detail.data?.data.districts.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.place_count})</option>)}
      </Select>
      <Select label="City / town" value={placeId} disabled={!districtId || places.isPending} onChange={(e) => setPlaceId(e.target.value)}>
        <option value="">
          {!districtId ? 'Choose a district first' : places.isPending ? 'Loading places…' : places.data?.data.total === 0 ? 'No places listed in dataset' : `${places.data?.data.total} places`}
        </option>
        {places.data?.data.items.map((p) => <option key={p.id} value={p.id}>{p.name}{p.population ? ` · ${formatPopulation(p.population)}` : ''}</option>)}
      </Select>
      {onShow && (
        <Button variant="primary" size="lg" className="h-11" disabled={!state} icon={<MapPin className="h-4 w-4" />} onClick={() => onShow({ state, district, place })}>
          Show
        </Button>
      )}
      {(detail.isError || places.isError) && <p role="alert" className="text-[13px] text-red-600 md:col-span-4">{((detail.error ?? places.error) as Error).message}</p>}
      {places.data?.fromCache && <div className="md:col-span-4"><SourceBadge fromCache cachedAt={places.data.cachedAt} /></div>}
    </div>
  );
}
