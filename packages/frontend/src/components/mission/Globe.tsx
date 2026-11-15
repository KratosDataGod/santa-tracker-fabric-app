import { geoCircle, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import type { Feature, LineString, MultiPolygon } from 'geojson';
import { useEffect, useMemo, useRef } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';

import type { MissionState } from '@/mission/derive';
import { NORTH_POLE, subsolarPoint } from '@/mission/geo';
import type { SeasonData } from '@/mission/model';

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topology, topology.objects.land) as unknown as Feature<MultiPolygon>;
const GRATICULE = geoGraticule10();

const COLORS = {
  oceanInner: '#3f8fb5',
  oceanOuter: '#123f5f',
  land: '#3d9a5c',
  landEdge: 'rgba(255, 247, 230, 0.85)',
  graticule: 'rgba(255, 247, 230, 0.1)',
  night: 'rgba(6, 16, 40, 0.42)',
  planned: 'rgba(255, 247, 230, 0.4)',
  ribbonRed: '#e5203a',
  ribbonWhite: '#fff7e6',
  pending: 'rgba(255, 247, 230, 0.75)',
  delivered: '#ffd76a',
  nose: '#e5203a',
  label: '#fff7e6',
};

// Snowflakes drifting inside the glass.
const FLAKES = Array.from({ length: 46 }, (_, i) => ({
  a: (i * 2.399) % (Math.PI * 2),
  r: 0.15 + ((i * 37) % 80) / 100,
  size: 1 + (i % 3) * 0.6,
  speed: 0.05 + ((i * 11) % 10) / 120,
}));

interface GlobeProps {
  data: SeasonData;
  state: MissionState;
}

/**
 * Orthographic globe drawn on canvas. Follows the sleigh in flight; before
 * takeoff it looks down on the Arctic, where the workshop is.
 */
export function Globe({ data, state }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const size = useRef({ width: 0, height: 0, dpr: 1 });
  const rotation = useRef<[number, number] | null>(null);
  const latest = useRef({ data, state });
  useEffect(() => {
    latest.current = { data, state };
  }, [data, state]);

  const plannedRoute = useMemo<Feature<LineString>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 90],
          ...data.stops.map((s) => [s.lon, s.lat]),
          [0, 90],
        ],
      },
    }),
    [data.stops]
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { width: rect.width, height: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    let frame = 0;
    const draw = (wall: number) => {
      frame = requestAnimationFrame(draw);
      const { width, height, dpr } = size.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || width < 10 || height < 10) return;
      const { data: season, state: mission } = latest.current;
      const sleigh = mission.sleigh;
      const airborne = sleigh.status !== 'docked' && sleigh.status !== 'home';

      // Camera: ease toward the sleigh in flight, or a slow Arctic orbit.
      const target: [number, number] = airborne
        ? [-sleigh.position.lon, -Math.max(-55, Math.min(72, sleigh.position.lat * 0.82))]
        : [((wall / 1000) * 1.2) % 360, -68];
      const current = rotation.current ?? target;
      let dLon = target[0] - current[0];
      dLon = ((((dLon + 180) % 360) + 360) % 360) - 180;
      const ease = airborne ? 0.08 : 1;
      rotation.current = [current[0] + dLon * ease, current[1] + (target[1] - current[1]) * 0.08];

      const radius = Math.min(width, height) / 2 - 14;
      const projection = geoOrthographic()
        .translate([width / 2, height / 2])
        .scale(radius)
        .rotate([rotation.current[0], rotation.current[1], 0])
        .clipAngle(90);
      const path = geoPath(projection, ctx);
      const centre: [number, number] = [-rotation.current[0], -rotation.current[1]];
      const visible = (lon: number, lat: number) =>
        geoDistance([lon, lat], centre) < Math.PI / 2 - 0.02;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Atmosphere + ocean
      const glow = ctx.createRadialGradient(
        width / 2, height / 2, radius * 0.96,
        width / 2, height / 2, radius * 1.12
      );
      glow.addColorStop(0, 'rgba(255, 247, 230, 0.35)');
      glow.addColorStop(1, 'rgba(255, 247, 230, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius * 1.12, 0, Math.PI * 2);
      ctx.fill();

      const ocean = ctx.createRadialGradient(
        width / 2 - radius * 0.3, height / 2 - radius * 0.35, radius * 0.1,
        width / 2, height / 2, radius
      );
      ocean.addColorStop(0, COLORS.oceanInner);
      ocean.addColorStop(1, COLORS.oceanOuter);
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();

      ctx.beginPath();
      path(GRATICULE);
      ctx.strokeStyle = COLORS.graticule;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = COLORS.land;
      ctx.fill();
      ctx.strokeStyle = COLORS.landEdge;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Night side
      const sun = subsolarPoint(mission.time);
      const night = geoCircle()
        .center([sun.lon + 180, -sun.lat])
        .radius(90)();
      ctx.beginPath();
      path(night);
      ctx.fillStyle = COLORS.night;
      ctx.fill();

      // Planned route: only before takeoff, when it is a promise of the night ahead.
      if (sleigh.status === 'docked') {
        ctx.beginPath();
        path(plannedRoute);
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = COLORS.planned;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Flown route
      if (sleigh.status !== 'docked' && sleigh.status !== 'home') {
        // The last stretch only, like a comet's tail.
        const from = Math.max(0, sleigh.stopsDone - 45);
        const done = season.stops.slice(from, sleigh.stopsDone);
        const flown: Feature<LineString> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              ...(from === 0 ? [[0, 90]] : []),
              ...done.map((s) => [s.lon, s.lat]),
              [sleigh.position.lon, sleigh.position.lat],
            ],
          },
        };
        // A candy-cane ribbon: red underneath, cream dashes on top.
        ctx.lineCap = 'round';
        ctx.beginPath();
        path(flown);
        ctx.strokeStyle = COLORS.ribbonRed;
        ctx.lineWidth = 3.4;
        ctx.stroke();
        ctx.beginPath();
        path(flown);
        ctx.setLineDash([5, 7]);
        ctx.strokeStyle = COLORS.ribbonWhite;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
      }

      // Stops
      for (const stop of season.stops) {
        if (!visible(stop.lon, stop.lat)) continue;
        const point = projection([stop.lon, stop.lat]);
        if (!point) continue;
        const isDone =
          stop.seq <= sleigh.stopsDone ||
          (sleigh.status === 'delivering' && sleigh.target?.seq === stop.seq);
        ctx.beginPath();
        ctx.arc(point[0], point[1], isDone ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = isDone ? COLORS.delivered : COLORS.pending;
        ctx.shadowColor = COLORS.delivered;
        ctx.shadowBlur = isDone ? 8 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const pulse = 0.5 + 0.5 * Math.sin(wall / 260);
      ctx.font = '600 13px Fredoka, "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const label = (text: string, x: number, y: number) => {
        ctx.strokeStyle = 'rgba(8, 26, 43, 0.92)';
        ctx.lineWidth = 4;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = COLORS.label;
        ctx.fillText(text, x, y);
      };

      // Workshop at the Pole
      if (visible(NORTH_POLE.lon, NORTH_POLE.lat)) {
        const pole = projection([0, 90]);
        if (pole) {
          ctx.beginPath();
          ctx.arc(pole[0], pole[1], 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffd76a';
          ctx.shadowBlur = 14 + pulse * 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          label("Santa's Workshop", pole[0] + 10, pole[1]);
        }
      }

      // Next stop label
      if (sleigh.target && airborne && visible(sleigh.target.lon, sleigh.target.lat)) {
        const next = projection([sleigh.target.lon, sleigh.target.lat]);
        if (next) {
          ctx.beginPath();
          ctx.arc(next[0], next[1], 6, 0, Math.PI * 2);
          ctx.strokeStyle = COLORS.delivered;
          ctx.lineWidth = 2;
          ctx.stroke();
          label(sleigh.target.city, next[0] + 12, next[1] - 12);
        }
      }

      // The sleigh: its lead lantern
      if (airborne && visible(sleigh.position.lon, sleigh.position.lat)) {
        const here = projection([sleigh.position.lon, sleigh.position.lat]);
        if (here) {
          ctx.beginPath();
          ctx.arc(here[0], here[1], 10 + pulse * 7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 215, 106, ${0.3 - pulse * 0.16})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(here[0], here[1], 5, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.nose;
          ctx.shadowColor = COLORS.nose;
          ctx.shadowBlur = 18;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(here[0] - 1.4, here[1] - 1.4, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fill();
        }
      }

      // Snow drifting inside the glass, and a soft highlight on it.
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (const flake of FLAKES) {
        const fall = ((wall / 1000) * flake.speed + flake.r) % 1;
        const x = width / 2 + Math.cos(flake.a) * radius * flake.r + Math.sin(wall / 900 + flake.a) * 6;
        const y = height / 2 - radius + fall * radius * 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const shine = ctx.createRadialGradient(
        width / 2 - radius * 0.45, height / 2 - radius * 0.5, radius * 0.05,
        width / 2 - radius * 0.45, height / 2 - radius * 0.5, radius * 0.7
      );
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 247, 230, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [plannedRoute]);

  const sleigh = state.sleigh;
  const description =
    sleigh.status === 'docked'
      ? 'Globe centred on the Arctic. The sleigh is docked at the North Pole.'
      : sleigh.status === 'home'
        ? 'Globe centred on the Arctic. The sleigh is home.'
        : `Globe following the sleigh at latitude ${sleigh.position.lat.toFixed(1)}, longitude ${sleigh.position.lon.toFixed(1)}.`;

  return (
    <div ref={wrapRef} className="relative h-full min-h-[340px] w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={description}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
