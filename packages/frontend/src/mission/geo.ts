const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EARTH_RADIUS_MILES = 3958.8;

export interface LatLon {
  lat: number;
  lon: number;
}

export const NORTH_POLE: LatLon = { lat: 90, lon: 0 };

/** Angular distance in radians. */
export function angularDistance(a: LatLon, b: LatLon): number {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLat = lat2 - lat1;
  const dLon = (b.lon - a.lon) * RAD;
  return (
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
        )
      )
    )
  );
}

export const distanceMiles = (a: LatLon, b: LatLon) =>
  angularDistance(a, b) * EARTH_RADIUS_MILES;

export function interpolateGreatCircle(a: LatLon, b: LatLon, t: number): LatLon {
  const d = angularDistance(a, b);
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const lat1 = a.lat * RAD;
  const lon1 = a.lon * RAD;
  const lat2 = b.lat * RAD;
  const lon2 = b.lon * RAD;
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return {
    lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG,
    lon: Math.atan2(y, x) * DEG,
  };
}

/** Initial bearing from `a` to `b`, degrees clockwise from north. */
export function bearing(a: LatLon, b: LatLon): number {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * DEG + 360) % 360;
}

/** Point on Earth where the sun is directly overhead at `time`. */
export function subsolarPoint(time: number): LatLon {
  const date = new Date(time);
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (time - startOfYear) / 86_400_000;
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let lon = (12 - utcHours) * 15;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat: declination, lon };
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compass = (degrees: number) =>
  COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
