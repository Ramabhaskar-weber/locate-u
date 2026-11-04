import { useQuery } from '@tanstack/react-query';
import type L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useConfig } from '@/hooks/useConfig';
import { api } from '@/lib/api';
import { bboxToBounds } from '@/lib/geo';
import type { District, IndiaPlace } from '@/lib/schemas';
import { resolveDark, useSettings } from '@/stores/settings';
import { selectedIcon } from '../map/MapView';

function Fit({ bbox, focus }: { bbox?: number[] | null; focus?: IndiaPlace | null }) {
  const map = useMap();
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 11), { animate: !reduce, duration: 0.7 });
    else if (bbox) map.flyToBounds(bboxToBounds(bbox), { padding: [24, 24], animate: !reduce, duration: 0.7 });
  }, [bbox, focus, map]);
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function StateMap({ code, bbox, places, district, focus, onPickPlace, onPickDistrict }: {
  code: string;
  bbox?: number[] | null;
  places: IndiaPlace[];
  district?: District | null;
  focus?: IndiaPlace | null;
  onPickPlace: (p: IndiaPlace) => void;
  onPickDistrict: (id: string) => void;
}) {
  const { data: config } = useConfig();
  const baseLayer = useSettings((s) => s.baseLayer);
  const dark = resolveDark(useSettings((s) => s.theme));
  const bnd = useQuery({ queryKey: ['bnd', code], queryFn: () => api.districtBoundaries(code), staleTime: Infinity });
  const layer = config?.map.layers.find((l) => l.id === baseLayer && l.url) ?? config?.map.layers[0];
  const maxPop = useMemo(() => Math.max(1, ...places.map((p) => p.population ?? 0)), [places]);

  return (
    <MapContainer bounds={bbox ? bboxToBounds(bbox) : undefined} center={bbox ? undefined : [22.5, 79]} zoom={bbox ? undefined : 5} className="h-full w-full" zoomControl preferCanvas scrollWheelZoom>
      <TileLayer url={layer?.url ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} attribution={layer?.attribution ?? '&copy; OpenStreetMap contributors'} subdomains={layer?.subdomains ?? 'abc'} maxZoom={layer?.max_zoom ?? 19} />
      <Fit bbox={district?.bbox ?? bbox} focus={focus} />
      {bnd.data && (
        <GeoJSON
          key={`${code}-${district?.id}-${dark}`}
          data={bnd.data.data as GeoJSON.FeatureCollection}
          style={(f) => {
            const on = f?.properties?.id === district?.id;
            return { color: on ? '#1f5fe0' : dark ? '#f6c177' : '#c2410c', weight: on ? 2.5 : 1, opacity: 0.8, fillOpacity: on ? 0.12 : 0.03, fillColor: on ? '#3478f6' : '#f59e0b' };
          }}
          onEachFeature={(f, l: L.Layer) => {
            l.bindTooltip(f.properties?.name ?? '', { sticky: true, className: 'lu-tip' });
            l.on('click', () => onPickDistrict(f.properties?.id));
          }}
        />
      )}
      {places.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lon]}
          radius={3 + Math.sqrt((p.population ?? 0) / maxPop) * 9}
          pathOptions={{ color: '#fff', weight: 1, fillColor: p.is_capital ? '#e11d48' : '#3478f6', fillOpacity: 0.85 }}
          eventHandlers={{ click: () => onPickPlace(p) }}
        >
          <Tooltip className="lu-tip" direction="top">{p.name}</Tooltip>
        </CircleMarker>
      ))}
      {focus && <Marker position={[focus.lat, focus.lon]} icon={selectedIcon} />}
    </MapContainer>
  );
}
