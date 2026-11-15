import { LiveReading } from './LiveReading.js';
import { MissionEvent } from './MissionEvent.js';
import { ProductionSnapshot } from './ProductionSnapshot.js';
import { RouteStop } from './RouteStop.js';
import { Season } from './Season.js';
import { ToyLine } from './ToyLine.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

/**
 * The app's Rayfin data schema. Keep `UniversalAppSchema` in
 * `@rayfin-app/shared` in step with `schema` below.
 */
export type { UniversalAppSchema };
export { LiveReading, MissionEvent, ProductionSnapshot, RouteStop, Season, ToyLine };

export const schema = [
  Season,
  ToyLine,
  RouteStop,
  ProductionSnapshot,
  MissionEvent,
  LiveReading,
];
