import { CheckCircle2, Info, RefreshCw, WifiOff, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOnline } from '@/hooks';
import { useToasts } from '@/stores/toast';
import { Button, cn } from '../ui';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-[1200] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-[13px] font-medium text-amber-950">
      <WifiOff className="h-4 w-4" />
      You’re offline. Showing data cached on this device; map tiles and live search need a connection.
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[2500] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
      {toasts.map((t) => (
        <div key={t.id} className="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 animate-sheet-up">
          {t.tone === 'error' ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          ) : t.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
          </div>
          {t.action && (
            <button
              className="shrink-0 rounded-full px-2 py-1 text-[13px] font-semibold text-brand-600 hover:bg-brand-500/10 dark:text-brand-300"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="shrink-0 rounded-full p-1 text-muted hover:bg-black/5 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Shows when a new service-worker version is waiting (registerType: 'prompt'). */
export function UpdatePrompt() {
  const [state, setState] = useState<{ need: boolean; ready: boolean; update?: (reload?: boolean) => Promise<void> }>({ need: false, ready: false });
  useEffect(() => {
    if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh: () => !cancelled && setState((s) => ({ ...s, need: true })),
          onOfflineReady: () => !cancelled && setState((s) => ({ ...s, ready: true })),
        });
        setState((s) => ({ ...s, update }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (state.ready) {
      const t = setTimeout(() => setState((s) => ({ ...s, ready: false })), 5000);
      return () => clearTimeout(t);
    }
  }, [state.ready]);
  if (!state.need && !state.ready) return null;
  return (
    <div className={cn('glass-strong fixed bottom-24 left-1/2 z-[2600] whitespace-nowrap lg:bottom-auto lg:top-4 flex -translate-x-1/2 items-center gap-3 rounded-full py-2 pl-4 pr-2 text-sm animate-sheet-up')}>
      {state.need ? (
        <>
          <span>A new version of Locate U is available.</span>
          <Button size="sm" variant="primary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => state.update?.(true)}>
            Update
          </Button>
        </>
      ) : (
        <span className="pr-2">Ready to work offline ✓</span>
      )}
    </div>
  );
}
