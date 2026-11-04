import { create } from 'zustand';
import type { LatLon } from '@/lib/geo';
import type { GeoPlace } from '@/lib/schemas';

export type SelectionKind = 'search' | 'point' | 'gps' | 'india' | 'saved';

export interface Selection extends LatLon {
  kind: SelectionKind;
  name?: string;
  address?: string;
  ref?: string; // India place id, OSM id or saved id
  bbox?: number[] | null;
  stateCode?: string;
  zoom?: number;
}

export type ViewRequest =
  | { type: 'fly'; lat: number; lon: number; zoom?: number; nonce: number }
  | { type: 'bounds'; bbox: number[]; nonce: number };

export interface UserLocation extends LatLon {
  accuracy: number;
  at: number;
}

interface MapState {
  selection: Selection | null;
  view: ViewRequest | null;
  results: GeoPlace[];
  user: UserLocation | null;
  measuring: boolean;
  measurePoints: LatLon[];
  focusState: string | null;
  cursor: LatLon | null;
  zoom: number;
  select: (s: Selection | null, opts?: { fly?: boolean }) => void;
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  fitBbox: (bbox: number[]) => void;
  setResults: (r: GeoPlace[]) => void;
  setUser: (u: UserLocation | null) => void;
  setMeasuring: (on: boolean) => void;
  addMeasurePoint: (p: LatLon) => void;
  undoMeasurePoint: () => void;
  clearMeasure: () => void;
  setFocusState: (code: string | null) => void;
  setCursor: (p: LatLon | null) => void;
  setZoom: (z: number) => void;
}

let nonce = 0;

export const useMap = create<MapState>()((set, get) => ({
  selection: null,
  view: null,
  results: [],
  user: null,
  measuring: false,
  measurePoints: [],
  focusState: null,
  cursor: null,
  zoom: 5,
  select: (s, opts = {}) => {
    set({ selection: s });
    if (s && opts.fly !== false) {
      if (s.bbox && s.bbox.length === 4 && s.kind === 'search') get().fitBbox(s.bbox);
      else get().flyTo(s.lat, s.lon, s.zoom ?? Math.max(get().zoom, 13));
    }
  },
  flyTo: (lat, lon, zoom) => set({ view: { type: 'fly', lat, lon, zoom, nonce: ++nonce } }),
  fitBbox: (bbox) => set({ view: { type: 'bounds', bbox, nonce: ++nonce } }),
  setResults: (results) => set({ results }),
  setUser: (user) => set({ user }),
  setMeasuring: (measuring) => set({ measuring, measurePoints: measuring ? get().measurePoints : [] }),
  addMeasurePoint: (p) => set({ measurePoints: [...get().measurePoints, p] }),
  undoMeasurePoint: () => set({ measurePoints: get().measurePoints.slice(0, -1) }),
  clearMeasure: () => set({ measurePoints: [] }),
  setFocusState: (focusState) => set({ focusState }),
  setCursor: (cursor) => set({ cursor }),
  setZoom: (zoom) => set({ zoom }),
}));
