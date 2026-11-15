import { kitchenAt, routeTreatsK } from '../../../../functions/src/cookies';

import type { MissionState } from '@/mission/derive';
import { toys, utcBrief, whole } from '@/mission/format';
import type { SeasonData } from '@/mission/model';

function Counter({ label, value, note, color }: { label: string; value: string; note?: string; color: string }) {
  return (
    <div className="slip rounded-lg px-400 py-300 text-center">
      <div className="eyebrow">{label}</div>
      <div className="title num mt-100 text-hero-800 leading-hero-800" style={{ color }}>
        {value}
      </div>
      {note && <div className="text-200 text-muted-foreground">{note}</div>}
    </div>
  );
}

/**
 * Mrs. Claus's Kitchen: cookies baked, cookies eaten and who ate them, plus
 * her latest note. Part of the North Pole simulation, like the toy counts.
 */
export function CookieKitchen({ data, state }: { data: SeasonData; state: MissionState }) {
  const kitchen = kitchenAt(data.timeline, state.time);
  const eaten = (kitchen.elvesK + kitchen.reindeerK) * 1000 + kitchen.santa;
  const flying = state.phase === 'flight' || state.phase === 'home';
  const route = routeTreatsK(state.deliveredK);
  const note = state.kitchenNote;
  return (
    <section className="panel p-500" aria-label="Mrs. Claus's kitchen">
      <div className="relative grid gap-500 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="eyebrow">The cookie tracker</div>
          <h2 className="ink-title mt-100 text-hero-800 leading-hero-800">Mrs. Claus&apos;s Kitchen</h2>
          <div className="mt-300 grid gap-300 sm:grid-cols-3">
            <Counter label="Cookies baked" value={toys(kitchen.bakedK)} color="var(--color-stage-load)" note="out of the oven this season" />
            <Counter label="Cookies eaten" value={whole(eaten)} color="var(--color-stage-wrap)" note="every one of them enjoyed" />
            <Counter label="In the jar" value={toys(kitchen.jarK)} color="var(--color-stage-deliver)" note="for now" />
          </div>
          <dl className="mt-300 grid gap-x-500 gap-y-100 text-300 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">🧝 The elves</dt>
              <dd className="num text-ink">{toys(kitchen.elvesK)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">🦌 The reindeer (carrot cookies)</dt>
              <dd className="num text-ink">{toys(kitchen.reindeerK)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">🎅 Santa (&ldquo;quality control&rdquo;)</dt>
              <dd className="num text-ink-red">{whole(kitchen.santa)}</dd>
            </div>
          </dl>
          {flying && (
            <div className="mt-300 grid gap-300 sm:grid-cols-2">
              <Counter label="Cookies Santa has eaten on his route" value={toys(route.cookiesK)} color="var(--color-ink-red)" note="left out by good boys and girls" />
              <Counter label="Glasses of milk" value={toys(route.milkK)} color="var(--color-stage-build)" note="and not a drop spilled" />
            </div>
          )}
        </div>
        <div className="xl:col-span-5">
          {note ? (
            <article key={note.key} className="recipe-card gazette-in h-full px-500 py-400" aria-label="A note from Mrs. Claus">
              <div className="eyebrow">From Mrs. Claus&apos;s kitchen · {utcBrief(note.ts)} UTC</div>
              <p className="mt-200 text-400 leading-[1.55] text-ink">{note.detail}</p>
              <p className="script mt-500 text-right text-[30px] leading-[1.2] text-ink-green">Mrs. Claus</p>
            </article>
          ) : (
            <p className="recipe-card h-full px-500 py-400 text-300 text-muted-foreground">
              The oven is warming up. Mrs. Claus&apos;s first note arrives on the second day of the season.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
