import type { MissionState } from '@/mission/derive';
import { utcBrief } from '@/mission/format';
import type { MyVisit } from '@/mission/home';
import type { SeasonData } from '@/mission/model';
import { personalLine } from '@/mission/santa-notes';

const STAGE: Record<string, { label: string; color: string }> = {
  build: { label: 'Workshop', color: 'var(--color-stage-build)' },
  wrap: { label: 'Wrapping', color: 'var(--color-stage-wrap)' },
  load: { label: 'Loading', color: 'var(--color-stage-load)' },
  flight: { label: 'Flight', color: 'var(--color-stage-deliver)' },
};

/** Today's note from Santa, on a card of its own, with a line just for this viewer. */
function SantaNote({
  state,
  data,
  visit,
  extra,
}: {
  state: MissionState;
  data: SeasonData;
  visit: MyVisit | null;
  /** One more line for the newest note, such as the weather where the viewer is. */
  extra?: string | null;
}) {
  const note = state.santaNote;
  if (!note) return null;
  const personal = personalLine(note, visit, data);
  return (
    <article key={note.key} className="santa-note gazette-in mt-300 px-500 py-400" aria-label="A note from Santa">
      <div className="eyebrow">A note from Santa · {utcBrief(note.ts)} UTC</div>
      <p className="mt-200 text-400 leading-[1.55] text-ink">
        {note.detail}
        {personal && <> {personal}</>}
        {extra && <> {extra}</>}
      </p>
      <p className="script mt-300 text-right text-[34px] leading-[1.2] text-ink-red">Santa</p>
    </article>
  );
}

/** The North Pole Gazette: Santa's note pinned on top, then the news, newest first. */
export function MissionLog({
  state,
  data,
  visit,
  noteExtra,
}: {
  state: MissionState;
  data: SeasonData;
  visit: MyVisit | null;
  noteExtra?: string | null;
}) {
  return (
    <section className="panel panel-emerald flex h-full min-h-0 flex-col p-500" aria-label="Mission log">
      <div className="eyebrow">Extra! Extra!</div>
      <h2 className="ink-title mt-100 border-y-2 border-double border-ink/60 py-100 text-center text-hero-800 leading-hero-800">The North Pole Gazette</h2>
      <SantaNote state={state} data={data} visit={visit} extra={noteExtra} />
      {state.recentEvents.length === 0 ? (
        <p className="mt-300 text-300 text-muted-foreground">
          No news yet. The presses roll when the workshop whistle blows.
        </p>
      ) : (
        <ol className="mt-300 min-h-[320px] flex-1 basis-0 space-y-200 overflow-y-auto pr-100">
          {state.recentEvents.map((event, index) => {
            const stage = STAGE[event.stage] ?? STAGE.build;
            return (
              <li
                key={event.key}
                className={`rounded-xl px-300 py-200 ${index === 0 ? 'slip gazette-in' : ''}`}
              >
                <div className="flex items-center gap-200 text-200 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span style={{ color: stage.color }} className="font-semibold">{stage.label}</span>
                  <span className="num">{utcBrief(event.ts)} UTC</span>
                </div>
                <div className="title mt-100 text-400 leading-400 text-ink">{event.title}</div>
                {event.detail && (
                  <div className="text-200 text-muted-foreground">{event.detail}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** One line of the latest news, for the flight view. */
export function GazetteTicker({ state }: { state: MissionState }) {
  const latest = state.recentEvents[0];
  if (!latest) return null;
  return (
    <div className="plaque flex items-center gap-300 !rounded-full px-500 py-100" aria-label="Latest from the Gazette">
      <span className="shrink-0 text-200 font-extrabold uppercase tracking-[0.18em] text-gold">The Gazette</span>
      <span key={latest.key} className="gazette-in-dark min-w-0 flex-1 truncate text-300">
        <strong className="title">{latest.title}</strong>
        {latest.detail && <span className="text-snow/80"> · {latest.detail}</span>}
      </span>
      <span className="num shrink-0 text-200 text-snow/70">{utcBrief(latest.ts)} UTC</span>
    </div>
  );
}
