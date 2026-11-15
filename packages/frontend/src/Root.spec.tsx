import type { OpaqueSession } from '@microsoft/rayfin-auth';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Root } from './Root';
import type { AuthConfig, IAuthService } from './services/rayfin-auth.service';

// The app content reads its season from Fabric. In these auth tests there is no
// backend, so answer "no season loaded yet" and assert on the loader heading.
vi.mock('./mission/fabric-backend', () => ({
  fabricBackend: {
    loadSeason: async () => ({ status: 'missing' }),
    seedSeason: async () => ({ total: 0, created: 0, skipped: 0, nextOffset: 0, done: true }),
    resetSeason: async () => ({ deleted: 0, done: true }),
    ingestLiveFeed: async () => ({ ok: true, code: 'FRESH', message: '', stored: false }),
    latestReadings: async () => [],
  },
}));

// Signed-out visitors get the public backend, which never touches Fabric.
vi.mock('./mission/public-backend', () => ({
  publicBackend: {
    visitor: true,
    loadSeason: async () => ({ status: 'missing' }),
    seedSeason: async () => {
      throw new Error('Sign in to load the season into Fabric.');
    },
    resetSeason: async () => {
      throw new Error('Sign in to rebuild the season in Fabric.');
    },
    ingestLiveFeed: async () => ({ ok: true, code: 'VISITOR', message: '', stored: false }),
    latestReadings: async () => [],
  },
}));

const LOAD = /Load Christmas \d{4} into Fabric/;
const protectedContent = () => screen.queryByRole('button', { name: LOAD });

const authenticated: OpaqueSession = {
  user: null,
  isAuthenticated: true,
  isAnonymous: false,
};

function service(config: AuthConfig = { kind: 'ready' }): IAuthService {
  return {
    config,
    canSignIn: config.kind === 'ready',
    resolveSession: vi.fn(async () => null),
    signIn: vi.fn(async () => authenticated),
  };
}

describe('public app for visitors, protected app for the crew', () => {
  beforeEach(() => {
    // The crew link: only it shows the sign-in button.
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/?crew');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not render the app while session resolution is pending', () => {
    const auth = service();
    auth.resolveSession = vi.fn(
      () => new Promise<OpaqueSession | null>(() => {})
    );
    render(<Root rayfinAuthService={auth} />);
    expect(
      screen.queryByRole('heading', { name: 'North Pole Mission Control' })
    ).toBeNull();
    expect(screen.getByText('Connecting to Fabric…')).toBeVisible();
  });

  it('shows signed-out visitors the public app, without protected content', async () => {
    render(<Root rayfinAuthService={service()} />);
    expect(await screen.findByRole('button', { name: 'Crew sign-in' })).toBeVisible();
    expect(await screen.findByText(/still setting up/)).toBeVisible();
    expect(protectedContent()).toBeNull();
  });

  it('hides crew sign-in from the public, who open the plain address', async () => {
    window.history.replaceState(null, '', '/');
    render(<Root rayfinAuthService={service()} />);
    expect(await screen.findByText(/still setting up/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Crew sign-in' })).toBeNull();
    expect(protectedContent()).toBeNull();
  });

  it('renders the protected app only after a silent authenticated session resolves', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => authenticated);
    render(<Root rayfinAuthService={auth} />);
    expect(await screen.findByRole('button', { name: LOAD })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Crew sign-in' })).toBeNull();
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('does not treat an anonymous SDK session as an authenticated app user', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => ({
      ...authenticated,
      isAnonymous: true,
    }));
    render(<Root rayfinAuthService={auth} />);
    expect(await screen.findByRole('button', { name: 'Crew sign-in' })).toBeVisible();
    expect(protectedContent()).toBeNull();
  });

  it('recovers from failed local automatic sign-in through a user gesture', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => {
      throw new Error('Local sign-in unavailable.');
    });
    render(<Root rayfinAuthService={auth} />);
    const button = await screen.findByRole('button', { name: 'Crew sign-in' });
    expect(protectedContent()).toBeNull();
    await act(async () => fireEvent.click(button));
    expect(auth.signIn).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: LOAD })).toBeVisible();
  });

  it('keeps content protected after interactive sign-in fails', async () => {
    const auth = service();
    auth.signIn = vi.fn(async () => {
      throw new Error('Sign-in was cancelled.');
    });
    render(<Root rayfinAuthService={auth} />);
    const button = await screen.findByRole('button', { name: 'Crew sign-in' });
    await act(async () => fireEvent.click(button));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in was cancelled.');
    expect(protectedContent()).toBeNull();
  });

  it('falls back to the public app when the authenticated session ends', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => authenticated);
    let notify: ((session: OpaqueSession | null) => void) | undefined;
    const unsubscribe = vi.fn();
    auth.onSessionChange = vi.fn((listener) => {
      notify = listener;
      return unsubscribe;
    });
    render(<Root rayfinAuthService={auth} />);
    expect(await screen.findByRole('button', { name: LOAD })).toBeVisible();
    await act(async () => notify?.(null));
    expect(await screen.findByRole('button', { name: 'Crew sign-in' })).toBeVisible();
    expect(protectedContent()).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it.each<AuthConfig>([
    { kind: 'not-deployed' },
    { kind: 'incomplete', missing: ['publishableKey'] },
    { kind: 'config-error', message: 'Runtime configuration is unavailable.' },
  ])('fails closed for $kind configuration', async (config) => {
    await act(async () => render(<Root rayfinAuthService={service(config)} />));
    expect(
      screen.queryByRole('heading', { name: 'North Pole Mission Control' })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Crew sign-in' })).toBeNull();
    expect(protectedContent()).toBeNull();
  });
});
