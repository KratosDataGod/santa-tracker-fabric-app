import { CircleAlert, Radio } from 'lucide-react';

import { ago, weatherLabel } from '@/mission/format';
import { compass } from '@/mission/geo';
import type { ClockMode, LiveFeed } from '@/mission/hooks';
import { snowText, type Snow } from '@/mission/snow';

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-stage-build)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Real-world weather pulled from Open-Meteo into Fabric by `ingestLiveFeed`. */
export function LiveFeedPanel({
  feed,
  mode,
  now,
  visitor = false,
  snow = null,
}: {
  feed: LiveFeed;
  mode: ClockMode;
  now: number;
  /** Public visitors get weather straight from Open-Meteo, not from Fabric. */
  visitor?: boolean;
  /** Real snow on the ground and fresh snowfall, when the weather service has it. */
  snow?: Snow | null;
}) {
  const latest = feed.readings[0];
  const temps = [...feed.readings].reverse().map((r) => r.temperatureF);

  return (
    <section className="panel panel-emerald p-500" aria-label="Live weather feed">
      <div className="flex items-start justify-between gap-300">
        <div>
          <div className="eyebrow">{visitor ? 'Live weather · Open-Meteo' : 'Live API feed · Open-Meteo → Fabric'}</div>
          <h2 className="ink-title mt-100 text-hero-800 leading-hero-800">
            The Weather Elf reports
          </h2>
        </div>
        <Radio
          aria-hidden
          className={`h-5 w-5 shrink-0 ${mode === 'live' && feed.status === 'ok' ? 'beacon text-stage-deliver' : 'text-muted-foreground'}`}
        />
      </div>

      {feed.status === 'error' && !visitor && (
        <p role="status" className="mt-300 flex items-start gap-200 rounded-xl border border-destructive px-300 py-200 text-200">
          <CircleAlert aria-hidden className="mt-[2px] h-4 w-4 shrink-0 text-destructive" />
          <span>
            <span className="font-semibold text-ink">The feed could not update.</span>{' '}
            <span className="text-muted-foreground">{feed.message} It will try again {visitor ? 'in a few minutes' : 'in a minute'}.</span>
          </span>
        </p>
      )}

      {latest ? (
        <>
          <div className="mt-300 flex items-end justify-between gap-300">
            <div>
              <div className="num text-hero-900 leading-hero-900 text-stage-build"
                style={{ textShadow: '0 1px 0 rgba(255, 248, 220, 0.7)' }}>
                {latest.temperatureF.toFixed(0)}°F
              </div>
              <div className="title text-500 leading-500 text-ink">{weatherLabel(latest.weatherCode)}</div>
            </div>
            <dl className="grid grid-cols-2 gap-x-400 gap-y-100 text-200">
              <dt className="text-muted-foreground">Wind</dt>
              <dd className="num text-right text-ink">
                {latest.windMph.toFixed(0)} mph {compass(latest.windDirection)}
              </dd>
              <dt className="text-muted-foreground">Cloud</dt>
              <dd className="num text-right text-ink">{latest.cloudCover}%</dd>
            </dl>
          </div>
          <div className="mt-200">
            <Sparkline values={temps} />
          </div>
          <p className="mt-100 text-200 text-muted-foreground">
            Real conditions at {latest.place} · {visitor ? 'read' : 'stored'} {ago(now - latest.observedAt)} ·{' '}
            {feed.readings.length} recent {feed.readings.length === 1 ? 'reading' : 'readings'}
          </p>
        </>
      ) : (
        <p className="mt-300 text-300 text-muted-foreground">
          {feed.status === 'idle'
            ? visitor
              ? 'Asking the Weather Elf…'
              : 'Checking Fabric for stored readings…'
            : visitor
              ? 'No reading yet. The Weather Elf will try again in a few minutes.'
              : 'No readings stored yet. The first one arrives within a minute of going live.'}
        </p>
      )}

      {snow && (snow.depthIn !== null || snow.freshIn !== null) && (
        <dl className="slip mt-300 grid grid-cols-2 gap-300 rounded-lg px-400 py-200" aria-label={`Snow at ${snow.place}`}>
          <div>
            <dt className="eyebrow">❄ Snow on the ground</dt>
            <dd className="num text-600 text-stage-build">{snowText(snow.depthIn) ?? 'no report'}</dd>
          </div>
          <div>
            <dt className="eyebrow">Fresh snow today</dt>
            <dd className="num text-600 text-stage-build">{snowText(snow.freshIn) ?? 'no report'}</dd>
          </div>
          <p className="col-span-2 text-200 text-muted-foreground">Real snow report for {snow.place}.</p>
        </dl>
      )}

      {mode === 'replay' && (
        <p className="mt-200 text-200 text-muted-foreground">
          Replay shows a past moment, so the feed is paused. These are the most recent
          real-world readings.
        </p>
      )}
    </section>
  );
}
