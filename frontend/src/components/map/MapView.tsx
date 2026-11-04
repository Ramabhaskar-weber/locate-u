import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip, useMap as useLeafletMap, useMapEvents } from 'react-leaflet';
import { api } from '@/lib/api';
import { bboxToBounds, formatDistance } from '@/lib/geo';
import type { AppConfig, MapLayer } from '@/lib/schemas';
import { useMap } from '@/stores/map';
import { useSaved } from '@/stores/saved';
import { resolveDark, useSettings } from '@/stores/settings';

const pinSvg = (color: string, inner = '#fff') =>
  `<svg class="lu-pin" width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg"><path d="M17 1C8.2 1 1 7.9 1 16.5 1 28.1 17 43 17 43s16-14.9 16-26.5C33 7.9 25.8 1 17 1Z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16.5" r="6" fill="${inner}"/></svg>`;

export const selectedIcon = L.divIcon({ className: '', html: pinSvg('#1f5fe0'), iconSize: [34, 44], iconAnchor: [17, 43], tooltipAnchor: [0, -40] });
const savedIcon = (color = '#f59e0b') =>
  L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 4px 10px rgb(0 0 0/.3);display:grid;place-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
const userIcon = L.divIcon({
  className: '',
  html: '<div class="lu-pulse" style="width:18px;height:18px;border-radius:9999px;background:#3478f6;border:3px solid #fff;box-shadow:0 2px 8px rgb(0 0 0/.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const FALLBACK_LAYER: MapLayer = {
  id: 'osm',
  name: 'OpenStreetMap',
  kind: 'base',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  max_zoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/** The live Leaflet map instance, for imperative controls (zoom buttons). */
export const leafletRef: { current: L.Map | null } = { current: null };

function Controller() {
  const map = useLeafletMap();
  useEffect(() => {
    leafletRef.current = map;
    return () => {
      leafletRef.current = null;
    };
  }, [map]);
  const view = useMap((s) => s.view);
  const { setCursor, setZoom, measuring, addMeasurePoint, select } = useMap();
  useEffect(() => {
    if (!view) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (view.type === 'fly') map.flyTo([view.lat, view.lon], view.zoom ?? map.getZoom(), { animate: !reduce, duration: 0.9 });
    else map.flyToBounds(bboxToBounds(view.bbox), { padding: [48, 48], maxZoom: 15, animate: !reduce, duration: 0.9 });
  }, [view, map]);
  useEffect(() => {
    // Leaflet needs a size recalculation when the container resizes (sheet open, rotation).
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  useMapEvents({
    mousemove: (e) => setCursor({ lat: e.latlng.lat, lon: e.latlng.lng }),
    mouseout: () => setCursor(null),
    zoomend: () => setZoom(map.getZoom()),
    click: (e) => {
      const lat = e.latlng.lat;
      const lon = L.Util.wrapNum(e.latlng.lng, [-180, 180], true);
      if (measuring) addMeasurePoint({ lat, lon });
      else select({ kind: 'point', lat, lon }, { fly: false });
    },
  });
  return null;
}

function StatesOverlay() {
  const { data } = useQuery({ queryKey: ['bnd-states'], queryFn: api.stateBoundaries, staleTime: Infinity });
  const focus = useMap((s) => s.focusState);
  const dark = resolveDark(useSettings((s) => s.theme));
  if (!data) return null;
  return (
    <GeoJSON
      key={`states-${focus}-${dark}`}
      data={data.data as GeoJSON.FeatureCollection}
      style={(f) => ({
        color: dark ? '#8ab4ff' : '#1f5fe0',
        weight: f?.properties?.code === focus ? 2.5 : 1,
        opacity: 0.7,
        fillOpacity: f?.properties?.code === focus ? 0.06 : 0.015,
        fillColor: '#3478f6',
      })}
      onEachFeature={(f, layer) => layer.bindTooltip(f.properties?.name ?? '', { sticky: true, className: 'lu-tip', direction: 'top' })}
    />
  );
}

function DistrictsOverlay({ code }: { code: string }) {
  const { data } = useQuery({ queryKey: ['bnd', code], queryFn: () => api.districtBoundaries(code), staleTime: Infinity });
  const dark = resolveDark(useSettings((s) => s.theme));
  if (!data) return null;
  return (
    <GeoJSON
      key={`d-${code}-${dark}`}
      data={data.data as GeoJSON.FeatureCollection}
      style={() => ({ color: dark ? '#f6c177' : '#c2410c', weight: 1.2, opacity: 0.75, dashArray: '4 3', fillOpacity: 0.03, fillColor: '#f59e0b' })}
      onEachFeature={(f, layer) => layer.bindTooltip(`${f.properties?.name} district`, { sticky: true, className: 'lu-tip', direction: 'top' })}
    />
  );
}

export function MapView({ config, extraMarkers }: { config?: AppConfig; extraMarkers?: { id: string; lat: number; lon: number; label: string }[] }) {
  const { selection, results, user, measurePoints, focusState, select } = useMap();
  const { baseLayer, overlays, units } = useSettings();
  const saved = useSaved((s) => s.items);
  const layer = useMemo(() => {
    const layers = config?.map.layers.filter((l) => l.kind === 'base' && l.url) ?? [];
    return layers.find((l) => l.id === baseLayer) ?? layers[0] ?? FALLBACK_LAYER;
  }, [config, baseLayer]);
  const center = (config?.map.default_center ?? [22.5, 79]) as [number, number];

  return (
    <MapContainer
      center={center}
      zoom={config?.map.default_zoom ?? 5}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      className="h-full w-full"
      preferCanvas
      attributionControl
    >
      <TileLayer
        key={layer.id}
        url={layer.url!}
        attribution={layer.attribution}
        maxZoom={layer.max_zoom ?? 19}
        subdomains={layer.subdomains ?? 'abc'}
        crossOrigin
      />
      <ScaleControl position="bottomright" imperial={units === 'imperial'} metric={units === 'metric'} />
      <Controller />
      {overlays.states && <StatesOverlay />}
      {overlays.districts && focusState && <DistrictsOverlay code={focusState} />}

      {results.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lon]}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#3478f6', fillOpacity: 0.95 }}
          eventHandlers={{ click: () => select({ kind: 'search', lat: r.lat, lon: r.lon, name: r.name, address: r.display_name, ref: r.id, bbox: r.bbox }) }}
        >
          <Tooltip className="lu-tip" direction="top" offset={[0, -6]}>{r.name}</Tooltip>
        </CircleMarker>
      ))}

      {extraMarkers?.map((m) => (
        <CircleMarker key={m.id} center={[m.lat, m.lon]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.95 }}>
          <Tooltip className="lu-tip" direction="top">{m.label}</Tooltip>
        </CircleMarker>
      ))}

      {overlays.saved &&
        saved.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lon]}
            icon={savedIcon(s.color ?? undefined)}
            eventHandlers={{ click: () => select({ kind: 'saved', lat: s.lat, lon: s.lon, name: s.name, ref: s.id, address: s.address ?? undefined }) }}
          >
            <Tooltip className="lu-tip" direction="top" offset={[0, -12]}>{s.name}</Tooltip>
          </Marker>
        ))}

      {user && (
        <>
          <Circle center={[user.lat, user.lon]} radius={Math.min(user.accuracy, 5000)} pathOptions={{ color: '#3478f6', weight: 1, fillOpacity: 0.08 }} />
          <Marker position={[user.lat, user.lon]} icon={userIcon} eventHandlers={{ click: () => select({ kind: 'gps', lat: user.lat, lon: user.lon, name: 'Your location' }) }}>
            <Tooltip className="lu-tip" direction="top" offset={[0, -10]}>You are here (±{Math.round(user.accuracy)} m)</Tooltip>
          </Marker>
        </>
      )}

      {selection && (
        <Marker position={[selection.lat, selection.lon]} icon={selectedIcon} zIndexOffset={1000} keyboard={false}>
          {selection.name && <Tooltip className="lu-tip" direction="top" offset={[0, -40]} permanent>{selection.name}</Tooltip>}
        </Marker>
      )}

      {measurePoints.length > 0 && (
        <>
          <Polyline positions={measurePoints.map((p) => [p.lat, p.lon])} pathOptions={{ color: '#e11d48', weight: 3, dashArray: '6 6' }} />
          {measurePoints.map((p, i) => (
            <CircleMarker key={i} center={[p.lat, p.lon]} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#e11d48', fillOpacity: 1 }}>
              {i === measurePoints.length - 1 && i > 0 && (
                <Tooltip permanent className="lu-tip" direction="right" offset={[8, 0]}>
                  {formatDistance(
                    measurePoints.reduce((t, q, k) => (k ? t + L.latLng(measurePoints[k - 1].lat, measurePoints[k - 1].lon).distanceTo([q.lat, q.lon]) / 1000 : 0), 0),
                    units,
                  )}
                </Tooltip>
              )}
            </CircleMarker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
