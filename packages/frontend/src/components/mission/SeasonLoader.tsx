import { CircleAlert, Gift, RefreshCw, Snowflake } from 'lucide-react';
import type { ReactNode } from 'react';

import { PaperDefs, Snowfall } from './Decor';
import { Hero } from './Hero';

import type { SeasonView, SeedState } from '@/mission/hooks';

interface SeasonLoaderProps {
  year: number;
  view: SeasonView;
  seed: SeedState;
  onLoad: () => void;
  onRetry: () => void;
  /** Public visitors cannot load the season; they are asked to come back. */
  visitor?: boolean;
  crew?: ReactNode;
}

/** Shown until the season's rows exist in the app's Fabric SQL database. */
export function SeasonLoader({ year, view, seed, onLoad, onRetry, visitor, crew }: SeasonLoaderProps) {
  const pct = seed.total > 0 ? Math.round((seed.done / seed.total) * 100) : 0;
  const button =
    'inline-flex h-12 items-center gap-200 rounded-full border-2 border-gold bg-primary px-600 text-400 font-semibold text-primary-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60';

  return (
    <div className="mission-sky film relative flex min-h-screen flex-col overflow-x-clip font-base">
      <Hero showTitle={false} />
      <PaperDefs />
      <Snowfall />
      <div className="relative z-10 flex flex-1 items-center justify-center p-400">
      <div className="panel w-full max-w-xl p-800 text-center">
        <div className="relative z-10">
        <Snowflake aria-hidden className="mx-auto h-10 w-10 text-ink-red" />
        <h1 className="marquee ink-title mt-200 text-hero-800 leading-hero-800">
          North Pole Mission Control
        </h1>

        {view.status === 'loading' && (
          <p className="mt-300 text-300 text-muted-foreground" role="status">
            {visitor ? `Unrolling Christmas ${year}…` : `Reading Christmas ${year} from Fabric…`}
          </p>
        )}

        {view.status === 'error' && (
          <>
            <p className="mt-300 flex items-start justify-center gap-200 text-300" role="alert">
              <CircleAlert aria-hidden className="mt-[2px] h-4 w-4 shrink-0 text-destructive" />
              <span>
                <span className="font-semibold text-ink">The season could not be read from Fabric.</span>{' '}
                <span className="text-muted-foreground">{view.message}</span>
              </span>
            </p>
            <button type="button" className={`${button} mt-400`} onClick={onRetry}>
              <RefreshCw aria-hidden className="h-4 w-4" />
              Try again
            </button>
          </>
        )}

        {visitor && view.status !== 'loading' && view.status !== 'error' && (
          <p className="mt-300 text-300 text-muted-foreground">
            The elves are still setting up Christmas {year}. Check back soon.
          </p>
        )}

        {!visitor && (view.status === 'missing' || view.status === 'partial' || view.status === 'outdated') && (
          <>
            <p className="mt-300 text-300 text-muted-foreground">
              {view.status === 'missing'
                ? `Christmas ${year} is not in this app's Fabric database yet.`
                : view.status === 'outdated'
                  ? `Santa has a new route for Christmas ${year}, with more stops than the one stored in Fabric. Rebuilding clears the old plan first.`
                  : `Christmas ${year} is only partly loaded. Loading again picks up where it stopped.`}{' '}
              Loading writes the season plan (twelve toy workshops, production, the delivery route and the
              Gazette, about 4,200 rows) into the app's SQL database in Fabric. It takes several
              minutes, and only ever needs doing once per season.
            </p>

            {seed.running ? (
              <div className="mt-400" role="status">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="flowing h-full rounded-full bg-primary" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                <p className="num mt-200 text-200 text-muted-foreground">
                  {seed.step === 'clearing'
                    ? `Clearing the old plan: ${seed.done} rows removed`
                    : seed.total > 0
                      ? `${seed.done} of ${seed.total} rows written to Fabric`
                      : 'Starting…'}
                </p>
              </div>
            ) : (
              <button type="button" className={`${button} mt-400`} onClick={onLoad}>
                <Gift aria-hidden className="h-5 w-5" />
                {view.status === 'outdated' ? `Rebuild Christmas ${year} in Fabric` : `Load Christmas ${year} into Fabric`}
              </button>
            )}

            {seed.error && (
              <p className="mt-300 text-200" role="alert">
                <span className="font-semibold text-destructive">Loading stopped.</span>{' '}
                <span className="text-muted-foreground">
                  {seed.error} Nothing is lost. Press the button to continue.
                </span>
              </p>
            )}
          </>
        )}
        {crew && <div className="mt-400 flex justify-center">{crew}</div>}
        </div>
      </div>
      </div>
    </div>
  );
}
