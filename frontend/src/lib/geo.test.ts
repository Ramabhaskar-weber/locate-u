import { bearing, compass, formatCoords, formatDistance, haversineKm, isRoughlyInIndia, parseCoordinates, pathLengthKm, plusCode, sunTimes } from './geo';

describe('geo helpers', () => {
  it('computes haversine distances', () => {
    const delhi = { lat: 28.6139, lon: 77.209 };
    const mumbai = { lat: 19.076, lon: 72.8777 };
    expect(haversineKm(delhi, mumbai)).toBeCloseTo(1153, -1);
    expect(haversineKm(delhi, delhi)).toBe(0);
    expect(pathLengthKm([delhi, mumbai, delhi])).toBeCloseTo(2 * haversineKm(delhi, mumbai), 5);
  });

  it('formats distances in both unit systems', () => {
    expect(formatDistance(0.45)).toBe('450 m');
    expect(formatDistance(3.456)).toBe('3.5 km');
    expect(formatDistance(1234)).toBe('1,234 km');
    expect(formatDistance(1.609344, 'imperial')).toBe('1.0 mi');
    expect(formatDistance(0.01, 'imperial')).toBe('33 ft');
  });

  it('formats coordinates as DD, DMS and DDM', () => {
    const p = { lat: 17.385, lon: -78.4867 };
    expect(formatCoords(p)).toBe('17.38500, -78.48670');
    expect(formatCoords(p, 'dms')).toBe('17° 23′ 6.0″ N, 78° 29′ 12.1″ W');
    expect(formatCoords(p, 'ddm')).toMatch(/^17° 23\.100′ N, 78° 29\.202′ W$/);
  });

  it('parses typed coordinates and rejects invalid ones', () => {
    expect(parseCoordinates('17.385, 78.4867')).toEqual({ lat: 17.385, lon: 78.4867 });
    expect(parseCoordinates('17.385 78.4867')).toEqual({ lat: 17.385, lon: 78.4867 });
    expect(parseCoordinates('33.9N 151.2W')).toEqual({ lat: 33.9, lon: -151.2 });
    const dms = parseCoordinates(`17°23'6"N 78°29'12"E`)!;
    expect(dms.lat).toBeCloseTo(17.385, 3);
    expect(dms.lon).toBeCloseTo(78.4867, 3);
    expect(parseCoordinates('91, 10')).toBeNull();
    expect(parseCoordinates('Hyderabad')).toBeNull();
    expect(parseCoordinates('10, 200')).toBeNull();
  });

  it('encodes Plus Codes per the Open Location Code spec', () => {
    // Values cross-checked with exact decimal arithmetic of the OLC algorithm
    expect(plusCode(37.4219983, -122.084)).toBe('849VCWC8+QC');
    expect(plusCode(20.375, 2.775)).toBe('7FG49QGG+22');
    expect(plusCode(17.385, 78.4867)).toBe('7J9W9FPP+2M');
  });

  it('computes bearings and compass points', () => {
    expect(compass(bearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }))).toBe('N');
    expect(compass(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }))).toBe('E');
  });

  it('computes plausible sunrise/sunset for Delhi', () => {
    const t = sunTimes(new Date('2026-06-21T06:30:00Z'), 28.6139, 77.209);
    const ist = (d: Date) => (d.getUTCHours() + 5.5 + d.getUTCMinutes() / 60) % 24;
    expect(ist(t.sunrise!)).toBeGreaterThan(5.1);
    expect(ist(t.sunrise!)).toBeLessThan(5.8);
    expect(t.dayLengthMin).toBeGreaterThan(13 * 60);
    expect(sunTimes(new Date('2026-06-21T12:00:00Z'), 80, 0).dayLengthMin).toBe(1440);
  });

  it('roughly detects India', () => {
    expect(isRoughlyInIndia({ lat: 17.38, lon: 78.48 })).toBe(true);
    expect(isRoughlyInIndia({ lat: 51.5, lon: 0 })).toBe(false);
  });
});
