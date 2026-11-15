import { describe, expect, it } from 'vitest';

import { personalLine, weatherLine } from './santa-notes';

import { testSeason } from '@/test/fake-backend';

const DAY = 86_400_000;
const note = (day: number) => ({ key: `n${day}`, ts: day * DAY, stage: 'build' as const, kind: 'santa-note', title: 'A note from Santa', detail: 'Hello.', stopSeq: null });

describe("Santa's personal lines", () => {
  const data = testSeason();
  const stop = data.stops[1];

  it('names the town the viewer chose, and varies by day', () => {
    const visit = { stop, kind: 'house' as const, label: 'Austin, TX' };
    const lines = [0, 1, 2, 3].map((d) => personalLine(note(d), visit, data));
    expect(lines.every((line) => line?.includes('Austin, TX') || line?.includes('straight from'))).toBe(true);
    expect(new Set(lines).size).toBeGreaterThan(2);
    expect(personalLine(note(0), visit, data)).toBe(personalLine(note(0), visit, data));
  });

  it('stays at time-zone level when that is all it knows', () => {
    const line = personalLine(note(0), { stop, kind: 'zone', label: 'the Central Time zone' }, data);
    expect(line).toContain('the Central Time zone');
    expect(line).not.toContain(stop.city);
  });

  it('says nothing personal with no visit, and describes the weather simply', () => {
    expect(personalLine(note(0), null, data)).toBeNull();
    expect(weatherLine({ temperatureF: 20, weatherCode: 73 })).toMatch(/snowing/);
    expect(weatherLine({ temperatureF: 85, weatherCode: 0 })).toMatch(/Warm/);
  });
});
