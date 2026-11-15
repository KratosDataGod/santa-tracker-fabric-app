import giftArt from '@/assets/stages/gift.webp';
import villageArt from '@/assets/stages/village.webp';
import worldArt from '@/assets/stages/world.webp';
import sleighArt from '@/assets/toys/sleds.webp';

import type { MissionState } from '@/mission/derive';
import { percent, toys, toysCompact } from '@/mission/format';
import type { SeasonData } from '@/mission/model';

interface StageCard {
  id: string;
  label: string;
  verb: string;
  art: string;
  color: string;
  valueK: number;
  note: string;
}

function status(valueK: number, totalK: number) {
  if (valueK <= 0) return 'Not started';
  if (valueK >= totalK - 0.5) return 'Complete';
  return 'In progress';
}

/** The supply chain at a glance: built → wrapped → loaded → delivered. */
export function Pipeline({ data, state }: { data: SeasonData; state: MissionState }) {
  const total = data.totalToysK;
  const stages: StageCard[] = [
    {
      id: 'build',
      label: "Santa's Workshop",
      verb: 'Toys built',
      art: villageArt,
      color: 'var(--color-stage-build)',
      valueK: state.builtK,
      note: `${toysCompact(Math.max(0, state.builtK - state.wrappedK))} waiting for wrapping`,
    },
    {
      id: 'wrap',
      label: 'Wrapping Hall',
      verb: 'Gifts wrapped',
      art: giftArt,
      color: 'var(--color-stage-wrap)',
      valueK: state.wrappedK,
      note: `${toysCompact(Math.max(0, state.wrappedK - state.loadedK))} waiting for the sleigh`,
    },
    {
      id: 'load',
      label: 'Sleigh Dock',
      verb: 'Sleigh loaded',
      art: sleighArt,
      color: 'var(--color-stage-load)',
      valueK: state.loadedK,
      note: `${toysCompact(state.aboardK)} aboard right now`,
    },
    {
      id: 'deliver',
      label: 'Christmas Eve',
      verb: 'Gifts delivered',
      art: worldArt,
      color: 'var(--color-stage-deliver)',
      valueK: state.deliveredK,
      note: `${state.sleigh.stopsDone} of ${data.stops.length} stops complete`,
    },
  ];

  return (
    <section aria-label="Supply chain" className="grid gap-x-600 gap-y-500 md:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, index) => {
        const pct = percent(stage.valueK, total);
        const stageStatus = status(stage.valueK, total);
        return (
          <article key={stage.id} className="panel relative px-500 pb-500 pt-500">
            {index < stages.length - 1 && (
              <svg
                aria-hidden
                viewBox="0 0 46 46"
                className="gold-arrow absolute -right-[36px] top-1/2 z-10 hidden -translate-y-1/2 xl:block"
              >
                <defs>
                  <linearGradient id={`arrow-${stage.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff6c8" />
                    <stop offset="0.5" stopColor="#ffd34a" />
                    <stop offset="1" stopColor="#d48a12" />
                  </linearGradient>
                </defs>
                <path
                  d="M3 17 H24 V7 L43 23 L24 39 V29 H3 Z"
                  fill={`url(#arrow-${stage.id})`}
                  stroke="#8a5a0a"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <img
              src={stage.art}
              alt=""
              className="pointer-events-none absolute right-300 top-300 h-[88px] w-[38%] select-none object-contain object-right-top"
              draggable={false}
            />
            <div className="relative flex items-center gap-300">
              <span className="seal">{index + 1}</span>
              <div className="max-w-[50%]">
                <div className="eyebrow">{stage.label}</div>
                <div className="title text-400 uppercase leading-400 tracking-wide text-ink">{stage.verb}</div>
              </div>
            </div>

            <div
              className="title num relative mt-400 text-center text-hero-900 leading-hero-900"
              style={{ color: stage.color, textShadow: '0 1px 0 rgba(255, 248, 220, 0.8), 0 0 18px rgba(255, 236, 170, 0.9)' }}
            >
              {toys(stage.valueK)}
            </div>

            <div
              className="glowbar relative mt-200"
              role="progressbar"
              aria-label={`${stage.verb}: ${pct.toFixed(1)} percent of the season total`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="relative mt-300 flex items-center justify-between gap-200 text-200 text-muted-foreground">
              <span>
                <span className="num text-ink">{pct.toFixed(1)}%</span> of {toysCompact(total)}
              </span>
              <span
                className="stamp whitespace-nowrap"
                style={{
                  color:
                    stageStatus === 'In progress'
                      ? stage.color
                      : stageStatus === 'Complete'
                        ? 'var(--color-ink-green)'
                        : 'var(--color-muted-foreground)',
                }}
              >
                {stageStatus}
              </span>
            </div>
            <p className="relative mt-100 text-center text-200 text-muted-foreground">{stage.note}</p>
          </article>
        );
      })}
    </section>
  );
}
