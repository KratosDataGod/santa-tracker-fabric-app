import {
  BedDouble,
  BookOpen,
  Cookie,
  Globe2,
  Mail,
  MapPin,
  Newspaper,
  Radio,
  ShieldCheck,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="slip rounded-lg px-500 py-400">
      <h3 className="ink-title flex items-center gap-200 text-500 leading-500">
        <span className="seal !h-9 !w-9">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        {title}
      </h3>
      <div className="mt-200 space-y-200 text-300 leading-300 text-ink">{children}</div>
    </section>
  );
}

const Key = ({ children }: { children: ReactNode }) => (
  <span className="plaque inline-block !rounded-md px-200 py-[1px] text-200 font-bold">{children}</span>
);

/** "How it works": a short guide to everything in Mission Control, opened over the page. */
export function Guide({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Focus the Close button once, when the window opens. This must not depend
  // on `onClose`: the page re-renders many times a second with the clock, and
  // re-running it would keep pulling the keyboard away from whatever is being typed.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-400"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="panel no-snow my-500 w-full max-w-[1040px] p-600">
        <div className="relative flex items-start justify-between gap-300">
          <div>
            <div className="eyebrow">Welcome to Mission Control</div>
            <h2 id="guide-title" className="ink-title text-hero-900 leading-hero-900">
              How it works
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="plaque inline-flex h-10 items-center gap-200 !rounded-full px-400 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onClick={onClose}
          >
            <X aria-hidden className="h-4 w-4 text-gold" />
            Close
          </button>
        </div>

        <div className="relative mt-400 grid gap-400 md:grid-cols-2">
          <Section icon={Globe2} title="Watching the mission">
            <p>
              The four numbered cards follow every toy from the workshop to the tree: built, wrapped, loaded on the
              sleigh, delivered. Below them is the snow globe, Santa&apos;s sleigh tracker and the weather.
            </p>
            <p>
              On Christmas Eve the page switches to the flight view by itself: a big globe on the left and a close-up
              map on the right. <Key>Full dashboard</Key> and <Key>Globe view</Key> swap between the two.
            </p>
            <p>
              On the globe, gold lights are delivered stops, orange ones are next in line, blue ones are the biggest
              deliveries still to come. Drag the globe to turn it; it glides back to Santa when you let go.
            </p>
          </Section>

          <Section icon={Timer} title="The Christmas Time Machine">
            <p>
              <Key>Live</Key> follows the real clock. <Key>Replay</Key> plays from wherever the sleigh marker is on the
              candy-cane track, at the speed in the <Key>Speed</Key> menu. Drag the marker to jump to any moment.
            </p>
            <p>
              <Key>Watch the story</Key> plays the whole season in about two minutes: a day a second in the workshop,
              then the flight in under a minute.
            </p>
            <p>The six plaques jump straight to the big moments, including your own town.</p>
          </Section>

          <Section icon={MapPin} title="Set my town">
            <p>
              Mission Control starts with a guess from your device&apos;s time zone. Press <Key>Set my town</Key> and
              type your town or a US ZIP code, or press <Key>Use my location</Key>, and your town becomes a stop on
              Santa&apos;s route with a gold star on the map.
            </p>
            <p>
              Town or ZIP only: there is nowhere to type a street address, on purpose. Your choice stays in your
              browser. <Key>Forget my town</Key> removes it.
            </p>
          </Section>

          <Section icon={BedDouble} title="For grown-ups: the bedtime countdown">
            <p>
              <Key>Watch my visit</Key> counts down to Santa reaching your town, in real time, from{' '}
              <Key>1 hour out</Key> or <Key>10 minutes out</Key>. <Key>Speed up</Key> moves things along and{' '}
              <Key>Back to live</Key> returns to the real clock.
            </p>
            <p>
              The warning grows as he gets closer: a calm reminder an hour out, flashing lights from 30 minutes, a
              final warning for the last 10, and then he lands on the roof.
            </p>
            <p>
              <Key>Bedtime mode</Key> fills the screen with just the globe, the map and a very large countdown: handy
              on a tablet or TV.
            </p>
          </Section>

          <Section icon={Newspaper} title="The North Pole Gazette">
            <p>
              A new story comes off the press every hour of the season, and every few minutes as takeoff gets close.
              New headlines flash gold as they arrive.
            </p>
            <p>
              Santa writes a note every morning, pinned at the top. Once you set your town, he mentions it.
            </p>
          </Section>

          <Section icon={Cookie} title="Mrs. Claus's Kitchen">
            <p>
              The cookie tracker counts every cookie baked and eaten at the Pole, and who ate them. Santa&apos;s own
              count is under review. Mrs. Claus sends a note from the kitchen every few days.
            </p>
            <p>On Christmas Eve it also counts the cookies and milk left out along the route.</p>
          </Section>

          <Section icon={Mail} title="Letters to Santa">
            <p>
              <Key>Letters to Santa</Key> opens a wish list for every child in the house. Start a letter with a first
              name, pick a picture, type a wish. Wishes can be changed, moved up and down, or crossed off, and a
              letter can be printed.
            </p>
            <p>
              <Key>Grown-ups’ corner</Key> opens a side where a wish can be ticked as taken care of. Those ticks never show
              on the children&apos;s side. Letters stay in your browser, and there is nothing to buy.
            </p>
          </Section>

          <Section icon={Radio} title="What is real">
            <p>
              The weather and the snow report are real, from the Open-Meteo weather service. The toys, the cookies, the
              route and the Gazette are a North Pole simulation made for fun; nobody publishes official figures from
              Santa&apos;s workshop.
            </p>
          </Section>

          <Section icon={ShieldCheck} title="Privacy">
            <p>
              No account, no sign-up, and nothing about you is collected. If you set a town it is saved only in your
              own browser. The weather service is asked about the rough area of the town you chose, nothing more.
            </p>
          </Section>
        </div>

        <p className="relative mt-400 flex items-center justify-center gap-200 text-300 text-ink">
          <BookOpen aria-hidden className="h-4 w-4 text-ink-red" />
          You can open this guide any time with <Key>How it works</Key> at the top of the page.
        </p>
      </div>
    </div>
  );
}
