import { api, ApiError } from './api';
import { _resetDB } from './db';

const states = [{ code: 'GA', name: 'Goa', type: 'state', capital: 'Panaji', lat: 15.3, lon: 74.1, bbox: [73.6, 14.9, 74.3, 15.8], district_count: 2, place_count: 50 }];

describe('api client', () => {
  beforeEach(() => _resetDB());
  afterEach(() => vi.restoreAllMocks());

  it('validates responses and caches them for offline use', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(states), { status: 200 }));
    const live = await api.states();
    expect(live.fromCache).toBe(false);
    expect(live.data[0].name).toBe('Goa');
    await new Promise((r) => setTimeout(r, 20));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const cached = await api.states();
    expect(cached.fromCache).toBe(true);
    expect(cached.cachedAt).toBeTruthy();
    expect(cached.data[0].code).toBe('GA');
  });

  it('surfaces server error messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'provider_rate_limited', message: 'Nominatim rate limit reached' } }), { status: 503 }),
    );
    await expect(api.search('anything')).rejects.toMatchObject({ message: 'Nominatim rate limit reached', code: 'provider_rate_limited', retryable: true });
  });

  it('rejects malformed payloads instead of crashing later', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify([{ code: 1 }]), { status: 200 }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = await api.indiaSearch('x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('invalid_response');
  });

  it('reports network errors when nothing is cached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.reverse(1.23, 4.56)).rejects.toMatchObject({ code: 'network' });
  });
});
