/**
 * Directions are provided as plain links to external apps — no routing API is
 * called and no API key is used. Opening a link hands the destination to the
 * chosen app; the user's origin is only shared if they explicitly choose
 * "from my location".
 */
import type { LatLon } from './geo';

export type DirectionsMode = 'driving' | 'walking' | 'cycling' | 'transit';

export interface DirectionsLink {
  id: string;
  label: string;
  url: string;
  note?: string;
}

const f = (n: number) => n.toFixed(6);

export function directionsLinks(dest: LatLon, origin?: LatLon | null, mode: DirectionsMode = 'driving', name?: string): DirectionsLink[] {
  const d = `${f(dest.lat)},${f(dest.lon)}`;
  const o = origin ? `${f(origin.lat)},${f(origin.lon)}` : '';
  const osmEngine = { driving: 'fossgis_osrm_car', walking: 'fossgis_osrm_foot', cycling: 'fossgis_osrm_bike', transit: 'fossgis_osrm_car' }[mode];
  const gMode = { driving: 'driving', walking: 'walking', cycling: 'bicycling', transit: 'transit' }[mode];
  const aMode = { driving: 'd', walking: 'w', cycling: 'c', transit: 'r' }[mode];
  const links: DirectionsLink[] = [
    {
      id: 'osm',
      label: 'OpenStreetMap',
      url: `https://www.openstreetmap.org/directions?engine=${osmEngine}&route=${encodeURIComponent(o ? `${o};${d}` : `;${d}`)}`,
      note: mode === 'transit' ? 'Transit not supported; opens driving route' : undefined,
    },
    {
      id: 'google',
      label: 'Google Maps',
      url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}${o ? `&origin=${encodeURIComponent(o)}` : ''}&travelmode=${gMode}`,
    },
    {
      id: 'apple',
      label: 'Apple Maps',
      url: `https://maps.apple.com/?daddr=${encodeURIComponent(d)}${o ? `&saddr=${encodeURIComponent(o)}` : ''}&dirflg=${aMode}${name ? `&q=${encodeURIComponent(name)}` : ''}`,
    },
  ];
  return links;
}

export function geoUri(p: LatLon, name?: string): string {
  return `geo:${f(p.lat)},${f(p.lon)}?q=${f(p.lat)},${f(p.lon)}${name ? `(${encodeURIComponent(name)})` : ''}`;
}

export function osmLink(p: LatLon, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${f(p.lat)}&mlon=${f(p.lon)}#map=${zoom}/${f(p.lat)}/${f(p.lon)}`;
}

export function shareLink(p: LatLon, zoom = 15, name?: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const q = new URLSearchParams({ lat: p.lat.toFixed(5), lon: p.lon.toFixed(5), z: String(zoom) });
  if (name) q.set('name', name);
  return `${base}/map?${q.toString()}`;
}
