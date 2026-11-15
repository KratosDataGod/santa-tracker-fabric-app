import type { LiveReading, SeasonData } from './model';

export type SeasonLoad =
  | { status: 'ready'; data: SeasonData }
  /** No rows for this season in the app database yet. */
  | { status: 'missing' }
  /** A previous load was interrupted; loading again resumes it. */
  | { status: 'partial' }
  /** Fabric holds a season written from an older plan; it needs a rebuild. */
  | { status: 'outdated' };

/** Must match PLAN_VERSION in the functions package's plan generator. */
export const PLAN_VERSION = 6;

export interface SeedProgress {
  total: number;
  created: number;
  skipped: number;
  nextOffset: number;
  done: boolean;
}

export interface FeedResult {
  ok: boolean;
  code: string;
  message: string;
  stored: boolean;
}

/** Everything the UI needs from the Fabric app backend. */
export interface MissionBackend {
  /** True for the public, signed-out backend, which never touches Fabric data. */
  visitor?: boolean;
  /** How often to refresh the live feed. Defaults to once a minute. */
  feedIntervalMs?: number;
  loadSeason(year: number): Promise<SeasonLoad>;
  seedSeason(year: number, offset: number, limit: number): Promise<SeedProgress>;
  /** Removes one slice of the season's plan rows; repeat until `done`. */
  resetSeason(year: number, limit: number): Promise<{ deleted: number; done: boolean }>;
  ingestLiveFeed(year: number): Promise<FeedResult>;
  latestReadings(year: number, count: number): Promise<LiveReading[]>;
}
