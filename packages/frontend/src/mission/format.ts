const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Formats a count stored in thousands as a whole number of toys. */
export const toys = (k: number) => integer.format(Math.round(k * 1000));

/** Compact count: 1.44B, 276M, 12K. */
export function toysCompact(k: number): string {
  const n = k * 1000;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return integer.format(Math.round(n));
}

export const whole = (n: number) => integer.format(Math.round(n));

export const percent = (part: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, (part / total) * 100)) : 0;

const utcStamp = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const utcShort = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const localShort = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const utcClock = (t: number) => `${utcStamp.format(t)} UTC`;
export const utcBrief = (t: number) => utcShort.format(t);
export const localBrief = (t: number) => localShort.format(t);

/** 3d 04h 12m 09s — or 12m 09s when short. */
export function duration(msValue: number): string {
  const total = Math.max(0, Math.floor(msValue / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

export function ago(msValue: number): string {
  const s = Math.max(0, Math.round(msValue / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return `${Math.round(s / 86400)} d ago`;
}

/** WMO weather interpretation codes, as used by Open-Meteo. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorm';
}
