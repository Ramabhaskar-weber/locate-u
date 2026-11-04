/**
 * Zod schemas for every backend response the UI relies on. Responses are
 * validated at the boundary so a malformed payload surfaces as a clear error
 * instead of an undefined-property crash deep inside a component.
 */
import { z } from 'zod';

export const GeoPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  display_name: z.string(),
  lat: z.number(),
  lon: z.number(),
  category: z.string().nullish(),
  type: z.string().nullish(),
  importance: z.number().nullish(),
  osm_type: z.string().nullish(),
  osm_id: z.number().nullish(),
  bbox: z.array(z.number()).length(4).nullish(),
  address: z.record(z.string()).default({}),
  source: z.string(),
  licence: z.string().nullish(),
});
export type GeoPlace = z.infer<typeof GeoPlaceSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(GeoPlaceSchema),
  cached: z.boolean(),
  fetched_at: z.string(),
  provider: z.string(),
  attribution: z.string(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const StateSchema = z.object({
  code: z.string(),
  name: z.string(),
  type: z.enum(['state', 'union_territory']),
  capital: z.string().nullish(),
  lat: z.number().nullish(),
  lon: z.number().nullish(),
  bbox: z.array(z.number()).nullish(),
  district_count: z.number(),
  place_count: z.number(),
  source_ids: z.record(z.any()).nullish(),
});
export type IndiaState = z.infer<typeof StateSchema>;

export const DistrictSchema = z.object({
  id: z.string(),
  state_code: z.string(),
  name: z.string(),
  name_2011: z.string().nullish(),
  census_2011_code: z.number().nullish(),
  lat: z.number().nullish(),
  lon: z.number().nullish(),
  bbox: z.array(z.number()).nullish(),
  place_count: z.number(),
});
export type District = z.infer<typeof DistrictSchema>;

export const PlaceSchema = z.object({
  id: z.string(),
  state_code: z.string(),
  district_id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  population: z.number().nullish(),
  is_capital: z.boolean(),
  assignment: z.string(),
  sources: z.record(z.union([z.number(), z.string()])),
});
export type IndiaPlace = z.infer<typeof PlaceSchema>;

export const NearestSchema = z.object({
  place: PlaceSchema,
  district: z.string().nullish(),
  state: z.string().nullish(),
  distance_km: z.number(),
});
export type NearestPlace = z.infer<typeof NearestSchema>;

export const ReverseResponseSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  result: GeoPlaceSchema.nullable(),
  nearest_india_places: z.array(NearestSchema).default([]),
  cached: z.boolean(),
  fetched_at: z.string(),
  provider: z.string(),
  attribution: z.string(),
});
export type ReverseResponse = z.infer<typeof ReverseResponseSchema>;

export const StateDetailSchema = z.object({ state: StateSchema, districts: z.array(DistrictSchema) });
export type StateDetail = z.infer<typeof StateDetailSchema>;

export const PlacePageSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  items: z.array(PlaceSchema),
});
export type PlacePage = z.infer<typeof PlacePageSchema>;

export const IndiaSearchSchema = z.object({
  query: z.string(),
  states: z.array(StateSchema),
  districts: z.array(DistrictSchema),
  places: z.array(PlaceSchema),
});
export type IndiaSearch = z.infer<typeof IndiaSearchSchema>;

export const PlaceDetailSchema = z.object({
  place: PlaceSchema,
  district: DistrictSchema,
  state: StateSchema,
  nearby: z.array(NearestSchema),
});
export type PlaceDetail = z.infer<typeof PlaceDetailSchema>;

export const MapLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['base', 'overlay']),
  url: z.string().optional(),
  subdomains: z.string().optional(),
  attribution: z.string().optional(),
  max_zoom: z.number().optional(),
  policy: z.string().optional(),
  source: z.string().optional(),
});
export type MapLayer = z.infer<typeof MapLayerSchema>;

export const ConfigSchema = z.object({
  app_name: z.string(),
  version: z.string(),
  map: z.object({
    provider: z.string(),
    default_center: z.tuple([z.number(), z.number()]),
    default_zoom: z.number(),
    layers: z.array(MapLayerSchema),
  }),
  features: z.object({
    weather: z.boolean(),
    wikipedia: z.boolean(),
    nearby: z.boolean(),
    accounts: z.boolean(),
    satellite: z.boolean(),
    offline_tiles: z.boolean(),
    ai: z.boolean(),
  }),
  nearby_categories: z.array(z.object({ id: z.string(), label: z.string() })),
  geocoding: z.object({
    provider: z.string(),
    min_interval_seconds: z.number(),
    autocomplete: z.boolean(),
    cache_days: z.number(),
  }),
});
export type AppConfig = z.infer<typeof ConfigSchema>;

export const CoverageSchema = z.object({
  states: z.number(),
  union_territories: z.number(),
  expected: z.object({ states: z.number(), union_territories: z.number() }),
  complete_state_list: z.boolean(),
  districts: z.number(),
  places: z.number(),
  places_by_source: z.object({ geonames: z.number(), csc_only: z.number() }),
  per_state: z.array(z.object({ code: z.string(), name: z.string(), type: z.string(), districts: z.number(), places: z.number() })),
  last_import: z
    .object({
      version: z.string(),
      generated_at: z.string().nullish(),
      imported_at: z.string().nullish(),
      counts: z.record(z.number()).nullish(),
      validation: z.record(z.any()).nullish(),
    })
    .nullable(),
  manifest: z
    .object({
      dataset: z.string(),
      version: z.string(),
      generated_at: z.string(),
      coverage_note: z.string(),
      sources: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          license: z.string(),
          url: z.string(),
          attribution: z.string(),
          retrieved_at: z.string().nullish(),
          sha256: z.string().nullish(),
          data_snapshot: z.string().optional(),
        }),
      ),
      counts: z.record(z.number()),
    })
    .nullable(),
});
export type Coverage = z.infer<typeof CoverageSchema>;

const Envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data, cached: z.boolean(), fetched_at: z.string() }).passthrough();

export const WeatherSchema = Envelope(
  z.object({
    timezone: z.string().nullish(),
    current: z.object({
      time: z.string().nullish(),
      temperature: z.number().nullish(),
      feels_like: z.number().nullish(),
      humidity: z.number().nullish(),
      wind_speed: z.number().nullish(),
      precipitation: z.number().nullish(),
      code: z.number().nullish(),
      summary: z.string(),
      is_day: z.boolean(),
    }),
    daily: z.array(
      z.object({
        date: z.string(),
        code: z.number().nullish(),
        summary: z.string(),
        t_max: z.number().nullish(),
        t_min: z.number().nullish(),
        precip_prob: z.number().nullish(),
        sunrise: z.string().nullish(),
        sunset: z.string().nullish(),
        uv_max: z.number().nullish(),
      }),
    ),
    attribution: z.string(),
  }),
);
export type WeatherResponse = z.infer<typeof WeatherSchema>;

export const WikiArticleSchema = z.object({
  title: z.string().nullish(),
  extract: z.string().nullish(),
  url: z.string().nullish(),
  thumbnail: z.string().nullish(),
  lat: z.number().nullish(),
  lon: z.number().nullish(),
});
export const WikiNearbySchema = Envelope(z.array(WikiArticleSchema));
export type WikiArticle = z.infer<typeof WikiArticleSchema>;

export const NearbyItemSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  lat: z.number(),
  lon: z.number(),
  kind: z.string().nullish(),
  phone: z.string().nullish(),
  website: z.string().nullish(),
  opening_hours: z.string().nullish(),
  wheelchair: z.string().nullish(),
  address: z.string().nullish(),
  distance_km: z.number(),
});
export const NearbySchema = Envelope(z.array(NearbyItemSchema));
export type NearbyItem = z.infer<typeof NearbyItemSchema>;

export const UserSchema = z.object({ id: z.string(), email: z.string(), display_name: z.string(), created_at: z.string() });
export type User = z.infer<typeof UserSchema>;
export const TokenSchema = z.object({ access_token: z.string(), token_type: z.string(), expires_in: z.number(), user: UserSchema });

export const SavedServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  address: z.string().nullish(),
  note: z.string().nullish(),
  tags: z.array(z.string()),
  collection: z.string().nullish(),
  color: z.string().nullish(),
  source: z.string(),
  source_ref: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const SavedListSchema = z.array(SavedServerSchema);

export const HealthSchema = z.object({
  status: z.string(),
  app: z.string(),
  version: z.string(),
  env: z.string(),
  database: z.object({ ok: z.boolean(), dialect: z.string().nullish() }),
  time: z.string(),
});
