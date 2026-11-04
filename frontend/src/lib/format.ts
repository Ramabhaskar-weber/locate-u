export function timeAgo(iso: string | Date, now = Date.now()): string {
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.valueOf();
  const s = Math.round((now - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString();
}

export function formatPopulation(n?: number | null): string {
  if (!n) return 'Population n/a';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} lakh`;
  return n.toLocaleString('en-IN');
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function typeLabel(t: 'state' | 'union_territory' | string): string {
  return t === 'union_territory' ? 'Union Territory' : 'State';
}

export function formatTime(d: Date | null, tz?: string): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz });
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
