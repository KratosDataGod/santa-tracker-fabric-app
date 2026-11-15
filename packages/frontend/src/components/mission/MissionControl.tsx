import {
  ChevronDown,
  CircleHelp,
  Mail,
  Flag,
  Gauge,
  Gift,
  Globe2,
  LayoutDashboard,
  MapPin,
  Snowflake,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { lazyWithReload } from '@/lib/lazy-with-reload';
import type { MissionBackend } from '@/mission/backend';
import { deriveMission, type MissionState, type Phase } from '@/mission/derive';
import { duration, localBrief, toys, utcClock, whole } from '@/mission/format';
import { loadHome, myVisit, requestHome, rooftopActive, saveHome, type Home } from '@/mission/home';
import { useLiveFeed, useMissionClock, type MissionClock } from '@/mission/hooks';
import type { SeasonData } from '@/mission/model';
import { weatherLine, type HomeWeather } from '@/mission/santa-notes';
import { snowLine, useSnow } from '@/mission/snow';
import { letterLine, loadLetters, saveLetters, type Letter } from '@/mission/wishlist';

import { PaperDefs, Snowfall } from './Decor';
import { Globe } from './Globe';
import titleArt from '@/assets/title.webp';

import { Hero } from './Hero';
import { LiveFeedPanel } from './LiveFeedPanel';
import { BedtimeMode } from './BedtimeMode';
import { CookieKitchen } from './CookieKitchen';
import { Guide } from './Guide';
import { GazetteTicker, MissionLog } from './MissionLog';
import { MyTown, SantaAlert } from './MyTown';
import { RooftopScene } from './RooftopScene';
import { Pipeline } from './Pipeline';
import { ReplayBar } from './ReplayBar';
import { SleighPanel } from './SleighPanel';
import { ToyLines } from './ToyLines';
import { WishList, WishListCard } from './WishList';
import { webglAvailable } from './webgl';

const SnowGlobe3D = lazyWithReload(() => import('./SnowGlobe3D'));
const LocalMap = lazyWithReload(() => import('./LocalMap'));

const PHASE_LABEL: Record<Phase, string> = {
  offseason: 'The workshop is resting',
  build: 'The elves are building toys',
  wrap: 'Building and wrapping',
  load: 'Loading the sleigh',
  flight: 'Santa is flying!',
  home: 'Merry Christmas to all!',
};

const GLOBE_TITLE: Record<Phase, string> = {
  offseason: 'All quiet at the North Pole',
  build: 'Lights on at the workshop',
  wrap: 'Lights on at the workshop',
  load: 'The sleigh is at the dock',
  flight: 'Riding the midnight line',
  home: 'Home again, home again',
};

type ViewChoice = 'auto' | 'globe' | 'dashboard';

const GUIDE_SEEN = 'santa-tracker-guide-seen';

function ModeBadge({ clock, onBackToLive }: { clock: MissionClock; onBackToLive: () => void }) {
  const live = clock.mode === 'live';
  const style = {
    borderColor: live ? 'var(--color-nose)' : 'var(--color-gold)',
    color: live ? '#ff8a98' : 'var(--color-gold)',
    background: 'rgba(3, 8, 23, 0.7)',
    boxShadow: live ? '0 0 24px -4px var(--color-nose)' : '0 0 24px -6px var(--color-gold)',
  };
  const className =
    'inline-flex items-center gap-200 rounded-full border px-400 py-100 text-200 font-extrabold tracking-[0.25em]';
  const dot = (
    <span
      aria-hidden
      className={`h-2 w-2 rounded-full ${live || clock.playing ? 'beacon' : ''}`}
      style={{ backgroundColor: 'currentColor' }}
    />
  );
  if (live) {
    return (
      <span className={className} style={style}>
        {dot}
        LIVE
      </span>
    );
  }
  // In replay the badge is the way home.
  return (
    <button
      type="button"
      className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold`}
      style={style}
      onClick={onBackToLive}
      title={clock.liveAvailable ? 'Back to live' : 'Back to the start'}
    >
      {dot}
      {clock.story ? 'THE STORY' : clock.playing ? 'REPLAY' : 'REPLAY · PAUSED'}
      <span className="tracking-normal text-snow">· {clock.liveAvailable ? 'back to live' : 'back to start'}</span>
    </button>
  );
}

function ViewButton({ globeView, onToggle }: { globeView: boolean; onToggle: () => void }) {
  const Icon = globeView ? LayoutDashboard : Globe2;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="plaque inline-flex h-10 items-center gap-200 !rounded-full px-400 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <Icon aria-hidden className="h-4 w-4 text-gold" />
      {globeView ? 'Full dashboard' : 'Globe view'}
    </button>
  );
}

/** A dark, gold-trimmed figure on the globe's heads-up strip. */
function Hud({ icon: Icon, label, value, wide }: { icon: LucideIcon; label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={`plaque px-300 py-200 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-100 text-[10px] font-extrabold uppercase tracking-[0.1em] text-gold">
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="num whitespace-nowrap text-[18px] leading-500">{value}</div>
    </div>
  );
}

const LEGEND = [
  { label: "Santa's sleigh and trail", color: '#ff3148' },
  { label: 'Delivered stops', color: '#ffc85a' },
  { label: 'Next 60 minutes', color: '#ff8a2a' },
  { label: 'Biggest deliveries still to come', color: '#5cc8ff' },
  { label: 'Still waiting for Santa', color: '#e8eeff' },
];

function GlobePanel({
  data,
  state,
  use3d,
  stage,
}: {
  data: SeasonData;
  state: MissionState;
  use3d: boolean;
  stage: boolean;
}) {
  const flat = <Globe data={data} state={state} />;
  const airborne = state.sleigh.status !== 'docked' && state.sleigh.status !== 'home';
  // During the flight the camera flies in; closer still while he is on a roof.
  // The dashboard's smaller globe leans in too, just not as far.
  const zoom = airborne ? (stage ? (state.sleigh.status === 'delivering' ? 1 : 0.86) : 0.6) : 0;
  return (
    <section className="panel panel-night relative flex h-full flex-col p-400" aria-label="Snow globe map">
      <div className="slip relative z-10 rounded-lg px-500 py-200">
        <div className="eyebrow">
          {state.phase === 'flight' ? 'The big night is underway' : 'The world in a snow globe'}
        </div>
        <div className="ink-title text-hero-800 italic leading-hero-800">{GLOBE_TITLE[state.phase]}</div>
      </div>
      {stage && (
        <div className="relative z-10 mt-200 grid grid-cols-3 gap-200 md:grid-cols-10">
          <Hud wide icon={Gift} label="Gifts delivered" value={toys(state.deliveredK)} />
          <Hud wide icon={MapPin} label="Stops" value={`${whole(state.sleigh.stopsDone)} / ${whole(data.stops.length)}`} />
          <Hud wide icon={Globe2} label="Countries" value={`${state.coverage.countries} / ${state.coverage.countriesTotal}`} />
          <Hud icon={Flag} label="US states" value={`${state.coverage.us} / ${state.coverage.usTotal}`} />
          <Hud icon={Snowflake} label="Canada" value={`${state.coverage.ca} / ${state.coverage.caTotal}`} />
          <Hud wide icon={Gauge} label="Sleigh speed" value={`${whole(state.sleigh.speedMph)} mph`} />
        </div>
      )}
      <div className={`relative mx-auto w-full flex-1 ${stage ? 'min-h-[380px]' : 'mt-300 h-[640px] max-w-[760px] flex-none'}`}>
        {use3d ? (
          <ErrorBoundary fallback={flat}>
            <Suspense fallback={flat}>
              <SnowGlobe3D data={data} state={state} plaque={data.name} zoom={zoom} wheelZoom={stage} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          flat
        )}
      </div>
      <ul
        className="pointer-events-none absolute bottom-500 left-500 z-10 space-y-100 text-200 font-bold text-snow"
        style={{ textShadow: '0 1px 4px #000' }}
      >
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-200">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Controls({
  clock,
  globeView,
  onToggle,
  onBackToLive,
  onGuide,
  onLetters,
  nudge,
}: {
  clock: MissionClock;
  globeView: boolean;
  onToggle: () => void;
  onBackToLive: () => void;
  onGuide: () => void;
  onLetters: () => void;
  /** Point first-time visitors at the guide. */
  nudge: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-300">
      <div className="text-right" style={{ textShadow: '0 2px 8px #000' }}>
        <div className="num text-400 text-snow">{utcClock(clock.time)}</div>
        <div className="text-200 italic text-snow/80">{localBrief(clock.time)} your time</div>
      </div>
      <ModeBadge clock={clock} onBackToLive={onBackToLive} />
      <ViewButton globeView={globeView} onToggle={onToggle} />
      <button
        type="button"
        onClick={onLetters}
        className="plaque plaque-red inline-flex h-10 items-center gap-200 !rounded-full px-400 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <Mail aria-hidden className="h-4 w-4" />
        Letters to Santa
      </button>
      <span className="relative">
        <button
          type="button"
          onClick={onGuide}
          className="plaque inline-flex h-10 items-center gap-200 !rounded-full px-400 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <CircleHelp aria-hidden className="h-4 w-4 text-gold" />
          How it works
        </button>
        {nudge && (
          <span className="guide-nudge pointer-events-none absolute right-0 top-[calc(100%+10px)] z-40 whitespace-nowrap rounded-xl px-400 py-200 text-200 font-bold">
            New here? See how it works
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * The weather where the viewer is, for a line in Santa's note. Only asked for
 * once someone has chosen a town, and only to the nearest tenth of a degree
 * (about 10 km), so the weather service never sees more than a rough area.
 */
function useHomeWeather(home: Home | null): HomeWeather | null {
  const [weather, setWeather] = useState<HomeWeather | null>(null);
  const lat = home ? home.lat.toFixed(1) : null;
  const lon = home ? home.lon.toFixed(1) : null;
  useEffect(() => {
    if (lat === null || lon === null) return;
    let cancelled = false;
    const abort = new AbortController();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
    fetch(url, { signal: abort.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { current?: { temperature_2m?: number; weather_code?: number } } | null) => {
        const current = body?.current;
        if (cancelled || !current) return;
        const temperatureF = Number(current.temperature_2m);
        const weatherCode = Number(current.weather_code);
        if (Number.isFinite(temperatureF) && Number.isFinite(weatherCode)) setWeather({ temperatureF, weatherCode });
      })
      .catch(() => {
        // No weather line today; the note reads fine without it.
      });
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [lat, lon]);
  return home ? weather : null;
}

export function MissionControl({
  data,
  backend,
  crew,
  onHomeChange,
}: {
  data: SeasonData;
  backend: MissionBackend;
  /** Shown to public visitors: a discreet way for the crew to sign in. */
  crew?: ReactNode;
  /** Called after the viewer shares or forgets their location, so the route can be rebuilt. */
  onHomeChange?: () => void;
}) {
  const clock = useMissionClock(data);
  const state = useMemo(() => deriveMission(data, clock.time), [data, clock.time]);
  const feed = useLiveFeed(backend, data.year, clock.mode === 'live');
  const [use3d] = useState(webglAvailable);
  const [viewChoice, setViewChoice] = useState<ViewChoice>('auto');
  const [showDetails, setShowDetails] = useState(false);
  const untilTakeoff = data.timeline.takeoff - clock.time;

  // Where is this viewer, and when does Santa get there?
  const [home, setHome] = useState(loadHome);
  const [locating, setLocating] = useState(false);
  const [homeMessage, setHomeMessage] = useState<string | null>(null);
  const [bedtime, setBedtime] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [nudge, setNudge] = useState(() => {
    try {
      return window.localStorage.getItem(GUIDE_SEEN) !== '1';
    } catch {
      return false;
    }
  });
  const openGuide = () => {
    setGuideOpen(true);
    setNudge(false);
    try {
      window.localStorage.setItem(GUIDE_SEEN, '1');
    } catch {
      // Without storage the nudge simply shows again next visit.
    }
  };
  // Letters to Santa: kept in this browser only.
  const [letters, setLetters] = useState<Letter[]>(loadLetters);
  const [lettersOpen, setLettersOpen] = useState(false);
  const changeLetters = useCallback((edit: (all: Letter[]) => Letter[]) => {
    setLetters((all) => {
      const next = edit(all);
      saveLetters(next);
      return next;
    });
  }, []);
  const snow = useSnow(clock.mode === 'live', state.phase === 'flight', state.sleigh.position);
  const visit = useMemo(() => myVisit(data, home), [data, home]);
  const changeHome = useCallback(
    (next: Home | null) => {
      saveHome(next);
      setHome(next);
      setHomeMessage(null);
      onHomeChange?.();
    },
    [onHomeChange]
  );
  const locate = useCallback(async () => {
    setLocating(true);
    setHomeMessage(null);
    try {
      changeHome(await requestHome());
    } catch (error) {
      setHomeMessage(error instanceof Error ? error.message : 'Your location could not be found just now.');
    } finally {
      setLocating(false);
    }
  }, [changeHome]);
  const homeWeather = useHomeWeather(home);

  const backToLive = () => {
    if (clock.liveAvailable) {
      clock.goLive();
    } else {
      clock.seek(data.timeline.takeoff - 120_000);
      clock.setPlaying(false);
    }
  };
  const watchVisit = (leadMs: number) => {
    if (!visit) return;
    // Real time, so ten minutes out really is ten minutes of waiting.
    setViewChoice('globe');
    clock.startReplay(visit.stop.arrival - leadMs, 1);
  };
  const watchStory = () => {
    // The story should show the flight on the big globe, whatever was chosen before.
    setViewChoice('auto');
    clock.watchStory();
  };

  const renderMap = (restAt?: { lat: number; lon: number } | null) => (
    // A map that cannot load must never take the whole app down.
    <ErrorBoundary
      fallbackRender={() => (
        <div className="flex h-full flex-col items-center justify-center gap-300 text-center">
          <p className="title text-500 text-ink">The close-up map would not unroll.</p>
          <p className="text-300 text-muted-foreground">
            This usually means the app was updated while this page was open.
          </p>
          <button
            type="button"
            className="plaque plaque-red h-10 px-500 text-300 font-bold"
            onClick={() => window.location.reload()}
          >
            Reload the page
          </button>
        </div>
      )}
    >
      <Suspense fallback={<p className="text-300 text-muted-foreground">Unrolling the map…</p>}>
        <LocalMap
          data={data}
          state={state}
          restAt={restAt}
          overlay={visit && rooftopActive(visit, clock.time) ? <RooftopScene visit={visit} time={clock.time} /> : null}
        />
      </Suspense>
    </ErrorBoundary>
  );

  const myTown = (
    <MyTown
      visit={visit}
      clock={clock}
      home={home}
      locating={locating}
      message={homeMessage}
      onPick={(place) => changeHome({ lat: place.lat, lon: place.lon, name: place.name })}
      onLocate={() => void locate()}
      onForget={() => changeHome(null)}
      onWatch={watchVisit}
      onBackToLive={backToLive}
      onBedtime={() => setBedtime(true)}
    />
  );
  const timeMachine = <ReplayBar data={data} clock={clock} myStop={visit?.stop} onWatchStory={watchStory} />;
  const gazette = (
    <MissionLog
      state={state}
      data={data}
      visit={visit}
      noteExtra={letterLine(letters) ?? (clock.mode === 'live' ? (homeWeather ? weatherLine(homeWeather) : snowLine(snow)) : null)}
    />
  );

  if (bedtime && visit) {
    return (
      <BedtimeMode
        visit={visit}
        clock={clock}
        globe={<GlobePanel data={data} state={state} use3d={use3d} stage />}
        // Until he takes off the map rests on the viewer's town, not on an empty Arctic.
        map={renderMap(visit.kind === 'zone' ? null : visit.stop)}
        onStart={watchVisit}
        onRealTime={backToLive}
        onExit={() => setBedtime(false)}
      />
    );
  }

  // During the flight the globe takes over the screen, unless the viewer says otherwise.
  const globeView = viewChoice === 'globe' || (viewChoice === 'auto' && state.phase === 'flight');
  const toggleView = () => setViewChoice(globeView ? 'dashboard' : 'globe');

  const workshop = (
    <div className="grid gap-500 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <ToyLines state={state} />
      </div>
      {/* The Gazette runs down the side, as tall as the workshop floor. */}
      <div className="min-h-[640px] xl:col-span-4">{gazette}</div>
    </div>
  );
  const cards = (
    <>
      <Pipeline data={data} state={state} />
      <div className="grid gap-500 xl:grid-cols-2">
        <SleighPanel data={data} state={state} />
        <LiveFeedPanel feed={feed} mode={clock.mode} now={clock.wallNow} visitor={backend.visitor} snow={snow} />
      </div>
      <WishListCard letters={letters} onOpen={() => setLettersOpen(true)} />
      <CookieKitchen data={data} state={state} />
      {workshop}
    </>
  );

  const footnote = (
    <div className="flex flex-col items-center gap-200">
      <p className="text-center text-200 text-snow/75">
        {backend.visitor
          ? 'Workshop, cookie and sleigh figures are a North Pole simulation; the crew copy lives in a Fabric SQL database. Weather and snow are real, from Open-Meteo (CC BY 4.0).'
          : "Workshop, cookie and sleigh figures are a North Pole simulation stored in this app's Fabric SQL database. Weather and snow are real, from Open-Meteo (CC BY 4.0); weather is pulled into Fabric by a server-side function."}{' '}
        City and town names and locations are from GeoNames (CC BY 4.0).
      </p>
      {crew}
    </div>
  );

  if (globeView) {
    return (
      <div className="mission-sky film relative min-h-screen overflow-x-clip font-base">
        <Snowfall />
        <PaperDefs />
        <SantaAlert visit={visit} time={clock.time} />
        {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
        {lettersOpen && <WishList letters={letters} onChange={changeLetters} onClose={() => setLettersOpen(false)} />}
        <div className="relative z-10 mx-auto flex max-w-[1900px] flex-col gap-400 px-400 pb-500 pt-300">
          <header className="flex flex-wrap items-center justify-between gap-300">
            <div className="flex items-center gap-400">
              <h1 className="sr-only">North Pole Mission Control</h1>
              <img
                src={titleArt}
                alt=""
                className="-mb-200 h-[104px] w-auto select-none"
                draggable={false}
              />
              <p className="title hidden text-400 italic leading-400 text-snow lg:block">
                {data.name} · {PHASE_LABEL[state.phase]}
                {untilTakeoff > 0 && ` · takeoff in ${duration(untilTakeoff)}`}
              </p>
            </div>
            <Controls clock={clock} globeView onToggle={toggleView} onBackToLive={backToLive} onGuide={openGuide} onLetters={() => setLettersOpen(true)} nudge={nudge} />
          </header>

          {timeMachine}

          {/* The stage: the globe and the close-up map fill the screen. */}
          <div className="grid gap-400 xl:h-[calc(100vh-310px)] xl:min-h-[560px] xl:grid-cols-[1.05fr_1fr]">
            <div className="h-[560px] xl:h-auto">
              <GlobePanel data={data} state={state} use3d={use3d} stage />
            </div>
            <section className="panel panel-emerald h-[560px] p-400 xl:h-auto" aria-label="Close-up map">
              {renderMap()}
            </section>
          </div>

          <GazetteTicker state={state} />
          {myTown}

          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            aria-expanded={showDetails}
            className="plaque mx-auto inline-flex h-10 items-center gap-200 !rounded-full px-500 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <ChevronDown aria-hidden className={`h-4 w-4 text-gold transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            {showDetails ? 'Hide the workshop, weather and Gazette' : 'Show the workshop, weather and Gazette'}
          </button>
          {showDetails && cards}
          {footnote}
        </div>
      </div>
    );
  }

  return (
    <div className="mission-sky film relative min-h-screen overflow-x-clip font-base">
      <Snowfall />
      <PaperDefs />
      <SantaAlert visit={visit} time={clock.time} />
        {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
        {lettersOpen && <WishList letters={letters} onChange={changeLetters} onClose={() => setLettersOpen(false)} />}

      {/* The opening shot. The banner artwork carries the title. */}
      <header className="relative">
        <div
          className="relative mx-auto w-full overflow-hidden"
          style={{ aspectRatio: '2170 / 725', maxHeight: 'min(72vh, 700px)' }}
        >
          <Hero subtitle={`${data.name} · ${PHASE_LABEL[state.phase]}`} />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-20"
            style={{ background: 'linear-gradient(180deg, transparent, #0a2147 100%)' }}
          />
        </div>
        <h1 className="sr-only">North Pole Mission Control</h1>
        <div className="relative z-10 mx-auto -mt-400 flex max-w-[1560px] flex-wrap items-center justify-between gap-300 px-400">
          <p className="title text-500 italic leading-500 text-snow" style={{ textShadow: '0 2px 8px #000' }}>
            {data.name} · {PHASE_LABEL[state.phase]}
          </p>
          {untilTakeoff > 0 && (
            <div className="plaque !rounded-full px-700 py-100 text-center" style={{ boxShadow: '0 0 40px -8px rgba(246, 210, 122, 0.8)' }}>
              <div className="eyebrow">Sleigh takes off in</div>
              <div className="num foil text-hero-800 leading-hero-800">{duration(untilTakeoff)}</div>
            </div>
          )}
          <Controls clock={clock} globeView={false} onToggle={toggleView} onBackToLive={backToLive} onGuide={openGuide} onLetters={() => setLettersOpen(true)} nudge={nudge} />
        </div>
      </header>

      <div className="relative z-10 mx-auto mt-500 flex max-w-[1560px] flex-col gap-600 px-400 pb-600">
        {timeMachine}
        {myTown}
        <Pipeline data={data} state={state} />
        <div className="grid gap-500 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <GlobePanel data={data} state={state} use3d={use3d} stage={false} />
          </div>
          <div className="flex flex-col gap-600 xl:col-span-5">
            <SleighPanel data={data} state={state} />
            <LiveFeedPanel feed={feed} mode={clock.mode} now={clock.wallNow} visitor={backend.visitor} snow={snow} />
          </div>
        </div>
        <WishListCard letters={letters} onOpen={() => setLettersOpen(true)} />
        <CookieKitchen data={data} state={state} />
        {workshop}
        {footnote}
      </div>
    </div>
  );
}
