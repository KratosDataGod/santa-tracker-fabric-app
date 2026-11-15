import type { MissionBackend, SeasonLoad } from '@/mission/backend';
import type { SeasonData } from '@/mission/model';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A tiny hand-written season for unit tests. Never used by the running app. */
export function testSeason(year = 2026): SeasonData {
  const buildStart = Date.UTC(year, 10, 1);
  const takeoff = Date.UTC(year, 11, 24, 11);
  const stop = (seq: number, city: string, lat: number, lon: number, at: number) => ({
    seq,
    city,
    country: 'Testland',
    region: 'Test',
    lat,
    lon,
    arrival: at,
    departure: at + 60_000,
    giftsK: 100,
    cumulativeK: seq * 100,
    usState: null,
    caProvince: null,
    counted: true,
    eu: false,
  });
  return {
    year,
    name: `Christmas ${year}`,
    timeline: {
      buildStart,
      wrapStart: buildStart + 14 * DAY,
      loadStart: takeoff - 4 * DAY,
      takeoff,
      landing: takeoff + 25 * HOUR,
    },
    totalToysK: 300,
    lines: [
      {
        code: 'trains',
        name: 'Wooden Trains',
        emoji: '🚂',
        workshop: 'Tinker Hall',
        leadElf: 'Pip Tinselwick',
        tagline: 'Tuned by ear.',
        targetK: 300,
        snapshots: [
          { ts: buildStart, builtK: 0, wrappedK: 0, loadedK: 0 },
          { ts: buildStart + 20 * DAY, builtK: 150, wrappedK: 50, loadedK: 0 },
          { ts: takeoff, builtK: 300, wrappedK: 300, loadedK: 300 },
        ],
      },
    ],
    stops: [
      stop(1, 'Eastville', 10, 170, takeoff + 2 * HOUR),
      stop(2, 'Midtown', 40, 0, takeoff + 12 * HOUR),
      stop(3, 'Westport', 20, -150, takeoff + 22 * HOUR),
    ],
    events: [
      {
        key: 'e1',
        ts: buildStart,
        stage: 'build',
        kind: 'stage',
        title: 'Production begins',
        detail: null,
        stopSeq: null,
      },
      {
        key: 'e2',
        ts: takeoff,
        stage: 'flight',
        kind: 'takeoff',
        title: 'Santa is airborne!',
        detail: null,
        stopSeq: null,
      },
    ],
  };
}

export function fakeBackend(load: SeasonLoad): MissionBackend {
  return {
    loadSeason: async () => load,
    seedSeason: async () => ({ total: 0, created: 0, skipped: 0, nextOffset: 0, done: true }),
    resetSeason: async () => ({ deleted: 0, done: true }),
    ingestLiveFeed: async () => ({ ok: true, code: 'FRESH', message: '', stored: false }),
    latestReadings: async () => [],
  };
}
