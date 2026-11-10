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
  Wallet,
  Languages,
  Menu,
  X,
  User as UserIcon,
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
  { to: '/map', label: 'World Map', short: 'Map', icon: MapIcon },
  { to: '/transport', label: 'Transport Hub', short: 'Rides', icon: Car },
  { to: '/language', label: 'Language Assistant', short: 'Language', icon: Languages },
  { to: '/explore', label: 'Travel Guide & AI', short: 'Guide', icon: Sparkles },
  { to: '/planner', label: 'Wallet & Trips', short: 'Wallet', icon: Wallet },
  { to: '/india', label: 'India Explorer', short: 'India', icon: Compass },
  { to: '/saved', label: 'Saved Places', short: 'Saved', icon: Star },
  { to: '/settings', label: 'Settings & Profile', short: 'Profile', icon: Settings },
  { to: '/about', label: 'Data & About', short: 'About', icon: Info },
];

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/explore', label: 'Guide', icon: Sparkles },
  { to: '/transport', label: 'Rides', icon: Car },
  { to: '/language', label: 'Language', icon: Languages },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon;
  const label = `Theme: ${theme}. Switch to ${next[theme]}`;
  return (
    <button
      type="button"
      onClick={() => set({ theme: next[theme] })}
      aria-label={label}
      title={label}
      className={cn(
        'surface-hover inline-flex items-center gap-3 rounded-2xl text-sm font-medium',
        compact ? 'h-9 w-9 justify-center' : 'h-10 w-full px-3',
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {!compact && <span className="capitalize">{theme} theme</span>}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const displayName = user?.display_name || profile.name || 'Traveler';
  const avatarUrl = profile.avatarUrl || (user as any)?.avatar_url || null;

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[3000] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="aurora" aria-hidden>
        <span />
      </div>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[256px] shrink-0 p-3 lg:block">
        <nav aria-label="Main" className="glass flex h-full flex-col rounded-4xl p-3 overflow-y-auto scroll-thin">
          <div className="px-2 pb-4 pt-2">
            <Logo />
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="mb-3 flex h-10 shrink-0 items-center gap-2 rounded-2xl bg-black/[0.04] px-3 text-left text-sm text-muted transition hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
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
                  <n.icon className="h-[18px] w-[18px] shrink-0" />
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
              to="/settings"
              className="surface-hover flex h-11 items-center gap-3 rounded-2xl px-3 text-sm"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-brand-500/40"
                />
              ) : (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold leading-tight">{displayName}</div>
                <div className="truncate text-[10px] text-muted">
                  {user ? 'Account Verified' : 'Settings & Profile'}
                </div>
              </div>
            </NavLink>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col max-w-full overflow-x-hidden">
        <OfflineBanner />
        {!fullBleed && (
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
            <div className="glass flex h-12 flex-1 items-center justify-between rounded-full pl-3 pr-1.5 shadow-sm">
              <Logo compact />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Search"
                  className="surface-hover grid h-9 w-9 place-items-center rounded-full"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
                <ThemeToggle compact />
                <NavLink
                  to="/settings"
                  aria-label="Account & Settings"
                  className="surface-hover grid h-9 w-9 place-items-center rounded-full"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-brand-500/40"
                    />
                  ) : (
                    <UserIcon className="h-[18px] w-[18px]" />
                  )}
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Open navigation menu"
                  aria-expanded={mobileMenuOpen}
                  className="surface-hover grid h-9 w-9 place-items-center rounded-full"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </header>
        )}

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <nav
              aria-label="Mobile menu"
              className="glass-strong absolute right-2.5 top-[max(3.75rem,env(safe-area-inset-top))] w-72 max-w-[calc(100vw-1.25rem)] rounded-3xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between border-b hairline pb-2.5">
                <NavLink
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-brand-500/40"
                    />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{displayName}</div>
                    <div className="text-[10px] text-brand-600 dark:text-brand-300 font-semibold">
                      Tap to edit photo & profile →
                    </div>
                  </div>
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full p-1 text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="space-y-1 max-h-[65dvh] overflow-y-auto pr-1">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex h-10 items-center gap-3 rounded-2xl px-3 text-xs font-semibold transition-colors',
                          isActive ? 'bg-brand-600 text-white shadow-sm' : 'surface-hover',
                        )
                      }
                    >
                      <n.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{n.label}</span>
                      {n.to === '/saved' && savedCount > 0 && (
                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] dark:bg-white/15">
                          {savedCount}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        <main
          id="main"
          className={cn(
            'flex-1 w-full max-w-full overflow-x-hidden',
            fullBleed
              ? 'relative'
              : 'px-2.5 pb-24 pt-1.5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6',
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-[1100] px-1.5 pb-[max(0.4rem,var(--safe-bottom))] lg:hidden pointer-events-auto"
      >
        <ul className="glass-strong mx-auto flex max-w-md items-center justify-around rounded-full p-1 shadow-lg border border-black/10 dark:border-white/10">
          {MOBILE_NAV.map((n) => (
            <li key={n.to} className="flex-1 text-center min-w-0">
              <NavLink
                to={n.to}
                end={n.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-colors px-0.5',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-muted hover:text-foreground',
                  )
                }
              >
                <n.icon className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-[54px] leading-tight mt-0.5">{n.label}</span>
              </NavLink>
            </li>
          ))}
          <li className="flex-1 text-center min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={cn(
                'flex h-11 w-full flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-colors px-0.5',
                mobileMenuOpen ? 'bg-brand-600 text-white shadow-sm' : 'text-muted hover:text-foreground',
              )}
            >
              <Menu className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[54px] leading-tight mt-0.5">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
      <UpdatePrompt />
    </div>
  );
}
