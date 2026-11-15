import type { SeasonData, Stop } from './model';

/**
 * Where the viewer is, so the app can say when Santa reaches them.
 *
 * Three sources, all inside the browser: the time zone (automatic, coarse), a
 * town or US ZIP code the viewer picks from a list that ships with the app,
 * and the browser's own location prompt (opt-in). The app never asks for a
 * street address. Nothing here is sent to the app's backend; a chosen home is
 * kept only in this browser's storage so it is still there on the next visit.
 */
export interface Home {
  lat: number;
  lon: number;
  /** The town's name ("Austin, TX"), when the viewer picked one. */
  name?: string;
}

const KEY = 'santa-tracker-home';

export function loadHome(): Home | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Home>;
    const lat = Number(value.lat);
    const lon = Number(value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const name = typeof value.name === 'string' ? value.name.slice(0, 80) : undefined;
    return name ? { lat, lon, name } : { lat, lon };
  } catch {
    return null;
  }
}

export function saveHome(home: Home | null): void {
  try {
    if (home) window.localStorage.setItem(KEY, JSON.stringify(home));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode); the home then lasts for this visit only.
  }
}

/** Asks the browser for the viewer's location. Rounded to about a kilometre. */
export function requestHome(): Promise<Home> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share a location. Type your town instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(2)),
          lon: Number(position.coords.longitude.toFixed(2)),
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'The browser did not share a location. Type your town or ZIP code instead.'
              : 'Your location could not be found just now. Type your town or ZIP code instead.'
          )
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 3_600_000 }
    );
  });
}

export const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Time-zone city names that differ from the route's spelling. */
const ZONE_ALIASES: Record<string, string> = {
  calcutta: 'kolkata',
  kiev: 'kyiv',
  saigon: 'ho chi minh city',
  'ho chi minh': 'ho chi minh city',
  katmandu: 'kathmandu',
  rangoon: 'yangon',
};

/** The route stop whose arrival time best stands for the viewer's time zone. */
export function stopForTimeZone(
  stops: Stop[],
  zone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  offsetMinutes = new Date().getTimezoneOffset()
): Stop | null {
  if (stops.length === 0) return null;
  const city = plain((zone ?? '').split('/').pop()?.replace(/_/g, ' ') ?? '');
  const wanted = ZONE_ALIASES[city] ?? city;
  if (wanted) {
    const match = stops.filter((s) => plain(s.city) === wanted).sort((a, b) => b.giftsK - a.giftsK)[0];
    if (match) return match;
  }
  // No city by that name on the route: take the biggest stop in the same
  // 15-degree slice of longitude as the clock offset.
  const lon = -offsetMinutes / 4;
  const slice = stops.filter((s) => Math.abs(s.lon - lon) <= 7.5);
  if (slice.length > 0) return slice.reduce((a, b) => (b.giftsK > a.giftsK ? b : a));
  return stops.reduce((a, b) => (Math.abs(b.lon - lon) < Math.abs(a.lon - lon) ? b : a));
}

/** "Central Time", or "your time zone" when the browser cannot name it. */
export function timeZoneName(): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZoneName: 'longGeneric' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    if (part && !/^GMT|^UTC/.test(part)) return part;
  } catch {
    // Older browsers do not know 'longGeneric'.
  }
  return 'your time zone';
}

export function nearestStop(stops: Stop[], home: Home): Stop | null {
  if (stops.length === 0) return null;
  const scale = Math.cos((home.lat * Math.PI) / 180);
  const far = (s: Stop) => {
    let dLon = Math.abs(s.lon - home.lon);
    if (dLon > 180) dLon = 360 - dLon;
    return Math.hypot(s.lat - home.lat, dLon * scale);
  };
  return stops.reduce((a, b) => (far(b) < far(a) ? b : a));
}

export interface MyVisit {
  stop: Stop;
  /**
   * 'house': a personal stop on this viewer's route.
   * 'near': the closest city on the route to the place they chose.
   * 'zone': only the time zone is known, so the time is approximate.
   */
  kind: 'house' | 'near' | 'zone';
  /** Reads naturally after "Santa reaches": "Austin, TX", "your house", "the Dallas area", "the Central Time zone". */
  label: string;
}

/** When and where Santa reaches this viewer. */
export function myVisit(data: SeasonData, home: Home | null, zoneName = timeZoneName()): MyVisit | null {
  const house = data.stops.find((s) => s.personal);
  if (house) {
    return { stop: house, kind: 'house', label: house.city === 'Your house' ? 'your house' : house.city };
  }
  if (home) {
    const near = nearestStop(data.stops, home);
    if (near) return { stop: near, kind: 'near', label: home.name ?? `the ${near.city} area` };
  }
  const zone = stopForTimeZone(data.stops);
  if (!zone) return null;
  return {
    stop: zone,
    kind: 'zone',
    label: zoneName === 'your time zone' ? zoneName : `the ${zoneName} zone`,
  };
}

/** The stages of the bedtime countdown, by how long until Santa arrives. */
export type VisitStage = 'early' | 'warning' | 'final' | 'here' | 'gone';

export const STAGE_EARLY_MS = 60 * 60_000;
export const STAGE_WARNING_MS = 30 * 60_000;
export const STAGE_FINAL_MS = 10 * 60_000;
const AFTERGLOW_MS = 20 * 60_000;

export function visitStage(visit: MyVisit | null, time: number): VisitStage | null {
  if (!visit) return null;
  const { arrival, departure } = visit.stop;
  if (time >= departure) return time < departure + AFTERGLOW_MS ? 'gone' : null;
  if (time >= arrival) return 'here';
  const left = arrival - time;
  if (left <= STAGE_FINAL_MS) return 'final';
  if (left <= STAGE_WARNING_MS) return 'warning';
  if (left <= STAGE_EARLY_MS) return 'early';
  return null;
}

/** How long the rooftop landing scene plays before arrival and after departure. */
export const ROOFTOP_APPROACH_MS = 25_000;
export const ROOFTOP_LEAVE_MS = 20_000;

/** True while the rooftop scene should cover the map. */
export function rooftopActive(visit: MyVisit | null, time: number): boolean {
  if (!visit || visit.kind === 'zone') return false;
  return time >= visit.stop.arrival - ROOFTOP_APPROACH_MS && time < visit.stop.departure + ROOFTOP_LEAVE_MS;
}

