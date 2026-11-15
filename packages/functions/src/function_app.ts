import {
  UserDataFunctions,
  type RayfinContext,
} from '@microsoft/fabric-user-data-functions';
import type {
  RouteStopRecord,
  SeasonRecord,
  UniversalAppSchema,
} from '@rayfin-app/shared';

import { interpolateGreatCircle } from './geo.js';
import { buildSeasonPlan, type PlanEntity } from './plan.js';

type Ctx = RayfinContext<UniversalAppSchema>;
type Data = ReturnType<Ctx['getDataClient']>;

const udf = new UserDataFunctions();

const PLAN_ENTITIES: PlanEntity[] = [
  'Season',
  'ToyLine',
  'RouteStop',
  'ProductionSnapshot',
  'MissionEvent',
];

const MIN_YEAR = 2020;
const MAX_YEAR = 2100;

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error(`year must be a whole number from ${MIN_YEAR} to ${MAX_YEAR}.`);
  }
}

interface KeyPage {
  items: { key: string }[];
  hasNextPage: boolean;
  endCursor?: string | null;
}

/** One page of stored keys for an entity in a season, in a stable order. */
function keyPage(
  data: Data,
  entity: PlanEntity,
  year: number,
  cursor: string | undefined
): Promise<KeyPage> {
  const page = <Q extends { after(c: string): Q; executePaginated(): Promise<KeyPage> }>(
    query: Q
  ) => (cursor ? query.after(cursor) : query).executePaginated();
  switch (entity) {
    case 'Season':
      return page(
        data.Season.select(['key']).where({ year: { eq: year } }).orderBy({ key: 'asc' }).first(1000)
      );
    case 'ToyLine':
      return page(
        data.ToyLine.select(['key']).where({ season: { eq: year } }).orderBy({ key: 'asc' }).first(1000)
      );
    case 'RouteStop':
      return page(
        data.RouteStop.select(['key']).where({ season: { eq: year } }).orderBy({ key: 'asc' }).first(1000)
      );
    case 'ProductionSnapshot':
      return page(
        data.ProductionSnapshot.select(['key'])
          .where({ season: { eq: year } })
          .orderBy({ key: 'asc' })
          .first(1000)
      );
    case 'MissionEvent':
      return page(
        data.MissionEvent.select(['key']).where({ season: { eq: year } }).orderBy({ key: 'asc' }).first(1000)
      );
  }
}

/** Reads every `key` already stored for one entity in a season. */
async function existingKeys(
  data: Data,
  entity: PlanEntity,
  year: number
): Promise<Set<string>> {
  const keys = new Set<string>();
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 50; pageNumber++) {
    const result = await keyPage(data, entity, year, cursor);
    for (const item of result.items) keys.add(item.key);
    if (!result.hasNextPage || !result.endCursor) break;
    cursor = result.endCursor;
  }
  return keys;
}

async function inBatches<T>(
  items: T[],
  size: number,
  work: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(work));
  }
}

/**
 * Writes one slice of a season's plan into the app's Fabric SQL database.
 *
 * Idempotent and resumable: rows are identified by a stable `key`, rows that
 * already exist are skipped, and the caller repeats the call with
 * `nextOffset` until `done` is true.
 */
udf.func(
  'seedSeason',
  async (
    year: number,
    offset: number,
    limit: number,
    ctx: RayfinContext<UniversalAppSchema>
  ): Promise<{
    total: number;
    created: number;
    skipped: number;
    nextOffset: number;
    done: boolean;
  }> => {
    assertYear(year);
    const start = Number.isInteger(offset) && offset > 0 ? offset : 0;
    const size = Math.max(1, Math.min(120, Number.isInteger(limit) ? limit : 60));

    const plan = buildSeasonPlan(year);
    const slice = plan.slice(start, start + size);
    const data = ctx.getDataClient();

    const known = new Map<PlanEntity, Set<string>>();
    for (const entity of PLAN_ENTITIES) {
      if (slice.some((row) => row.entity === entity)) {
        known.set(entity, await existingKeys(data, entity, year));
      }
    }

    const missing = slice.filter((row) => !known.get(row.entity)?.has(row.key));
    await inBatches(missing, 6, async (planned) => {
      const payload = { key: planned.key, ...planned.row };
      // Each entity client has its own create-input type; the plan generator
      // is the single place those row shapes are produced.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (data[planned.entity] as { create: (input: any) => Promise<unknown> }).create(payload);
    });

    const nextOffset = Math.min(plan.length, start + size);
    console.log(
      `seedSeason ${year}: rows ${start}-${nextOffset} of ${plan.length}, created ${missing.length}`
    );
    return {
      total: plan.length,
      created: missing.length,
      skipped: slice.length - missing.length,
      nextOffset,
      done: nextOffset >= plan.length,
    };
  },
  []
);

/** One page of row ids for an entity in a season. */
async function idPage(data: Data, entity: PlanEntity, year: number, size: number): Promise<string[]> {
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
  switch (entity) {
    case 'Season':
      return ids(await data.Season.select(['id']).where({ year: { eq: year } }).first(size).execute());
    case 'ToyLine':
      return ids(await data.ToyLine.select(['id']).where({ season: { eq: year } }).first(size).execute());
    case 'RouteStop':
      return ids(await data.RouteStop.select(['id']).where({ season: { eq: year } }).first(size).execute());
    case 'ProductionSnapshot':
      return ids(
        await data.ProductionSnapshot.select(['id']).where({ season: { eq: year } }).first(size).execute()
      );
    case 'MissionEvent':
      return ids(await data.MissionEvent.select(['id']).where({ season: { eq: year } }).first(size).execute());
  }
}

/**
 * Removes one slice of a season's plan rows so the season can be rebuilt from
 * a newer plan. The caller repeats the call until `done` is true. Live weather
 * readings are kept. The Season row is removed last, so an interrupted reset
 * still shows up as a season that needs loading.
 */
udf.func(
  'resetSeason',
  async (
    year: number,
    limit: number,
    ctx: RayfinContext<UniversalAppSchema>
  ): Promise<{ deleted: number; done: boolean }> => {
    assertYear(year);
    const size = Math.max(1, Math.min(150, Number.isInteger(limit) ? limit : 100));
    const data = ctx.getDataClient();
    const order: PlanEntity[] = ['MissionEvent', 'ProductionSnapshot', 'RouteStop', 'ToyLine', 'Season'];
    for (const entity of order) {
      const ids = await idPage(data, entity, year, size);
      if (ids.length === 0) continue;
      await inBatches(ids, 6, async (id) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (data[entity] as { delete: (where: any) => Promise<unknown> }).delete({ id });
      });
      console.log(`resetSeason ${year}: removed ${ids.length} ${entity} rows`);
      return { deleted: ids.length, done: false };
    }
    return { deleted: 0, done: true };
  },
  []
);

// --- Live API feed -----------------------------------------------------------

const NORTH_POLE = { lat: 89.9, lon: 0 };
const FEED_MIN_INTERVAL_MS = 55_000;
const PROVIDER_TIMEOUT_MS = 8_000;

const ms = (value: Date | string) => new Date(value).getTime();

function whereIsTheMission(
  season: SeasonRecord,
  stops: RouteStopRecord[],
  now: number
): { phase: string; place: string; lat: number; lon: number } {
  const pole = { ...NORTH_POLE };
  if (now < ms(season.buildStart)) {
    return { phase: 'offseason', place: 'North Pole (off-season)', ...pole };
  }
  if (now < ms(season.wrapStart)) {
    return { phase: 'build', place: "Santa's Workshop, North Pole", ...pole };
  }
  if (now < ms(season.loadStart)) {
    return { phase: 'wrap', place: 'Wrapping Hall, North Pole', ...pole };
  }
  if (now < ms(season.takeoff)) {
    return { phase: 'load', place: 'Sleigh Dock 1, North Pole', ...pole };
  }
  if (now >= ms(season.landing) || stops.length === 0) {
    return { phase: 'home', place: 'North Pole (mission complete)', ...pole };
  }

  const takeoff = ms(season.takeoff);
  const landing = ms(season.landing);
  let from = { at: takeoff, ...pole, label: 'the North Pole' };
  for (const stop of stops) {
    const arrival = ms(stop.arrival);
    const departure = ms(stop.departure);
    const here = { lat: Number(stop.lat), lon: Number(stop.lon) };
    if (now < arrival) {
      const t = (now - from.at) / Math.max(1, arrival - from.at);
      return {
        phase: 'flight',
        place: `En route to ${stop.city}, ${stop.country}`,
        ...interpolateGreatCircle(from, here, t),
      };
    }
    if (now <= departure) {
      return { phase: 'flight', place: `${stop.city}, ${stop.country}`, ...here };
    }
    from = { at: departure, ...here, label: stop.city };
  }
  const t = (now - from.at) / Math.max(1, landing - from.at);
  return {
    phase: 'flight',
    place: 'Heading home to the North Pole',
    ...interpolateGreatCircle(from, pole, t),
  };
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Pulls one reading from the live weather API (Open-Meteo) for wherever the
 * mission is right now — the workshop before takeoff, the sleigh's position
 * in flight — and stores it in Fabric.
 *
 * Throttled server-side: if a reading newer than ~1 minute already exists the
 * provider is not called again, so many open browsers share one feed.
 */
udf.func(
  'ingestLiveFeed',
  async (
    year: number,
    ctx: RayfinContext<UniversalAppSchema>
  ): Promise<{
    ok: boolean;
    code: string;
    message: string;
    stored: boolean;
  }> => {
    assertYear(year);
    const data = ctx.getDataClient();
    const now = Date.now();

    const latest = await data.LiveReading.select(['id', 'observedAt'])
      .where({ season: { eq: year } })
      .orderBy({ observedAt: 'desc' })
      .first(1)
      .execute();
    if (latest[0] && now - ms(latest[0].observedAt) < FEED_MIN_INTERVAL_MS) {
      return { ok: true, code: 'FRESH', message: 'A recent reading already exists.', stored: false };
    }

    // Name every field: without select() the data API returns only `id`.
    const seasons = await data.Season.select([
      'year',
      'buildStart',
      'wrapStart',
      'loadStart',
      'takeoff',
      'landing',
    ])
      .where({ year: { eq: year } })
      .first(1)
      .execute();
    const season = seasons[0] as SeasonRecord | undefined;
    if (!season) {
      return {
        ok: false,
        code: 'SEASON_NOT_LOADED',
        message: `Season ${year} has not been loaded into Fabric yet.`,
        stored: false,
      };
    }
    const stops = await data.RouteStop.select([
      'seq',
      'city',
      'country',
      'lat',
      'lon',
      'arrival',
      'departure',
    ])
      .where({ season: { eq: year } })
      .orderBy({ seq: 'asc' })
      .first(500)
      .execute();

    const spot = whereIsTheMission(season, stops as RouteStopRecord[], now);

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', spot.lat.toFixed(4));
    url.searchParams.set('longitude', spot.lon.toFixed(4));
    url.searchParams.set(
      'current',
      'temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code'
    );
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('wind_speed_unit', 'mph');

    let body: unknown;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: abort.signal,
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        console.error(`ingestLiveFeed: provider answered HTTP ${response.status}`);
        return {
          ok: false,
          code: 'PROVIDER_REJECTED',
          message: `The weather service answered HTTP ${response.status}.`,
          stored: false,
        };
      }
      body = await response.json();
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      console.error(`ingestLiveFeed: provider call failed (${timedOut ? 'timeout' : 'network'})`);
      return {
        ok: false,
        code: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNREACHABLE',
        message: timedOut
          ? 'The weather service did not answer in time.'
          : 'The weather service could not be reached.',
        stored: false,
      };
    } finally {
      clearTimeout(timer);
    }

    const current = (body as { current?: Record<string, unknown> } | null)?.current;
    if (
      !current ||
      !finite(current.temperature_2m) ||
      !finite(current.wind_speed_10m) ||
      !finite(current.wind_direction_10m) ||
      !finite(current.cloud_cover) ||
      !finite(current.weather_code)
    ) {
      console.error('ingestLiveFeed: provider response did not have the expected fields');
      return {
        ok: false,
        code: 'PROVIDER_UNEXPECTED',
        message: 'The weather service returned a response this app does not recognise.',
        stored: false,
      };
    }

    await data.LiveReading.create({
      season: year,
      observedAt: new Date(now),
      phase: spot.phase,
      place: spot.place.slice(0, 120),
      lat: Number(spot.lat.toFixed(5)),
      lon: Number(spot.lon.toFixed(5)),
      temperatureF: Number(current.temperature_2m.toFixed(1)),
      windMph: Number(current.wind_speed_10m.toFixed(1)),
      windDirection: Math.round(current.wind_direction_10m),
      cloudCover: Math.round(current.cloud_cover),
      weatherCode: Math.round(current.weather_code),
      provider: 'open-meteo',
      providerTime: String(current.time ?? '').slice(0, 40),
    });
    console.log(`ingestLiveFeed ${year}: stored a reading for phase ${spot.phase}`);
    return { ok: true, code: 'STORED', message: 'Stored a new reading.', stored: true };
  },
  []
);
