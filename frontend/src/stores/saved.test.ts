import { _resetDB, listSaved } from '@/lib/db';
import { useSaved } from './saved';

describe('saved locations store', () => {
  beforeEach(async () => {
    _resetDB();
    await useSaved.getState().clearAll();
  });

  it('persists to IndexedDB and survives a reload', async () => {
    const s = useSaved.getState();
    await s.add({ name: 'Charminar', lat: 17.3616, lon: 78.4747, source: 'search', tags: ['heritage'] });
    expect(useSaved.getState().items).toHaveLength(1);
    // simulate a browser restart: drop in-memory state and reload from IndexedDB
    useSaved.setState({ items: [], loaded: false });
    _resetDB();
    await useSaved.getState().load();
    expect(useSaved.getState().items[0]).toMatchObject({ name: 'Charminar', tags: ['heritage'] });
    expect(useSaved.getState().findNear(17.36161, 78.47471)?.name).toBe('Charminar');
  });

  it('updates, removes and restores', async () => {
    const rec = await useSaved.getState().add({ name: 'A', lat: 1, lon: 2, source: 'map' });
    await useSaved.getState().update(rec.id, { note: 'hello' });
    expect((await listSaved())[0].note).toBe('hello');
    const removed = await useSaved.getState().remove(rec.id);
    expect(await listSaved()).toHaveLength(0);
    await useSaved.getState().restore(removed!);
    expect(await listSaved()).toHaveLength(1);
  });
});
