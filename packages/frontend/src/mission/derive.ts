import {
  bearing,
  distanceMiles,
  interpolateGreatCircle,
  NORTH_POLE,
  type LatLon,
} from './geo';
import type { LogEvent, SeasonData, Snapshot, Stop, ToyLine } from './model';

export type Phase = 'offseason' | 'build' | 'wrap' | 'load' | 'flight' | 'home';

export interface LineState {
  code: string;
  name: string;
  emoji: string;
  workshop: string;
  leadElf: string;
  tagline: string;
  targetK: number;
  builtK: number;
  wrappedK: number;
  loadedK: number;
}

export type SleighStatus = 'docked' | 'enroute' | 'delivering' | 'returning' | 'home';

export interface SleighState {
  status: SleighStatus;
  position: LatLon;
  headingDeg: number;
  speedMph: number;
  altitudeFt: number;
  /** Stop being served or approached; null when docked, returning or home. */
  target: Stop | null;
  previous: Stop | null;
  /** Milliseconds until arrival at `target` (0 while delivering). */
  etaMs: number;
  stopsDone: number;
}

export interface MissionState {
  time: number;
  phase: Phase;
  builtK: number;
  wrappedK: number;
  loadedK: number;
  deliveredK: number;
  /** Gifts still aboard the sleigh. */
  aboardK: number;
  lines: LineState[];
  sleigh: SleighState;
  /** Most recent first. */
  recentEvents: LogEvent[];
  /** Santa's most recent daily note, if he has written one yet. */
  santaNote: LogEvent | null;
  /** Mrs. Claus's most recent note from the kitchen. */
  kitchenNote: LogEvent | null;
  /** Places visited so far, out of those on the route. */
  coverage: {
    countries: number;
    countriesTotal: number;
    us: number;
    usTotal: number;
    ca: number;
    caTotal: number;
    eu: number;
    euTotal: number;
  };
}

function snapshotAt(snapshots: Snapshot[], t: number): Snapshot {
  if (snapshots.length === 0) return { ts: t, builtK: 0, wrappedK: 0, loadedK: 0 };
  if (t <= snapshots[0].ts) {
    return t < snapshots[0].ts
      ? { ts: t, builtK: 0, wrappedK: 0, loadedK: 0 }
      : snapshots[0];
  }
  const last = snapshots[snapshots.length - 1];
  if (t >= last.ts) return last;
  let lo = 0;
  let hi = snapshots.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid].ts <= t) lo = mid;
    else hi = mid;
  }
  const a = snapshots[lo];
  const b = snapshots[hi];
  const f = (t - a.ts) / (b.ts - a.ts);
  const mix = (x: number, y: number) => x + (y - x) * f;
  return {
    ts: t,
    builtK: mix(a.builtK, b.builtK),
    wrappedK: mix(a.wrappedK, b.wrappedK),
    loadedK: mix(a.loadedK, b.loadedK),
  };
}

function lineAt(line: ToyLine, t: number): LineState {
  const s = snapshotAt(line.snapshots, t);
  return {
    code: line.code,
    name: line.name,
    emoji: line.emoji,
    workshop: line.workshop,
    leadElf: line.leadElf,
    tagline: line.tagline,
    targetK: line.targetK,
    builtK: s.builtK,
    wrappedK: s.wrappedK,
    loadedK: s.loadedK,
  };
}

function phaseAt(data: SeasonData, t: number): Phase {
  const tl = data.timeline;
  if (t < tl.buildStart) return 'offseason';
  if (t < tl.wrapStart) return 'build';
  if (t < tl.loadStart) return 'wrap';
  if (t < tl.takeoff) return 'load';
  if (t < tl.landing) return 'flight';
  return 'home';
}

function cruise(from: LatLon, to: LatLon, start: number, end: number, t: number) {
  const span = Math.max(1, end - start);
  const f = Math.max(0, Math.min(1, (t - start) / span));
  const miles = distanceMiles(from, to);
  const position = interpolateGreatCircle(from, to, f);
  return {
    position,
    headingDeg: bearing(position, to),
    speedMph: miles / (span / 3_600_000),
    altitudeFt: Math.sin(Math.PI * f) * Math.min(62_000, 4_000 + miles * 9),
  };
}

function sleighAt(data: SeasonData, t: number): { sleigh: SleighState; deliveredK: number } {
  const { takeoff, landing } = data.timeline;
  const stops = data.stops;
  const idle = { headingDeg: 0, speedMph: 0, altitudeFt: 0 };

  if (t < takeoff || stops.length === 0) {
    return {
      deliveredK: 0,
      sleigh: {
        status: 'docked',
        position: NORTH_POLE,
        ...idle,
        target: stops[0] ?? null,
        previous: null,
        etaMs: stops[0] ? stops[0].arrival - t : 0,
        stopsDone: 0,
      },
    };
  }
  if (t >= landing) {
    return {
      deliveredK: data.totalToysK,
      sleigh: {
        status: 'home',
        position: NORTH_POLE,
        ...idle,
        target: null,
        previous: stops[stops.length - 1],
        etaMs: 0,
        stopsDone: stops.length,
      },
    };
  }

  let fromPoint: LatLon = NORTH_POLE;
  let fromTime = takeoff;
  let previous: Stop | null = null;
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const before = previous ? previous.cumulativeK : 0;
    if (t < stop.arrival) {
      return {
        deliveredK: before,
        sleigh: {
          status: 'enroute',
          ...cruise(fromPoint, stop, fromTime, stop.arrival, t),
          target: stop,
          previous,
          etaMs: stop.arrival - t,
          stopsDone: i,
        },
      };
    }
    if (t <= stop.departure) {
      const f = (t - stop.arrival) / Math.max(1, stop.departure - stop.arrival);
      return {
        deliveredK: before + stop.giftsK * f,
        sleigh: {
          status: 'delivering',
          position: stop,
          ...idle,
          target: stop,
          previous,
          etaMs: 0,
          stopsDone: i,
        },
      };
    }
    fromPoint = stop;
    fromTime = stop.departure;
    previous = stop;
  }
  return {
    deliveredK: data.totalToysK,
    sleigh: {
      status: 'returning',
      ...cruise(fromPoint, NORTH_POLE, fromTime, landing, t),
      target: null,
      previous,
      etaMs: landing - t,
      stopsDone: stops.length,
    },
  };
}

function recentEvents(events: LogEvent[], t: number, count: number): LogEvent[] {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].ts <= t) lo = mid + 1;
    else hi = mid;
  }
  return events.slice(Math.max(0, lo - count), lo).reverse();
}

// Santa's notes are pinned on their own card, so they are split from the news once per season.
const NEWS = new WeakMap<SeasonData, { news: LogEvent[]; notes: LogEvent[]; kitchen: LogEvent[] }>();
function split(data: SeasonData) {
  let cached = NEWS.get(data);
  if (!cached) {
    cached = {
      news: data.events.filter((event) => event.kind !== 'santa-note'),
      notes: data.events.filter((event) => event.kind === 'santa-note'),
      kitchen: data.events.filter((event) => event.kind === 'mrs-claus-note'),
    };
    NEWS.set(data, cached);
  }
  return cached;
}
const newsOf = (data: SeasonData) => split(data).news;
function latestOf(notes: LogEvent[], t: number): LogEvent | null {
  let latest: LogEvent | null = null;
  for (const note of notes) {
    if (note.ts > t) break;
    latest = note;
  }
  return latest;
}

function coverageAt(stops: Stop[], stopsDone: number): MissionState['coverage'] {
  const seen = { countries: new Set<string>(), us: new Set<string>(), ca: new Set<string>(), eu: new Set<string>() };
  const all = { countries: new Set<string>(), us: new Set<string>(), ca: new Set<string>(), eu: new Set<string>() };
  stops.forEach((stop, index) => {
    const done = index < stopsDone;
    const note = (kind: keyof typeof all, name: string | null | false) => {
      if (!name) return;
      all[kind].add(name);
      if (done) seen[kind].add(name);
    };
    note('countries', stop.counted && stop.country);
    note('us', stop.usState);
    note('ca', stop.caProvince);
    note('eu', stop.eu && stop.country);
  });
  return {
    countries: seen.countries.size,
    countriesTotal: all.countries.size,
    us: seen.us.size,
    usTotal: all.us.size,
    ca: seen.ca.size,
    caTotal: all.ca.size,
    eu: seen.eu.size,
    euTotal: all.eu.size,
  };
}

/** The full mission picture at mission time `t`, derived from Fabric data. */
export function deriveMission(data: SeasonData, t: number): MissionState {
  const lines = data.lines.map((line) => lineAt(line, t));
  const sum = (pick: (l: LineState) => number) => lines.reduce((a, l) => a + pick(l), 0);
  const { sleigh, deliveredK } = sleighAt(data, t);
  const loadedK = sum((l) => l.loadedK);
  return {
    time: t,
    phase: phaseAt(data, t),
    builtK: sum((l) => l.builtK),
    wrappedK: sum((l) => l.wrappedK),
    loadedK,
    deliveredK,
    aboardK: Math.max(0, loadedK - deliveredK),
    lines,
    sleigh,
    recentEvents: recentEvents(newsOf(data), t, 40),
    santaNote: latestOf(split(data).notes, t),
    kitchenNote: latestOf(split(data).kitchen, t),
    coverage: coverageAt(data.stops, sleigh.stopsDone),
  };
}
