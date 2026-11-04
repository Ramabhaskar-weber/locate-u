/** Import/export saved locations as JSON, GeoJSON, CSV or GPX. */
import type { SavedLocation } from './db';

export type ExportFormat = 'json' | 'geojson' | 'csv' | 'gpx';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function exportSaved(items: SavedLocation[], format: ExportFormat): { content: string; mime: string; ext: string } {
  switch (format) {
    case 'geojson':
      return {
        mime: 'application/geo+json',
        ext: 'geojson',
        content: JSON.stringify(
          {
            type: 'FeatureCollection',
            features: items.map((s) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
              properties: { id: s.id, name: s.name, address: s.address, note: s.note, tags: s.tags, collection: s.collection, color: s.color, source: s.source, created_at: s.created_at },
            })),
          },
          null,
          2,
        ),
      };
    case 'csv': {
      const cell = (v: unknown) => {
        const t = v == null ? '' : String(v);
        return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
      };
      const rows = [['name', 'lat', 'lon', 'address', 'note', 'tags', 'collection', 'created_at']];
      items.forEach((s) => rows.push([s.name, String(s.lat), String(s.lon), s.address ?? '', s.note ?? '', s.tags.join('|'), s.collection ?? '', s.created_at]));
      return { mime: 'text/csv', ext: 'csv', content: rows.map((r) => r.map(cell).join(',')).join('\n') };
    }
    case 'gpx':
      return {
        mime: 'application/gpx+xml',
        ext: 'gpx',
        content:
          `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Locate U" xmlns="http://www.topografix.com/GPX/1/1">\n` +
          items
            .map((s) => `  <wpt lat="${s.lat}" lon="${s.lon}"><name>${esc(s.name)}</name>${s.note ? `<desc>${esc(s.note)}</desc>` : ''}</wpt>`)
            .join('\n') +
          '\n</gpx>\n',
      };
    default:
      return { mime: 'application/json', ext: 'json', content: JSON.stringify({ app: 'locate-u', version: 1, items }, null, 2) };
  }
}

export interface ImportedItem {
  name: string;
  lat: number;
  lon: number;
  note?: string;
  address?: string;
  tags?: string[];
  collection?: string;
}

/** Parse a JSON (Locate U export) or GeoJSON FeatureCollection; invalid points are skipped. */
export function parseImport(text: string): { items: ImportedItem[]; skipped: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON or GeoJSON.');
  }
  const out: ImportedItem[] = [];
  let skipped = 0;
  const push = (name: unknown, lat: unknown, lon: unknown, extra: Record<string, unknown> = {}) => {
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      skipped++;
      return;
    }
    out.push({
      name: String(name || 'Imported place').slice(0, 200),
      lat: la,
      lon: lo,
      note: typeof extra.note === 'string' ? extra.note.slice(0, 2000) : undefined,
      address: typeof extra.address === 'string' ? extra.address : undefined,
      tags: Array.isArray(extra.tags) ? extra.tags.filter((t) => typeof t === 'string').slice(0, 20) : undefined,
      collection: typeof extra.collection === 'string' ? extra.collection : undefined,
    });
  };
  const d = data as Record<string, unknown>;
  if (d && d.type === 'FeatureCollection' && Array.isArray(d.features)) {
    for (const f of d.features as Array<Record<string, any>>) {
      const c = f?.geometry?.type === 'Point' ? f.geometry.coordinates : null;
      if (!c) {
        skipped++;
        continue;
      }
      push(f.properties?.name, c[1], c[0], f.properties ?? {});
    }
  } else if (d && Array.isArray(d.items)) {
    for (const i of d.items as Array<Record<string, unknown>>) push(i.name, i.lat, i.lon, i);
  } else {
    throw new Error('Unrecognised file. Use a Locate U JSON export or a GeoJSON FeatureCollection of points.');
  }
  return { items: out.slice(0, 1000), skipped };
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
