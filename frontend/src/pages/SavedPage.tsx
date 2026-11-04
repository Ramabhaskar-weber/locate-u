import { Cloud, Download, FolderOpen, Map as MapIcon, MoreHorizontal, Pencil, Search, Star, Tag, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SaveDialog } from '@/components/location/SaveDialog';
import { Badge, Button, cn, EmptyState, Glass, IconButton, Input, Modal, Segmented, Select } from '@/components/ui';
import { useOpenOnMap } from '@/hooks/useOpenOnMap';
import type { SavedLocation } from '@/lib/db';
import { download, exportSaved, parseImport, type ExportFormat } from '@/lib/exporters';
import { timeAgo } from '@/lib/format';
import { formatCoords, formatDistance, haversineKm } from '@/lib/geo';
import { useAuth } from '@/stores/auth';
import { useMap } from '@/stores/map';
import { useSaved } from '@/stores/saved';
import { useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';

type Sort = 'recent' | 'name' | 'distance';

export default function SavedPage() {
  const { items, loaded, remove, restore, importMany, clearAll, syncing, lastSync, syncError, sync } = useSaved();
  const user = useMap((s) => s.user);
  const { units, coordFormat, syncEnabled } = useSettings();
  const token = useAuth((s) => s.token);
  const openOnMap = useOpenOnMap();
  const [q, setQ] = useState('');
  const [collection, setCollection] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [editing, setEditing] = useState<SavedLocation | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const collections = useMemo(() => Array.from(new Set(items.map((i) => i.collection).filter(Boolean))) as string[], [items]);
  const tags = useMemo(() => Array.from(new Set(items.flatMap((i) => i.tags))).sort(), [items]);
  const list = useMemo(() => {
    const t = q.toLowerCase();
    const l = items.filter(
      (i) =>
        (!t || i.name.toLowerCase().includes(t) || (i.address ?? '').toLowerCase().includes(t) || (i.note ?? '').toLowerCase().includes(t)) &&
        (!collection || i.collection === collection) &&
        (!tag || i.tags.includes(tag)),
    );
    if (sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'distance' && user) l.sort((a, b) => haversineKm(user, a) - haversineKm(user, b));
    return l;
  }, [items, q, collection, tag, sort, user]);

  const onDelete = async (id: string) => {
    const r = await remove(id);
    if (r) toast(`Removed “${r.name}”`, { action: { label: 'Undo', run: () => restore(r) } }, 6000);
  };
  const doExport = (fmt: ExportFormat) => {
    const { content, mime, ext } = exportSaved(list, fmt);
    download(`locate-u-saved-${new Date().toISOString().slice(0, 10)}.${ext}`, content, mime);
    setExportOpen(false);
    toast(`Exported ${list.length} place${list.length === 1 ? '' : 's'}`, { tone: 'success' });
  };
  const onImport = async (f: File) => {
    try {
      if (f.size > 5 * 1024 * 1024) throw new Error('File is larger than 5 MB.');
      const { items: parsed, skipped } = parseImport(await f.text());
      const n = await importMany(parsed.map((p) => ({ ...p, source: 'import' as const })));
      toast(`Imported ${n} place${n === 1 ? '' : 's'}`, { tone: 'success', description: skipped ? `${skipped} entries skipped (invalid coordinates).` : undefined });
    } catch (e) {
      toast('Import failed', { tone: 'error', description: (e as Error).message }, 6000);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Saved places</h1>
          <p className="mt-1 text-[15px] text-muted">
            {items.length} place{items.length === 1 ? '' : 's'} stored on this device{token && syncEnabled ? ' · synced to your account' : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".json,.geojson,application/json,application/geo+json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          <Button size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Import</Button>
          <Button size="sm" icon={<Download className="h-4 w-4" />} disabled={!items.length} onClick={() => setExportOpen(true)}>Export</Button>
          {token && syncEnabled && <Button size="sm" icon={<Cloud className="h-4 w-4" />} loading={syncing} onClick={sync}>Sync now</Button>}
        </div>
      </header>

      {token && syncEnabled && (lastSync || syncError) && (
        <p className={cn('text-[13px]', syncError ? 'text-red-600' : 'text-muted')}>{syncError ? `Sync failed: ${syncError}` : `Last synced ${timeAgo(lastSync!)}`}</p>
      )}

      {items.length > 0 && (
        <Glass className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
          <div className="md:w-64"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search saved places" aria-label="Search saved places" leading={<Search className="h-4 w-4" />} className="h-10" /></div>
          {collections.length > 0 && (
            <div className="md:w-48">
              <Select label="Collection" hideLabel value={collection} onChange={(e) => setCollection(e.target.value)} className="h-10">
                <option value="">All collections</option>
                {collections.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
          )}
          {tags.length > 0 && (
            <div className="md:w-40">
              <Select label="Tag" hideLabel value={tag} onChange={(e) => setTag(e.target.value)} className="h-10">
                <option value="">All tags</option>
                {tags.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </div>
          )}
          <div className="md:ml-auto">
            <Segmented size="sm" label="Sort" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Recent' }, { value: 'name', label: 'A–Z' }, ...(user ? [{ value: 'distance' as Sort, label: 'Nearest' }] : [])]} />
          </div>
        </Glass>
      )}

      {!loaded ? null : items.length === 0 ? (
        <Glass>
          <EmptyState
            title="No saved places yet"
            description="Open the map, tap any spot or search result and press Save. You can also import a GeoJSON or Locate U export."
            icon={<Star className="h-6 w-6" />}
            action={<Link to="/map"><Button variant="primary" icon={<MapIcon className="h-4 w-4" />}>Open the map</Button></Link>}
          />
        </Glass>
      ) : list.length === 0 ? (
        <Glass><EmptyState title="No matches" description="No saved places match these filters." icon={<Search className="h-5 w-5" />} /></Glass>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((s) => (
            <li key={s.id}>
              <Glass className="flex h-full flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-black/5 dark:ring-white/10" style={{ background: s.color ?? '#f59e0b' }} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">{s.name}</h2>
                    <p className="truncate text-[13px] text-muted">{s.address ?? formatCoords(s, coordFormat)}</p>
                  </div>
                  <RowMenu onEdit={() => setEditing(s)} onDelete={() => onDelete(s.id)} />
                </div>
                {s.note && <p className="mt-2 line-clamp-2 text-[13px]">{s.note}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {s.collection && <Badge tone="brand"><FolderOpen className="h-3 w-3" /> {s.collection}</Badge>}
                  {s.tags.map((t) => <Badge key={t}><Tag className="h-3 w-3" /> {t}</Badge>)}
                  {user && <Badge tone="neutral">{formatDistance(haversineKm(user, s), units)} away</Badge>}
                  {s.synced_at && <Badge tone="green"><Cloud className="h-3 w-3" /> synced</Badge>}
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-[12px] text-muted">Saved {timeAgo(s.created_at)}</span>
                  <Button size="sm" variant="primary" icon={<MapIcon className="h-3.5 w-3.5" />} onClick={() => openOnMap({ kind: 'saved', lat: s.lat, lon: s.lon, name: s.name, ref: s.id, address: s.address ?? undefined, zoom: 15 })}>
                    View
                  </Button>
                </div>
              </Glass>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmClear(true)}>Delete all from this device</Button>
        </div>
      )}

      <SaveDialog open={!!editing} existing={editing ?? undefined} onClose={() => setEditing(null)} />
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title={`Export ${list.length} place${list.length === 1 ? '' : 's'}`}>
        <div className="grid grid-cols-2 gap-2">
          {([['json', 'Locate U JSON', 'Re-import later'], ['geojson', 'GeoJSON', 'GIS tools, geojson.io'], ['csv', 'CSV', 'Spreadsheets'], ['gpx', 'GPX', 'GPS & hiking apps']] as const).map(([f, l, d]) => (
            <button key={f} onClick={() => doExport(f)} className="rounded-2xl border hairline p-3 text-left surface-hover">
              <div className="text-sm font-semibold">{l}</div>
              <div className="text-[12px] text-muted">{d}</div>
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Delete all saved places?"
        footer={<><Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await clearAll(); setConfirmClear(false); toast('All saved places deleted from this device'); }}>Delete all</Button></>}
      >
        <p className="text-sm text-muted">This removes {items.length} places from this device. Export them first if you want a backup. Places already synced to your account remain there.</p>
      </Modal>
    </div>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconButton label="More actions" variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}><MoreHorizontal className="h-4 w-4" /></IconButton>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute right-0 z-20 mt-1 w-40 rounded-2xl p-1 animate-fade-in" role="menu">
            <button role="menuitem" onClick={() => { setOpen(false); onEdit(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm surface-hover"><Pencil className="h-4 w-4" /> Edit</button>
            <button role="menuitem" onClick={() => { setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 surface-hover"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
