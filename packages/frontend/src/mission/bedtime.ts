import { duration } from './format';
import type { MyVisit, VisitStage } from './home';

/** The speeds the "Speed up" button steps through. */
export const VISIT_SPEEDS = [1, 10, 60];
export const nextVisitSpeed = (speed: number) =>
  VISIT_SPEEDS[(VISIT_SPEEDS.indexOf(speed) + 1) % VISIT_SPEEDS.length] ?? 1;

/** What each stage of the bedtime countdown says. */
export function stageMessage(stage: VisitStage, visit: MyVisit, time: number) {
  const left = duration(visit.stop.arrival - time);
  switch (stage) {
    case 'early':
      return {
        headline: 'Santa is on his way!',
        body: 'Time to brush teeth and get pyjamas on.',
        tail: `He reaches ${visit.label} in ${left}.`,
      };
    case 'warning':
      return {
        headline: 'Warning: Santa approaching!',
        body: 'All kids must be in bed, or Santa skips your house.',
        tail: `He reaches ${visit.label} in ${left}.`,
      };
    case 'final':
      return {
        headline: 'Final warning!',
        body: 'Lights out and eyes closed, or Santa skips your house.',
        tail: `Only ${left} to go.`,
      };
    case 'here':
      return {
        headline: 'Santa is here!',
        body: 'Shh. Not a peep.',
        tail: `He is over ${visit.label} right now.`,
      };
    case 'gone':
      return {
        headline: `Santa has been to ${visit.label}!`,
        body: 'Back to sleep until morning.',
        tail: '',
      };
  }
}
