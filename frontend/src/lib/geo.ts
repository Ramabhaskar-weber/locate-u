/** Pure geographic helpers (no network). All covered by unit tests. */

export type LatLon = { lat: number; lon: number };
export type CoordFormat = 'dd' | 'dms' | 'ddm';
export type Units = 'metric' | 'imperial';

const R_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthKm(points: LatLon[]): number {
  let t = 0;
  for (let i = 1; i < points.length; i++) t += haversineKm(points[i - 1], points[i]);
  return t;
}

/** Initial bearing in degrees (0 = north, clockwise). */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function compass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function formatDistance(km: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const mi = km * 0.621371;
    if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
    return `${mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString()} mi`;
  }
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString()} km`;
}

function dms(value: number, pos: string, neg: string, minutesOnly = false): string {
  const hemi = value >= 0 ? pos : neg;
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  if (minutesOnly) return `${d}° ${mFloat.toFixed(3)}′ ${hemi}`;
  let m = Math.floor(mFloat);
  let s = Math.round((mFloat - m) * 60 * 10) / 10;
  if (s >= 60) {
    s = 0;
    m += 1;
  }
  return `${d}° ${m}′ ${s.toFixed(1)}″ ${hemi}`;
}

export function formatCoords(p: LatLon, fmt: CoordFormat = 'dd'): string {
  if (fmt === 'dms') return `${dms(p.lat, 'N', 'S')}, ${dms(p.lon, 'E', 'W')}`;
  if (fmt === 'ddm') return `${dms(p.lat, 'N', 'S', true)}, ${dms(p.lon, 'E', 'W', true)}`;
  return `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
}

/**
 * Parse user-typed coordinates so they can be jumped to without calling a
 * geocoder. Supports "17.385, 78.4867", "17.385 78.4867", "17.385N 78.48E",
 * and DMS like 17°23'6"N 78°29'12"E.
 */
export function parseCoordinates(input: string): LatLon | null {
  const s = input.trim().toUpperCase().replace(/[′’]/g, "'").replace(/[″”]/g, '"');
  const dec = s.match(/^([-+]?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*([-+]?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?$/);
  if (dec) {
    let lat = parseFloat(dec[1]);
    let lon = parseFloat(dec[3]);
    if (dec[2] === 'S') lat = -Math.abs(lat);
    if (dec[4] === 'W') lon = -Math.abs(lon);
    return valid(lat, lon);
  }
  const part = String.raw`(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(?:(\d{1,2}(?:\.\d+)?)\s*")?\s*([NSEW])`;
  const m = s.match(new RegExp(`^${part}[,;\\s]*${part}$`));
  if (m) {
    const conv = (d: string, mi: string, se: string | undefined, h: string) => {
      const v = parseInt(d, 10) + parseInt(mi, 10) / 60 + (se ? parseFloat(se) / 3600 : 0);
      return h === 'S' || h === 'W' ? -v : v;
    };
    let a = conv(m[1], m[2], m[3], m[4]);
    let b = conv(m[5], m[6], m[7], m[8]);
    if (m[4] === 'E' || m[4] === 'W') [a, b] = [b, a];
    return valid(a, b);
  }
  return null;
}

function valid(lat: number, lon: number): LatLon | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

// ---- Open Location Code ("Plus Code"), public algorithm, Apache-2.0 spec ----
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';
export function plusCode(lat: number, lon: number): string {
  // Integer arithmetic on a 1/8000° grid (10-digit code) avoids float drift, as the reference implementation does.
  const la0 = Math.min(90, Math.max(-90, lat));
  const lo0 = ((((lon + 180) % 360) + 360) % 360) - 180;
  let la = Math.min(Math.floor(Math.round((la0 + 90) * 8000 * 1e6) / 1e6), 180 * 8000 - 1);
  let lo = Math.floor(Math.round((lo0 + 180) * 8000 * 1e6) / 1e6);
  let code = '';
  for (const r of [160000, 8000, 400, 20, 1]) {
    code += OLC_ALPHABET[Math.floor(la / r)] + OLC_ALPHABET[Math.floor(lo / r)];
    la %= r;
    lo %= r;
  }
  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

// ---- Sunrise / sunset (NOAA algorithm, ±1–2 min) ----------------------------
export function sunTimes(date: Date, lat: number, lon: number): { sunrise: Date | null; sunset: Date | null; dayLengthMin: number | null } {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
  const d = toJulian(date) - J2000;
  const lw = rad * -lon;
  const phi = rad * lat;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(L) * Math.sin(rad * 23.4397));
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const h0 = rad * -0.833;
  const cosW = (Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return { sunrise: null, sunset: null, dayLengthMin: cosW < -1 ? 1440 : 0 };
  const w = Math.acos(cosW);
  const Jset = J2000 + 0.0009 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  const sunrise = fromJulian(Jrise);
  const sunset = fromJulian(Jset);
  return { sunrise, sunset, dayLengthMin: Math.round((sunset.valueOf() - sunrise.valueOf()) / 60000) };
}

/** Rough check used to decide whether the India dataset is relevant. */
export function isRoughlyInIndia(p: LatLon): boolean {
  return p.lat >= 6 && p.lat <= 37.5 && p.lon >= 68 && p.lon <= 97.8;
}

export function bboxToBounds(b: number[]): [[number, number], [number, number]] {
  // [west, south, east, north] → Leaflet [[south, west], [north, east]]
  return [
    [b[1], b[0]],
    [b[3], b[2]],
  ];
}
