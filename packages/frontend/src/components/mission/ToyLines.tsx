import type { LineState, MissionState } from '@/mission/derive';
import { percent, toysCompact } from '@/mission/format';

const TOY_ART = import.meta.glob('../../assets/toys/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;
const artFor = (code: string) => TOY_ART[`../../assets/toys/${code}.webp`];

const LEGEND = [
  { label: 'Built', color: 'var(--color-stage-build)' },
  { label: 'Wrapped', color: 'var(--color-stage-wrap)' },
  { label: 'On the sleigh', color: 'var(--color-stage-load)' },
];

const ORNAMENTS = ['#d4142f', '#12804a', '#1f6fc4', '#c98a1e', '#7a3fb8', '#0f8f9c'];

function statusOf(line: LineState): string {
  if (line.builtK <= 0) return 'Warming up the tools';
  if (line.loadedK >= line.targetK - 0.5) return 'All aboard the sleigh';
  if (line.wrappedK >= line.targetK - 0.5) return 'Wrapped and waiting';
  if (line.builtK >= line.targetK - 0.5) return 'Built! Now wrapping';
  return 'Elves hard at work';
}

function ToyCard({ line, index }: { line: LineState; index: number }) {
  const built = percent(line.builtK, line.targetK);
  const wrapped = percent(line.wrappedK, line.targetK);
  const loaded = percent(line.loadedK, line.targetK);
  const busy = line.builtK > 0 && line.builtK < line.targetK - 0.5;
  const color = ORNAMENTS[index % ORNAMENTS.length];
  const art = artFor(line.code);
  return (
    <li className="panel relative px-500 pb-400 pt-500">
      {art && (
        <img
          src={art}
          alt=""
          className="pointer-events-none absolute right-200 top-200 h-[104px] w-[116px] select-none object-contain"
          draggable={false}
        />
      )}
      <div className={`relative flex items-start gap-300 ${art ? 'pr-[104px]' : ''}`}>
        {/* The toy, hanging like an ornament. */}
        <div className="ornament relative mt-200 shrink-0" style={{ animationDelay: `${index * 0.3}s` }}>
          <span
            aria-hidden
            className="absolute -top-[13px] left-1/2 h-[10px] w-[10px] -translate-x-1/2 rounded-full border-2 border-[#c98a1e]"
          />
          <span
            aria-hidden
            className="absolute -top-[6px] left-1/2 h-[8px] w-[14px] -translate-x-1/2 rounded-t-[4px]"
            style={{ background: 'linear-gradient(90deg, #b9801c, #fff1c4 45%, #b9801c)' }}
          />
          <span
            aria-hidden
            className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full text-[28px]"
            style={{
              background: `radial-gradient(circle at 30% 24%, rgba(255,255,255,0.95) 0 6%, rgba(255,255,255,0.35) 14%, ${color} 48%, color-mix(in srgb, ${color} 45%, #000) 100%)`,
              boxShadow: `0 6px 10px -4px rgba(40,20,0,0.8), inset 0 -8px 14px rgba(0,0,0,0.45), inset 0 0 0 1.5px rgba(246,210,122,0.85)`,
            }}
          >
            <span style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }}>{line.emoji}</span>
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="ink-title text-500 leading-[1.15]">{line.name}</h3>
          <p className="mt-100 text-300 font-semibold leading-200 text-ink">{line.workshop}</p>
          <p className="text-200 text-muted-foreground">Led by {line.leadElf}</p>
        </div>
      </div>

      <p className="title relative mt-300 min-h-[40px] text-300 italic leading-300 text-ink-red">“{line.tagline}”</p>

      <div
        className="track relative mt-300 h-3.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${line.name}: ${built.toFixed(0)} percent built, ${wrapped.toFixed(0)} percent wrapped, ${loaded.toFixed(0)} percent on the sleigh`}
      >
        <div className={`absolute inset-y-0 left-0 rounded-full ${busy ? 'flowing' : ''}`} style={{ width: `${built}%`, backgroundColor: 'var(--color-stage-build)' }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${wrapped}%`, backgroundColor: 'var(--color-stage-wrap)' }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${loaded}%`, backgroundColor: 'var(--color-stage-load)' }} />
      </div>

      <div className="mt-200 flex items-center justify-between gap-200 text-200">
        <span className="num text-ink">
          {toysCompact(line.builtK)}
          <span className="font-normal text-muted-foreground"> of {toysCompact(line.targetK)}</span>
        </span>
        <span className="num text-muted-foreground">
          <span style={{ color: 'var(--color-stage-build)' }}>{built.toFixed(0)}%</span>
          {' · '}
          <span style={{ color: 'var(--color-stage-wrap)' }}>{wrapped.toFixed(0)}%</span>
          {' · '}
          <span style={{ color: 'var(--color-stage-load)' }}>{loaded.toFixed(0)}%</span>
        </span>
      </div>
      <p className="mt-200 text-center">
        <span className="stamp text-stage-deliver">{statusOf(line)}</span>
      </p>
    </li>
  );
}

/** Evergreen sprigs and a red bow along the foot of the sign. */
function Garland() {
  const sprigs = Array.from({ length: 22 }, (_, i) => i);
  return (
    <svg aria-hidden viewBox="0 0 440 34" className="absolute -bottom-[24px] left-1/2 h-[34px] w-[min(440px,90%)] -translate-x-1/2">
      {sprigs.map((i) => (
        <g key={i} transform={`translate(${10 + i * 20} ${12 + Math.sin(i * 0.9) * 3}) rotate(${(i % 2 ? 1 : -1) * 24})`}>
          <ellipse rx="15" ry="5.5" fill={i % 3 ? '#12693c' : '#0b4a2a'} />
          <ellipse rx="10" ry="2" fill="#2f9a5d" opacity="0.7" />
        </g>
      ))}
      {[40, 110, 330, 400].map((x, i) => (
        <circle key={x} cx={x} cy={15} r="4" fill={i % 2 ? '#ffd34a' : '#e0162f'} stroke="#5a0a14" strokeWidth="0.6" />
      ))}
      <g transform="translate(220 15)">
        <path d="M0 0 C-10 -16 -34 -14 -30 0 C-34 14 -10 14 0 0 Z" fill="#d4142f" stroke="#7a0a1b" />
        <path d="M0 0 C10 -16 34 -14 30 0 C34 14 10 14 0 0 Z" fill="#d4142f" stroke="#7a0a1b" />
        <path d="M-4 2 L-12 19 L-3 14 Z M4 2 L12 19 L3 14 Z" fill="#a80f26" />
        <circle r="5" fill="#e83a52" stroke="#7a0a1b" />
      </g>
    </svg>
  );
}

/** The workshop floor: one card per toy line, each bar nesting built ⊇ wrapped ⊇ loaded. */
export function ToyLines({ state }: { state: MissionState }) {
  return (
    <section className="workshop-hall px-500 pb-600 pt-500" aria-label="Toy workshops">
      <div className="flex flex-col items-center gap-300">
        <div className="wood-sign text-center">
          <div className="plaque mx-auto -mt-[30px] w-fit px-500 py-100 text-200 font-extrabold uppercase tracking-[0.22em] text-gold">
            The workshop floor
          </div>
          <h2 className="gold-text mt-100 text-hero-900 leading-hero-900">
            Twelve Workshops, One Very Big Night
          </h2>
          <Garland />
        </div>
        <ul className="plaque mt-200 flex flex-wrap gap-400 !rounded-full px-500 py-100 text-200 font-bold xl:self-end">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-100">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}`, border: '1px solid rgba(255,255,255,0.6)' }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <ul className="mt-600 grid gap-x-500 gap-y-600 md:grid-cols-2">
        {state.lines.map((line, index) => (
          <ToyCard key={line.code} line={line} index={index} />
        ))}
      </ul>
    </section>
  );
}
