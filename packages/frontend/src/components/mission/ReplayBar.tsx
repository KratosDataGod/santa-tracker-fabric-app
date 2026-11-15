import { BookOpen, Pause, Play, Radio } from 'lucide-react';

import { utcBrief } from '@/mission/format';
import { chaptersFor, replayRange, SPEEDS, type MissionClock } from '@/mission/hooks';
import type { SeasonData, Stop } from '@/mission/model';

/**
 * The season is ~55 days of workshop and ~1 day of flight. A linear scrubber
 * would give the flight 2% of the bar, so the track is split: the left half
 * is the workshop season, the right half is Christmas Eve.
 */
const SPLIT = 0.5;
const STEPS = 2000;

function scale(data: SeasonData) {
  const { start, end } = replayRange(data.timeline);
  const pivot = data.timeline.takeoff - 3 * 3_600_000;
  return {
    toSlider: (t: number) =>
      Math.round(
        (t <= pivot
          ? ((t - start) / (pivot - start)) * SPLIT
          : SPLIT + ((t - pivot) / (end - pivot)) * (1 - SPLIT)) * STEPS
      ),
    toTime: (v: number) => {
      const f = v / STEPS;
      return f <= SPLIT
        ? start + (f / SPLIT) * (pivot - start)
        : pivot + ((f - SPLIT) / (1 - SPLIT)) * (end - pivot);
    },
  };
}

const SPEED_WORDS = (factor: number) => SPEEDS.find((s) => s.factor === factor)?.label.toLowerCase() ?? `${factor}×`;

export function ReplayBar({
  data,
  clock,
  myStop,
  onWatchStory,
}: {
  data: SeasonData;
  clock: MissionClock;
  /** The viewer's own stop, which gets a "My town" chapter. */
  myStop?: Stop | null;
  /** Lets the page reset its view before the story plays. Defaults to the clock's own. */
  onWatchStory?: () => void;
}) {
  const { toSlider, toTime } = scale(data);
  const chapters = chaptersFor(data, myStop);
  const position = toSlider(clock.time);
  const live = clock.mode === 'live';

  const button =
    'plaque inline-flex h-9 items-center gap-200 px-400 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section aria-label="Replay controls" className="panel no-snow top-200 z-30 px-500 pb-200 pt-300 lg:sticky">
      <div className="relative z-10 flex flex-wrap items-center gap-x-300 gap-y-200">
        <Clock />
        <span className="ink-title mr-100 text-hero-700 italic leading-hero-700">Christmas Time Machine</span>
        <button
          type="button"
          className={`${button} ${live ? 'plaque-red' : ''}`}
          onClick={clock.goLive}
          disabled={!clock.liveAvailable}
          aria-pressed={live}
          title={clock.liveAvailable ? 'Follow the real clock' : 'Live is available from November 1 to Christmas Day'}
        >
          <Radio aria-hidden className={`h-4 w-4 ${live ? 'beacon' : ''}`} />
          Live
        </button>

        <button
          type="button"
          className={`${button} ${!live && !clock.story ? 'plaque-red' : ''}`}
          onClick={() => (live ? clock.startReplay(clock.time) : clock.setPlaying(!clock.playing))}
          aria-label={!live && clock.playing ? 'Pause replay' : 'Play replay'}
        >
          {!live && clock.playing ? (
            <Pause aria-hidden className="h-4 w-4" />
          ) : (
            <Play aria-hidden className="h-4 w-4" />
          )}
          {!live && clock.playing ? 'Pause' : 'Replay'}
        </button>

        <button
          type="button"
          className={`${button} ${clock.story ? 'plaque-red' : ''}`}
          onClick={onWatchStory ?? clock.watchStory}
          aria-pressed={clock.story}
          title="A day a second until takeoff, then half an hour a second for the flight"
        >
          <BookOpen aria-hidden className="h-4 w-4" />
          Watch the story
        </button>

        <label className="flex items-center gap-200 text-300 font-bold text-ink">
          Speed:
          <select
            className="slip h-9 rounded-lg px-300 text-300 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            value={clock.speed}
            onChange={(event) => {
              const next = Number(event.target.value);
              // Choosing a speed while live starts the replay at that speed,
              // so the choice always has a visible effect.
              if (live) clock.startReplay(clock.time, next);
              else clock.setSpeed(next);
            }}
          >
            {SPEEDS.map((speed) => (
              <option key={speed.factor} value={speed.factor}>
                {speed.label}
              </option>
            ))}
          </select>
        </label>

        {/* Says out loud what the clock is doing, so every button gives feedback. */}
        <p role="status" className="ml-auto text-right text-300 text-ink">
          <span className="num">{utcBrief(clock.time)} UTC</span>
          <span className="block text-200 font-bold uppercase tracking-[0.12em] text-ink-red">
            {live
              ? 'Live, in real time'
              : clock.playing
                ? `${clock.story ? 'The story' : 'Replay'} playing at ${SPEED_WORDS(clock.speed)}`
                : 'Replay paused'}
          </span>
        </p>
      </div>

      <div className="relative z-10 mt-200 grid grid-cols-3 gap-200 md:grid-cols-6">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            type="button"
            className="plaque h-7 px-200 text-[11px] font-extrabold uppercase tracking-wider text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onClick={() => clock.startReplay(chapter.at, chapter.speed)}
          >
            {chapter.label}
          </button>
        ))}
      </div>

      <div className="relative z-10 px-[22px]">
        <div className="relative">
          <div aria-hidden className="candy-track pointer-events-none absolute inset-x-0 top-[17px] opacity-45" />
          <div
            aria-hidden
            className="candy-track pointer-events-none absolute left-0 top-[17px]"
            style={{ width: `${(position / STEPS) * 100}%` }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[23px]">
            {chapters.map((chapter) => (
              <span
                key={chapter.id}
                className="track-node"
                style={{ left: `${(toSlider(chapter.at) / STEPS) * 100}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            className="scrubber relative -mx-[22px] block !w-[calc(100%+44px)]"
            min={0}
            max={STEPS}
            step={1}
            value={position}
            onChange={(event) => clock.seek(toTime(Number(event.target.value)))}
            aria-label="Mission timeline"
            aria-valuetext={`${utcBrief(clock.time)} UTC`}
          />
        </div>
        <div className="-mt-100 flex justify-between text-[11px] font-bold text-muted-foreground">
          <span>Workshop season · Nov 1 to Dec 24</span>
          <span>Christmas Eve flight · 25 hours</span>
        </div>
      </div>
    </section>
  );
}

/** A brass pocket-watch face beside the title. */
function Clock() {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className="h-10 w-10 shrink-0" style={{ filter: 'drop-shadow(0 3px 4px rgba(40,20,0,0.7))' }}>
      <defs>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#d9a93f" />
          <stop offset="1" stopColor="#7a5206" />
        </linearGradient>
      </defs>
      <rect x="27" y="1" width="10" height="8" rx="2" fill="url(#brass)" stroke="#5a3906" />
      <circle cx="32" cy="35" r="27" fill="url(#brass)" stroke="#5a3906" strokeWidth="1.5" />
      <circle cx="32" cy="35" r="20" fill="#fbf1d3" stroke="#7a5206" strokeWidth="1.5" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="32" y1="18" x2="32" y2={i % 3 ? 20 : 22} stroke="#3a2412" strokeWidth={i % 3 ? 1 : 2} transform={`rotate(${i * 30} 32 35)`} />
      ))}
      <path d="M32 35 L32 22 M32 35 L41 40" stroke="#8f1026" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="35" r="2.4" fill="#3a2412" />
    </svg>
  );
}
