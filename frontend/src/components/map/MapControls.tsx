import { Crosshair, Expand, Layers, LocateFixed, Minimize, Minus, Plus, RotateCcw, Ruler, Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks';
import { formatCoords, formatDistance, pathLengthKm } from '@/lib/geo';
import type { AppConfig } from '@/lib/schemas';
import { useMap } from '@/stores/map';
import { useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { Button, cn, Glass, IconButton, Switch } from '../ui';

/** Map buttons. Zoom uses the DOM-level Leaflet map via a custom event to stay decoupled. */
export function MapControls({ config, onZoom }: { config?: AppConfig; onZoom: (d: 1 | -1) => void }) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const { measuring, setMeasuring, flyTo, select, fitBbox } = useMap();
  const geo = useGeolocation();

  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const locate = async () => {
    const pos = await geo.locate();
    if (pos) {
      flyTo(pos.coords.latitude, pos.coords.longitude, 15);
      select({ kind: 'gps', lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your location' }, { fly: false });
    } else {
      toast('Location unavailable', { tone: 'error', description: geo.error ?? 'Permission denied or position unavailable. You can still search or tap the map.' }, 7000);
    }
  };

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <Glass strong className="flex flex-col overflow-hidden rounded-2xl p-1">
        <IconButton label="Zoom in" variant="ghost" onClick={() => onZoom(1)}><Plus className="h-5 w-5" /></IconButton>
        <div className="mx-2 h-px bg-black/10 dark:bg-white/10" />
        <IconButton label="Zoom out" variant="ghost" onClick={() => onZoom(-1)}><Minus className="h-5 w-5" /></IconButton>
      </Glass>
      <Glass strong className="flex flex-col gap-1 rounded-2xl p-1">
        <IconButton
          label={geo.status === 'denied' ? 'Location blocked — see browser settings' : 'Show my location'}
          variant="ghost"
          loading={geo.status === 'locating'}
          onClick={locate}
          className={cn(geo.status === 'denied' && 'text-red-500')}
        >
          {geo.status === 'granted' ? <LocateFixed className="h-5 w-5 text-brand-600 dark:text-brand-300" /> : <Crosshair className="h-5 w-5" />}
        </IconButton>
        <IconButton label="Map layers" variant="ghost" active={layersOpen} onClick={() => setLayersOpen((o) => !o)}><Layers className="h-5 w-5" /></IconButton>
        <IconButton label={measuring ? 'Stop measuring' : 'Measure distance'} variant="ghost" active={measuring} onClick={() => setMeasuring(!measuring)}><Ruler className="h-5 w-5" /></IconButton>
        <IconButton label="Reset view to India" variant="ghost" onClick={() => fitBbox([68.1, 6.7, 97.4, 35.7])}><RotateCcw className="h-5 w-5" /></IconButton>
        {document.fullscreenEnabled && (
          <IconButton label={fs ? 'Exit full screen' : 'Full screen'} variant="ghost" onClick={() => (fs ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>
            {fs ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
          </IconButton>
        )}
      </Glass>
      {layersOpen && <LayerPanel config={config} onClose={() => setLayersOpen(false)} />}
    </div>
  );
}

export function LayerPanel({ config, onClose }: { config?: AppConfig; onClose: () => void }) {
  const { baseLayer, overlays, set, toggleOverlay } = useSettings();
  const focus = useMap((s) => s.focusState);
  const bases = config?.map.layers.filter((l) => l.kind === 'base') ?? [];
  return (
    <Glass strong className="w-72 rounded-3xl p-4 animate-fade-up" role="dialog" aria-label="Map layers">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Map layers</h3>
        <IconButton label="Close layers" size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></IconButton>
      </div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Base map">
        {(bases.length ? bases : [{ id: 'osm', name: 'OpenStreetMap' }]).map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={baseLayer === l.id}
            onClick={() => set({ baseLayer: l.id })}
            className={cn('rounded-2xl border px-3 py-2.5 text-left text-[13px] font-medium transition', baseLayer === l.id ? 'border-brand-500 bg-brand-500/10' : 'hairline surface-hover')}
          >
            {l.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">Street-map styles only. Satellite imagery needs a separately licensed provider and is not included.</p>
      <div className="mt-3 border-t hairline pt-2">
        <Switch label="State & UT boundaries" checked={overlays.states} onChange={() => toggleOverlay('states')} />
        <Switch label="District boundaries" description={focus ? `Showing ${focus}` : 'Pick a state in India explorer'} checked={overlays.districts} onChange={() => toggleOverlay('districts')} />
        <Switch label="Saved places" checked={overlays.saved} onChange={() => toggleOverlay('saved')} />
      </div>
    </Glass>
  );
}

export function CoordinateReadout() {
  const { cursor, zoom } = useMap();
  const fmt = useSettings((s) => s.coordFormat);
  if (!cursor) return null;
  return (
    <div className="glass pointer-events-none hidden rounded-full px-3 py-1.5 font-mono text-[12px] tabular-nums md:block" aria-hidden>
      {formatCoords(cursor, fmt)} · z{zoom}
    </div>
  );
}

export function MeasureBar() {
  const { measuring, measurePoints, undoMeasurePoint, clearMeasure, setMeasuring } = useMap();
  const units = useSettings((s) => s.units);
  if (!measuring) return null;
  const km = pathLengthKm(measurePoints);
  return (
    <Glass strong className="pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 animate-fade-up" role="status">
      <Ruler className="h-4 w-4 text-rose-600" />
      <span className="text-sm">
        {measurePoints.length < 2 ? 'Tap the map to add points' : <><b className="tabular-nums">{formatDistance(km, units)}</b> <span className="text-muted">· {measurePoints.length} points · straight-line</span></>}
      </span>
      <IconButton label="Undo last point" size="sm" variant="ghost" onClick={undoMeasurePoint} disabled={!measurePoints.length}><Undo2 className="h-4 w-4" /></IconButton>
      <Button size="sm" variant="ghost" onClick={clearMeasure} disabled={!measurePoints.length}>Clear</Button>
      <Button size="sm" variant="primary" onClick={() => setMeasuring(false)}>Done</Button>
    </Glass>
  );
}
