import { Link } from 'react-router-dom';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Locate U home">
      <svg viewBox="0 0 64 64" className={compact ? 'h-7 w-7' : 'h-9 w-9'} aria-hidden>
        <defs>
          <linearGradient id="lu-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5aa2ff" />
            <stop offset="1" stopColor="#1f5fe0" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#lu-g)" />
        <path d="M32 13c-8.3 0-15 6.5-15 14.6C17 38.5 32 51 32 51s15-12.5 15-23.4C47 19.5 40.3 13 32 13Z" fill="#fff" fillOpacity=".95" />
        <circle cx="32" cy="27.5" r="6" fill="#1f5fe0" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[17px] font-bold tracking-tight">Locate U</span>
        {!compact && <span className="block text-[11px] font-medium text-muted">Travel companion for India</span>}
      </span>
    </Link>
  );
}
