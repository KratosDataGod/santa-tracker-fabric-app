import { ArrowDown, ArrowUp, Check, Lock, LockOpen, Mail, Plus, Printer, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  addLetter,
  addWish,
  cleanName,
  cleanWish,
  editWish,
  isGrownUpYear,
  MAX_LETTERS,
  MAX_WISHES,
  moveWish,
  removeLetter,
  removeWish,
  renameLetter,
  WISH_ICONS,
  type Letter,
} from '@/mission/wishlist';

const button =
  'plaque inline-flex h-10 items-center gap-200 !rounded-full px-400 text-300 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50';
const field =
  'slip h-11 rounded-lg px-400 text-400 font-semibold text-ink placeholder:text-ink/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';
const tool =
  'inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/70 hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-25';

/** One child's letter: a sheet of parchment with their wishes on it. */
function LetterSheet({
  letter,
  grownUp,
  onChange,
  onRemove,
}: {
  letter: Letter;
  grownUp: boolean;
  onChange: (edit: (letters: Letter[]) => Letter[]) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState('');
  const [icon, setIcon] = useState(WISH_ICONS[0]);
  const full = letter.wishes.length >= MAX_WISHES;
  const add = () => {
    if (!text.trim()) return;
    onChange((letters) => addWish(letters, letter.id, text, icon));
    setText('');
  };
  return (
    <article className="letter-sheet relative px-700 pb-600 pt-700" aria-label={`${letter.name}'s letter to Santa`}>
      <span className="stamp absolute right-500 top-500 rotate-[8deg] text-stage-deliver print:hidden">Nice list</span>
      <p className="script text-[44px] leading-[1.2] text-ink-red">Dear Santa,</p>
      <p className="mt-200 flex flex-wrap items-baseline gap-200 text-500 leading-500 text-ink">
        My name is
        <input
          aria-label="First name or nickname"
          className="letter-line w-[9.5em] px-100 text-center font-bold text-ink-green print:border-0"
          value={letter.name}
          maxLength={20}
          onChange={(event) => onChange((letters) => renameLetter(letters, letter.id, cleanName(event.target.value) || letter.name))}
        />
        and I have been very good this year.
      </p>
      <p className="mt-200 text-500 leading-500 text-ink">For Christmas I would love:</p>

      {letter.wishes.length === 0 ? (
        <p className="mt-400 text-400 italic text-muted-foreground print:hidden">
          No wishes yet. Pick a picture, type a wish and press Add.
        </p>
      ) : (
        <ol className="mt-300 space-y-100">
          {letter.wishes.map((wish, index) => (
            <li key={wish.id} className="letter-line flex items-center gap-200 py-100">
              <span aria-hidden className="w-9 text-center text-[26px] leading-none">
                {wish.icon}
              </span>
              <input
                aria-label={`Wish ${index + 1}`}
                className={`min-w-0 flex-1 bg-transparent text-500 text-ink focus-visible:outline-2 focus-visible:outline-ink ${grownUp && wish.sorted ? 'line-through opacity-60' : ''}`}
                value={wish.text}
                maxLength={80}
                onChange={(event) =>
                  onChange((letters) => editWish(letters, letter.id, wish.id, { text: cleanWish(event.target.value) || wish.text }))
                }
              />
              <span className="flex items-center print:hidden">
                {grownUp && (
                  <button
                    type="button"
                    className={`${tool} ${wish.sorted ? '!bg-stage-deliver !text-snow' : ''}`}
                    aria-pressed={wish.sorted}
                    title={wish.sorted ? 'Taken care of. Press to undo' : 'Mark as taken care of (grown-ups only)'}
                    onClick={() => onChange((letters) => editWish(letters, letter.id, wish.id, { sorted: !wish.sorted }))}
                  >
                    <Check aria-hidden className="h-4 w-4" />
                    <span className="sr-only">Taken care of</span>
                  </button>
                )}
                <button type="button" className={tool} disabled={index === 0} title="Move up" onClick={() => onChange((letters) => moveWish(letters, letter.id, wish.id, -1))}>
                  <ArrowUp aria-hidden className="h-4 w-4" />
                  <span className="sr-only">Move {wish.text} up</span>
                </button>
                <button type="button" className={tool} disabled={index === letter.wishes.length - 1} title="Move down" onClick={() => onChange((letters) => moveWish(letters, letter.id, wish.id, 1))}>
                  <ArrowDown aria-hidden className="h-4 w-4" />
                  <span className="sr-only">Move {wish.text} down</span>
                </button>
                <button type="button" className={tool} title="Cross this wish off the letter" onClick={() => onChange((letters) => removeWish(letters, letter.id, wish.id))}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                  <span className="sr-only">Remove {wish.text}</span>
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Add a wish */}
      <div className="mt-500 print:hidden">
        <div className="flex flex-wrap gap-100" role="radiogroup" aria-label="Pick a picture for the wish">
          {WISH_ICONS.map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={icon === choice}
              aria-label={`Picture ${choice}`}
              className={`h-10 w-10 rounded-full text-[22px] leading-none transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ink ${icon === choice ? 'bg-ink-red/15 ring-2 ring-ink-red' : ''}`}
              onClick={() => setIcon(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
        <form
          className="mt-200 flex flex-wrap gap-200"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <input
            aria-label="A new wish"
            className={`${field} min-w-[220px] flex-1`}
            value={text}
            maxLength={80}
            disabled={full}
            placeholder={full ? 'This letter is full' : 'Type a wish, like "a red bike"'}
            onChange={(event) => setText(cleanWish(event.target.value))}
          />
          <button type="submit" className={`${button} plaque-red !h-11`} disabled={full || !text.trim()}>
            <Plus aria-hidden className="h-4 w-4" />
            Add to my letter
          </button>
        </form>
      </div>

      <p className="script mt-500 text-right text-[38px] leading-[1.2] text-ink-green">Love, {letter.name}</p>

      <div className="mt-300 flex flex-wrap justify-between gap-200 print:hidden">
        <button type="button" className={button} onClick={() => window.print()}>
          <Printer aria-hidden className="h-4 w-4 text-gold" />
          Print this letter
        </button>
        {grownUp && (
          <button
            type="button"
            className={button}
            onClick={() => {
              if (window.confirm(`Throw away ${letter.name}'s letter? This cannot be undone.`)) onRemove();
            }}
          >
            <Trash2 aria-hidden className="h-4 w-4 text-gold" />
            Throw this letter away
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * The copy of a letter that goes to the printer: plain, one page, and placed
 * straight under <body> so the rest of the app can be left off the paper.
 * Grown-ups' ticks are never printed.
 */
function PrintLetter({ letter }: { letter: Letter }) {
  // A long letter is set a little smaller so that even a full one fits a single page.
  const compact = letter.wishes.length > 12;
  return createPortal(
    <div className="print-letter">
      <div className="print-sheet">
        <p className="script" style={{ fontSize: 44, lineHeight: 1.2, color: '#b3122b' }}>
          Dear Santa,
        </p>
        <p style={{ fontSize: 18, marginTop: 8 }}>
          My name is <strong>{letter.name}</strong> and I have been very good this year.
        </p>
        <p style={{ fontSize: 18, marginTop: 6 }}>For Christmas I would love:</p>
        <ol style={{ marginTop: 10 }}>
          {letter.wishes.map((wish) => (
            <li
              key={wish.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: compact ? 14 : 20,
                padding: compact ? '2px 0' : '7px 0',
                borderBottom: '1.5px dashed #b99a6a',
              }}
            >
              <span aria-hidden style={{ fontSize: compact ? 17 : 24, width: 34, textAlign: 'center' }}>
                {wish.icon}
              </span>
              {wish.text}
            </li>
          ))}
        </ol>
        <p className="script" style={{ fontSize: 38, lineHeight: 1.2, color: '#0f6a3f', textAlign: 'right', marginTop: 18 }}>
          Love, {letter.name}
        </p>
      </div>
    </div>,
    document.body
  );
}

/** The grown-ups' gate: a birth year, so a small child cannot wander in. Nothing typed here is kept. */
function GrownUpGate({ onOpen, onCancel }: { onOpen: () => void; onCancel: () => void }) {
  const [year, setYear] = useState('');
  const [wrong, setWrong] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      className="plaque mt-300 flex flex-wrap items-center gap-300 !rounded-2xl px-500 py-300"
      onSubmit={(event) => {
        event.preventDefault();
        if (isGrownUpYear(year)) onOpen();
        else setWrong(true);
      }}
    >
      <label className="flex flex-wrap items-center gap-200 text-300 font-bold">
        Grown-ups only (not needed to write a letter): what year were you born?
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="go"
          placeholder="YYYY"
          aria-label="Year you were born"
          maxLength={4}
          className="slip h-10 w-[6em] rounded-lg px-300 text-center text-400 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          value={year}
          onChange={(event) => {
            setYear(event.target.value.replace(/\D/g, '').slice(0, 4));
            setWrong(false);
          }}
        />
      </label>
      <button type="submit" className={`${button} plaque-red`}>
        Open
      </button>
      <button type="button" className={button} onClick={onCancel}>
        Never mind
      </button>
      {wrong && (
        <span role="alert" className="text-300 text-snow">
          That side is for grown-ups. Ask one to help!
        </span>
      )}
      <span className="basis-full text-200 text-snow/70">The year is only checked, never saved.</span>
    </form>
  );
}

/**
 * Santa's List Desk: write, change and print a Christmas wish list for each
 * child. Opens over the page. Lists stay in this browser; there are no
 * shopping links.
 */
export function WishList({
  letters,
  onChange,
  onClose,
}: {
  letters: Letter[];
  onChange: (edit: (letters: Letter[]) => Letter[]) => void;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(letters[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  // Set when someone types digits or symbols into the name box, which only takes letters.
  const [nameHint, setNameHint] = useState(false);
  const [grownUp, setGrownUp] = useState(false);
  const [gate, setGate] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = letters.find((letter) => letter.id === openId) ?? letters[0] ?? null;

  // While the letters are open, printing prints the open letter and nothing else.
  useEffect(() => {
    document.body.classList.add('printing-letter');
    return () => document.body.classList.remove('printing-letter');
  }, []);

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

  const start = () => {
    const name = cleanName(newName).trim();
    if (!name) return;
    let created: string | null = null;
    onChange((all) => {
      const next = addLetter(all, name);
      created = next.length > all.length ? next[next.length - 1].id : null;
      return next;
    });
    setNewName('');
    // The new letter is the last one; open it once state has caught up.
    window.setTimeout(() => created && setOpenId(created), 0);
  };

  return (
    <div
      className="wishlist-overlay fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/75 p-400"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wishlist-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="panel no-snow my-500 w-full max-w-[980px] p-600 print:my-0 print:p-0">
        <div className="relative flex flex-wrap items-start justify-between gap-300 print:hidden">
          <div>
            <div className="eyebrow">North Pole Post Office</div>
            <h2 id="wishlist-title" className="ink-title text-hero-900 leading-hero-900">
              Letters to Santa
            </h2>
            <p className="mt-100 text-300 text-ink">
              A wish list for every child in the house. Letters are kept in this browser only, and you can change
              them any time.
            </p>
          </div>
          <div className="flex flex-wrap gap-200">
            <button
              type="button"
              className={button}
              aria-pressed={grownUp}
              onClick={() => (grownUp ? setGrownUp(false) : setGate(true))}
            >
              {grownUp ? <LockOpen aria-hidden className="h-4 w-4 text-gold" /> : <Lock aria-hidden className="h-4 w-4 text-gold" />}
              {grownUp ? 'Leave grown-ups’ side' : 'Grown-ups’ corner'}
            </button>
            <button ref={closeRef} type="button" className={button} onClick={onClose}>
              <X aria-hidden className="h-4 w-4 text-gold" />
              Close
            </button>
          </div>
        </div>

        {gate && !grownUp && (
          <GrownUpGate
            onOpen={() => {
              setGrownUp(true);
              setGate(false);
            }}
            onCancel={() => setGate(false)}
          />
        )}
        {grownUp && (
          <div className="plaque relative mt-300 !rounded-2xl px-500 py-300 text-300 print:hidden">
            <strong className="text-gold">Grown-ups’ side.</strong> The green tick marks a wish as taken care of; ticks
            are hidden on the children’s side, so surprises stay surprises. You can also throw a letter away here.
            Enjoying the Santa Tracker? You can support it by following{' '}
            <a
              className="font-bold text-gold underline underline-offset-2"
              href="https://substack.com/@kratosbi"
              target="_blank"
              rel="noreferrer"
            >
              KratosBI on Substack
            </a>
            .
          </div>
        )}

        {/* One wax seal per child, and a place to start a new letter. */}
        <div className="relative mt-400 flex flex-wrap items-center gap-300 print:hidden">
          {letters.map((letter) => (
            <button
              key={letter.id}
              type="button"
              aria-pressed={current?.id === letter.id}
              className={`inline-flex items-center gap-200 rounded-full py-100 pl-100 pr-400 text-400 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${current?.id === letter.id ? 'bg-ink-red/15 text-ink-red ring-2 ring-ink-red' : 'text-ink hover:bg-ink/10'}`}
              onClick={() => setOpenId(letter.id)}
            >
              <span className="seal !h-10 !w-10 !text-[20px]">{letter.name.charAt(0).toUpperCase()}</span>
              {letter.name}
              <span className="num text-200 font-normal text-muted-foreground">
                {letter.wishes.length} {letter.wishes.length === 1 ? 'wish' : 'wishes'}
              </span>
            </button>
          ))}
          {letters.length < MAX_LETTERS && (
            <form
              className="flex flex-wrap items-center gap-200"
              onSubmit={(event) => {
                event.preventDefault();
                start();
              }}
            >
              <input
                aria-label="Child's first name or nickname"
                className={`${field} w-[13em]`}
                value={newName}
                maxLength={20}
                placeholder="Child’s first name"
                onChange={(event) => {
                  const typed = event.target.value;
                  const clean = cleanName(typed);
                  setNameHint(clean !== typed.slice(0, 20).replace(/\s+/g, ' ').trimStart());
                  setNewName(clean);
                }}
              />
              <button type="submit" className={`${button} !h-11`} disabled={!newName.trim()}>
                <Mail aria-hidden className="h-4 w-4 text-gold" />
                Start a letter
              </button>
            </form>
          )}
          {nameHint && (
            <p role="status" className="basis-full text-300 font-bold text-ink-red">
              Just a first name goes here, letters only. No year is needed to start a letter.
            </p>
          )}
        </div>

        <div className="relative mt-400">
          {current ? (
            <LetterSheet
              key={current.id}
              letter={current}
              grownUp={grownUp}
              onChange={onChange}
              onRemove={() => {
                onChange((all) => removeLetter(all, current.id));
                setOpenId(null);
              }}
            />
          ) : (
            <div className="letter-sheet px-700 py-700 text-center">
              <p className="script text-[44px] leading-[1.2] text-ink-red">Dear Santa…</p>
              <p className="mt-200 text-500 text-ink">Type a child’s first name above and press “Start a letter”. That is all it takes.</p>
            </div>
          )}
        </div>

        {current && <PrintLetter letter={current} />}

        <p className="relative mt-400 text-center text-200 text-muted-foreground print:hidden">
          First names or nicknames only, please: no surnames, ages, birthdays or addresses. Nothing here is sent
          anywhere, and there is nothing to buy.
        </p>
      </div>
    </div>
  );
}

/** The dashboard's invitation to the List Desk. */
export function WishListCard({ letters, onOpen }: { letters: Letter[]; onOpen: () => void }) {
  const wishes = letters.reduce((sum, letter) => sum + letter.wishes.length, 0);
  return (
    <section className="panel p-500" aria-label="Letters to Santa">
      <div className="relative flex flex-wrap items-center justify-between gap-400">
        <div className="min-w-0">
          <div className="eyebrow">North Pole Post Office</div>
          <h2 className="ink-title mt-100 text-hero-800 leading-hero-800">Letters to Santa</h2>
          <p className="mt-100 text-400 text-ink">
            {letters.length === 0
              ? 'Write a Christmas wish list for every child in the house. Santa reads each one twice.'
              : `${letters.length} ${letters.length === 1 ? 'letter' : 'letters'} on Santa’s desk, ${wishes} ${wishes === 1 ? 'wish' : 'wishes'} in all.`}
          </p>
          {letters.length > 0 && (
            <ul className="mt-300 flex flex-wrap gap-300">
              {letters.map((letter) => (
                <li key={letter.id} className="inline-flex items-center gap-200 text-400 font-bold text-ink">
                  <span className="seal !h-9 !w-9 !text-[18px]">{letter.name.charAt(0).toUpperCase()}</span>
                  {letter.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="plaque plaque-red inline-flex h-12 items-center gap-200 !rounded-full px-600 text-400 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <Mail aria-hidden className="h-5 w-5" />
          {letters.length === 0 ? 'Write a letter to Santa' : 'Open the letters'}
        </button>
      </div>
    </section>
  );
}
