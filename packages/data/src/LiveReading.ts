import { authenticated, date, decimal, entity, int, text, uuid } from '@microsoft/rayfin-core';

/**
 * One reading from the live API feed: real weather (Open-Meteo) observed at
 * the place the mission is happening right now. Written by the
 * `ingestLiveFeed` function.
 */
@entity()
@authenticated('*')
export class LiveReading {
  @uuid() id!: string;
  @int() season!: number;
  @date() observedAt!: Date;
  @text({ max: 24 }) phase!: string;
  @text({ max: 120 }) place!: string;
  @decimal({ precision: 9, scale: 5 }) lat!: number;
  @decimal({ precision: 9, scale: 5 }) lon!: number;
  @decimal({ precision: 6, scale: 1 }) temperatureF!: number;
  @decimal({ precision: 6, scale: 1 }) windMph!: number;
  @int() windDirection!: number;
  @int() cloudCover!: number;
  @int() weatherCode!: number;
  @text({ max: 40 }) provider!: string;
  @text({ max: 40 }) providerTime!: string;
}
