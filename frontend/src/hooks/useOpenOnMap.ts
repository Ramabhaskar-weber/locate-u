import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { addHistory } from '@/lib/db';
import type { IndiaPlace } from '@/lib/schemas';
import { useMap, type Selection } from '@/stores/map';

/** Select a location and show it on the world map page. */
export function useOpenOnMap() {
  const navigate = useNavigate();
  const select = useMap((s) => s.select);
  return useCallback(
    (sel: Selection) => {
      select(sel);
      addHistory({ kind: 'view', label: sel.name ?? `${sel.lat.toFixed(4)}, ${sel.lon.toFixed(4)}`, sublabel: sel.address, lat: sel.lat, lon: sel.lon, ref: sel.ref ?? `${sel.lat.toFixed(4)},${sel.lon.toFixed(4)}` }).catch(() => undefined);
      if (!location.pathname.startsWith('/map')) navigate('/map');
    },
    [navigate, select],
  );
}

export function indiaPlaceToSelection(p: IndiaPlace, extra: { district?: string; state?: string } = {}): Selection {
  return {
    kind: 'india',
    lat: p.lat,
    lon: p.lon,
    name: p.name,
    ref: p.id,
    stateCode: p.state_code,
    address: [extra.district, extra.state].filter(Boolean).join(', ') || undefined,
    zoom: 12,
  };
}
