import { useEffect, useRef, useState } from 'react';

/**
 * Real snow on the ground and fresh snowfall, from Open-Meteo (CC BY 4.0),
 * fetched by the viewer's browser.
 *
 * The true North Pole is floating sea ice, and weather models do not always
 * report a snow depth over ocean. When the Pole has no reading the app asks
 * for Alert, Nunavut, the nearest land weather post, and says so.
 */
export interface Snow {
  /** Inches on the ground, or null when the service has no depth for this spot. */
  depthIn: number | null;
  /** Inches of new snow today. */
  freshIn: number | null;
  place: string;
  /** True when the reading is for the Pole itself, not the stand-in outpost. */
  atPole: boolean;
}

const POLE = { lat: 89.9, lon: 0 };
const ALERT = { lat: 82.5, lon: -62.35 };
const EVERY_MS = 15 * 60_000;

async function read(lat: number, lon: number, signal: AbortSignal) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(1)}&longitude=${lon.toFixed(1)}` +
    '&current=snow_depth,snowfall&daily=snowfall_sum&forecast_days=1&timezone=UTC';
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = (await response.json()) as {
    current?: { snow_depth?: number | null };
    daily?: { snowfall_sum?: (number | null)[] };
  };
  const depthM = body.current?.snow_depth;
  const freshCm = body.daily?.snowfall_sum?.[0];
  return {
    depthIn: typeof depthM === 'number' && Number.isFinite(depthM) ? depthM * 39.37 : null,
    freshIn: typeof freshCm === 'number' && Number.isFinite(freshCm) ? freshCm / 2.54 : null,
  };
}

/**
 * Snow at the North Pole while Santa is there, or under the sleigh once he is
 * flying. Only asks while `active` (live mode), and at most every 15 minutes.
 */
export function useSnow(active: boolean, flying: boolean, position: { lat: number; lon: number }): Snow | null {
  const [snow, setSnow] = useState<Snow | null>(null);
  const latest = useRef({ flying, position });
  useEffect(() => {
    latest.current = { flying, position };
  }, [flying, position]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const abort = new AbortController();
    const refresh = async () => {
      const now = latest.current;
      try {
        if (now.flying) {
          const here = await read(Math.min(89.9, now.position.lat), now.position.lon, abort.signal);
          if (!cancelled) setSnow({ ...here, place: 'under the sleigh', atPole: false });
          return;
        }
        const pole = await read(POLE.lat, POLE.lon, abort.signal);
        if (pole.depthIn !== null) {
          if (!cancelled) setSnow({ ...pole, place: 'the North Pole', atPole: true });
          return;
        }
        const outpost = await read(ALERT.lat, ALERT.lon, abort.signal);
        if (!cancelled) {
          setSnow({
            depthIn: outpost.depthIn,
            freshIn: pole.freshIn ?? outpost.freshIn,
            place: 'Alert, the last outpost before the Pole',
            atPole: false,
          });
        }
      } catch {
        // No snow report this time; the panel simply leaves the line out.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), EVERY_MS);
    return () => {
      cancelled = true;
      abort.abort();
      window.clearInterval(timer);
    };
  }, [active, flying]);

  return active ? snow : null;
}

const inches = (value: number) => (value >= 10 ? `${Math.round(value)}` : value.toFixed(1).replace(/\.0$/, ''));

export const snowText = (value: number | null) =>
  value === null ? null : value < 0.05 ? 'none' : `${inches(value)} in`;

/** A line for Santa's note when it has snowed at the Pole today. */
export function snowLine(snow: Snow | null): string | null {
  if (!snow?.atPole || snow.freshIn === null || snow.freshIn < 0.5) return null;
  const amount = inches(snow.freshIn);
  return `Another ${amount} ${amount === '1' ? 'inch' : 'inches'} of snow fell on the workshop roofs today.`;
}
