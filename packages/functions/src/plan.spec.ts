import { describe, expect, it } from 'vitest';

import {
  buildSeasonPlan,
  CA_PROVINCES,
  EU_COUNTRIES,
  US_STATES,
  WORLD_COUNTRIES,
} from './plan.js';

interface StopRow {
  seq: number;
  city: string;
  country: string;
  usState?: string;
  caProvince?: string;
  tally?: string;
  bloc?: string;
  arrival: Date;
  departure: Date;
  cumulativeK: number;
}

describe('season plan', () => {
  const rows = buildSeasonPlan(2026);
  const season = rows.find((r) => r.entity === 'Season')!.row as {
    takeoff: Date;
    landing: Date;
    totalToysK: number;
    stopCount: number;
  };
  const stops = rows
    .filter((r) => r.entity === 'RouteStop')
    .map((r) => r.row as unknown as StopRow)
    .sort((a, b) => a.seq - b.seq);

  it('stops in every one of the 195 countries before going home', () => {
    const visited = new Set(stops.filter((s) => s.tally === 'UN').map((s) => s.country));
    expect(WORLD_COUNTRIES).toHaveLength(195);
    expect(new Set(WORLD_COUNTRIES).size).toBe(195);
    expect(WORLD_COUNTRIES.filter((c) => !visited.has(c))).toEqual([]);
  });

  it('stops in every Canadian province and territory before going home', () => {
    const visited = new Set(stops.map((s) => s.caProvince).filter(Boolean));
    expect(CA_PROVINCES).toHaveLength(13);
    expect(CA_PROVINCES.filter((p) => !visited.has(p))).toEqual([]);
  });

  it('stops in every EU member state before going home', () => {
    const visited = new Set(stops.filter((s) => s.bloc === 'EU').map((s) => s.country));
    expect(EU_COUNTRIES).toHaveLength(27);
    expect(EU_COUNTRIES.filter((c) => !visited.has(c))).toEqual([]);
  });

  it('stops in every US state before going home', () => {
    const visited = new Set(stops.map((s) => s.usState).filter(Boolean));
    expect(US_STATES).toHaveLength(50);
    expect(US_STATES.filter((s) => !visited.has(s))).toEqual([]);
    expect([...visited].filter((s) => !US_STATES.includes(s as string))).toEqual([]);
  });

  it('makes exactly 1,000 distinct stops', () => {
    expect(stops).toHaveLength(1000);
    const places = new Set(stops.map((s) => `${s.city}|${s.usState ?? s.caProvince ?? s.country}`));
    expect(places.size).toBe(1000);
  });

  it('flies the stops in order, between takeoff and landing', () => {
    expect(stops).toHaveLength(season.stopCount);
    expect(stops[0].arrival.getTime()).toBeGreaterThan(season.takeoff.getTime());
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].arrival.getTime()).toBeGreaterThan(stops[i - 1].departure.getTime());
    }
    expect(stops[stops.length - 1].departure.getTime()).toBeLessThan(season.landing.getTime());
  });

  it('delivers every toy and gives every row a unique key', () => {
    expect(stops[stops.length - 1].cumulativeK).toBe(season.totalToysK);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it('adds one personal stop near local midnight when given a home, and counts nothing extra', () => {
    const mine = buildSeasonPlan(2026, { lat: 43.04, lon: -87.91 })
      .filter((r) => r.entity === 'RouteStop')
      .map((r) => r.row as unknown as StopRow & { mine?: boolean; lon: number });
    expect(mine).toHaveLength(1001);
    const house = mine.filter((s) => s.mine);
    expect(house).toHaveLength(1);
    expect(house[0].city).toBe('Your house');
    expect(house[0].tally).toBeUndefined();
    // Local solar midnight at 87.91 W is 05:51 UTC on the 25th.
    const solar = Date.UTC(2026, 11, 25, 5, 51);
    expect(Math.abs(house[0].arrival.getTime() - solar)).toBeLessThan(45 * 60_000);
    expect(new Set(mine.filter((s) => s.tally === 'UN').map((s) => s.country)).size).toBe(195);
    expect(mine[mine.length - 1].cumulativeK).toBe(season.totalToysK);
    expect(stops.some((s) => 'mine' in s)).toBe(false);
  });

  it('prints a Gazette story every hour of the season and a note from Santa every day', () => {
    const events = rows
      .filter((r) => r.entity === 'MissionEvent')
      .map((r) => r.row as { ts: Date; kind: string; title: string; detail?: string });
    const buildStart = Date.UTC(2026, 10, 1);
    const takeoff = season.takeoff.getTime();
    const stories = events.filter((e) => e.kind === 'story').map((e) => e.ts.getTime()).sort((a, b) => a - b);
    for (let i = 1; i < stories.length; i++) expect(stories[i] - stories[i - 1]).toBeLessThanOrEqual(3_600_000);
    expect(stories[0] - buildStart).toBeLessThanOrEqual(3_600_000);
    expect(takeoff - stories[stories.length - 1]).toBeLessThanOrEqual(15 * 60_000);
    const notes = events.filter((e) => e.kind === 'santa-note');
    expect(notes).toHaveLength(55);
    const kitchen = events.filter((e) => e.kind === 'mrs-claus-note');
    expect(kitchen.length).toBeGreaterThanOrEqual(17);
    expect(events.some((e) => e.title.includes('One billionth cookie'))).toBe(true);
    for (const e of events) {
      expect(e.title.length).toBeLessThanOrEqual(160);
      expect((e.detail ?? '').length).toBeLessThanOrEqual(400);
      expect(`${e.title} ${e.detail ?? ''}`).not.toMatch(/\{\w+\}|NaN|undefined/);
    }
  });

  it('is deterministic, so a season can be replayed exactly', () => {
    expect(JSON.stringify(buildSeasonPlan(2026))).toBe(JSON.stringify(rows));
  });
});
