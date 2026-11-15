import { authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

/**
 * One Christmas season: the mission's master timeline.
 * Shared mission data — every signed-in user of the app reads the same rows.
 */
@entity()
@authenticated('*')
export class Season {
  @uuid() id!: string;
  @text({ max: 60, unique: true }) key!: string;
  @int() year!: number;
  @text({ max: 120 }) name!: string;
  @date() buildStart!: Date;
  @date() wrapStart!: Date;
  @date() loadStart!: Date;
  @date() takeoff!: Date;
  @date() landing!: Date;
  @int() totalToysK!: number;
  @int() stopCount!: number;
  /** Version of the plan generator that wrote this season. */
  @int({ optional: true }) planVersion?: number;
}
