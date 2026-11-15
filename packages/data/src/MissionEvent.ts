import { authenticated, date, entity, int, set, text, uuid } from '@microsoft/rayfin-core';

/** One entry in the mission log. */
@entity()
@authenticated('*')
export class MissionEvent {
  @uuid() id!: string;
  @text({ max: 60, unique: true }) key!: string;
  @int() season!: number;
  @date() ts!: Date;
  @set('build', 'wrap', 'load', 'flight')
  stage!: 'build' | 'wrap' | 'load' | 'flight';
  @text({ max: 40 }) kind!: string;
  @text({ max: 160 }) title!: string;
  @text({ optional: true, max: 400 }) detail?: string;
  @int({ optional: true }) stopSeq?: number;
  @text({ optional: true, max: 24 }) lineCode?: string;
}
