/** ISO-8601 UTC timestamp for storage. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** YYYY-MM-DD in the device's local time zone. Sessions belong to the local date they started. */
export function localDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(localDateString: string): Date {
  const [y, m, d] = localDateString.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** Monday of the week containing `date`, as a local date string. */
export function weekStartLocalDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return localDate(d);
}

export function weeksSince(iso: string | null, now: Date = new Date()): number {
  if (!iso) return 1;
  return Math.max(1, Math.floor(daysBetween(iso, now) / 7) + 1);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${m}:${String(rest).padStart(2, '0')}`;
}

export function formatMinutes(seconds: number): string {
  if (seconds < 60) return 'Under a minute';
  return `${Math.round(seconds / 60)} min`;
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
