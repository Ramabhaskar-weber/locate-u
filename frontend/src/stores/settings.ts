import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CoordFormat, Units } from '@/lib/geo';

export type Theme = 'system' | 'light' | 'dark';

export interface SettingsState {
  theme: Theme;
  units: Units;
  coordFormat: CoordFormat;
  baseLayer: string;
  overlays: { states: boolean; districts: boolean; saved: boolean };
  dimMapInDark: boolean;
  geocodeLang: string;
  restrictSearchToIndia: boolean;
  syncEnabled: boolean;
  onboarded: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'toggleOverlay'>>) => void;
  toggleOverlay: (k: keyof SettingsState['overlays']) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      units: 'metric',
      coordFormat: 'dd',
      baseLayer: 'osm',
      overlays: { states: false, districts: true, saved: true },
      dimMapInDark: true,
      geocodeLang: 'en',
      restrictSearchToIndia: false,
      syncEnabled: false,
      onboarded: false,
      set: (patch) => set(patch),
      toggleOverlay: (k) => set((s) => ({ overlays: { ...s.overlays, [k]: !s.overlays[k] } })),
    }),
    { name: 'locate-u-settings', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

export function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme: Theme, dim = true) {
  const root = document.documentElement;
  const dark = resolveDark(theme);
  root.classList.toggle('dark', dark);
  root.classList.toggle('map-dim-off', !dim);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0b1220' : '#f4f6fb'));
}
