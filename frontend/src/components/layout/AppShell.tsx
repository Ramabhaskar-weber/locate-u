import {
  Car,
  Compass,
  Home,
  Info,
  Map as MapIcon,
  Moon,
  Search,
  Settings,
  Star,
  Sun,
  SunMoon,
  Sparkles,
  Wallet
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useHotkey } from '@/hooks';
import { useAuth } from '@/stores/auth';
import { useSaved } from '@/stores/saved';
import { useSettings, type Theme } from '@/stores/settings';
import { useProfile } from '@/stores/profile';
import { cn, Kbd } from '../ui';
import { CommandPalette } from './CommandPalette';
import { OfflineBanner, Toaster, UpdatePrompt } from './Feedback';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'World map', short: 'Map', icon: MapIcon },
  { to: '/explore', label: 'Travel Guide & AI', short: 'Guide', icon: Sparkles },
  { to: '/transport', label: 'Transport Hub', short: 'Rides', icon: Car },
  { to: '/planner', label: 'Wallet & Trips', short: 'Wallet', icon: Wallet },
  { to: '/india', label: 'India explorer', short: 'India', icon: Compass },
  { to: '/saved', label: 'Saved places', short: 'Saved', icon: Star },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'Data & about', short: 'About', icon: Info },
];

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/explore', label: 'Guide', icon: Sparkles },
  { to: '/transport', label: 'Rides', icon: Car },
  { to: '/planner', label: 'Wallet', icon: Wallet },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon;
  const label = `Theme: ${theme}. Switch to ${next[theme]}`;
  return (
    <button
      onClick={() => set({ theme: next[theme] })}
      aria-label={label}
      title={label}
      className={cn(
        'surface-hover inline-flex items-center gap-3 rounded-2xl text-sm font-medium',
        compact ? 'h-10 w-10 justify-center' : 'h-10 w-full px-3',
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {!compact && <span className="capitalize">{theme} theme</span>}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const loc = useLocation();
  const fullBleed = loc.pathname.startsWith('/map');
  const savedCount = useSaved((s) => s.items.length);
  const user = useAuth((s) => s.user);
  const { profile } = useProfile();

  useHotkey('k', () => setPaletteOpen(true), { meta: true });
  useHotkey('/', (e) => {
    e.preventDefault();
    setPaletteOpen(true);
  });

  const displayName = profile.name || user?.display_name || 'Guest Explorer';

  return (
    <div className="flex min-h-[100dvh] w-full max-w-full overflow-x-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[3000] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="aurora" aria-hidden>
        <span />
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 p-3 lg:block">
        <nav aria-label="Main" className="glass flex h-full flex-col rounded-4xl p-3">
          <div className="px-2 pb-4 pt-2">
            <Logo />
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="mb-3 flex h-10 items-center gap-2 rounded-2xl bg-black/[0.04] px-3 text-left text-sm text-muted transition hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
          >
            <Search className="h-4 w-4" /> <span className="flex-1">Search...</span> <Kbd>Ctrl K</Kbd>
          </button>
          <ul className="space-y-0.5">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-600 text-white shadow-[0_6px_20px_-8px_rgb(31_95_224/.8)]'
                        : 'surface-hover',
                    )
                  }
                >
                  <n.icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 truncate">{n.label}</span>
                  {n.to === '/saved' && savedCount > 0 && (
                    <span className="rounded-full bg-black/10 px-2 text-[11px] tabular-nums dark:bg-white/15">
                      {savedCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-1 border-t hairline pt-3">
            <ThemeToggle />
            <NavLink
              to="/planner"
              className="surface-hover flex h-10 items-center gap-3 rounded-2xl px-3 text-sm"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-[11px] font-bold text-white">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate">{displayName}</span>
            </NavLink>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {/* Mobile top bar */}
        {!fullBleed && (
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
            <div className="glass flex h-12 flex-1 items-center justify-between rounded-full pl-4 pr-1.5 shadow-sm">
              <Logo compact />
              <div className="flex items-center">
                <button
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Search"
                  className="surface-hover grid h-10 w-10 place-items-center rounded-full"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
                <ThemeToggle compact />
              </div>
            </div>
          </header>
        )}
        <main
          id="main"
          className={cn(
            'flex-1 w-full max-w-full overflow-x-hidden',
            fullBleed
              ? 'relative'
              : 'px-3 pb-24 pt-2 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6',
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Tab Bar - Exactly 5 clean, non-overlapping items */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-[1100] px-2 pb-[max(0.6rem,var(--safe-bottom))] lg:hidden pointer-events-auto"
      >
        <ul className="glass-strong mx-auto flex max-w-md items-center justify-around rounded-full p-1 shadow-lg border border-black/10 dark:border-white/10">
          {MOBILE_NAV.map((n) => (
            <li key={n.to} className="flex-1 text-center">
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-colors px-1',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-muted hover:text-foreground',
                  )
                }
              >
                <n.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate max-w-[55px] leading-tight mt-0.5">{n.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
      <UpdatePrompt />
    </div>
  );
}
