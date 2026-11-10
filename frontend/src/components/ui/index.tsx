import clsx from 'clsx';
import { AlertTriangle, Database, Inbox, Loader2, RefreshCw, WifiOff, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { timeAgo } from '@/lib/format';

export const cn = clsx;

export function Glass({ className, strong, as: As = 'div', ...p }: HTMLAttributes<HTMLDivElement> & { strong?: boolean; as?: 'div' | 'section' | 'aside' | 'article' | 'header' | 'nav' }) {
  return <As className={cn(strong ? 'glass-strong' : 'glass', 'rounded-3xl', className)} {...p} />;
}

export function Card({ title, subtitle, action, children, className, icon }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <Glass as="section" className={cn('p-4 sm:p-5 w-full max-w-full overflow-hidden animate-fade-up', className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">{icon}</div>}
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-[15px] font-semibold leading-tight break-words">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-[12px] sm:text-[13px] text-muted break-words">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0 self-start sm:self-auto max-w-full overflow-x-auto">{action}</div>}
        </header>
      )}
      {children}
    </Glass>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_6px_20px_-8px_rgb(31_95_224/.7)] disabled:bg-brand-600/50',
  secondary: 'bg-black/[0.05] text-[rgb(var(--fg))] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
  ghost: 'text-[rgb(var(--fg))] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  glass: 'glass-strong text-[rgb(var(--fg))] hover:brightness-[1.03]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...p },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-full [&_svg]:shrink-0 font-medium transition-all duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        variants[variant],
        className,
      )}
      {...p}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string; active?: boolean }>(function IconButton(
  { label, className, variant = 'glass', active, size = 'md', ...p },
  ref,
) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      aria-pressed={active}
      variant={variant}
      size={size}
      className={cn(
        size === 'sm' ? 'h-8 w-8 !px-0' : size === 'lg' ? 'h-12 w-12 !px-0' : 'h-10 w-10 !px-0',
        active && '!bg-brand-600 !text-white',
        className,
      )}
      {...p}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; leading?: ReactNode }>(
  function Input({ label, error, hint, leading, className, id, ...p }, ref) {
    const auto = useId();
    const iid = id ?? auto;
    return (
      <div className="w-full">
        {label && <label htmlFor={iid} className="mb-1.5 block text-[13px] font-medium">{label}</label>}
        <div className="relative">
          {leading && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{leading}</span>}
          <input
            ref={ref}
            id={iid}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${iid}-err` : hint ? `${iid}-hint` : undefined}
            className={cn(
              'h-11 w-full rounded-2xl border bg-white/80 px-4 text-[15px] outline-none transition placeholder:text-[rgb(var(--muted))] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:bg-white/[0.06]',
              'hairline',
              leading && 'pl-10',
              error && '!border-red-500 focus:!ring-red-500/15',
              className,
            )}
            {...p}
          />
        </div>
        {error ? (
          <p id={`${iid}-err`} role="alert" className="mt-1.5 text-[13px] text-red-600 dark:text-red-400">{error}</p>
        ) : hint ? (
          <p id={`${iid}-hint`} className="mt-1.5 text-[12px] text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; hideLabel?: boolean }>(
  function Select({ label, hideLabel, className, id, children, ...p }, ref) {
    const auto = useId();
    const sid = id ?? auto;
    return (
      <div className="w-full">
        <label htmlFor={sid} className={cn('mb-1.5 block text-[13px] font-medium', hideLabel && 'sr-only')}>{label}</label>
        <select
          ref={ref}
          id={sid}
          className={cn(
            'h-11 w-full appearance-none rounded-2xl border bg-white/80 bg-[length:16px] bg-[right_14px_center] bg-no-repeat px-4 pr-10 text-[15px] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50 dark:bg-white/[0.06] hairline',
            className,
          )}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
          {...p}
        >
          {children}
        </select>
      </div>
    );
  },
);

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-black/15 dark:bg-white/20')}
      >
        <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; icon?: ReactNode }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap sm:inline-flex max-w-full gap-1 rounded-3xl sm:rounded-full bg-black/[0.05] p-1 dark:bg-white/[0.07]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-all',
            size === 'sm' ? 'h-7 px-2.5 text-[11px] sm:text-[12px]' : 'h-8 px-3 text-[12px] sm:text-[13px]',
            value === o.value ? 'bg-white text-ink-900 shadow-sm dark:bg-white/[0.16] dark:text-white' : 'text-muted hover:text-[rgb(var(--fg))]',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-muted', className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}…</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl p-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, icon, action, className }: { title: string; description?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-black/[0.05] text-muted dark:bg-white/[0.07]">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact, title = 'Something went wrong' }: { error: unknown; onRetry?: () => void; compact?: boolean; title?: string }) {
  const msg = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const offline = /offline|reach/i.test(msg);
  return (
    <div role="alert" className={cn('flex flex-col items-center text-center', compact ? 'gap-2 py-4' : 'px-6 py-10')}>
      <div className={cn('grid place-items-center rounded-2xl', compact ? 'h-9 w-9' : 'mb-3 h-12 w-12', offline ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400')}>
        {offline ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">{offline ? 'Connection problem' : title}</h3>
        <p className="mt-1 max-w-sm text-[13px] text-muted">{msg}</p>
      </div>
      {onRetry && (
        <Button size="sm" className="mt-3" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Badge({ tone = 'neutral', children, className, title }: { tone?: 'neutral' | 'brand' | 'green' | 'amber' | 'red' | 'violet'; children: ReactNode; className?: string; title?: string }) {
  const tones = {
    neutral: 'bg-black/[0.06] text-ink-700 dark:bg-white/[0.08] dark:text-ink-200',
    brand: 'bg-brand-500/12 text-brand-700 dark:bg-brand-400/15 dark:text-brand-200',
    green: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
    amber: 'bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    red: 'bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    violet: 'bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200',
  };
  return <span title={title} className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function SourceBadge({ fromCache, cachedAt, live, label, local }: { fromCache?: boolean; cachedAt?: string; live?: string; label?: string; local?: boolean }) {
  if (fromCache)
    return (
      <Badge tone="amber" title={cachedAt ? `Stored on this device ${new Date(cachedAt).toLocaleString()}` : 'Stored on this device'}>
        <Database className="h-3 w-3" /> Cached{cachedAt ? ` · ${timeAgo(cachedAt)}` : ''}
      </Badge>
    );
  if (local) return <Badge tone="violet"><Database className="h-3 w-3" /> {label ?? 'Local dataset'}</Badge>;
  return (
    <Badge tone="green">
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {live ?? 'Live'}
      {label ? ` · ${label}` : ''}
    </Badge>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border hairline bg-white/70 px-1.5 py-0.5 font-mono text-[11px] text-muted dark:bg-white/[0.06]">{children}</kbd>;
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-muted">{icon}{label}</div>
      <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,button,select,textarea,[tabindex]')?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', h);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div ref={ref} className={cn('glass-strong relative w-full rounded-t-4xl p-5 pb-[calc(1.25rem+var(--safe-bottom))] animate-sheet-up sm:rounded-4xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scroll-thin">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
