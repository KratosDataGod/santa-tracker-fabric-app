import { describe, expect, it } from 'vitest';

import { testSeason } from '@/test/fake-backend';

import { deriveMission } from './derive';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('deriveMission', () => {
  const season = testSeason();
  const { buildStart, takeoff, landing } = season.timeline;

  it('is empty before the workshop opens', () => {
    const s = deriveMission(season, buildStart - DAY);
    expect(s.phase).toBe('offseason');
    expect(s.builtK).toBe(0);
    expect(s.sleigh.status).toBe('docked');
    expect(s.recentEvents).toHaveLength(0);
  });

  it('interpolates production between snapshots', () => {
    const s = deriveMission(season, buildStart + 10 * DAY);
    expect(s.phase).toBe('build');
    expect(s.builtK).toBeCloseTo(75, 5);
    expect(s.wrappedK).toBeCloseTo(25, 5);
    expect(s.deliveredK).toBe(0);
  });

  it('flies between stops and counts deliveries only once a stop is served', () => {
    const enroute = deriveMission(season, takeoff + 1 * HOUR);
    expect(enroute.phase).toBe('flight');
    expect(enroute.sleigh.status).toBe('enroute');
    expect(enroute.sleigh.target?.city).toBe('Eastville');
    expect(enroute.sleigh.speedMph).toBeGreaterThan(0);
    expect(enroute.deliveredK).toBe(0);
    expect(enroute.aboardK).toBe(300);

    const delivering = deriveMission(season, takeoff + 2 * HOUR + 30_000);
    expect(delivering.sleigh.status).toBe('delivering');
    expect(delivering.deliveredK).toBeCloseTo(50, 5);

    const afterFirst = deriveMission(season, takeoff + 3 * HOUR);
    expect(afterFirst.sleigh.stopsDone).toBe(1);
    expect(afterFirst.deliveredK).toBe(100);
    expect(afterFirst.sleigh.target?.city).toBe('Midtown');
  });

  it('returns home with everything delivered', () => {
    const returning = deriveMission(season, takeoff + 23 * HOUR);
    expect(returning.sleigh.status).toBe('returning');
    expect(returning.deliveredK).toBe(300);

    const home = deriveMission(season, landing + HOUR);
    expect(home.phase).toBe('home');
    expect(home.sleigh.status).toBe('home');
    expect(home.aboardK).toBe(0);
  });

  it('lists the most recent events first', () => {
    const s = deriveMission(season, takeoff + HOUR);
    expect(s.recentEvents.map((e) => e.key)).toEqual(['e2', 'e1']);
  });
});
