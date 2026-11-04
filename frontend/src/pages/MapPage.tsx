import { useState } from 'react';
import { CoordinateReadout, MapControls, MeasureBar } from '@/components/map/MapControls';
import { leafletRef, MapView } from '@/components/map/MapView';
import { SearchPanel } from '@/components/map/SearchPanel';
import { LocationCard } from '@/components/location/LocationCard';
import { Glass } from '@/components/ui';
import { useHotkey } from '@/hooks';
import { useConfig } from '@/hooks/useConfig';
import type { NearbyItem } from '@/lib/schemas';
import { useMap } from '@/stores/map';

export default function MapPage() {
  const { data: config } = useConfig();
  const selection = useMap((s) => s.selection);
  const select = useMap((s) => s.select);
  const [nearby, setNearby] = useState<NearbyItem[]>([]);
  const close = () => {
    select(null);
    setNearby([]);
  };
  useHotkey('Escape', close);
  const zoom = (d: 1 | -1) => (d > 0 ? leafletRef.current?.zoomIn() : leafletRef.current?.zoomOut());

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden lg:h-[100dvh]">
      <h1 className="sr-only">World map</h1>
      <div className="absolute inset-0 lg:inset-3 lg:overflow-hidden lg:rounded-4xl lg:shadow-lift">
        <MapView config={config} extraMarkers={nearby.map((n) => ({ id: n.id, lat: n.lat, lon: n.lon, label: n.name ?? n.kind ?? 'Feature' }))} />
      </div>

      {/* Floating UI layer */}
      <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col p-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:p-6">
        <div className="flex items-start gap-3">
          <SearchPanel />
          <div className={selection ? 'ml-auto lg:mr-[412px]' : 'ml-auto'}><MapControls config={config} onZoom={zoom} /></div>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pb-20 lg:pb-0">
          <CoordinateReadout />
          <div className="mx-auto"><MeasureBar /></div>
        </div>
      </div>

      {selection && (
        <Glass
          strong
          as="aside"
          key={`${selection.lat},${selection.lon},${selection.ref ?? ''}`}
          className="absolute inset-x-2 bottom-[5.25rem] z-[1050] max-h-[58dvh] overflow-hidden rounded-4xl animate-sheet-up lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-[6.5rem] lg:max-h-none lg:w-[400px]"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20 lg:hidden" aria-hidden />
          <LocationCard sel={selection} config={config} onClose={close} onNearby={setNearby} />
        </Glass>
      )}
    </div>
  );
}
