/**
 * IndexedDB persistence (via `idb`):
 *  - saved:     the user's saved locations (device-first, optional cloud sync)
 *  - responses: last successful API responses, used as a clearly-labelled
 *               offline fallback ("cached", with the time it was stored)
 *  - history:   recent searches and recently viewed locations
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string | null;
  note?: string | null;
  tags: string[];
  collection?: string | null;
  color?: string | null;
  source: 'map' | 'search' | 'india' | 'gps' | 'import';
  source_ref?: string | null;
  created_at: string;
  updated_at: string;
  synced_at?: string | null;
  deleted?: boolean;
}

export interface CachedResponse {
  key: string;
  data: unknown;
  stored_at: string;
}

export interface HistoryEntry {
  id: string;
  kind: 'search' | 'view';
  label: string;
  sublabel?: string;
  lat?: number;
  lon?: number;
  ref?: string;
  at: string;
}

interface LocateUDB extends DBSchema {
  saved: { key: string; value: SavedLocation; indexes: { by_updated: string } };
  responses: { key: string; value: CachedResponse };
  history: { key: string; value: HistoryEntry; indexes: { by_at: string } };
}

const DB_NAME = 'locate-u';
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<LocateUDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LocateUDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LocateUDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const saved = db.createObjectStore('saved', { keyPath: 'id' });
        saved.createIndex('by_updated', 'updated_at');
        db.createObjectStore('responses', { keyPath: 'key' });
        const h = db.createObjectStore('history', { keyPath: 'id' });
        h.createIndex('by_at', 'at');
      },
    });
  }
  return dbPromise;
}

/** Test helper: forget the cached connection. */
export function _resetDB() {
  dbPromise = null;
}

// ---- saved ------------------------------------------------------------------
export async function listSaved(): Promise<SavedLocation[]> {
  const all = await (await getDB()).getAll('saved');
  return all.filter((s) => !s.deleted).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
export async function listSavedIncludingDeleted(): Promise<SavedLocation[]> {
  return (await getDB()).getAll('saved');
}
export async function putSaved(item: SavedLocation) {
  await (await getDB()).put('saved', item);
}
export async function putManySaved(items: SavedLocation[]) {
  const db = await getDB();
  const tx = db.transaction('saved', 'readwrite');
  await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
}
export async function removeSaved(id: string) {
  await (await getDB()).delete('saved', id);
}
export async function clearSaved() {
  await (await getDB()).clear('saved');
}

// ---- response cache ------------------------------------------------------------
export async function cacheResponse(key: string, data: unknown) {
  await (await getDB()).put('responses', { key, data, stored_at: new Date().toISOString() });
}
export async function readCachedResponse(key: string): Promise<CachedResponse | undefined> {
  return (await getDB()).get('responses', key);
}
export async function clearResponses() {
  await (await getDB()).clear('responses');
}
export async function countResponses(): Promise<number> {
  return (await getDB()).count('responses');
}

// ---- history --------------------------------------------------------------------
const HISTORY_MAX = 40;
export async function addHistory(entry: Omit<HistoryEntry, 'id' | 'at'> & { id?: string }) {
  const db = await getDB();
  const id = entry.id ?? `${entry.kind}:${entry.ref ?? entry.label.toLowerCase()}`;
  await db.put('history', { ...entry, id, at: new Date().toISOString() });
  const all = await db.getAllFromIndex('history', 'by_at');
  const excess = all.length - HISTORY_MAX;
  if (excess > 0) {
    const tx = db.transaction('history', 'readwrite');
    await Promise.all([...all.slice(0, excess).map((h) => tx.store.delete(h.id)), tx.done]);
  }
}
export async function listHistory(kind?: HistoryEntry['kind']): Promise<HistoryEntry[]> {
  const all = await (await getDB()).getAllFromIndex('history', 'by_at');
  return all.reverse().filter((h) => !kind || h.kind === kind);
}
export async function clearHistory() {
  await (await getDB()).clear('history');
}
