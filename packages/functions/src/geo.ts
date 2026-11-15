/** Small great-circle helpers. Self-contained so the functions bundle has no workspace runtime dependency. */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Interpolates along the great circle from `a` to `b` (t in 0..1). */
export function interpolateGreatCircle(a: LatLon, b: LatLon, t: number): LatLon {
  const lat1 = a.lat * RAD;
  const lon1 = a.lon * RAD;
  const lat2 = b.lat * RAD;
  const lon2 = b.lon * RAD;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
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
