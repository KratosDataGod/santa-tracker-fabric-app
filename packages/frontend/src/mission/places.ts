import { plain, type Home } from './home';

/**
 * Town and US ZIP code search, entirely inside the browser.
 *
 * The lists ship with the app as two text files that are downloaded only when
 * someone opens the "set my town" box, so no outside service ever sees what a
 * visitor types. Towns come from GeoNames (CC BY 4.0); ZIP codes from US
 * government data. There is deliberately no street-address lookup.
 */
export interface Place extends Home {
  name: string;
}

interface Town {
  key: string;
  name: string;
  sub: string;
  country: string;
  lat: number;
  lon: number;
}

let towns: Promise<Town[]> | null = null;
let zips: Promise<Map<string, Place>> | null = null;

function loadTowns(): Promise<Town[]> {
  towns ??= import('@/assets/data/towns.txt?raw').then(({ default: text }) =>
    text.split('\n').map((row) => {
      const [name, sub, country, lat, lon] = row.split('|');
      return { key: plain(name), name, sub, country, lat: Number(lat), lon: Number(lon) };
    })
  );
  return towns;
}

function loadZips(): Promise<Map<string, Place>> {
  zips ??= import('@/assets/data/zips.txt?raw').then(({ default: text }) => {
    const map = new Map<string, Place>();
    for (const row of text.split('\n')) {
      const [zip, lat, lon, city, state] = row.split('|');
      map.set(zip, { name: `${city}, ${state}`, lat: Number(lat), lon: Number(lon) });
    }
    return map;
  });
  return zips;
}

let countryNames: Intl.DisplayNames | null = null;
function countryName(code: string): string {
  try {
    countryNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const label = (town: Town) =>
  town.country === 'US' || town.country === 'CA'
    ? `${town.name}, ${town.sub}`
    : `${town.name}, ${countryName(town.country)}`;

/** Up to `limit` places matching what the viewer typed: a town name, "town, state" or a US ZIP code. */
export async function searchPlaces(query: string, limit = 8): Promise<(Place & { hint?: string })[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  if (/^\d{3,5}$/.test(text)) {
    const map = await loadZips();
    if (text.length === 5) {
      const hit = map.get(text);
      return hit ? [{ ...hit, hint: `ZIP ${text}` }] : [];
    }
    const out: (Place & { hint?: string })[] = [];
    for (const [zip, place] of map) {
      if (zip.startsWith(text)) out.push({ ...place, hint: `ZIP ${zip}` });
      if (out.length >= limit) break;
    }
    return out;
  }

  const [namePart, regionPart = ''] = text.split(',').map((part) => plain(part.trim()));
  if (namePart.length < 2) return [];
  const list = await loadTowns();
  const regionMatches = (town: Town) =>
    !regionPart ||
    plain(town.sub).startsWith(regionPart) ||
    plain(countryName(town.country)).startsWith(regionPart);
  // The list is ordered by population, so the first matches are the likeliest.
  const starts: Town[] = [];
  const contains: Town[] = [];
  for (const town of list) {
    if (!regionMatches(town)) continue;
    if (town.key.startsWith(namePart)) {
      starts.push(town);
      if (starts.length >= limit) break;
    } else if (contains.length < limit && town.key.includes(namePart)) {
      contains.push(town);
    }
  }
  return [...starts, ...contains].slice(0, limit).map((town) => ({
    name: label(town),
    lat: town.lat,
    lon: town.lon,
  }));
}
