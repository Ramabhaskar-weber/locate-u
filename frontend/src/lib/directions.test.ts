import { directionsLinks, geoUri, shareLink } from './directions';

describe('directions links', () => {
  const dest = { lat: 15.335, lon: 76.46 };
  it('builds links without leaking an origin by default', () => {
    const links = directionsLinks(dest);
    expect(links.map((l) => l.id)).toEqual(['osm', 'google', 'apple']);
    expect(links[1].url).toContain('destination=15.335000%2C76.460000');
    expect(links[1].url).not.toContain('origin=');
    expect(links[0].url).toContain('openstreetmap.org/directions');
  });
  it('includes origin and mode when requested', () => {
    const links = directionsLinks(dest, { lat: 12.97, lon: 77.59 }, 'walking');
    expect(links[1].url).toContain('origin=12.970000%2C77.590000');
    expect(links[1].url).toContain('travelmode=walking');
    expect(links[2].url).toContain('dirflg=w');
    expect(links[0].url).toContain('fossgis_osrm_foot');
  });
  it('creates geo: URIs and share links', () => {
    expect(geoUri(dest, 'Hampi')).toBe('geo:15.335000,76.460000?q=15.335000,76.460000(Hampi)');
    expect(shareLink(dest, 14, 'Hampi')).toMatch(/\/map\?lat=15\.33500&lon=76\.46000&z=14&name=Hampi$/);
  });
});
