/**
 * Typed API client.
 *
 * - Validates every response with Zod.
 * - Converts network/HTTP failures into `ApiError` with a user-friendly message.
 * - `offlineKey`: successful responses are stored in IndexedDB; if the network
 *   later fails, the stored copy is returned with `fromCache: true` and the time
 *   it was stored — so the UI can label it as cached, never as live.
 */
import type { z } from 'zod';
import { cacheResponse, readCachedResponse } from './db';
import * as S from './schemas';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  retryable: boolean;
  constructor(message: string, status: number, code: string, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export interface Cached<T> {
  data: T;
  fromCache: boolean;
  cachedAt?: string;
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

type Params = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, params?: Params) {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const q = qs.toString();
  return `${API_BASE}${path}${q ? `?${q}` : ''}`;
}

async function request<T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  opts: { params?: Params; method?: string; body?: unknown; signal?: AbortSignal; auth?: boolean } = {},
): Promise<z.infer<T>> {
  let res: Response;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth && authToken) headers.Authorization = `Bearer ${authToken}`;
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(
      typeof navigator !== 'undefined' && !navigator.onLine
        ? 'You are offline. Connect to the internet and try again.'
        : 'Could not reach the Locate U server. Check that the backend is running.',
      0,
      'network',
      true,
    );
  }
  if (res.status === 204) return undefined as z.infer<T>;
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = (payload as { error?: { message?: string; code?: string } } | null)?.error;
    const msg =
      err?.message ??
      (res.status === 429 ? 'Too many requests — please wait a moment.' : `Request failed (HTTP ${res.status})`);
    throw new ApiError(msg, res.status, err?.code ?? 'http_error', res.status >= 500 || res.status === 429);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error('Unexpected API response', path, parsed.error.issues);
    throw new ApiError('The server sent data in an unexpected format.', res.status, 'invalid_response');
  }
  return parsed.data;
}

async function withOffline<T>(key: string, fn: () => Promise<T>): Promise<Cached<T>> {
  try {
    const data = await fn();
    cacheResponse(key, data).catch(() => undefined);
    return { data, fromCache: false };
  } catch (e) {
    if (e instanceof ApiError && e.code === 'network') {
      const hit = await readCachedResponse(key).catch(() => undefined);
      if (hit) return { data: hit.data as T, fromCache: true, cachedAt: hit.stored_at };
    }
    throw e;
  }
}

const anyJson = { safeParse: (v: unknown) => ({ success: true as const, data: v }) } as unknown as z.ZodAny;

export const api = {
  health: () => request(S.HealthSchema, '/health'),
  config: () => withOffline('config', () => request(S.ConfigSchema, '/config')),

  search: (q: string, opts: { lang?: string; country?: string; signal?: AbortSignal } = {}) =>
    withOffline(`search:${q.toLowerCase()}:${opts.country ?? ''}`, () =>
      request(S.SearchResponseSchema, '/geocode/search', {
        params: { q, lang: opts.lang, country: opts.country },
        signal: opts.signal,
      }),
    ),
  reverse: (lat: number, lon: number, opts: { lang?: string; zoom?: number } = {}) =>
    withOffline(`reverse:${lat.toFixed(4)},${lon.toFixed(4)}`, () =>
      request(S.ReverseResponseSchema, '/geocode/reverse', { params: { lat, lon, lang: opts.lang, zoom: opts.zoom } }),
    ),

  states: () => withOffline('india:states', () => request(S.StateSchema.array(), '/india/states')),
  coverage: () => withOffline('india:coverage', () => request(S.CoverageSchema, '/india/coverage')),
  state: (code: string) => withOffline(`india:state:${code}`, () => request(S.StateDetailSchema, `/india/${code}`)),
  places: (code: string, p: { district?: string; q?: string; sort?: 'population' | 'name'; limit?: number; offset?: number } = {}) =>
    withOffline(`india:places:${code}:${JSON.stringify(p)}`, () =>
      request(S.PlacePageSchema, `/india/${code}/places`, { params: p }),
    ),
  indiaSearch: (q: string, state?: string, signal?: AbortSignal) =>
    request(S.IndiaSearchSchema, '/india/search', { params: { q, state }, signal }),
  placeDetail: (id: string) =>
    withOffline(`india:place:${id}`, () => request(S.PlaceDetailSchema, `/india/places/${encodeURIComponent(id)}`)),
  nearest: (lat: number, lon: number, limit = 5) =>
    request(S.NearestSchema.array(), '/india/nearest', { params: { lat, lon, limit } }),
  stateBoundaries: () => withOffline('india:boundaries:states', () => request(anyJson, '/india/boundaries/states')),
  districtBoundaries: (code: string) =>
    withOffline(`india:boundaries:${code}`, () => request(anyJson, `/india/boundaries/${code}`)),

  weather: (lat: number, lon: number) =>
    withOffline(`weather:${lat.toFixed(2)},${lon.toFixed(2)}`, () =>
      request(S.WeatherSchema, '/weather', { params: { lat, lon } }),
    ),
  wikiNearby: (lat: number, lon: number, lang = 'en') =>
    withOffline(`wiki:${lat.toFixed(3)},${lon.toFixed(3)}:${lang}`, () =>
      request(S.WikiNearbySchema, '/wiki/nearby', { params: { lat, lon, lang } }),
    ),
  nearby: (lat: number, lon: number, category: string, radius = 2000) =>
    withOffline(`nearby:${lat.toFixed(3)},${lon.toFixed(3)}:${category}:${radius}`, () =>
      request(S.NearbySchema, '/nearby', { params: { lat, lon, category, radius } }),
    ),
  sources: () => request(anyJson, '/meta/sources'),

  register: (body: { email: string; password: string; display_name: string }) =>
    request(S.TokenSchema, '/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) => request(S.TokenSchema, '/auth/login', { method: 'POST', body }),
  me: () => request(S.UserSchema, '/auth/me', { auth: true }),
  deleteAccount: () => request(anyJson, '/auth/me', { method: 'DELETE', auth: true }),
  syncSaved: (items: unknown[]) => request(S.SavedListSchema, '/saved/sync', { method: 'POST', body: { items }, auth: true }),
  deleteSavedRemote: (id: string) => request(anyJson, `/saved/${id}`, { method: 'DELETE', auth: true }),
};
