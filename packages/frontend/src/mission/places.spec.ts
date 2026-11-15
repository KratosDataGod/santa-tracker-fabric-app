import { describe, expect, it } from 'vitest';

import { searchPlaces } from './places';

describe('town and ZIP search, inside the browser', () => {
  it('finds a town by the start of its name, biggest first', async () => {
    const found = await searchPlaces('milwau');
    expect(found[0]).toMatchObject({ name: 'Milwaukee, WI' });
    expect(found[0].lat).toBeCloseTo(43.04, 1);
  });

  it('narrows by state or country after a comma', async () => {
    expect((await searchPlaces('springfield, mo'))[0].name).toBe('Springfield, MO');
    expect((await searchPlaces('paris, fr'))[0].name).toBe('Paris, France');
  });

  it('finds a US ZIP code', async () => {
    expect(await searchPlaces('53202')).toEqual([
      expect.objectContaining({ name: 'Milwaukee, WI', hint: 'ZIP 53202' }),
    ]);
  });

  it('ignores accents and returns nothing for nonsense', async () => {
    expect((await searchPlaces('sao paulo'))[0].name).toBe('São Paulo, Brazil');
    expect(await searchPlaces('zzzzqqq')).toEqual([]);
    expect(await searchPlaces('a')).toEqual([]);
  });
});
