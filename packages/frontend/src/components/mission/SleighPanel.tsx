import type { ReactNode } from 'react';

import type { MissionState } from '@/mission/derive';
import { duration, percent, toysCompact, whole } from '@/mission/format';
import { compass } from '@/mission/geo';
import { placeName, type SeasonData } from '@/mission/model';

function Metric({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="slip px-300 py-200">
      <div className="text-200 text-muted-foreground">{label}</div>
      <div className="num text-600 leading-600 text-ink">
        {value}
        {unit && <span className="ml-100 text-200 font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function headline(state: MissionState): { title: string; sub: string } {
  const sleigh = state.sleigh;
  switch (sleigh.status) {
    case 'docked':
      return {
        title: 'Docked at the North Pole',
        sub:
          state.phase === 'load'
            ? 'Loading gifts at Dock 1'
            : state.phase === 'offseason'
              ? 'The workshop has not opened yet'
              : 'Waiting while the elves build and wrap',
      };
    case 'enroute':
      return {
        title: `En route to ${sleigh.target?.city ?? 'the next stop'}`,
        sub: sleigh.target
          ? `${placeName(sleigh.target)} · ${toysCompact(sleigh.target.giftsK)} gifts to drop`
          : '',
      };
    case 'delivering':
      return {
        title: `Delivering in ${sleigh.target?.city ?? ''}`,
        sub: sleigh.target ? `${placeName(sleigh.target)} · down the chimneys right now` : '',
      };
    case 'returning':
      return { title: 'Heading home', sub: 'Every stop delivered. Next: the North Pole' };
    case 'home':
      return { title: 'Home at the North Pole', sub: 'Mission complete. Merry Christmas!' };
  }
}

export function SleighPanel({ data, state }: { data: SeasonData; state: MissionState }) {
  const sleigh = state.sleigh;
  const { title, sub } = headline(state);
  const airborne = sleigh.status === 'enroute' || sleigh.status === 'returning';
  const routePct = percent(sleigh.stopsDone, data.stops.length);
  const countdown =
    sleigh.status === 'docked'
      ? { label: 'Takeoff in', value: duration(data.timeline.takeoff - state.time) }
      : sleigh.status === 'enroute'
        ? { label: 'Arrives in', value: duration(sleigh.etaMs) }
        : sleigh.status === 'returning'
          ? { label: 'Lands in', value: duration(sleigh.etaMs) }
          : sleigh.status === 'delivering'
            ? { label: 'Status', value: 'On the roof' }
            : { label: 'Status', value: 'Landed' };

  return (
    <section className="panel p-500" aria-label="Sleigh telemetry">
      <div className="flex items-start justify-between gap-300">
        <div>
          <div className="eyebrow">Sleigh tracker</div>
          <h2 className="ink-title mt-100 text-hero-800 leading-hero-800">{title}</h2>
          <p className="text-200 text-muted-foreground">{sub}</p>
        </div>
        <span
          aria-hidden
          className={`mt-100 h-3 w-3 shrink-0 rounded-full ${airborne ? 'beacon' : ''}`}
          style={{
            backgroundColor: airborne || sleigh.status === 'delivering' ? 'var(--color-nose)' : 'rgba(92, 56, 14, 0.35)',
            boxShadow: airborne ? '0 0 14px var(--color-nose)' : undefined,
          }}
        />
      </div>

      <div className="mt-300 grid grid-cols-2 gap-200">
        <Metric label={countdown.label} value={countdown.value} />
        <Metric label="Gifts aboard" value={toysCompact(state.aboardK)} />
        <Metric label="Speed" value={whole(sleigh.speedMph)} unit="mph" />
        <Metric label="Altitude" value={whole(sleigh.altitudeFt)} unit="ft" />
        <Metric
          label="Heading"
          value={airborne ? `${whole(sleigh.headingDeg)}° ${compass(sleigh.headingDeg)}` : '–'}
        />
        <Metric label="Countries" value={`${state.coverage.countries} / ${state.coverage.countriesTotal}`} />
        <Metric label="US states" value={`${state.coverage.us} / ${state.coverage.usTotal}`} />
        <Metric label="Canadian provinces and territories" value={`${state.coverage.ca} / ${state.coverage.caTotal}`} />
        <Metric label="EU countries" value={`${state.coverage.eu} / ${state.coverage.euTotal}`} />
        <Metric
          label="Position"
          value={`${Math.abs(sleigh.position.lat).toFixed(1)}°${sleigh.position.lat >= 0 ? 'N' : 'S'} ${Math.abs(sleigh.position.lon).toFixed(1)}°${sleigh.position.lon >= 0 ? 'E' : 'W'}`}
        />
      </div>

      <div className="mt-300">
        <div className="flex justify-between text-200 text-muted-foreground">
          <span>Route</span>
          <span className="num text-ink">
            {sleigh.stopsDone} / {data.stops.length} stops
          </span>
        </div>
        <div
          className="track mt-100 h-3 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Route progress"
          aria-valuemin={0}
          aria-valuemax={data.stops.length}
          aria-valuenow={sleigh.stopsDone}
        >
          <div
            className="flowing h-full rounded-full"
            style={{ width: `${routePct}%`, backgroundColor: 'var(--color-primary)' }}
          />
        </div>
      </div>
    </section>
  );
}
