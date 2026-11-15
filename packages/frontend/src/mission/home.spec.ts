import { describe, expect, it } from 'vitest';

import { myVisit, nearestStop, stopForTimeZone, visitStage } from './home';
import type { Stop } from './model';

import { testSeason } from '@/test/fake-backend';

const stop = (seq: number, city: string, lat: number, lon: number, giftsK = 100, personal = false): Stop => ({
  seq, city, country: 'Testland', region: 'Test', lat, lon,
  arrival: seq * 1000, departure: seq * 1000 + 500, giftsK, cumulativeK: seq * 100,
  usState: null, caProvince: null, counted: true, eu: false, ...(personal ? { personal } : {}),
});

const stops = [
  stop(1, 'Kolkata', 22.57, 88.36),
  stop(2, 'São Paulo', -23.55, -46.63),
  stop(3, 'Chicago', 41.88, -87.63, 500),
  stop(4, 'Milwaukee', 43.04, -87.91, 200),
];

describe('finding the viewer on the route', () => {
  it('matches the time zone to a city on the route', () => {
    expect(stopForTimeZone(stops, 'America/Chicago', 360)?.city).toBe('Chicago');
    expect(stopForTimeZone(stops, 'Asia/Calcutta', -330)?.city).toBe('Kolkata');
    expect(stopForTimeZone(stops, 'America/Sao_Paulo', 180)?.city).toBe('São Paulo');
  });

  it('falls back to the biggest stop at the same clock offset', () => {
    expect(stopForTimeZone(stops, 'America/Menominee', 360)?.city).toBe('Chicago');
    expect(stopForTimeZone(stops, 'Etc/Unknown', -600)?.city).toBe('Kolkata');
  });

  it('finds the nearest city to a shared location', () => {
    expect(nearestStop(stops, { lat: 43.0, lon: -88.2 })?.city).toBe('Milwaukee');
  });

  it("prefers the viewer's own house when the route has one", () => {
    const data = testSeason();
    const withHouse = { ...data, stops: [...data.stops, stop(99, 'Your house', 43, -88, 0, true)] };
    expect(myVisit(withHouse, null)).toMatchObject({ kind: 'house', label: 'your house' });
    expect(myVisit(data, { lat: 0, lon: 0 })?.kind).toBe('near');
    expect(myVisit(data, null, 'Central Time')).toMatchObject({ kind: 'zone', label: 'the Central Time zone' });
    expect(myVisit(data, { lat: 0, lon: 0, name: 'Null Island' })?.label).toBe('Null Island');
  });

  it('stages the bedtime countdown: early, warning, final, here, gone', () => {
    const visit = { stop: { ...stops[2], arrival: 100 * 60_000, departure: 100 * 60_000 + 30_000 }, kind: 'house' as const, label: 'your house' };
    const at = (minutesBefore: number) => visitStage(visit, visit.stop.arrival - minutesBefore * 60_000);
    expect(at(90)).toBeNull();
    expect(at(45)).toBe('early');
    expect(at(20)).toBe('warning');
    expect(at(5)).toBe('final');
    expect(visitStage(visit, visit.stop.arrival + 1000)).toBe('here');
    expect(visitStage(visit, visit.stop.departure + 60_000)).toBe('gone');
    expect(visitStage(visit, visit.stop.departure + 3_600_000)).toBeNull();
  });
});
