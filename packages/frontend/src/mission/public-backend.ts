import type { MissionBackend, SeasonLoad } from './backend';
import { deriveMission } from './derive';
import { loadHome } from './home';
import { normaliseSeason, placeName, type LiveReading, type SeasonData } from './model';

/**
 * The backend for public visitors: people who open the app without signing in.
 *
 * It never touches the app's Fabric database or functions, so a crowd of
 * visitors costs the database nothing. The season comes from the same
 * deterministic plan generator that `seedSeason` uses to fill Fabric SQL, so a
 * visitor and a signed-in user see the same Christmas. Weather comes straight
 * from Open-Meteo to the visitor's browser.
 */

const WEATHER_EVERY_MS = 10 * 60_000;
const WEATHER_TIMEOUT_MS = 8_000;
const KEEP_READINGS = 24;

let season: SeasonData | null = null;
let seasonFor = '';
const readings: LiveReading[] = [];
let lastWeatherAt = 0;

const PHASE_PLACE: Record<string, string> = {
  offseason: 'North Pole (off-season)',
  build: "Santa's Workshop, North Pole",
  wrap: 'Wrapping Hall, North Pole',
  load: 'Sleigh Dock 1, North Pole',
  home: 'North Pole (mission complete)',
};

async function readWeather(data: SeasonData): Promise<void> {
  const now = Date.now();
  const state = deriveMission(data, now);
  const sleigh = state.sleigh;
  const flying = state.phase === 'flight';
  const lat = Math.min(89.9, sleigh.position.lat);
  const place = flying
    ? sleigh.target
      ? `the sleigh, near ${placeName(sleigh.target)}`
      : 'the sleigh, homeward bound'
    : (PHASE_PLACE[state.phase] ?? 'North Pole');

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(2));
  url.searchParams.set('longitude', sleigh.position.lon.toFixed(2));
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), WEATHER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: abort.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`The weather service answered HTTP ${response.status}.`);
    const body = (await response.json()) as { current?: Record<string, unknown> };
    const current = body.current ?? {};
    const num = (key: string) => {
      const value = Number(current[key]);
      if (!Number.isFinite(value)) throw new Error('The weather service sent an answer the app could not read.');
      return value;
    };
    readings.unshift({
      id: `visitor-${now}`,
      observedAt: now,
      phase: state.phase,
      place,
      lat,
      lon: sleigh.position.lon,
      temperatureF: num('temperature_2m'),
      windMph: num('wind_speed_10m'),
      windDirection: Math.round(num('wind_direction_10m')),
      cloudCover: Math.round(num('cloud_cover')),
      weatherCode: Math.round(num('weather_code')),
      provider: 'open-meteo',
    });
    readings.length = Math.min(readings.length, KEEP_READINGS);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The weather service did not answer in time.');
    }
    throw error instanceof TypeError ? new Error('The weather service could not be reached.') : error;
  } finally {
    clearTimeout(timer);
  }
}

export const publicBackend: MissionBackend = {
  visitor: true,
  feedIntervalMs: WEATHER_EVERY_MS,

  async loadSeason(year): Promise<SeasonLoad> {
    // A viewer who has shared their location gets their own house on the route.
    const home = loadHome();
    const wanted = `${year}:${home ? `${home.lat},${home.lon},${home.name ?? ''}` : ''}`;
    if (season && seasonFor === wanted) return { status: 'ready', data: season };
    // Loaded on demand so signed-in users never download the generator.
    const { buildSeasonPlan } = await import('../../../functions/src/plan');
    const rows = buildSeasonPlan(year, home ?? undefined);
    const pick = <T>(entity: string) =>
      rows.filter((r) => r.entity === entity).map((r) => ({ id: r.key, key: r.key, ...r.row })) as T[];
    type Args = Parameters<typeof normaliseSeason>;
    season = normaliseSeason(
      pick<Args[0]>('Season')[0],
      pick<Args[1][number]>('ToyLine'),
      pick<Args[2][number]>('RouteStop'),
      pick<Args[3][number]>('ProductionSnapshot'),
      pick<Args[4][number]>('MissionEvent')
    );
    seasonFor = wanted;
    return { status: 'ready', data: season };
  },

  async seedSeason() {
    throw new Error('Sign in to load the season into Fabric.');
  },

  async resetSeason() {
    throw new Error('Sign in to rebuild the season in Fabric.');
  },

  // Visitors never write to Fabric; their weather is fetched in `latestReadings`.
  async ingestLiveFeed() {
    return { ok: true, code: 'VISITOR', message: '', stored: false };
  },

  async latestReadings(_year, count) {
    if (season && Date.now() - lastWeatherAt >= WEATHER_EVERY_MS - 5_000) {
      lastWeatherAt = Date.now();
      await readWeather(season);
    }
    return readings.slice(0, count);
  },
};
