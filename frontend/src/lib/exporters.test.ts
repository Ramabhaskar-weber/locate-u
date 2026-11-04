import type { SavedLocation } from './db';
import { exportSaved, parseImport } from './exporters';

const item: SavedLocation = {
  id: '1', name: 'Gol "Gumbaz"', lat: 16.83, lon: 75.73, address: 'Vijayapura, Karnataka', note: 'Whispering <gallery>',
  tags: ['heritage', 'dome'], collection: 'Karnataka', color: '#f59e0b', source: 'map', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

describe('export / import', () => {
  it('round-trips through JSON and GeoJSON', () => {
    for (const fmt of ['json', 'geojson'] as const) {
      const { content } = exportSaved([item], fmt);
      const { items, skipped } = parseImport(content);
      expect(skipped).toBe(0);
      expect(items[0]).toMatchObject({ name: item.name, lat: item.lat, lon: item.lon, tags: item.tags });
    }
  });
  it('escapes CSV and GPX safely', () => {
    expect(exportSaved([item], 'csv').content.split('\n')[1]).toContain('"Gol ""Gumbaz"""');
    const gpx = exportSaved([item], 'gpx').content;
    expect(gpx).toContain('<name>Gol &quot;Gumbaz&quot;</name>');
    expect(gpx).toContain('&lt;gallery&gt;');
  });
  it('skips invalid coordinates and rejects garbage', () => {
    const fc = { type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [500, 10] }, properties: { name: 'bad' } },
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.2, 28.6] }, properties: { name: 'Delhi' } },
    ] };
    const r = parseImport(JSON.stringify(fc));
    expect(r.items).toHaveLength(1);
    expect(r.skipped).toBe(2);
    expect(() => parseImport('not json')).toThrow();
    expect(() => parseImport('{"foo":1}')).toThrow(/Unrecognised/);
  });
});
