import { authenticated, date, decimal, entity, int, text, uuid } from '@microsoft/rayfin-core';

/** A planned delivery stop on the Christmas Eve route. */
@entity()
@authenticated('*')
export class RouteStop {
  @uuid() id!: string;
  @text({ max: 60, unique: true }) key!: string;
  @int() season!: number;
  @int() seq!: number;
  @text({ max: 80 }) city!: string;
  @text({ max: 80 }) country!: string;
  @text({ max: 40 }) region!: string;
  @decimal({ precision: 9, scale: 5 }) lat!: number;
  @decimal({ precision: 9, scale: 5 }) lon!: number;
  @date() arrival!: Date;
  @date() departure!: Date;
  @int() giftsK!: number;
  @int() cumulativeK!: number;
  /** US state name, when the stop is in one of the 50 states. */
  @text({ optional: true, max: 40 }) usState?: string;
  /** Canadian province or territory name, when the stop is in one. */
  @text({ optional: true, max: 40 }) caProvince?: string;
  /** 'UN' when the stop's country is one of the 195 counted countries. */
  @text({ optional: true, max: 8 }) tally?: string;
  /** 'EU' when the stop is in a European Union member state. */
  @text({ optional: true, max: 8 }) bloc?: string;
}
