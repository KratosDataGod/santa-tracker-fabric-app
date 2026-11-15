import { BedDouble, FastForward, LocateFixed, MapPin, Radio, Search, Timer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { duration, localBrief } from '@/mission/format';
import { nextVisitSpeed, stageMessage, VISIT_SPEEDS } from '@/mission/bedtime';
import { visitStage, type Home, type MyVisit } from '@/mission/home';
import type { MissionClock } from '@/mission/hooks';
import { searchPlaces, type Place } from '@/mission/places';

/**
 * The bedtime alarm, in stages: a calm heads-up an hour out, flashing lights
 * from half an hour, a final warning for the last ten minutes. Flashes once a
 * second and holds still for people who ask for less motion.
 */
export function SantaAlert({ visit, time }: { visit: MyVisit | null; time: number }) {
  const stage = visitStage(visit, time);
  if (!visit || !stage) return null;
  const message = stageMessage(stage, visit, time);
  const calm = stage === 'early' || stage === 'gone';
  return (
    <div
      role={calm ? 'status' : 'alert'}
      className={`santa-alert ${stage === 'early' ? 'santa-alert-early' : stage === 'gone' ? 'santa-alert-calm' : 'santa-alert-live'} ${stage === 'final' ? 'santa-alert-final' : ''}`}
    >
      {calm ? <span aria-hidden>{stage === 'gone' ? '🎁' : '🌙'}</span> : <span aria-hidden className="santa-alert-lamp" />}
      <span>
        <strong className={calm ? '' : 'uppercase tracking-[0.12em]'}>{message.headline}</strong> {message.body}{' '}
        <span className="num whitespace-nowrap">{message.tail}</span>
      </span>
      {!calm && <span aria-hidden className="santa-alert-lamp santa-alert-lamp-b" />}
    </div>
  );
}

/** The "set my town" box: type a town or US ZIP code, or let the browser share a location. */
function TownPicker({
  home,
  locating,
  message,
  onPick,
  onLocate,
  onForget,
  onClose,
}: {
  home: Home | null;
  locating: boolean;
  message: string | null;
  onPick: (place: Place) => void;
  onLocate: () => void;
  onForget: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Place & { hint?: string })[]>([]);
  const [status, setStatus] = useState<'idle' | 'searching' | 'none' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const text = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        if (text.length < 2) {
          setResults([]);
          setStatus('idle');
          return;
        }
        setStatus('searching');
        searchPlaces(text)
          .then((found) => {
            if (cancelled) return;
            setResults(found);
            setStatus(found.length > 0 ? 'idle' : 'none');
          })
          .catch(() => {
            if (!cancelled) setStatus('error');
          });
      },
      text.length < 2 ? 0 : 180
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const button =
    'plaque inline-flex h-9 items-center gap-200 !rounded-full px-400 text-200 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60';

  return (
    <div className="mt-300 w-full border-t border-gold/40 pt-300">
      <div className="flex flex-wrap items-center gap-200">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Your town or US ZIP code</span>
          <Search aria-hidden className="pointer-events-none absolute left-300 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/60" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            maxLength={60}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type your town or US ZIP code"
            className="slip h-10 w-full rounded-lg pl-[38px] pr-300 text-300 font-semibold text-ink placeholder:text-ink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          />
        </label>
        <button type="button" className={button} onClick={onLocate} disabled={locating}>
          <LocateFixed aria-hidden className="h-4 w-4 text-gold" />
          {locating ? 'Finding you…' : 'Use my location'}
        </button>
        {home && (
          <button type="button" className={button} onClick={onForget}>
            Forget my town
          </button>
        )}
        <button type="button" className={button} onClick={onClose} aria-label="Close the town box">
          <X aria-hidden className="h-4 w-4 text-gold" />
        </button>
      </div>

      {results.length > 0 && (
        <ul className="mt-200 flex flex-wrap gap-200" aria-label="Matching towns">
          {results.map((place) => (
            <li key={`${place.name}|${place.lat}|${place.lon}|${place.hint ?? ''}`}>
              <button type="button" className={`${button} !h-auto min-h-9 py-100`} onClick={() => onPick(place)}>
                <MapPin aria-hidden className="h-4 w-4 text-gold" />
                {place.name}
                {place.hint && <span className="font-normal text-snow/70">{place.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="mt-200 text-200 text-snow/80">
        {status === 'searching' && 'Looking…'}
        {status === 'none' && 'No town by that name on the list. Try the nearest bigger town, or a 5-digit US ZIP code.'}
        {status === 'error' && 'The town list could not be loaded. Check your connection and try again.'}
        {message}
      </p>
      <p className="mt-100 text-200 text-snow/65">
        Town or ZIP only, please: never a street address. Your choice stays in this browser and is not sent anywhere.
      </p>
    </div>
  );
}

/** "Santa reaches Austin, TX at 11:52 PM", the bedtime buttons, and the town box. */
export function MyTown({
  visit,
  clock,
  home,
  locating,
  message,
  onPick,
  onLocate,
  onForget,
  onWatch,
  onBackToLive,
  onBedtime,
}: {
  visit: MyVisit | null;
  clock: MissionClock;
  home: Home | null;
  locating: boolean;
  message: string | null;
  onPick: (place: Place) => void;
  onLocate: () => void;
  onForget: () => void;
  /** Start a real-time replay this long before Santa arrives. */
  onWatch: (leadMs: number) => void;
  onBackToLive: () => void;
  onBedtime: () => void;
}) {
  const [picking, setPicking] = useState(false);
  if (!visit) return null;
  const time = clock.time;
  const { arrival, departure } = visit.stop;
  const replay = clock.mode === 'replay';
  const button =
    'plaque inline-flex h-9 items-center gap-200 !rounded-full px-400 text-200 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60';
  const when =
    time < arrival ? `in ${duration(arrival - time)}` : time < departure ? 'right now!' : 'already delivered';
  return (
    <section aria-label="Santa's visit to your town" className="plaque !rounded-2xl px-500 py-300">
      <div className="flex flex-wrap items-center justify-between gap-300">
        <div className="min-w-0">
          <div className="eyebrow">{visit.kind === 'zone' ? 'Your part of the world' : 'Your visit'}</div>
          <p className="title text-500 leading-500">
            Santa reaches {visit.label} {visit.kind === 'zone' ? 'around' : 'at'}{' '}
            <span className="text-gold">{localBrief(arrival)}</span>{' '}
            <span className="num text-400 text-snow/85">· {when}</span>
          </p>
          {visit.kind === 'zone' && !picking && (
            <p className="text-200 text-snow/80">
              That is a guess from your time zone.{' '}
              <button type="button" className="font-bold text-gold underline underline-offset-2" onClick={() => setPicking(true)}>
                Set your town
              </button>{' '}
              to put it on Santa&apos;s route.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-200">
          <span className="text-200 font-bold uppercase tracking-[0.14em] text-gold">Watch my visit:</span>
          <button type="button" className={button} onClick={() => onWatch(60 * 60_000)} title="Plays in real time, starting one hour before Santa arrives">
            <Timer aria-hidden className="h-4 w-4 text-gold" />1 hour out
          </button>
          <button type="button" className={button} onClick={() => onWatch(10 * 60_000)} title="Plays in real time, starting ten minutes before Santa arrives">
            <Timer aria-hidden className="h-4 w-4 text-gold" />
            10 minutes out
          </button>
          {replay && (
            <button
              type="button"
              className={button}
              onClick={() => clock.setSpeed(nextVisitSpeed(clock.speed))}
              title="Step through real time, 10 times faster and 60 times faster"
            >
              <FastForward aria-hidden className="h-4 w-4 text-gold" />
              Speed up{VISIT_SPEEDS.includes(clock.speed) ? ` · ${clock.speed}×` : ''}
            </button>
          )}
          {replay && (
            <button type="button" className={`${button} plaque-red`} onClick={onBackToLive}>
              <Radio aria-hidden className="h-4 w-4" />
              {clock.liveAvailable ? 'Back to live' : 'Back to start'}
            </button>
          )}
          <button type="button" className={button} onClick={onBedtime} title="Full screen: just the map, the countdown and the warning">
            <BedDouble aria-hidden className="h-4 w-4 text-gold" />
            Bedtime mode
          </button>
          {!picking && (
            <button type="button" className={button} onClick={() => setPicking(true)}>
              <MapPin aria-hidden className="h-4 w-4 text-gold" />
              {home ? 'Change my town' : 'Set my town'}
            </button>
          )}
        </div>
      </div>
      {picking && (
        <TownPicker
          home={home}
          locating={locating}
          message={message}
          onPick={(place) => {
            onPick(place);
            setPicking(false);
          }}
          onLocate={onLocate}
          onForget={() => {
            onForget();
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {!picking && message && (
        <p role="status" className="mt-200 text-200 text-snow">
          {message}
        </p>
      )}
    </section>
  );
}
