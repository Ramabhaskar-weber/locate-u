import { useQuery } from '@tanstack/react-query';
import { Clock, Compass, Crosshair, Globe2, Home, Info, Landmark, Map as MapIcon, MapPin, Settings, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDebounced } from '@/hooks';
import { indiaPlaceToSelection, useOpenOnMap } from '@/hooks/useOpenOnMap';
import { api } from '@/lib/api';
import { listHistory } from '@/lib/db';
import { formatPopulation } from '@/lib/format';
import { formatCoords, parseCoordinates } from '@/lib/geo';
import { useSaved } from '@/stores/saved';
import { cn, Kbd } from '../ui';

interface Item {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const openOnMap = useOpenOnMap();
  const saved = useSaved((s) => s.items);
  const dq = useDebounced(q.trim(), 180);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Instant suggestions come from the LOCAL India dataset (our own backend), never from public Nominatim.
  const local = useQuery({
    queryKey: ['india-search', dq],
    queryFn: ({ signal }) => api.indiaSearch(dq, undefined, signal),
    enabled: open && dq.length >= 2,
    staleTime: 60_000,
  });
  const history = useQuery({ queryKey: ['history'], queryFn: () => listHistory(), enabled: open });

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      navigate(to);
      onClose();
    };
    const out: Item[] = [];
    const term = q.trim();
    const coords = parseCoordinates(term);
    if (coords) {
      out.push({ id: 'coords', group: 'Coordinates', label: `Go to ${formatCoords(coords)}`, sub: 'Jump directly — no search needed', icon: <Crosshair className="h-4 w-4" />, run: () => { openOnMap({ kind: 'point', ...coords, zoom: 15 }); onClose(); } });
    }
    if (term.length >= 2 && !coords) {
      out.push({ id: 'world', group: 'Search', label: `Search the world for “${term}”`, sub: 'OpenStreetMap · Nominatim', icon: <Globe2 className="h-4 w-4" />, run: () => { navigate(`/map?q=${encodeURIComponent(term)}`); onClose(); } });
    }
    const r = local.data;
    r?.states.forEach((s) => out.push({ id: `st-${s.code}`, group: 'States & UTs', label: s.name, sub: `${s.type === 'state' ? 'State' : 'Union Territory'} · ${s.district_count} districts`, icon: <Landmark className="h-4 w-4" />, run: go(`/india/${s.code}`) }));
    r?.districts.forEach((d) => out.push({ id: `d-${d.id}`, group: 'Districts', label: d.name, sub: `District · ${d.state_code}`, icon: <Compass className="h-4 w-4" />, run: go(`/india/${d.state_code}?district=${encodeURIComponent(d.id)}`) }));
    r?.places.forEach((p) => out.push({ id: `p-${p.id}`, group: 'Cities & towns (India dataset)', label: p.name, sub: `${p.state_code} · ${formatPopulation(p.population)}`, icon: <MapPin className="h-4 w-4" />, run: () => { openOnMap(indiaPlaceToSelection(p)); onClose(); } }));
    const tl = term.toLowerCase();
    saved
      .filter((s) => tl && (s.name.toLowerCase().includes(tl) || s.tags.some((t) => t.toLowerCase().includes(tl))))
      .slice(0, 5)
      .forEach((s) => out.push({ id: `sv-${s.id}`, group: 'Saved', label: s.name, sub: s.address ?? formatCoords(s), icon: <Star className="h-4 w-4" />, run: () => { openOnMap({ kind: 'saved', lat: s.lat, lon: s.lon, name: s.name, ref: s.id, address: s.address ?? undefined }); onClose(); } }));
    if (!term) {
      (history.data ?? []).slice(0, 6).forEach((h) =>
        out.push({ id: `h-${h.id}`, group: 'Recent', label: h.label, sub: h.sublabel, icon: <Clock className="h-4 w-4" />, run: () => {
          if (h.kind === 'search') navigate(`/map?q=${encodeURIComponent(h.label)}`);
          else if (h.lat != null && h.lon != null) openOnMap({ kind: 'point', lat: h.lat, lon: h.lon, name: h.label, address: h.sublabel });
          onClose();
        } }),
      );
    }
    const pages: [string, string, ReactNode][] = [
      ['/', 'Home', <Home key="h" className="h-4 w-4" />],
      ['/map', 'World map', <MapIcon key="m" className="h-4 w-4" />],
      ['/india', 'India explorer', <Compass key="i" className="h-4 w-4" />],
      ['/saved', 'Saved places', <Star key="s" className="h-4 w-4" />],
      ['/settings', 'Settings', <Settings key="se" className="h-4 w-4" />],
      ['/about', 'Data sources & about', <Info key="a" className="h-4 w-4" />],
    ];
    pages.filter(([, l]) => !tl || l.toLowerCase().includes(tl)).forEach(([to, l, ic]) => out.push({ id: `nav-${to}`, group: 'Go to', label: l, icon: ic, run: go(to) }));
    return out;
  }, [q, local.data, history.data, saved, navigate, onClose, openOnMap]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;
  const groups: string[] = [];
  items.forEach((i) => !groups.includes(i.group) && groups.push(i.group));

  return createPortal(
    <div className="fixed inset-0 z-[2200] flex items-start justify-center p-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search and commands">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-xl overflow-hidden rounded-3xl animate-sheet-up">
        <div className="flex items-center gap-3 border-b hairline px-4">
          <Globe2 className="h-5 w-5 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run(); }
            }}
            placeholder="Search places, states, districts, coordinates…"
            aria-label="Search"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `pal-${items[active].id}` : undefined}
            className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[rgb(var(--muted))]"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id="palette-list" ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto p-2 scroll-thin">
          {local.isFetching && dq.length >= 2 && !local.data && <li className="px-3 py-2 text-[13px] text-muted">Searching the India dataset…</li>}
          {local.isError && <li className="px-3 py-2 text-[13px] text-red-600">{(local.error as Error).message}</li>}
          {groups.map((g) => (
            <li key={g} role="presentation">
              <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{g}</div>
              <ul role="group" aria-label={g}>
                {items.map((it, idx) =>
                  it.group !== g ? null : (
                    <li
                      key={it.id}
                      id={`pal-${it.id}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={idx === active}
                      onMouseEnter={() => setActive(idx)}
                      onClick={it.run}
                      className={cn('flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5', idx === active && 'bg-brand-600 text-white')}
                    >
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', idx === active ? 'bg-white/20' : 'bg-black/[0.05] dark:bg-white/[0.07]')}>{it.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{it.label}</span>
                        {it.sub && <span className={cn('block truncate text-[12px]', idx === active ? 'text-white/80' : 'text-muted')}>{it.sub}</span>}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No matches. Press Enter to search the world.</li>}
        </ul>
        <div className="flex items-center gap-3 border-t hairline px-4 py-2 text-[11px] text-muted">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span>
          <span><Kbd>Enter</Kbd> open</span>
          <span className="ml-auto">India suggestions: local dataset · World: Nominatim on Enter</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
