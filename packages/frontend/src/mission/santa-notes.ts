import type { MyVisit } from './home';
import type { LogEvent, SeasonData } from './model';

const DAY = 86_400_000;

const clock = (t: number) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(t);

export interface HomeWeather {
  temperatureF: number;
  weatherCode: number;
}

/** What Santa says about the weather where the viewer is. */
export function weatherLine(weather: HomeWeather): string {
  const code = weather.weatherCode;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'I hear it is snowing where you are. Perfect sleigh weather!';
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return 'A little rain where you are, I hear. Rudolph does not mind one bit.';
  }
  if (weather.temperatureF <= 32) return 'It is frosty where you are, I hear. Leave your mittens by the door.';
  if (weather.temperatureF >= 75) return 'Warm where you are! I shall loosen the red coat a button.';
  return 'Clear enough skies where you are, I hear: an easy landing.';
}

/**
 * The line Santa adds to a note for this particular viewer. Which line he
 * picks depends on the day, so it changes from note to note but a given note
 * always reads the same.
 */
export function personalLine(note: LogEvent, visit: MyVisit | null, data: SeasonData): string | null {
  if (!visit) return null;
  const day = Math.floor(note.ts / DAY);
  const when = clock(visit.stop.arrival);
  if (visit.kind === 'zone') {
    const zone = [
      `I will be over ${visit.label} around ${when} on Christmas Eve.`,
      `To everyone in ${visit.label}: be asleep by midnight, and I will do the rest.`,
    ];
    return zone[day % zone.length];
  }
  const place = visit.label;
  const index = data.stops.indexOf(visit.stop);
  const prev = index > 0 ? data.stops[index - 1] : null;
  const next = index >= 0 && index < data.stops.length - 1 ? data.stops[index + 1] : null;
  const options = [
    `I have circled ${place} on my map in red.`,
    `Look for me over ${place} at about ${when} on Christmas Eve.`,
    ...(prev && next ? [`I will come to you straight from ${prev.city}, and then it is on to ${next.city}.`] : []),
    visit.stop.lat < -15
      ? `A summer Christmas in ${place}! I shall pack the lighter coat.`
      : visit.stop.lat > 55
        ? `It is nearly as snowy in ${place} as it is up here. I will feel right at home.`
        : `${place.charAt(0).toUpperCase()}${place.slice(1)} is stop ${visit.stop.seq} of ${data.stops.length} on my list, and I will not miss it.`,
  ];
  return options[day % options.length];
}
