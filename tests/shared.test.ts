import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchKitchens, place, type Kitchen } from '../src/lib/shared';

// el() and kitchenCard() need a browser DOM, so they are not covered here.

afterEach(() => vi.unstubAllGlobals());

describe('place', () => {
  it('joins city and region, skipping blanks', () => {
    expect(place({ city: 'Oakland', region: 'California' } as Kitchen)).toBe('Oakland, California');
    expect(place({ city: 'Oakland', region: '' } as Kitchen)).toBe('Oakland');
  });
});

describe('fetchKitchens', () => {
  it('drops empty filters from the query string', async () => {
    const fetch = vi.fn(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetch);
    await fetchKitchens({ type: 'cafe', q: '' });
    expect(fetch).toHaveBeenCalledWith('/api/kitchens?type=cafe');
  });

  it('throws when the API fails', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    await expect(fetchKitchens()).rejects.toThrow('Could not load kitchens');
  });
});
