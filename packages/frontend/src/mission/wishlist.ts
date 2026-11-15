/**
 * Letters to Santa: each child's Christmas wish list.
 *
 * Everything here lives in this browser's storage and nowhere else. Nothing is
 * sent to the app's backend or to any other service, and there are no shopping
 * links of any kind. To keep what is stored harmless, a child is known only by
 * a first name or nickname: no surname, age, birthday, address or photo.
 */
export interface Wish {
  id: string;
  text: string;
  /** One of WISH_ICONS, shown beside the wish. */
  icon: string;
  /** Ticked by a grown-up once it is taken care of. Hidden from the children's view. */
  sorted: boolean;
}

export interface Letter {
  id: string;
  /** First name or nickname only. */
  name: string;
  wishes: Wish[];
}

export const WISH_ICONS = ['🎁', '🚲', '📚', '🧸', '🤖', '🎨', '⚽', '🎮', '🧩', '🪀', '🎸', '🛷', '🦖', '👗', '🚂', '🐶'];

export const MAX_LETTERS = 12;
export const MAX_WISHES = 25;
const NAME_MAX = 20;
const WISH_MAX = 80;
const KEY = 'santa-tracker-letters';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** A first name or nickname: letters, spaces, hyphens and apostrophes only, so nothing like a full address fits. */
export const cleanName = (raw: string) =>
  raw
    .replace(/[^\p{L}\p{M} '’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, NAME_MAX);

export const cleanWish = (raw: string) => raw.replace(/\s+/g, ' ').trimStart().slice(0, WISH_MAX);

export function loadLetters(): Letter[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_LETTERS).flatMap((entry): Letter[] => {
      const item = entry as Partial<Letter>;
      const name = typeof item.name === 'string' ? cleanName(item.name).trim() : '';
      if (!name) return [];
      const wishes = (Array.isArray(item.wishes) ? item.wishes : []).slice(0, MAX_WISHES).flatMap((w): Wish[] => {
        const wish = w as Partial<Wish>;
        const text = typeof wish.text === 'string' ? cleanWish(wish.text).trim() : '';
        if (!text) return [];
        return [
          {
            id: typeof wish.id === 'string' ? wish.id : newId(),
            text,
            icon: WISH_ICONS.includes(wish.icon ?? '') ? (wish.icon as string) : WISH_ICONS[0],
            sorted: wish.sorted === true,
          },
        ];
      });
      return [{ id: typeof item.id === 'string' ? item.id : newId(), name, wishes }];
    });
  } catch {
    return [];
  }
}

export function saveLetters(letters: Letter[]): void {
  try {
    if (letters.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(letters));
  } catch {
    // Storage can be unavailable (private mode); the letters then last for this visit only.
  }
}

export function addLetter(letters: Letter[], name: string): Letter[] {
  const clean = cleanName(name).trim();
  if (!clean || letters.length >= MAX_LETTERS) return letters;
  return [...letters, { id: newId(), name: clean, wishes: [] }];
}

export const removeLetter = (letters: Letter[], id: string) => letters.filter((letter) => letter.id !== id);

const change = (letters: Letter[], id: string, edit: (letter: Letter) => Letter) =>
  letters.map((letter) => (letter.id === id ? edit(letter) : letter));

export const renameLetter = (letters: Letter[], id: string, name: string) => {
  const clean = cleanName(name).trim();
  return clean ? change(letters, id, (letter) => ({ ...letter, name: clean })) : letters;
};

export function addWish(letters: Letter[], id: string, text: string, icon: string): Letter[] {
  const clean = cleanWish(text).trim();
  if (!clean) return letters;
  return change(letters, id, (letter) =>
    letter.wishes.length >= MAX_WISHES
      ? letter
      : { ...letter, wishes: [...letter.wishes, { id: newId(), text: clean, icon, sorted: false }] }
  );
}

export const editWish = (letters: Letter[], id: string, wishId: string, patch: Partial<Omit<Wish, 'id'>>) =>
  change(letters, id, (letter) => ({
    ...letter,
    wishes: letter.wishes.flatMap((wish) => {
      if (wish.id !== wishId) return [wish];
      const text = patch.text === undefined ? wish.text : cleanWish(patch.text).trim();
      return text ? [{ ...wish, ...patch, text }] : [wish];
    }),
  }));

export const removeWish = (letters: Letter[], id: string, wishId: string) =>
  change(letters, id, (letter) => ({ ...letter, wishes: letter.wishes.filter((wish) => wish.id !== wishId) }));

/** Moves a wish one place up (-1) or down (+1) the letter. */
export const moveWish = (letters: Letter[], id: string, wishId: string, by: -1 | 1) =>
  change(letters, id, (letter) => {
    const from = letter.wishes.findIndex((wish) => wish.id === wishId);
    const to = from + by;
    if (from < 0 || to < 0 || to >= letter.wishes.length) return letter;
    const wishes = [...letter.wishes];
    [wishes[from], wishes[to]] = [wishes[to], wishes[from]];
    return { ...letter, wishes };
  });

const listNames = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** What Santa says in his note once letters have arrived. */
export function letterLine(letters: Letter[]): string | null {
  const written = letters.filter((letter) => letter.wishes.length > 0);
  if (written.length === 0) return null;
  const names = listNames(written.slice(0, 4).map((letter) => letter.name));
  return written.length === 1
    ? `${names}, your letter is on my desk. I have read it twice.`
    : `${names}: your letters are on my desk, and I have read every one twice.`;
}

/** True when the year typed at the grown-ups' gate belongs to an adult. */
export function isGrownUpYear(input: string, thisYear = new Date().getFullYear()): boolean {
  if (!/^\d{4}$/.test(input.trim())) return false;
  const year = Number(input);
  return year >= thisYear - 110 && year <= thisYear - 18;
}
