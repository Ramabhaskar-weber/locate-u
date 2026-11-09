import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Crosshair,
  Database,
  Download,
  HardDrive,
  LogOut,
  Map as MapIcon,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  Utensils,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AccountPanel } from '@/components/account/AccountPanel';
import { Badge, Button, Card, Segmented, Select, Switch } from '@/components/ui';
import { useGeolocation, useInstallPrompt } from '@/hooks';
import { useConfig } from '@/hooks/useConfig';
import { clearHistory, clearResponses, countResponses } from '@/lib/db';
import { useAuth } from '@/stores/auth';
import { useMap } from '@/stores/map';
import { useProfile } from '@/stores/profile';
import { useSettings, type Theme } from '@/stores/settings';
import { toast } from '@/stores/toast';

function useStorageEstimate() {
  const [est, setEst] = useState<{ usage?: number; quota?: number; persisted?: boolean }>({});
  const refresh = async () => {
    try {
      const e = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setEst({ usage: e?.usage, quota: e?.quota, persisted });
    } catch {
      /* unsupported */
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  return { est, refresh };
}

const mb = (b?: number) =>
  b == null ? '—' : b < 1e6 ? `${(b / 1e3).toFixed(0)} KB` : `${(b / 1e6).toFixed(1)} MB`;

export default function SettingsPage() {
  const s = useSettings();
  const { profile, updateProfile } = useProfile();
  const { user: authUser, logout } = useAuth();
  const mapUser = useMap((st) => st.user);
  const geo = useGeolocation();
  const { data: config } = useConfig();
  const qc = useQueryClient();
  const install = useInstallPrompt();
  const { est, refresh } = useStorageEstimate();
  const cached = useQuery({ queryKey: ['cached-count'], queryFn: countResponses });

  const [travelAlerts, setTravelAlerts] = useState<boolean>(() => {
    return localStorage.getItem('locate_u:travel_alerts') !== 'false';
  });

  useEffect(() => {
    if (location.hash === '#account')
      document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const clearCache = async () => {
    await clearResponses();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('locate-u-')).map((k) => caches.delete(k)));
    }
    qc.clear();
    cached.refetch();
    refresh();
    toast('Offline data cleared', { tone: 'success', description: 'Saved places were kept.' });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12 w-full max-w-full overflow-x-hidden">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-4xl">Settings & Account Profile</h1>
          <p className="mt-1 text-sm text-muted sm:text-[15px]">
            Manage your account, personal travel preferences, location permissions, appearance, and offline data.
          </p>
        </div>
        {authUser && (
          <Button
            size="sm"
            variant="secondary"
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => {
              logout();
              toast('Signed out of your account');
            }}
          >
            Sign Out
          </Button>
        )}
      </header>

      <div id="account">
        <Card
          icon={<UserRound className="h-5 w-5" />}
          title="Account Profile & Authentication"
          subtitle="Sign in with phone number or email, manage your profile photo, home city, food preferences, and cloud sync."
        >
          <AccountPanel />
        </Card>
      </div>

      <Card
        icon={<Utensils className="h-5 w-5" />}
        title="Personal Travel & Food Preferences"
        subtitle="Used across the Homepage, Travel Guide, and Language Assistant."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Home City</label>
            <input
              type="text"
              value={profile.homeCity}
              onChange={(e) => updateProfile({ homeCity: e.target.value })}
              placeholder="e.g. Kakinada, Hyderabad"
              className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-3.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Food Preferences</label>
            <select
              value={profile.foodPreference}
              onChange={(e) => updateProfile({ foodPreference: e.target.value as any })}
              className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900"
            >
              <option value="Vegetarian">Vegetarian</option>
              <option value="Non-Veg">Non-Veg</option>
              <option value="Vegan">Vegan</option>
              <option value="Jain">Jain</option>
            </select>
          </div>
        </div>
      </Card>

      <Card icon={<Palette className="h-5 w-5" />} title="Appearance & Theme">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">Color Theme</span>
          <Segmented<Theme>
            label="Theme"
            value={s.theme}
            onChange={(v) => s.set({ theme: v })}
            options={[
              { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
              { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
              { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>
        <Switch
          label="Dim map tiles in dark mode"
          description="Softens bright street maps at night without changing map data."
          checked={s.dimMapInDark}
          onChange={(v) => s.set({ dimMapInDark: v })}
        />
      </Card>

      <Card
        icon={<Crosshair className="h-5 w-5" />}
        title="Location Permissions"
        subtitle="Explicit browser geolocation permission status and live coordinate readout."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>Permission Status:</span>
              <Badge
                tone={
                  geo.status === 'granted'
                    ? 'green'
                    : geo.status === 'denied'
                      ? 'red'
                      : 'amber'
                }
              >
                {geo.status.toUpperCase()}
              </Badge>
            </div>
            {mapUser ? (
              <p className="font-mono text-xs text-muted">
                Active Coordinates: {mapUser.lat.toFixed(5)}°N, {mapUser.lon.toFixed(5)}°E
              </p>
            ) : (
              <p className="text-xs text-muted">
                {geo.error || 'Location is only requested when you tap the button.'}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="primary"
            loading={geo.status === 'locating'}
            icon={<Crosshair className="h-4 w-4" />}
            onClick={() => geo.locate()}
          >
            {mapUser ? 'Refresh GPS Location' : 'Request Location Permission'}
          </Button>
        </div>
      </Card>

      <Card icon={<MapIcon className="h-5 w-5" />} title="Map, Units & Language Preferences">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Default map style"
            value={s.baseLayer}
            onChange={(e) => s.set({ baseLayer: e.target.value })}
          >
            {(config?.map.layers.filter((l) => l.kind === 'base') ?? [{ id: 'osm', name: 'OpenStreetMap' }]).map(
              (l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ),
            )}
          </Select>
          <Select
            label="Coordinate format"
            value={s.coordFormat}
            onChange={(e) => s.set({ coordFormat: e.target.value as typeof s.coordFormat })}
          >
            <option value="dd">Decimal degrees (17.38500, 78.48670)</option>
            <option value="dms">Degrees, minutes, seconds</option>
            <option value="ddm">Degrees + decimal minutes</option>
          </Select>
        </div>
      </Card>

      <Card icon={<Bell className="h-5 w-5" />} title="Notifications & Travel Advisories">
        <Switch
          label="Show weather & seasonal festival advisories"
          description="Displays local weather conditions and regional festival tips on destination cards."
          checked={travelAlerts}
          onChange={(v) => {
            setTravelAlerts(v);
            localStorage.setItem('locate_u:travel_alerts', String(v));
            toast(v ? 'Travel advisories enabled' : 'Travel advisories muted');
          }}
        />
      </Card>

      <Card icon={<HardDrive className="h-5 w-5" />} title="Offline & Storage">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
            <div className="text-[11px] uppercase text-muted">Used</div>
            <div className="font-semibold tabular-nums">{mb(est.usage)}</div>
          </div>
          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
            <div className="text-[11px] uppercase text-muted">Cached items</div>
            <div className="font-semibold tabular-nums">{cached.data ?? '—'}</div>
          </div>
          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
            <div className="text-[11px] uppercase text-muted">Persistent</div>
            <div className="font-semibold">{est.persisted == null ? '—' : est.persisted ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" icon={<Database className="h-4 w-4" />} onClick={clearCache}>
            Clear offline cache
          </Button>
          <Button
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              await clearHistory();
              qc.invalidateQueries({ queryKey: ['recent-history'] });
              toast('History cleared', { tone: 'success' });
            }}
          >
            Clear history
          </Button>
          {install.canInstall && !install.installed && (
            <Button size="sm" variant="primary" icon={<Download className="h-4 w-4" />} onClick={install.install}>
              Install app
            </Button>
          )}
        </div>
      </Card>

      <Card icon={<ShieldCheck className="h-5 w-5" />} title="Privacy, Security & Application Info">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-muted">
          <li>
            <strong>Application:</strong> {config?.app_name ?? 'Locate U'} (India-First OpenStreetMap Travel Companion).
          </li>
          <li>
            <strong>Location Privacy:</strong> Coordinates are requested only on explicit user action and are never shared with third parties unless you launch an external navigation or ride link.
          </li>
        </ul>
      </Card>
    </div>
  );
}
