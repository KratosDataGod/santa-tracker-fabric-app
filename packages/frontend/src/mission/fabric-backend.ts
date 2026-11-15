import type {
  MissionEventRecord,
  ProductionSnapshotRecord,
  RouteStopRecord,
  SeasonRecord,
  ToyLineRecord,
} from '@rayfin-app/shared';

import { getRayfinClient } from '@/lib/rayfin-client';

import { PLAN_VERSION, type MissionBackend, type SeasonLoad } from './backend';
import { normaliseReading, normaliseSeason } from './model';

interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor?: string | null;
}

/** Follows cursors until the whole result set is read (bounded). */
async function readAll<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 40; page++) {
    const result = await fetchPage(cursor);
    all.push(...result.items);
    if (!result.hasNextPage || !result.endCursor) break;
    cursor = result.endCursor;
  }
  return all;
}

const PAGE = 1000;

/** Reads and writes the mission through the Fabric app's data API and functions. */
export const fabricBackend: MissionBackend = {
  async loadSeason(year): Promise<SeasonLoad> {
    const client = await getRayfinClient();
    // Name every field: without select() the data API returns only `id`.
    const seasons = await client.data.Season.select([
      'id',
      'key',
      'year',
      'name',
      'buildStart',
      'wrapStart',
      'loadStart',
      'takeoff',
      'landing',
      'totalToysK',
      'stopCount',
      'planVersion',
    ])
      .where({ year: { eq: year } })
      .first(1)
      .execute();
    const season = seasons[0] as SeasonRecord | undefined;
    if (!season) return { status: 'missing' };
    if (Number(season.planVersion ?? 1) !== PLAN_VERSION) return { status: 'outdated' };

    const bySeason = { season: { eq: year } };
    const [lines, stops, snapshots, events] = await Promise.all([
      readAll<ToyLineRecord>((cursor) => {
        const q = client.data.ToyLine.select([
          'code',
          'name',
          'emoji',
          'workshop',
          'leadElf',
          'tagline',
          'targetK',
          'sortOrder',
        ])
          .where(bySeason)
          .orderBy({ sortOrder: 'asc' })
          .first(PAGE);
        return (cursor ? q.after(cursor) : q).executePaginated() as Promise<
          Page<ToyLineRecord>
        >;
      }),
      readAll<RouteStopRecord>((cursor) => {
        const q = client.data.RouteStop.select([
          'seq',
          'city',
          'country',
          'region',
          'lat',
          'lon',
          'arrival',
          'departure',
          'giftsK',
          'cumulativeK',
          'usState',
          'caProvince',
          'tally',
          'bloc',
        ])
          .where(bySeason)
          .orderBy({ seq: 'asc' })
          .first(PAGE);
        return (cursor ? q.after(cursor) : q).executePaginated() as Promise<
          Page<RouteStopRecord>
        >;
      }),
      readAll<ProductionSnapshotRecord>((cursor) => {
        const q = client.data.ProductionSnapshot.select([
          'ts',
          'lineCode',
          'builtK',
          'wrappedK',
          'loadedK',
        ])
          .where(bySeason)
          .orderBy({ ts: 'asc' })
          .first(PAGE);
        return (cursor ? q.after(cursor) : q).executePaginated() as Promise<
          Page<ProductionSnapshotRecord>
        >;
      }),
      readAll<MissionEventRecord>((cursor) => {
        const q = client.data.MissionEvent.select([
          'key',
          'ts',
          'stage',
          'kind',
          'title',
          'detail',
          'stopSeq',
        ])
          .where(bySeason)
          .orderBy({ ts: 'asc' })
          .first(PAGE);
        return (cursor ? q.after(cursor) : q).executePaginated() as Promise<
          Page<MissionEventRecord>
        >;
      }),
    ]);

    // The mission log is the last thing a load writes, and "landing" is its
    // final entry, so its presence means the load ran to completion.
    const complete =
      lines.length > 0 &&
      stops.length === Number(season.stopCount) &&
      snapshots.length > 0 &&
      events.some((event) => event.kind === 'landing');
    if (!complete) return { status: 'partial' };

    return {
      status: 'ready',
      data: normaliseSeason(season, lines, stops, snapshots, events),
    };
  },

  async seedSeason(year, offset, limit) {
    const client = await getRayfinClient();
    return client.functions.seedSeason.invoke(
      { year, offset, limit },
      { timeoutMs: 120_000 }
    );
  },

  async resetSeason(year, limit) {
    const client = await getRayfinClient();
    return client.functions.resetSeason.invoke({ year, limit }, { timeoutMs: 120_000 });
  },

  async ingestLiveFeed(year) {
    const client = await getRayfinClient();
    return client.functions.ingestLiveFeed.invoke({ year }, { timeoutMs: 30_000 });
  },

  async latestReadings(year, count) {
    const client = await getRayfinClient();
    const rows = await client.data.LiveReading.select([
      'id',
      'observedAt',
      'phase',
      'place',
      'lat',
      'lon',
      'temperatureF',
      'windMph',
      'windDirection',
      'cloudCover',
      'weatherCode',
      'provider',
    ])
      .where({ season: { eq: year } })
      .orderBy({ observedAt: 'desc' })
      .first(count)
      .execute();
    return rows.map((row) => normaliseReading(row as never));
  },
};
