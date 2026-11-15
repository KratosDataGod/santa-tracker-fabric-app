import { authenticated, entity, int, text, uuid } from '@microsoft/rayfin-core';

/** A workshop production line (one toy category). */
@entity()
@authenticated('*')
export class ToyLine {
  @uuid() id!: string;
  @text({ max: 60, unique: true }) key!: string;
  @int() season!: number;
  @text({ max: 24 }) code!: string;
  @text({ max: 80 }) name!: string;
  @text({ max: 16 }) emoji!: string;
  @text({ max: 80 }) workshop!: string;
  @text({ max: 80 }) leadElf!: string;
  @text({ max: 200 }) tagline!: string;
  @int() targetK!: number;
  @int() sortOrder!: number;
}
