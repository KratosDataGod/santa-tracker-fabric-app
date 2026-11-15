import { beforeEach, describe, expect, it } from 'vitest';

import {
  addLetter,
  addWish,
  cleanName,
  editWish,
  isGrownUpYear,
  letterLine,
  loadLetters,
  MAX_WISHES,
  moveWish,
  removeLetter,
  removeWish,
  saveLetters,
} from './wishlist';

describe('letters to Santa', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps a first name only: no digits, symbols or long text', () => {
    expect(cleanName('Emma 123 Main St.')).toBe('Emma Main St');
    expect(cleanName('Zoë-Mae O’Neil')).toBe('Zoë-Mae O’Neil');
    expect(cleanName('x'.repeat(50))).toHaveLength(20);
    expect(addLetter([], '12345')).toEqual([]);
  });

  it('adds several children, each with their own wishes, and saves them in the browser', () => {
    let letters = addLetter(addLetter([], 'Emma'), 'Noah');
    letters = addWish(letters, letters[0].id, '  A red bike  ', '🚲');
    letters = addWish(letters, letters[1].id, 'Dinosaur book', '📚');
    saveLetters(letters);
    const back = loadLetters();
    expect(back.map((l) => l.name)).toEqual(['Emma', 'Noah']);
    expect(back[0].wishes[0]).toMatchObject({ text: 'A red bike', icon: '🚲', sorted: false });
  });

  it('edits, reorders, ticks off and removes wishes', () => {
    let letters = addLetter([], 'Emma');
    const id = letters[0].id;
    for (const text of ['Bike', 'Book', 'Robot']) letters = addWish(letters, id, text, '🎁');
    const [bike, book] = letters[0].wishes;
    letters = moveWish(letters, id, book.id, -1);
    expect(letters[0].wishes.map((w) => w.text)).toEqual(['Book', 'Bike', 'Robot']);
    letters = editWish(letters, id, bike.id, { text: 'Blue bike', sorted: true });
    expect(letters[0].wishes[1]).toMatchObject({ text: 'Blue bike', sorted: true });
    letters = editWish(letters, id, bike.id, { text: '   ' });
    expect(letters[0].wishes[1].text).toBe('Blue bike');
    letters = removeWish(letters, id, book.id);
    expect(letters[0].wishes).toHaveLength(2);
    expect(removeLetter(letters, id)).toEqual([]);
  });

  it('caps a letter and ignores damaged storage', () => {
    let letters = addLetter([], 'Emma');
    for (let i = 0; i < MAX_WISHES + 5; i++) letters = addWish(letters, letters[0].id, `Wish ${i}`, '🎁');
    expect(letters[0].wishes).toHaveLength(MAX_WISHES);
    window.localStorage.setItem('santa-tracker-letters', '{not json');
    expect(loadLetters()).toEqual([]);
    window.localStorage.setItem('santa-tracker-letters', JSON.stringify([{ name: '', wishes: [] }, { name: 'Ok', wishes: [{ text: '' }] }]));
    expect(loadLetters()).toEqual([expect.objectContaining({ name: 'Ok', wishes: [] })]);
  });

  it("gives Santa a line about the letters, and gates the grown-ups' side by birth year", () => {
    let letters = addLetter(addLetter([], 'Emma'), 'Noah');
    expect(letterLine(letters)).toBeNull();
    letters = addWish(letters, letters[0].id, 'Bike', '🚲');
    expect(letterLine(letters)).toContain('Emma, your letter');
    letters = addWish(letters, letters[1].id, 'Book', '📚');
    expect(letterLine(letters)).toContain('Emma and Noah');
    expect(isGrownUpYear('1984', 2026)).toBe(true);
    expect(isGrownUpYear('2015', 2026)).toBe(false);
    expect(isGrownUpYear('84', 2026)).toBe(false);
    expect(isGrownUpYear('1800', 2026)).toBe(false);
  });
});
