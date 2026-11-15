import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MissionBackend, SeasonLoad } from './backend';
import type { LiveReading, SeasonData, Stop, Timeline } from './model';

/** The season to show: this year's from November on, otherwise last year's. */
export function currentSeasonYear(now = Date.now()): number {
  const date = new Date(now);
  return date.getUTCMonth() >= 10 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

const describe = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';

// --- Season ------------------------------------------------------------------

export type SeasonView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | SeasonLoad;

export interface SeedState {
  running: boolean;
  /** What the load is doing right now. */
  step: 'clearing' | 'writing';
  done: number;
  total: number;
  error: string | null;
}

export function useSeason(backend: MissionBackend, year: number) {
  const [view, setView] = useState<SeasonView>({ status: 'loading' });
  const [seed, setSeed] = useState<SeedState>({
    running: false,
    step: 'writing',
    done: 0,
    total: 0,
    error: null,
  });

  const reload = useCallback(async () => {
    setView({ status: 'loading' });
    try {
      setView(await backend.loadSeason(year));
    } catch (error) {
      setView({ status: 'error', message: describe(error) });
    }
  }, [backend, year]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Re-reads the season without showing the loading screen. */
  const refresh = useCallback(async () => {
    try {
      const next = await backend.loadSeason(year);
      if (next.status === 'ready') setView(next);
    } catch {
      // Keep what is on screen; a failed refresh is not worth an error page.
    }
  }, [backend, year]);

  /**
   * Writes the season plan into Fabric in slices, then reloads. With
   * `rebuild`, the old plan rows are cleared out first.
   */
  const loadIntoFabric = useCallback(async (rebuild = false) => {
    setSeed({ running: true, step: rebuild ? 'clearing' : 'writing', done: 0, total: 0, error: null });
    try {
      if (rebuild) {
        let cleared = 0;
        for (let call = 0; call < 200; call++) {
          const step = await backend.resetSeason(year, 100);
          cleared += step.deleted;
          setSeed({ running: true, step: 'clearing', done: cleared, total: 0, error: null });
          if (step.done) break;
        }
      }
      let offset = 0;
      for (let call = 0; call < 200; call++) {
        const step = await backend.seedSeason(year, offset, 60);
        offset = step.nextOffset;
        setSeed({ running: true, step: 'writing', done: offset, total: step.total, error: null });
        if (step.done) break;
      }
      setSeed((s) => ({ ...s, running: false }));
      await reload();
    } catch (error) {
      setSeed((s) => ({ ...s, running: false, error: describe(error) }));
    }
  }, [backend, year, reload]);

  return { view, seed, reload, refresh, loadIntoFabric };
}

// --- Mission clock -----------------------------------------------------------

export type ClockMode = 'live' | 'replay';

export interface Speed {
  label: string;
  factor: number;
}

export const SPEEDS: Speed[] = [
  { label: 'Real time', factor: 1 },
  { label: '10 sec / sec', factor: 10 },
  { label: '1 min / sec', factor: 60 },
  { label: '10 min / sec', factor: 600 },
  { label: '30 min / sec', factor: 1800 },
  { label: '1 hr / sec', factor: 3600 },
  { label: '6 hr / sec', factor: 21_600 },
  { label: '1 day / sec', factor: 86_400 },
];

/** Story mode: a day a second in the workshop, half an hour a second in flight. */
export const STORY_BUILD_SPEED = 86_400;
export const STORY_FLIGHT_SPEED = 1800;

export interface Chapter {
  id: string;
  label: string;
  at: number;
  speed: number;
}

export function chaptersFor(data: SeasonData, mine?: Stop | null): Chapter[] {
  const tl = data.timeline;
  const minute = 60_000;
  const milwaukee = data.stops.find((s) => s.city === 'Milwaukee');
  const last = data.stops[data.stops.length - 1];
  return [
    { id: 'build', label: 'Workshop opens', at: tl.buildStart, speed: 86_400 },
    { id: 'wrap', label: 'Wrapping begins', at: tl.wrapStart - 12 * 60 * minute, speed: 86_400 },
    { id: 'load', label: 'Sleigh loading', at: tl.loadStart - 6 * 60 * minute, speed: 21_600 },
    { id: 'takeoff', label: 'Takeoff', at: tl.takeoff - 2 * minute, speed: 600 },
    // The viewer's own visit, when the app knows where they are.
    ...(mine
      ? [{ id: 'mine', label: 'My town', at: mine.arrival - 12 * minute, speed: 60 }]
      : milwaukee
        ? [{ id: 'mke', label: 'Milwaukee', at: milwaukee.arrival - 12 * minute, speed: 60 }]
        : []),
    ...(last
      ? [{ id: 'home', label: 'Home stretch', at: last.arrival - 10 * minute, speed: 600 }]
      : []),
  ];
}

export const replayRange = (tl: Timeline) => ({
  start: tl.buildStart - 6 * 3_600_000,
  end: tl.landing + 30 * 60_000,
});

export interface MissionClock {
  mode: ClockMode;
  /** Mission time in epoch ms. */
  time: number;
  /** The real clock, refreshed with every tick. */
  wallNow: number;
  playing: boolean;
  speed: number;
  /** True when "now" falls inside the season, so live mode has something to show. */
  liveAvailable: boolean;
  goLive: () => void;
  startReplay: (at: number, speed?: number) => void;
  /** True while the story is playing itself: fast to takeoff, slower in flight. */
  story: boolean;
  /** Plays the whole season: a day a second, then half an hour a second once Santa takes off. */
  watchStory: () => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  seek: (at: number) => void;
}

export function useMissionClock(data: SeasonData): MissionClock {
  const range = useMemo(() => replayRange(data.timeline), [data.timeline]);
  const liveAvailable = useCallback(
    (now: number) => now >= data.timeline.buildStart && now <= data.timeline.landing + 6 * 3_600_000,
    [data.timeline]
  );

  const [mode, setMode] = useState<ClockMode>(() =>
    liveAvailable(Date.now()) ? 'live' : 'replay'
  );
  const [playing, setPlayingState] = useState(false);
  const [speed, setSpeedState] = useState(600);
  const [story, setStory] = useState(false);
  const [time, setTime] = useState(() =>
    liveAvailable(Date.now()) ? Date.now() : data.timeline.takeoff - 120_000
  );

  // Replay position is anchored: missionTime = anchor.mission + elapsedWall * speed.
  const [wallNow, setWallNow] = useState(() => Date.now());
  const anchor = useRef({ mission: time, wall: 0 });
  const replayTime = useCallback(
    (wall: number, isPlaying: boolean, factor: number) =>
      isPlaying
        ? anchor.current.mission + (wall - anchor.current.wall) * factor
        : anchor.current.mission,
    []
  );

  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (wall: number) => {
      frame = requestAnimationFrame(tick);
      if (wall - last < 33) return;
      last = wall;
      const realNow = Date.now();
      setWallNow(realNow);
      if (mode === 'live') {
        setTime(realNow);
        return;
      }
      const next = replayTime(wall, playing, speed);
      // Story mode shifts down a gear the moment the sleigh is about to leave.
      if (story && playing) {
        const wanted = next < data.timeline.takeoff - 20 * 60_000 ? STORY_BUILD_SPEED : STORY_FLIGHT_SPEED;
        if (wanted !== speed) {
          anchor.current = { mission: next, wall };
          setSpeedState(wanted);
        }
      }
      if (next >= range.end) {
        anchor.current = { mission: range.end, wall };
        setPlayingState(false);
        setTime(range.end);
      } else {
        setTime(next);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, playing, speed, story, data.timeline.takeoff, range.end, replayTime]);

  const reanchor = useCallback((mission: number) => {
    anchor.current = { mission, wall: performance.now() };
  }, []);

  const seek = useCallback(
    (at: number) => {
      const clamped = Math.max(range.start, Math.min(range.end, at));
      reanchor(clamped);
      setMode('replay');
      setTime(clamped);
    },
    [range.start, range.end, reanchor]
  );

  const setPlaying = useCallback(
    (next: boolean) => {
      const current = replayTime(performance.now(), playing, speed);
      // Pressing play at the very end starts the story again.
      reanchor(next && current >= range.end ? range.start : current);
      setMode('replay');
      setPlayingState(next);
    },
    [playing, speed, range.start, range.end, reanchor, replayTime]
  );

  const setSpeed = useCallback(
    (next: number) => {
      reanchor(replayTime(performance.now(), playing, speed));
      setStory(false);
      setSpeedState(next);
    },
    [playing, speed, reanchor, replayTime]
  );

  const startReplay = useCallback(
    (at: number, nextSpeed?: number) => {
      const clamped = Math.max(range.start, Math.min(range.end, at));
      reanchor(clamped);
      if (nextSpeed) setSpeedState(nextSpeed);
      setStory(false);
      setMode('replay');
      setPlayingState(true);
      setTime(clamped);
    },
    [range.start, range.end, reanchor]
  );

  const watchStory = useCallback(() => {
    reanchor(data.timeline.buildStart);
    setSpeedState(STORY_BUILD_SPEED);
    setStory(true);
    setMode('replay');
    setPlayingState(true);
    setTime(data.timeline.buildStart);
  }, [data.timeline.buildStart, reanchor]);

  const goLive = useCallback(() => {
    setStory(false);
    setPlayingState(false);
    setMode('live');
    setTime(Date.now());
  }, []);

  return {
    mode,
    time,
    wallNow,
    playing,
    speed,
    liveAvailable: liveAvailable(wallNow),
    story,
    watchStory,
    goLive,
    startReplay,
    setPlaying,
    setSpeed,
    seek,
  };
}

// --- Live feed ---------------------------------------------------------------

export interface LiveFeed {
  readings: LiveReading[];
  /** 'idle' before the first attempt. */
  status: 'idle' | 'ok' | 'error';
  message: string | null;
  lastCheckedAt: number | null;
}

const FEED_INTERVAL_MS = 60_000;

/**
 * While `active`, asks the backend once a minute to pull a fresh reading from
 * the weather API into Fabric, then reads the latest stored readings back.
 */
export function useLiveFeed(backend: MissionBackend, year: number, active: boolean): LiveFeed {
  const [feed, setFeed] = useState<LiveFeed>({
    readings: [],
    status: 'idle',
    message: null,
    lastCheckedAt: null,
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async (ingest: boolean) => {
      let status: LiveFeed['status'] = 'ok';
      let message: string | null = null;
      if (ingest && document.visibilityState === 'visible') {
        try {
          const result = await backend.ingestLiveFeed(year);
          if (!result.ok) {
            status = 'error';
            message = result.message;
          }
        } catch (error) {
          status = 'error';
          message = describe(error);
        }
      }
      try {
        const readings = await backend.latestReadings(year, 24);
        if (!cancelled) {
          setFeed({ readings, status, message, lastCheckedAt: Date.now() });
        }
      } catch (error) {
        if (!cancelled) {
          setFeed((f) => ({
            ...f,
            status: 'error',
            message: describe(error),
            lastCheckedAt: Date.now(),
          }));
        }
      }
    };

    void refresh(active);
    if (!active) return () => void (cancelled = true);
    const timer = window.setInterval(
      () => void refresh(true),
      backend.feedIntervalMs ?? FEED_INTERVAL_MS
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [backend, year, active]);

  return feed;
}
