const FLAG = 'santa-tracker-crew';

/**
 * True when the page was opened with the crew link (the normal address plus
 * `?crew`). The public never sees the sign-in button; the flag is remembered
 * for the browser session so it survives the trip to Microsoft's sign-in page.
 */
export function isCrewLink(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('crew')) {
      window.sessionStorage.setItem(FLAG, '1');
      return true;
    }
    return window.sessionStorage.getItem(FLAG) === '1';
  } catch {
    return new URLSearchParams(window.location.search).has('crew');
  }
}
