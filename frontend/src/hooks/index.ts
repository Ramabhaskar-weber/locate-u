import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from '@/stores/map';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const h = () => setM(mq.matches);
    h();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

export type GeoStatus = 'idle' | 'prompt' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

/**
 * Current location — requested only on an explicit user action. Coordinates
 * stay in memory on this device and are never sent anywhere unless the user
 * chooses an action that needs them (e.g. reverse geocoding, nearby search).
 */
export function useGeolocation() {
  const setUser = useMap((s) => s.setUser);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (p.state === 'denied') setStatus('denied');
        else if (p.state === 'prompt') setStatus('prompt');
        p.onchange = () => setStatus(p.state === 'denied' ? 'denied' : p.state === 'granted' ? 'granted' : 'prompt');
      })
      .catch(() => undefined);
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const locate = useCallback(
    (opts: { watch?: boolean } = {}) =>
      new Promise<GeolocationPosition | null>((resolve) => {
        if (!('geolocation' in navigator)) {
          setStatus('unsupported');
          setError('This browser does not support location services.');
          resolve(null);
          return;
        }
        setStatus('locating');
        setError(null);
        const ok = (pos: GeolocationPosition) => {
          setStatus('granted');
          setUser({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy, at: pos.timestamp });
          resolve(pos);
        };
        const fail = (e: GeolocationPositionError) => {
          const map: Record<number, [GeoStatus, string]> = {
            1: ['denied', 'Location permission was denied. You can enable it in your browser’s site settings.'],
            2: ['unavailable', 'Your position could not be determined. Check that location services are on.'],
            3: ['timeout', 'Finding your location took too long. Try again, ideally outdoors or with Wi-Fi on.'],
          };
          const [st, msg] = map[e.code] ?? ['unavailable', e.message];
          setStatus(st);
          setError(msg);
          resolve(null);
        };
        const o = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 };
        if (opts.watch) {
          if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = navigator.geolocation.watchPosition(ok, fail, o);
        } else navigator.geolocation.getCurrentPosition(ok, fail, o);
      }),
    [setUser],
  );

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  return { status, error, locate, stop };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches,
  );
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const done = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', h);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  const install = useCallback(async () => {
    if (!evt) return false;
    await evt.prompt();
    const r = await evt.userChoice;
    setEvt(null);
    return r.outcome === 'accepted';
  }, [evt]);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { canInstall: !!evt, installed, install, isIOS };
}

export function useHotkey(key: string, fn: (e: KeyboardEvent) => void, opts: { meta?: boolean } = {}) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (opts.meta) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
          e.preventDefault();
          ref.current(e);
        }
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === key) {
        ref.current(e);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [key, opts.meta]);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
