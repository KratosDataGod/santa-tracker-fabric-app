/**
 * Browser-safe contracts shared by the data registration package, the
 * functions package (type-only) and the frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 *
 * Counts ending in `K` are stored in THOUSANDS of toys so a season total
 * (billions) fits a 32-bit SQL INT.
 */

/** One Christmas season: the mission's master timeline (all UTC). */
export interface SeasonRecord {
  id: string;
  key: string;
  year: number;
  name: string;
  buildStart: Date | string;
  wrapStart: Date | string;
  loadStart: Date | string;
  takeoff: Date | string;
  landing: Date | string;
  totalToysK: number;
  stopCount: number;
  planVersion?: number | null;
}

/** A workshop production line (one toy category). */
export interface ToyLineRecord {
  id: string;
  key: string;
  season: number;
  code: string;
  name: string;
  emoji: string;
  workshop: string;
  leadElf: string;
  tagline: string;
  targetK: number;
  sortOrder: number;
}

/** A planned delivery stop on the Christmas Eve route. */
export interface RouteStopRecord {
  id: string;
  key: string;
  season: number;
  seq: number;
  city: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  arrival: Date | string;
  departure: Date | string;
  giftsK: number;
  cumulativeK: number;
  usState?: string | null;
  caProvince?: string | null;
  tally?: string | null;
  bloc?: string | null;
  /** Set only on a viewer's own personal stop; never stored in Fabric. */
  mine?: boolean | null;
}

/** Cumulative production counters for one toy line at a point in time. */
export interface ProductionSnapshotRecord {
  id: string;
  key: string;
  season: number;
  ts: Date | string;
  lineCode: string;
  builtK: number;
  wrappedK: number;
  loadedK: number;
}

export type MissionStage = 'build' | 'wrap' | 'load' | 'flight';

/** One entry in the mission log. */
export interface MissionEventRecord {
  id: string;
  key: string;
  season: number;
  ts: Date | string;
  stage: MissionStage;
  kind: string;
  title: string;
  detail?: string | null;
  stopSeq?: number | null;
  lineCode?: string | null;
}

/**
 * One reading from the live API feed: real weather (Open-Meteo) observed at
 * the place the mission is happening right now.
 */
export interface LiveReadingRecord {
  id: string;
  season: number;
  observedAt: Date | string;
  phase: string;
  place: string;
  lat: number;
  lon: number;
  temperatureF: number;
  windMph: number;
  windDirection: number;
  cloudCover: number;
  weatherCode: number;
  provider: string;
  providerTime: string;
}

export type UniversalAppSchema = {
  Season: SeasonRecord;
  ToyLine: ToyLineRecord;
  RouteStop: RouteStopRecord;
  ProductionSnapshot: ProductionSnapshotRecord;
  MissionEvent: MissionEventRecord;
  LiveReading: LiveReadingRecord;
};
