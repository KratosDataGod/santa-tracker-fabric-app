import type {
  LiveReadingRecord,
  MissionEventRecord,
  ProductionSnapshotRecord,
  RouteStopRecord,
  SeasonRecord,
  ToyLineRecord,
} from '@rayfin-app/shared';

/** Timeline of a season in epoch milliseconds. */
export interface Timeline {
  buildStart: number;
  wrapStart: number;
  loadStart: number;
  takeoff: number;
  landing: number;
}

export interface Stop {
  seq: number;
  city: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  arrival: number;
  departure: number;
  giftsK: number;
  cumulativeK: number;
  /** US state name, when the stop is in one of the 50 states. */
  usState: string | null;
  /** Canadian province or territory name, when the stop is in one. */
  caProvince: string | null;
  /** True when the stop's country is one of the 195 counted countries. */
  counted: boolean;
  /** True when the stop is in an EU member state. */
  eu: boolean;
  /** True for the viewer's own house, on their copy of the route. */
  personal?: boolean;
}

/** "Milwaukee, Wisconsin" or "Regina, Saskatchewan" in North America, "Paris, France" elsewhere. */
export const placeName = (stop: Stop) =>
  stop.personal ? stop.city : `${stop.city}, ${stop.usState ?? stop.caProvince ?? stop.country}`;

export interface Snapshot {
  ts: number;
  builtK: number;
  wrappedK: number;
  loadedK: number;
}

export interface ToyLine {
  code: string;
  name: string;
  emoji: string;
  workshop: string;
  leadElf: string;
  tagline: string;
  targetK: number;
  snapshots: Snapshot[];
}

export interface LogEvent {
  key: string;
  ts: number;
  stage: 'build' | 'wrap' | 'load' | 'flight';
  kind: string;
  title: string;
  detail: string | null;
  stopSeq: number | null;
}

/** Everything the app reads from Fabric for one season, normalised. */
export interface SeasonData {
  year: number;
  name: string;
  timeline: Timeline;
  totalToysK: number;
  lines: ToyLine[];
  stops: Stop[];
  events: LogEvent[];
}

export interface LiveReading {
  id: string;
  observedAt: number;
  phase: string;
  place: string;
  lat: number;
  lon: number;
  temperatureF: number;
  windMph: number;
  windDirection: number;
  cloudCover: number;
  weatherCode: number;
  provider: string;
}

const ms = (value: Date | string) => new Date(value).getTime();

export function normaliseSeason(
  season: SeasonRecord,
  lines: ToyLineRecord[],
  stops: RouteStopRecord[],
  snapshots: ProductionSnapshotRecord[],
  events: MissionEventRecord[]
): SeasonData {
  const byLine = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const list = byLine.get(s.lineCode) ?? [];
    list.push({
      ts: ms(s.ts),
      builtK: Number(s.builtK),
      wrappedK: Number(s.wrappedK),
      loadedK: Number(s.loadedK),
    });
    byLine.set(s.lineCode, list);
  }
  for (const list of byLine.values()) list.sort((a, b) => a.ts - b.ts);

  return {
    year: Number(season.year),
    name: season.name,
    timeline: {
      buildStart: ms(season.buildStart),
      wrapStart: ms(season.wrapStart),
      loadStart: ms(season.loadStart),
      takeoff: ms(season.takeoff),
      landing: ms(season.landing),
    },
    totalToysK: Number(season.totalToysK),
    lines: [...lines]
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((l) => ({
        code: l.code,
        name: l.name,
        emoji: l.emoji,
        workshop: l.workshop,
        leadElf: l.leadElf,
        tagline: l.tagline,
        targetK: Number(l.targetK),
        snapshots: byLine.get(l.code) ?? [],
      })),
    stops: stops
      .map((s) => ({
        seq: Number(s.seq),
        city: s.city,
        country: s.country,
        region: s.region,
        lat: Number(s.lat),
        lon: Number(s.lon),
        arrival: ms(s.arrival),
        departure: ms(s.departure),
        giftsK: Number(s.giftsK),
        cumulativeK: Number(s.cumulativeK),
        usState: s.usState ?? null,
        caProvince: s.caProvince ?? null,
        counted: s.tally === 'UN',
        eu: s.bloc === 'EU',
        ...(s.mine ? { personal: true } : {}),
      }))
      .sort((a, b) => a.seq - b.seq),
    events: events
      .map((e) => ({
        key: e.key,
        ts: ms(e.ts),
        stage: e.stage,
        kind: e.kind,
        title: e.title,
        detail: e.detail ?? null,
        stopSeq: e.stopSeq == null ? null : Number(e.stopSeq),
      }))
      .sort((a, b) => a.ts - b.ts),
  };
}

export function normaliseReading(r: LiveReadingRecord): LiveReading {
  return {
    id: r.id,
    observedAt: ms(r.observedAt),
    phase: r.phase,
    place: r.place,
    lat: Number(r.lat),
    lon: Number(r.lon),
    temperatureF: Number(r.temperatureF),
    windMph: Number(r.windMph),
    windDirection: Number(r.windDirection),
    cloudCover: Number(r.cloudCover),
    weatherCode: Number(r.weatherCode),
    provider: r.provider,
  };
}
