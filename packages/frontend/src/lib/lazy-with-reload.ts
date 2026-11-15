import { lazy, type ComponentType } from 'react';

const FLAG = 'santa-tracker-reloaded-for-chunk';

/**
 * `React.lazy` that survives a redeploy.
 *
 * Each build gives its code chunks new names. A page that was opened before a
 * deploy still asks for the old names, which are gone, and the import fails
 * with "Failed to fetch dynamically imported module". The cure is a fresh copy
 * of the page, so: retry once, then reload once. If it still fails after a
 * reload, the error is real and is passed on.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches React.lazy's own signature
export function lazyWithReload<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const loaded = await load();
      try {
        window.sessionStorage.removeItem(FLAG);
      } catch {
        // Storage unavailable: nothing to clear.
      }
      return loaded;
    } catch (first) {
      try {
        // A brief network blip: one more try before anything drastic.
        await new Promise((resolve) => setTimeout(resolve, 600));
        return await load();
      } catch {
        let alreadyReloaded = true;
        try {
          alreadyReloaded = window.sessionStorage.getItem(FLAG) === '1';
          if (!alreadyReloaded) window.sessionStorage.setItem(FLAG, '1');
        } catch {
          // Without storage we cannot tell, so do not risk a reload loop.
        }
        if (!alreadyReloaded) {
          window.location.reload();
          // Never resolves: the page is on its way out.
          return new Promise<{ default: T }>(() => {});
        }
        throw first;
      }
    }
  });
}
