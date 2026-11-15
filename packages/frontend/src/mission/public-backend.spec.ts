import { afterEach, describe, expect, it, vi } from 'vitest';

import { publicBackend } from './public-backend';

describe('public (signed-out) backend', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the whole season without a single network request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const load = await publicBackend.loadSeason(2026);
    expect(load.status).toBe('ready');
    if (load.status !== 'ready') return;
    expect(load.data.stops).toHaveLength(1000);
    expect(load.data.lines).toHaveLength(12);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses to write to Fabric', async () => {
    await expect(publicBackend.seedSeason(2026, 0, 100)).rejects.toThrow(/Sign in/);
    await expect(publicBackend.resetSeason(2026, 100)).rejects.toThrow(/Sign in/);
    expect((await publicBackend.ingestLiveFeed(2026)).stored).toBe(false);
  });

  it('reads weather from Open-Meteo at most once per interval', async () => {
    const fetchSpy = vi.fn<(url: unknown) => Promise<Response>>(async () =>
      new Response(
        JSON.stringify({
          current: { temperature_2m: -20, wind_speed_10m: 12, wind_direction_10m: 270, cloud_cover: 40, weather_code: 71 },
        })
      )
    );
    vi.stubGlobal('fetch', fetchSpy);
    await publicBackend.loadSeason(2026);
    const first = await publicBackend.latestReadings(2026, 24);
    const second = await publicBackend.latestReadings(2026, 24);
    expect(first).toHaveLength(1);
    expect(first[0].temperatureF).toBe(-20);
    expect(second).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('api.open-meteo.com');
  });
});
