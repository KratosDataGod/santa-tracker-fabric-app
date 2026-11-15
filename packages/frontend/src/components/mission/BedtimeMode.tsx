import { FastForward, Radio, RotateCcw, Timer, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { nextVisitSpeed, stageMessage, VISIT_SPEEDS } from '@/mission/bedtime';
import { duration, localBrief } from '@/mission/format';
import { STAGE_EARLY_MS, visitStage, type MyVisit } from '@/mission/home';
import type { MissionClock } from '@/mission/hooks';

import { Snowfall } from './Decor';

/**
 * Bedtime mode: the flight view with nothing else on screen. The globe and
 * the close-up map sit side by side under one very large countdown, sized for
 * a tablet or a TV across the room. It asks the browser for full screen and
 * carries on in the window if the browser says no.
 */
export function BedtimeMode({
  visit,
  clock,
  globe,
  map,
  onStart,
  onRealTime,
  onExit,
}: {
  visit: MyVisit;
  clock: MissionClock;
  globe: ReactNode;
  /** The close-up map, rooftop scene included. */
  map: ReactNode;
  /** Start the real-time countdown this long before Santa arrives. */
  onStart: (leadMs: number) => void;
  /** Follow the real clock instead. */
  onRealTime: () => void;
  onExit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const exit = useRef(onExit);
  useEffect(() => {
    exit.current = onExit;
  }, [onExit]);

  useEffect(() => {
    const element = ref.current;
    let wentFull = false;
    element?.requestFullscreen?.().catch(() => {
      // Full screen is a nicety; the mode works in the window too.
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit.current();
    };
    const onChange = () => {
      if (document.fullscreenElement) wentFull = true;
      else if (wentFull) exit.current();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const time = clock.time;
  const { arrival } = visit.stop;
  const stage = visitStage(visit, time);
  const message = stage ? stageMessage(stage, visit, time) : null;
  const before = time < arrival;
  const flashing = stage === 'warning' || stage === 'final';
  // With Santa more than an hour away there is nothing to watch yet, so offer to start a countdown.
  const [choosing, setChoosing] = useState(() => arrival - clock.time > STAGE_EARLY_MS);
  const at = visit.kind === 'zone' ? 'around' : 'at';
  const button =
    'plaque inline-flex h-11 items-center gap-200 !rounded-full px-500 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';
  const bigButton =
    'plaque flex min-h-[112px] flex-1 flex-col items-center justify-center gap-100 !rounded-2xl px-600 py-400 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

  return (
    <div
      ref={ref}
      className="mission-sky fixed inset-0 z-50 flex flex-col gap-300 overflow-hidden p-400 font-base"
      role="dialog"
      aria-label="Bedtime mode"
    >
      <Snowfall />

      {/* The top band: what is happening, and how long is left. */}
      <div
        className={`bedtime-banner relative z-10 flex flex-wrap items-center justify-between gap-x-700 gap-y-200 rounded-2xl px-700 py-300 ${flashing ? 'bedtime-flash' : ''} ${stage === 'here' ? 'bedtime-here' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <div className="marquee text-snow" style={{ fontSize: 'clamp(22px, 3.4vw, 54px)', lineHeight: 1.1 }}>
            {message?.headline ?? (before ? `Santa is coming to ${visit.label}` : `Santa has been to ${visit.label}`)}
          </div>
          <div className="title text-snow/95" style={{ fontSize: 'clamp(15px, 1.7vw, 26px)' }}>
            {message?.body ??
              (before
                ? `He arrives ${at} ${localBrief(arrival)}. Keep being good!`
                : 'He has been and gone. Sweet dreams.')}
          </div>
        </div>
        {before && (
          <div className="text-center" aria-live="off">
            <div className="text-200 font-extrabold uppercase tracking-[0.22em] text-gold">Santa arrives in</div>
            <div className="bedtime-count" style={{ fontSize: 'clamp(46px, 8.5vw, 140px)' }}>
              {duration(arrival - time)}
            </div>
          </div>
        )}
      </div>

      {/* The flight view: globe and close-up map, side by side. */}
      <div className="relative z-10 grid min-h-0 flex-1 gap-400 xl:grid-cols-[1.05fr_1fr]">
        <div className="hidden min-h-0 xl:block">{globe}</div>
        <section className="panel panel-emerald min-h-0 p-400" aria-label="Close-up map">
          {map}
        </section>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-300">
        {clock.mode === 'replay' && (
          <button type="button" className={button} onClick={() => clock.setSpeed(nextVisitSpeed(clock.speed))}>
            <FastForward aria-hidden className="h-4 w-4 text-gold" />
            Speed up{VISIT_SPEEDS.includes(clock.speed) ? ` · ${clock.speed}×` : ''}
          </button>
        )}
        <button type="button" className={button} onClick={() => setChoosing(true)}>
          <RotateCcw aria-hidden className="h-4 w-4 text-gold" />
          Start over
        </button>
        <button type="button" className={`${button} plaque-red`} onClick={onExit}>
          <X aria-hidden className="h-4 w-4" />
          Leave bedtime mode
        </button>
      </div>

      {choosing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-400">
          <div className="panel no-snow w-full max-w-[860px] p-700">
            <div className="relative">
              <div className="eyebrow">Bedtime mode</div>
              <h2 className="ink-title text-hero-900 leading-hero-900">How far away should Santa be?</h2>
              <p className="mt-100 text-400 text-ink">
                Pick a countdown to Santa reaching {visit.label}. It runs in real time, so 10 minutes is 10 minutes.
              </p>
              <div className="mt-500 flex flex-wrap gap-400">
                <button
                  type="button"
                  className={bigButton}
                  onClick={() => {
                    onStart(60 * 60_000);
                    setChoosing(false);
                  }}
                >
                  <Timer aria-hidden className="h-7 w-7 text-gold" />
                  <span className="title text-600">Start 1 hour out</span>
                  <span className="text-200 text-snow/80">Time for teeth, pyjamas and a story</span>
                </button>
                <button
                  type="button"
                  className={`${bigButton} plaque-red`}
                  onClick={() => {
                    onStart(10 * 60_000);
                    setChoosing(false);
                  }}
                >
                  <Timer aria-hidden className="h-7 w-7" />
                  <span className="title text-600">Start 10 minutes out</span>
                  <span className="text-200 text-snow/90">Lights out, now</span>
                </button>
                {clock.liveAvailable && (
                  <button
                    type="button"
                    className={bigButton}
                    onClick={() => {
                      onRealTime();
                      setChoosing(false);
                    }}
                  >
                    <Radio aria-hidden className="h-7 w-7 text-gold" />
                    <span className="title text-600">Show the real countdown</span>
                    <span className="text-200 text-snow/80">{duration(arrival - clock.wallNow)} to go</span>
                  </button>
                )}
              </div>
              <div className="mt-500 text-center">
                <button type="button" className={button} onClick={onExit}>
                  <X aria-hidden className="h-4 w-4 text-gold" />
                  Leave bedtime mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
