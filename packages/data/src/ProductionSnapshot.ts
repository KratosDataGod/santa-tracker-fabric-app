import { authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

/** Cumulative production counters for one toy line at a point in time. */
@entity()
@authenticated('*')
export class ProductionSnapshot {
  @uuid() id!: string;
  @text({ max: 60, unique: true }) key!: string;
  @int() season!: number;
  @date() ts!: Date;
  @text({ max: 24 }) lineCode!: string;
  @int() builtK!: number;
  @int() wrappedK!: number;
  @int() loadedK!: number;
}
