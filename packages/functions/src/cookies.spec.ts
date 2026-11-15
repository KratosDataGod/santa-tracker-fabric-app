import { describe, expect, it } from 'vitest';

import { cookiesBakedK, kitchenAt, routeTreatsK, TOTAL_COOKIES_K } from './cookies.js';

const tl = { buildStart: Date.UTC(2026, 10, 1), takeoff: Date.UTC(2026, 11, 24, 11) };

describe("Mrs. Claus's kitchen", () => {
  it('bakes nothing before the season and the full count by takeoff, never going backwards', () => {
    expect(cookiesBakedK(tl, tl.buildStart - 1)).toBe(0);
    expect(cookiesBakedK(tl, tl.takeoff)).toBe(TOTAL_COOKIES_K);
    let last = 0;
    for (let t = tl.buildStart; t <= tl.takeoff; t += 6 * 3_600_000) {
      const now = cookiesBakedK(tl, t);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it('never eats more cookies than were baked', () => {
    for (let t = tl.buildStart; t <= tl.takeoff + 86_400_000; t += 7 * 3_600_000) {
      const k = kitchenAt(tl, t);
      expect(k.elvesK + k.reindeerK + k.jarK).toBeLessThanOrEqual(k.bakedK);
      expect(k.jarK).toBeGreaterThanOrEqual(0);
      expect(k.santa).toBeGreaterThanOrEqual(0);
    }
    expect(kitchenAt(tl, tl.takeoff).santa).toBeGreaterThan(1500);
  });

  it('counts treats along the route from gifts delivered', () => {
    expect(routeTreatsK(0)).toEqual({ cookiesK: 0, milkK: 0 });
    expect(routeTreatsK(1800).cookiesK).toBe(300);
  });
});
