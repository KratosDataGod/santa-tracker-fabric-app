import { geoDistance, geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiLineString } from 'geojson';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import type { MissionState } from '@/mission/derive';
import { duration, toysCompact } from '@/mission/format';
import { placeName, type SeasonData, type Stop } from '@/mission/model';

import { SantaSleigh } from './SantaSleigh';

interface MapData {
  countries: FeatureCollection;
  borders: MultiLineString;
  states: MultiLineString;
}

const EARTH_RADIUS_KM = 6371;
const GRATICULE = geoGraticule().step([5, 5])();

const INK = {
  sea: '#c9dbe0',
  seaDeep: '#a9c4cd',
  land: '#efe0b4',
  landEdge: '#7a5a2c',
  border: 'rgba(110, 72, 26, 0.75)',
  state: 'rgba(110, 72, 26, 0.45)',
  graticule: 'rgba(90, 60, 20, 0.14)',
  text: '#3a2412',
  done: '#17713f',
  todo: '#b3122b',
};

/**
 * A close-up, old-atlas map that follows the sleigh: country and state lines,
 * the towns nearby, and Santa himself flying from one to the next.
 */
export function LocalMap({
  data,
  state,
  overlay,
  restAt,
}: {
  data: SeasonData;
  state: MissionState;
  /** Where to rest the map while the sleigh is at the Pole, such as the viewer's town. */
  restAt?: { lat: number; lon: number } | null;
  /** Drawn over the map area, such as the rooftop landing scene. */
  overlay?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<MapData | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const latest = useRef({ data, state, restAt });
  useEffect(() => {
    latest.current = { data, state, restAt };
  }, [data, state, restAt]);

  // The detailed outlines are large, so they load only when the map is shown.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      import('world-atlas/countries-50m.json'),
      import('us-atlas/states-10m.json'),
    ]).then(([world, usa]) => {
      if (cancelled) return;
      const w = world.default as unknown as Topology<{ countries: GeometryCollection }>;
      const u = usa.default as unknown as Topology<{ states: GeometryCollection }>;
      setMap({
        countries: feature(w, w.objects.countries) as unknown as FeatureCollection,
        borders: mesh(w, w.objects.countries, (a, b) => a !== b),
        states: mesh(u, u.objects.states, (a, b) => a !== b),
      });
    }).catch(() => {
      // The outlines could not be downloaded; say so instead of spinning forever.
      if (!cancelled) setMapFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !map) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    let frame = 0;
    let last = 0;
    let viewKm = 1400;
    const draw = (wall: number) => {
      frame = requestAnimationFrame(draw);
      if (wall - last < 60) return; // ~16 fps is plenty for a paper map
      last = wall;
      const ctx = canvas.getContext('2d');
      if (!ctx || width < 10 || height < 10) return;
      const { data: season, state: mission, restAt: rest } = latest.current;
      const s = mission.sleigh;
      const parked = s.status === 'docked' || s.status === 'home';
      const centre = parked && rest ? rest : s.position;

      // Close in on the rooftops while delivering, pull back between towns.
      const wantKm = parked && rest ? 700 : s.status === 'delivering' ? 420 : s.status === 'enroute' ? 1300 : 2200;
      viewKm += (wantKm - viewKm) * 0.12;
      const half = Math.min(width, height) / 2;
      const scale = half / (viewKm / EARTH_RADIUS_KM);
      const clip = Math.min(89, ((viewKm / EARTH_RADIUS_KM) * 180) / Math.PI * 2.1);
      const projection = geoOrthographic()
        .translate([width / 2, height / 2])
        .scale(scale)
        .rotate([-centre.lon, -centre.lat, 0])
        .clipAngle(clip);
      const path = geoPath(projection, ctx);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sea = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      sea.addColorStop(0, INK.sea);
      sea.addColorStop(1, INK.seaDeep);
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, width, height);

      // Near the Pole every meridian meets in one point and the grid turns
      // into a starburst, so the grid is left off up there.
      if (Math.abs(centre.lat) < 72) {
        ctx.beginPath();
        path(GRATICULE);
        ctx.strokeStyle = INK.graticule;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      path(map.countries);
      ctx.fillStyle = INK.land;
      ctx.fill();
      ctx.strokeStyle = INK.landEdge;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      path(map.borders);
      ctx.strokeStyle = INK.border;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.beginPath();
      path(map.states);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = INK.state;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      const near = (stop: Stop) =>
        geoDistance([stop.lon, stop.lat], [centre.lon, centre.lat]) < ((clip - 2) * Math.PI) / 180;

      // The way he came (candy stripe) and the way ahead (dotted).
      if (s.previous || s.status === 'enroute') {
        const from = s.previous ?? { lat: 90, lon: 0 };
        ctx.lineCap = 'round';
        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[from.lon, from.lat], [centre.lon, centre.lat]] });
        ctx.strokeStyle = '#c8102e';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[from.lon, from.lat], [centre.lon, centre.lat]] });
        ctx.setLineDash([8, 10]);
        ctx.strokeStyle = '#fff8e8';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
      }
      if (s.status === 'enroute' && s.target) {
        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[centre.lon, centre.lat], [s.target.lon, s.target.lat]] });
        ctx.setLineDash([2, 7]);
        ctx.strokeStyle = INK.todo;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Towns
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      // Dots for every town in view; names only where there is room, the next
      // stop first and then the biggest deliveries.
      const towns: { stop: Stop; x: number; y: number; isTarget: boolean }[] = [];
      for (const stop of season.stops) {
        if (!near(stop)) continue;
        const point = projection([stop.lon, stop.lat]);
        if (!point || point[0] < -20 || point[0] > width + 20 || point[1] < -20 || point[1] > height + 20) continue;
        towns.push({ stop, x: point[0], y: point[1], isTarget: s.target?.seq === stop.seq });
      }
      for (const town of towns) {
        if (town.stop.personal) {
          // The viewer's own house: a gold star.
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 13 : 5.5;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            ctx.lineTo(town.x + r * Math.cos(a), town.y + r * Math.sin(a));
          }
          ctx.closePath();
          ctx.fillStyle = '#f2b824';
          ctx.strokeStyle = '#7a4a06';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          continue;
        }
        const radius = town.isTarget ? 7 : 4;
        ctx.beginPath();
        ctx.arc(town.x, town.y, radius + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 248, 232, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(town.x, town.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = town.stop.seq <= s.stopsDone ? INK.done : INK.todo;
        ctx.fill();
      }
      // A target ring on the next stop.
      const target = towns.find((town) => town.isTarget);
      if (target) {
        for (const [r, alpha] of [[13, 0.9], [20, 0.5]] as const) {
          ctx.beginPath();
          ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(214, 150, 20, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      const placed: [number, number, number, number][] = [];
      const ranked = [...towns].sort(
        (a, b) =>
          Number(b.isTarget) - Number(a.isTarget) ||
          Number(Boolean(b.stop.personal)) - Number(Boolean(a.stop.personal)) ||
          b.stop.giftsK - a.stop.giftsK
      );
      for (const town of ranked) {
        ctx.font = `${town.isTarget ? '700 italic 20px' : town.stop.personal ? '700 italic 16px' : 'italic 13px'} "Playfair Display", Georgia, serif`;
        const textWidth = ctx.measureText(town.stop.city).width;
        const tall = town.isTarget ? 24 : 16;
        const x = town.x + (town.isTarget ? 24 : town.stop.personal ? 18 : 9);
        const box: [number, number, number, number] = [x - 4, town.y - tall / 2, x + textWidth + 4, town.y + tall / 2];
        if (box[2] > width - 4) continue;
        if (placed.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
        placed.push(box);
        ctx.strokeStyle = 'rgba(246, 233, 194, 0.95)';
        ctx.lineWidth = 5;
        ctx.strokeText(town.stop.city, x, town.y);
        ctx.fillStyle = INK.text;
        ctx.fillText(town.stop.city, x, town.y);
      }

      // Aged vignette over the whole sheet
      const age = ctx.createRadialGradient(width / 2, height / 2, half * 0.6, width / 2, height / 2, Math.max(width, height) * 0.75);
      age.addColorStop(0, 'rgba(120, 70, 20, 0)');
      age.addColorStop(1, 'rgba(120, 70, 20, 0.42)');
      ctx.fillStyle = age;
      ctx.fillRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  const s = state.sleigh;
  const airborne = s.status === 'enroute' || s.status === 'returning';
  const inFlight = airborne || s.status === 'delivering';
  // Most of the trip runs east to west, so turn the team to face the way it flies.
  const westward = s.headingDeg > 180 || s.status === 'delivering';
  const caption =
    s.status === 'delivering' && s.target
      ? { title: `Delivering in ${placeName(s.target)}`, sub: s.target.personal ? 'Gifts going down the chimney right now' : `${toysCompact(s.target.giftsK)} gifts going down the chimneys` }
      : s.status === 'enroute' && s.target
        ? { title: `Next Stop: ${placeName(s.target)}`, sub: `Arriving in ${duration(s.etaMs)}` }
        : s.status === 'returning'
          ? { title: 'Homeward bound', sub: `Landing at the North Pole in ${duration(s.etaMs)}` }
          : s.status === 'home'
            ? { title: 'Home at the North Pole', sub: 'Every stop delivered' }
            : restAt
              ? { title: 'Your town is on the map', sub: 'Santa is still at the North Pole. The map follows him once he takes off' }
              : { title: 'Waiting at the North Pole', sub: 'The close-up map follows Santa once he takes off' };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative z-10">
        <div className="eyebrow">Current journey</div>
        <h2 className="ink-title truncate text-hero-800 leading-hero-800" title={caption.title}>{caption.title}</h2>
        <p className="title text-400 italic text-ink">{caption.sub}</p>
      </div>
      <div
        ref={wrapRef}
        role="img"
        aria-label={`Close-up map centred on latitude ${s.position.lat.toFixed(1)}, longitude ${s.position.lon.toFixed(1)}. ${caption.title}.`}
        className="relative mt-300 min-h-[280px] flex-1 overflow-hidden rounded-md"
        style={{ boxShadow: '0 0 0 2px rgba(92, 56, 14, 0.6), 0 0 0 6px rgba(246, 233, 194, 0.9), 0 0 0 7px rgba(92, 56, 14, 0.4)' }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {!map && (
          <p className="absolute inset-0 flex items-center justify-center text-300 text-muted-foreground" role="status">
            {mapFailed ? 'The map outlines could not be loaded. Reload the page to try again.' : 'Unrolling the map…'}
          </p>
        )}
        {map && inFlight && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 w-[42%] max-w-[320px]"
            style={{
              aspectRatio: '330 / 150',
              transform: `translate(-50%, -78%) scaleX(${westward ? -1 : 1})`,
            }}
          >
            <SantaSleigh parked={s.status === 'delivering'} />
          </div>
        )}
        {overlay}
        {/* compass */}
        <svg aria-hidden viewBox="-30 -30 60 60" className="pointer-events-none absolute bottom-200 right-200 h-16 w-16 opacity-80">
          <circle r="26" fill="rgba(246,233,194,0.85)" stroke="#7a5a2c" strokeWidth="1.5" />
          <path d="M0 -22 L5 0 L0 22 L-5 0 Z" fill="#b3122b" />
          <path d="M-22 0 L0 -5 L22 0 L0 5 Z" fill="#7a5a2c" opacity="0.7" />
          <text y="-13" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff8e8" fontFamily="Georgia, serif">N</text>
        </svg>
      </div>
    </div>
  );
}

export default LocalMap;
