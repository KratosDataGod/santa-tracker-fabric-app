/**
 * Mrs. Claus's kitchen: how many cookies have been baked and eaten at any
 * moment of the season. Part of the North Pole SIMULATION, like the toys.
 *
 * These are plain formulas of the clock, so the dashboard and the Gazette's
 * cookie headlines always agree, and nothing extra needs storing.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Cookies baked by takeoff, in thousands: 1.8 billion. */
export const TOTAL_COOKIES_K = 1_800_000;

export interface KitchenTimeline {
  buildStart: number;
  takeoff: number;
}

export interface KitchenState {
  /** Thousands of cookies out of the oven so far. */
  bakedK: number;
  /** Thousands eaten by the elves. */
  elvesK: number;
  /** Thousands of carrot cookies eaten by the reindeer. */
  reindeerK: number;
  /** Individual cookies Santa has taken from the jar. He says it is quality control. */
  santa: number;
  /** Thousands still in the jar. */
  jarK: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pace = (x: number) => {
  const c = clamp01(x);
  return 0.45 * c + 0.55 * c * c * (3 - 2 * c);
};

/** Thousands baked by time `t`: steady all season, with one enormous batch on the last day. */
export function cookiesBakedK(tl: KitchenTimeline, t: number): number {
  const season = pace((t - tl.buildStart) / (tl.takeoff - tl.buildStart));
  const lastBatch = clamp01((t - (tl.takeoff - DAY)) / DAY);
  return Math.round(TOTAL_COOKIES_K * (0.9 * season + 0.1 * lastBatch));
}

export function kitchenAt(tl: KitchenTimeline, t: number): KitchenState {
  const bakedK = cookiesBakedK(tl, t);
  // Cookies take a little while to reach the workshop benches and the stables.
  const elvesK = Math.round(0.71 * cookiesBakedK(tl, t - 6 * HOUR));
  const reindeerK = Math.round(0.07 * cookiesBakedK(tl, t - 12 * HOUR));
  const days = Math.max(0, Math.min(t, tl.takeoff) - tl.buildStart) / DAY;
  // About three dozen a day, and a few more as Christmas gets close.
  const santa = Math.floor(days * 36 + days * days * 0.12);
  return { bakedK, elvesK, reindeerK, santa, jarK: Math.max(0, bakedK - elvesK - reindeerK) };
}

/** Cookies and glasses of milk left out along the route, in thousands, for a number of gifts delivered. */
export function routeTreatsK(deliveredK: number): { cookiesK: number; milkK: number } {
  return { cookiesK: Math.round(deliveredK / 6), milkK: Math.round(deliveredK / 18) };
}
