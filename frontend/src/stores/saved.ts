/**
 * Saved locations: IndexedDB is the source of truth on the device. When the
 * user is signed in AND has turned sync on, changes are pushed to the backend.
 */
import { create } from 'zustand';
import { api } from '@/lib/api';
import * as db from '@/lib/db';
import type { SavedLocation } from '@/lib/db';
import { uid } from '@/lib/format';
import { useAuth } from './auth';
import { useSettings } from './settings';

type NewSaved = Omit<SavedLocation, 'id' | 'created_at' | 'updated_at' | 'tags'> & { tags?: string[] };

interface SavedState {
  items: SavedLocation[];
  loaded: boolean;
  syncing: boolean;
  lastSync: string | null;
  syncError: string | null;
  load: () => Promise<void>;
  add: (item: NewSaved) => Promise<SavedLocation>;
  update: (id: string, patch: Partial<SavedLocation>) => Promise<void>;
  remove: (id: string) => Promise<SavedLocation | undefined>;
  restore: (item: SavedLocation) => Promise<void>;
  importMany: (items: NewSaved[]) => Promise<number>;
  clearAll: () => Promise<void>;
  sync: () => Promise<void>;
  findNear: (lat: number, lon: number) => SavedLocation | undefined;
}

const canSync = () => !!useAuth.getState().token && useSettings.getState().syncEnabled;

export const useSaved = create<SavedState>()((set, get) => ({
  items: [],
  loaded: false,
  syncing: false,
  lastSync: null,
  syncError: null,
  load: async () => {
    try {
      set({ items: await db.listSaved(), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  add: async (item) => {
    const now = new Date().toISOString();
    const rec: SavedLocation = { ...item, tags: item.tags ?? [], id: uid(), created_at: now, updated_at: now };
    await db.putSaved(rec);
    set({ items: [rec, ...get().items] });
    if (canSync()) get().sync();
    return rec;
  },
  update: async (id, patch) => {
    const cur = get().items.find((i) => i.id === id);
    if (!cur) return;
    const rec = { ...cur, ...patch, id, updated_at: new Date().toISOString() };
    await db.putSaved(rec);
    set({ items: get().items.map((i) => (i.id === id ? rec : i)) });
    if (canSync()) get().sync();
  },
  remove: async (id) => {
    const cur = get().items.find((i) => i.id === id);
    if (!cur) return undefined;
    if (cur.synced_at) {
      // keep a tombstone so the deletion can be pushed to the server
      await db.putSaved({ ...cur, deleted: true, updated_at: new Date().toISOString() });
    } else {
      await db.removeSaved(id);
    }
    set({ items: get().items.filter((i) => i.id !== id) });
    if (canSync()) get().sync();
    return cur;
  },
  restore: async (item) => {
    const rec = { ...item, deleted: false, updated_at: new Date().toISOString() };
    await db.putSaved(rec);
    set({ items: [rec, ...get().items.filter((i) => i.id !== item.id)] });
  },
  importMany: async (items) => {
    const now = new Date().toISOString();
    const recs = items.map((i) => ({ ...i, tags: i.tags ?? [], id: uid(), created_at: now, updated_at: now }) as SavedLocation);
    await db.putManySaved(recs);
    set({ items: [...recs, ...get().items] });
    if (canSync()) get().sync();
    return recs.length;
  },
  clearAll: async () => {
    await db.clearSaved();
    set({ items: [] });
  },
  sync: async () => {
    if (!canSync() || get().syncing) return;
    set({ syncing: true, syncError: null });
    try {
      const all = await db.listSavedIncludingDeleted();
      for (const t of all.filter((i) => i.deleted)) {
        await api.deleteSavedRemote(t.id).catch(() => undefined);
        await db.removeSaved(t.id);
      }
      const live = all.filter((i) => !i.deleted);
      const server = await api.syncSaved(
        live.map(({ id, name, lat, lon, address, note, tags, collection, color, source, source_ref }) => ({
          id, name, lat, lon, address, note, tags, collection, color, source, source_ref,
        })),
      );
      const now = new Date().toISOString();
      const merged: SavedLocation[] = server.map((s) => ({
        ...s,
        source: (s.source as SavedLocation['source']) ?? 'map',
        synced_at: now,
      }));
      await db.putManySaved(merged);
      set({ items: await db.listSaved(), lastSync: now });
    } catch (e) {
      set({ syncError: (e as Error).message });
    } finally {
      set({ syncing: false });
    }
  },
  findNear: (lat, lon) => get().items.find((i) => Math.abs(i.lat - lat) < 1e-4 && Math.abs(i.lon - lon) < 1e-4),
}));
