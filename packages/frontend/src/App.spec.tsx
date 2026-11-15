import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '@/App';

import { fakeBackend } from './test/fake-backend';

describe('App', () => {
  it('offers to load the season when Fabric has no rows for it', async () => {
    render(<App backend={fakeBackend({ status: 'missing' })} />);
    expect(
      await screen.findByRole('button', { name: /Load Christmas \d{4} into Fabric/ })
    ).toBeVisible();
  });

  it('explains that an interrupted load can be resumed', async () => {
    render(<App backend={fakeBackend({ status: 'partial' })} />);
    expect(await screen.findByText(/only partly loaded/)).toBeVisible();
  });

  it('shows an actionable error when the season cannot be read', async () => {
    const backend = fakeBackend({ status: 'missing' });
    backend.loadSeason = async () => {
      throw new Error('Forbidden');
    };
    render(<App backend={backend} />);
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
    expect(screen.getByText(/Forbidden/)).toBeVisible();
  });
});
