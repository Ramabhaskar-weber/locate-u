import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Download, Globe2, HardDrive, Map as MapIcon, Monitor, Moon, Palette, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AccountPanel } from '@/components/account/AccountPanel';
import { Button, Card, Segmented, Select, Switch } from '@/components/ui';
import { useInstallPrompt } from '@/hooks';
import { useConfig } from '@/hooks/useConfig';
import { clearHistory, clearResponses, countResponses } from '@/lib/db';
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

const mb = (b?: number) => (b == null ? '—' : b < 1e6 ? `${(b / 1e3).toFixed(0)} KB` : `${(b / 1e6).toFixed(1)} MB`);

export default function SettingsPage() {
  const s = useSettings();
  const { data: config } = useConfig();
  const qc = useQueryClient();
  const install = useInstallPrompt();
  const { est, refresh } = useStorageEstimate();
  const cached = useQuery({ queryKey: ['cached-count'], queryFn: countResponses });

  useEffect(() => {
    if (location.hash === '#account') document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
        <p className="mt-1 text-[15px] text-muted">Personalise Locate U. Preferences are stored on this device.</p>
      </header>

      <Card icon={<Palette className="h-5 w-5" />} title="Appearance">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">Theme</span>
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
        <Switch label="Dim map tiles in dark mode" description="Softens bright street maps at night without changing map data." checked={s.dimMapInDark} onChange={(v) => s.set({ dimMapInDark: v })} />
      </Card>

      <Card icon={<MapIcon className="h-5 w-5" />} title="Map & units">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Default map style" value={s.baseLayer} onChange={(e) => s.set({ baseLayer: e.target.value })}>
            {(config?.map.layers.filter((l) => l.kind === 'base') ?? [{ id: 'osm', name: 'OpenStreetMap' }]).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label="Coordinate format" value={s.coordFormat} onChange={(e) => s.set({ coordFormat: e.target.value as typeof s.coordFormat })}>
            <option value="dd">Decimal degrees (17.38500, 78.48670)</option>
            <option value="dms">Degrees, minutes, seconds</option>
            <option value="ddm">Degrees + decimal minutes</option>
          </Select>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-medium">Distance units</span>
          <Segmented label="Units" value={s.units} onChange={(v) => s.set({ units: v })} options={[{ value: 'metric', label: 'Kilometres' }, { value: 'imperial', label: 'Miles' }]} />
        </div>
      </Card>

      <Card icon={<Globe2 className="h-5 w-5" />} title="Search">
        <Select label="Language for place names" value={s.geocodeLang} onChange={(e) => s.set({ geocodeLang: e.target.value })}>
          {[['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['te', 'తెలుగు (Telugu)'], ['ta', 'தமிழ் (Tamil)'], ['kn', 'ಕನ್ನಡ (Kannada)'], ['ml', 'മലയാളം (Malayalam)'], ['bn', 'বাংলা (Bengali)'], ['mr', 'मराठी (Marathi)'], ['gu', 'ગુજરાતી (Gujarati)'], ['pa', 'ਪੰਜਾਬੀ (Punjabi)'], ['ur', 'اردو (Urdu)'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Switch label="Limit world search to India" description="Only return results inside India." checked={s.restrictSearchToIndia} onChange={(v) => s.set({ restrictSearchToIndia: v })} />
        <p className="mt-1 text-[12px] text-muted">World search uses OpenStreetMap Nominatim. To respect its usage policy, searches run only when you press Enter, are cached for {config?.geocoding.cache_days ?? 30} days and are limited to one request per second.</p>
      </Card>

      <Card icon={<HardDrive className="h-5 w-5" />} title="Offline & storage">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]"><div className="text-[11px] uppercase text-muted">Used</div><div className="font-semibold tabular-nums">{mb(est.usage)}</div></div>
          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]"><div className="text-[11px] uppercase text-muted">Cached items</div><div className="font-semibold tabular-nums">{cached.data ?? '—'}</div></div>
          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]"><div className="text-[11px] uppercase text-muted">Persistent</div><div className="font-semibold">{est.persisted == null ? '—' : est.persisted ? 'Yes' : 'No'}</div></div>
        </div>
        <p className="mt-3 text-[13px] text-muted">Available offline: the app itself, the India dataset you’ve opened, and places you’ve viewed (always labelled “Cached”). Map tiles are not stored for offline use, following the OpenStreetMap tile policy.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {navigator.storage?.persist && !est.persisted && (
            <Button size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={async () => { const ok = await navigator.storage.persist(); refresh(); toast(ok ? 'Storage will be kept' : 'The browser declined persistent storage', { tone: ok ? 'success' : 'info' }); }}>
              Keep offline data
            </Button>
          )}
          <Button size="sm" icon={<Database className="h-4 w-4" />} onClick={clearCache}>Clear offline cache</Button>
          <Button size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={async () => { await clearHistory(); qc.invalidateQueries({ queryKey: ['history'] }); toast('History cleared', { tone: 'success' }); }}>Clear history</Button>
          {install.canInstall && !install.installed && <Button size="sm" variant="primary" icon={<Download className="h-4 w-4" />} onClick={install.install}>Install app</Button>}
        </div>
        {install.installed && <p className="mt-2 text-[13px] text-emerald-700 dark:text-emerald-300">Installed as an app ✓</p>}
        {!install.canInstall && !install.installed && <p className="mt-2 text-[12px] text-muted">{install.isIOS ? 'To install on iPhone/iPad: Share → Add to Home Screen.' : 'Install is offered by supported browsers (Chrome, Edge, Samsung Internet) once the app is served over HTTPS or localhost.'}</p>}
      </Card>

      <div id="account">
        <Card icon={<UserRound className="h-5 w-5" />} title="Account & sync">
          <AccountPanel />
        </Card>
      </div>

      <Card icon={<ShieldCheck className="h-5 w-5" />} title="Privacy">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-muted">
          <li>Your location is requested only when you press a location button, and stays on this device.</li>
          <li>Tapping the map sends that point to the Locate U server to look up an address (via Nominatim). Points are cached by rounded coordinates and are not linked to you.</li>
          <li>Saved places, history and preferences live in this browser. Nothing is uploaded unless you sign in and turn on sync.</li>
          <li>No analytics, advertising or third-party trackers are included.</li>
        </ul>
      </Card>
    </div>
  );
}
