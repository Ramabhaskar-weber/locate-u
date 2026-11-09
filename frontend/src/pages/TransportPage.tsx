import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Car,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Search,
  TrainFront,
  Zap,
  Clock,
  Award,
  Plane,
  Crosshair,
  CheckCircle2,
  Smartphone,
  Info,
  Copy,
  Check,
  ArrowUpDown,
  AlertCircle,
  Map as MapIcon,
} from 'lucide-react';
import { Badge, Card, Glass, Segmented } from '@/components/ui';
import { useMap } from '@/stores/map';
import { useGeolocation, copyText } from '@/hooks';
import { api } from '@/lib/api';
import { haversineKm } from '@/lib/geo';
import { toast } from '@/stores/toast';
import {
  AIRLINE_SERVICES,
  AIRPORT_HUBS,
  BUS_SERVICES,
  METRO_SYSTEMS,
  PRESET_LOCATIONS,
  RAIL_SERVICES,
} from '@/lib/transport';

type TransportTab = 'rides' | 'flights' | 'metro' | 'trains' | 'buses';

function resolveKnownPlaceCoords(query: string): { lat: number; lon: number } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const p of PRESET_LOCATIONS) {
    if (p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase().split(' ')[0])) {
      return { lat: p.lat, lon: p.lon };
    }
  }
  for (const a of AIRPORT_HUBS) {
    if (a.name.toLowerCase().includes(q) || a.code.toLowerCase() === q) {
      return { lat: a.lat, lon: a.lon };
    }
  }
  return null;
}

function buildProviderLinks(
  dest: { lat: number; lon: number },
  origin: { lat: number; lon: number },
  destName: string,
  originName: string,
) {
  const dLat = dest.lat.toFixed(6);
  const dLon = dest.lon.toFixed(6);
  const oLat = origin.lat.toFixed(6);
  const oLon = origin.lon.toFixed(6);
  const encDest = encodeURIComponent(destName || 'Destination');
  const encOrig = encodeURIComponent(originName || 'Pickup Location');

  return {
    uber: {
      webUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLon}&pickup[nickname]=${encOrig}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLon}&dropoff[nickname]=${encDest}`,
      limitationNote: 'Official Uber Universal Link: pre-fills pickup & drop coordinates on app and mobile web.',
    },
    ola: {
      webUrl: `https://book.olacabs.com/?serviceType=p2p&lat=${oLat}&lng=${oLon}&pickup_name=${encOrig}&drop_lat=${dLat}&drop_lng=${dLon}&drop_name=${encDest}&utm_source=locate_u`,
      limitationNote: 'Official Ola Web Dispatcher: pre-fills pickup & drop coordinates in Ola Cabs.',
    },
    rapido: {
      webUrl: `https://www.rapido.bike/`,
      appDeepLink: `rapido://open?pickup_lat=${oLat}&pickup_lng=${oLon}&pickup_name=${encOrig}&drop_lat=${dLat}&drop_lng=${dLon}&drop_name=${encDest}`,
      androidIntent: `intent://open?pickup_lat=${oLat}&pickup_lng=${oLon}&drop_lat=${dLat}&drop_lng=${dLon}&drop_name=${encDest}#Intent;scheme=rapido;package=com.rapido.passenger;S.browser_fallback_url=https%3A%2F%2Fwww.rapido.bike%2F;end`,
      limitationNote: 'Rapido supports mobile app URI deep links; destination is also copied to your clipboard.',
    },
    gmapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLon}&destination=${dLat},${dLon}&travelmode=driving`,
  };
}

export default function TransportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useMap((s) => s.user);
  const geo = useGeolocation();

  const initialDest = searchParams.get('dest') || searchParams.get('destName') || 'Subbayya Gari Hotel, Kakinada';
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const initialLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null;

  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [pickupInput, setPickupInput] = useState('Kakinada Town Railway Station');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lon: number }>({
    lat: 16.9602,
    lon: 82.241,
  });

  const [destInput, setDestInput] = useState(initialDest);
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(
    initialLat && initialLon ? { lat: initialLat, lon: initialLon } : { lat: 16.9891, lon: 82.2475 },
  );
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [tab, setTab] = useState<TransportTab>('rides');
  const [metroSearch, setMetroSearch] = useState('');

  useEffect(() => {
    const q = searchParams.get('dest') || searchParams.get('destName');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (q) {
      setDestInput(q);
      if (lat && lon && !Number.isNaN(parseFloat(lat)) && !Number.isNaN(parseFloat(lon))) {
        setDestCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
      } else {
        const known = resolveKnownPlaceCoords(q);
        if (known) setDestCoords(known);
      }
      setTab('rides');
    }
  }, [searchParams]);

  const activeOrigin = useMemo(() => {
    if (!useCustomPickup && user) {
      return { lat: user.lat, lon: user.lon, name: 'My Live GPS Location' };
    }
    if (useCustomPickup) {
      return { lat: pickupCoords.lat, lon: pickupCoords.lon, name: pickupInput || 'Custom Pickup' };
    }
    return { lat: 16.9602, lon: 82.241, name: 'Kakinada Town Station (City-Center Fallback)' };
  }, [useCustomPickup, user, pickupCoords, pickupInput]);

  const activeDest = useMemo(() => {
    if (destCoords) return destCoords;
    const known = resolveKnownPlaceCoords(destInput);
    if (known) return known;
    return { lat: 16.9891, lon: 82.2475 };
  }, [destCoords, destInput]);

  const handleLookupDestination = async () => {
    const clean = destInput.trim();
    if (!clean) return;
    const preset = resolveKnownPlaceCoords(clean);
    if (preset) {
      setDestCoords(preset);
      toast(`Coordinates locked for ${clean}`, { tone: 'success' });
      return;
    }
    setSearchingPlace(true);
    try {
      const indiaRes = await api.indiaSearch(clean, 1);
      if (indiaRes.length > 0) {
        setDestCoords({ lat: indiaRes[0].lat, lon: indiaRes[0].lon });
        setDestInput(`${indiaRes[0].name}, ${indiaRes[0].state_name}`);
        return;
      }
      const worldRes = await api.search(clean, { limit: 1 });
      if (worldRes.data.results.length > 0) {
        const top = worldRes.data.results[0];
        setDestCoords({ lat: top.lat, lon: top.lon });
        setDestInput(top.name || clean);
      }
    } catch {
      toast('Using nearest regional coordinates.', { tone: 'info' });
    } finally {
      setSearchingPlace(false);
    }
  };

  const handleSwapPickupAndDest = () => {
    const oldOrigin = { ...activeOrigin };
    const oldDest = { ...activeDest };
    const oldDestName = destInput;
    setUseCustomPickup(true);
    setPickupInput(oldDestName || 'Swapped Pickup');
    setPickupCoords({ lat: oldDest.lat, lon: oldDest.lon });
    setDestInput(oldOrigin.name);
    setDestCoords({ lat: oldOrigin.lat, lon: oldOrigin.lon });
  };

  const distanceKm = useMemo(() => {
    const raw = haversineKm(activeOrigin, activeDest);
    return Math.max(1.2, parseFloat((raw * 1.25).toFixed(1)));
  }, [activeOrigin, activeDest]);

  const links = useMemo(
    () => buildProviderLinks(activeDest, activeOrigin, destInput, activeOrigin.name),
    [activeDest, activeOrigin, destInput],
  );

  const comparison = useMemo(() => {
    const d = Math.min(distanceKm, 120);
    return [
      {
        id: 'rapido-bike',
        name: 'Rapido Bike Taxi',
        provider: 'rapido' as const,
        vehicle: '1 Pillion Rider · Fastest in Traffic',
        estimatedPrice: Math.round(20 + d * 8.5),
        etaMins: Math.max(3, Math.round(d * 2.1)),
        badge: 'Lowest Fare · App Deep Link',
        webUrl: links.rapido.webUrl,
        appDeepLink: links.rapido.appDeepLink,
        androidIntent: links.rapido.androidIntent,
        supportsWebAutoFill: false,
        limitationNote: links.rapido.limitationNote,
      },
      {
        id: 'uber-auto',
        name: 'Uber Auto / Moto',
        provider: 'uber' as const,
        vehicle: 'Up to 3 Passengers · Upfront Fare',
        estimatedPrice: Math.round(30 + d * 13.5),
        etaMins: Math.max(4, Math.round(d * 2.6)),
        badge: 'Full Auto-Fill (App + Web)',
        webUrl: links.uber.webUrl,
        appDeepLink: links.uber.webUrl,
        androidIntent: links.uber.webUrl,
        supportsWebAutoFill: true,
        limitationNote: links.uber.limitationNote,
      },
      {
        id: 'ola-auto',
        name: 'Ola Auto',
        provider: 'ola' as const,
        vehicle: 'Up to 3 Passengers · Doorstep Pickup',
        estimatedPrice: Math.round(32 + d * 13.5),
        etaMins: Math.max(4, Math.round(d * 2.7)),
        badge: 'Full Auto-Fill (App + Web)',
        webUrl: links.ola.webUrl,
        appDeepLink: links.ola.webUrl,
        androidIntent: links.ola.webUrl,
        supportsWebAutoFill: true,
        limitationNote: links.ola.limitationNote,
      },
      {
        id: 'ola-mini',
        name: 'Ola Mini (AC Cab)',
        provider: 'ola' as const,
        vehicle: 'AC Hatchback · 4 Seats',
        estimatedPrice: Math.round(55 + d * 17.0),
        etaMins: Math.max(5, Math.round(d * 2.9)),
        badge: 'Full Auto-Fill (App + Web)',
        webUrl: links.ola.webUrl,
        appDeepLink: links.ola.webUrl,
        androidIntent: links.ola.webUrl,
        supportsWebAutoFill: true,
        limitationNote: links.ola.limitationNote,
      },
      {
        id: 'uber-go',
        name: 'Uber Go (AC Cab)',
        provider: 'uber' as const,
        vehicle: 'AC Compact Cab · 4 Seats',
        estimatedPrice: Math.round(58 + d * 17.5),
        etaMins: Math.max(5, Math.round(d * 3.0)),
        badge: 'Full Auto-Fill (App + Web)',
        webUrl: links.uber.webUrl,
        appDeepLink: links.uber.webUrl,
        androidIntent: links.uber.webUrl,
        supportsWebAutoFill: true,
        limitationNote: links.uber.limitationNote,
      },
    ].sort((a, b) => a.estimatedPrice - b.estimatedPrice);
  }, [distanceKm, links]);

  const handleLaunchRideService = async (opt: (typeof comparison)[number]) => {
    const summaryText = `${destInput} (${activeDest.lat.toFixed(5)}, ${activeDest.lon.toFixed(5)})`;
    await copyText(summaryText);

    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (opt.provider === 'uber' || opt.provider === 'ola') {
      toast(`Opening ${opt.name} with Pickup & Destination coordinates pre-filled.`, { tone: 'success' });
      window.open(opt.webUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isAndroid) {
      window.location.href = opt.androidIntent;
    } else if (isIOS) {
      window.location.href = opt.appDeepLink;
    } else {
      toast(`Destination "${summaryText}" copied to clipboard! Opening Rapido...`, { tone: 'info' });
      window.open(opt.webUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyRouteDetails = async () => {
    const text = `Pickup: ${activeOrigin.name} (${activeOrigin.lat.toFixed(5)}, ${activeOrigin.lon.toFixed(5)}) -> Drop: ${destInput} (${activeDest.lat.toFixed(5)}, ${activeDest.lon.toFixed(5)})`;
    if (await copyText(text)) {
      setCopiedCoords(true);
      toast('Pickup & Destination coordinates copied', { tone: 'success' });
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const filteredMetros = METRO_SYSTEMS.filter(
    (m) =>
      m.city.toLowerCase().includes(metroSearch.toLowerCase()) ||
      m.name.toLowerCase().includes(metroSearch.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      <Glass className="relative overflow-hidden p-5 sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <Zap className="h-3.5 w-3.5" /> Official Deep Links & Universal Ride Transfer
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Smart Transport Hub</h1>
            <p className="mt-1 text-sm text-muted sm:text-base max-w-2xl">
              Automatically detect your GPS pickup, choose or edit any destination, and transfer both coordinates into Uber, Ola, Rapido, or Google Maps.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {user && !useCustomPickup ? (
              <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-bold">Live GPS Pickup Locked</div>
                  <div className="font-mono text-[11px] opacity-85">
                    {user.lat.toFixed(4)}°N, {user.lon.toFixed(4)}°E
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setUseCustomPickup(false);
                  geo.locate();
                }}
                disabled={geo.status === 'locating'}
                className="flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Crosshair className={`h-4 w-4 ${geo.status === 'locating' ? 'animate-spin' : ''}`} />
                <span>{geo.status === 'locating' ? 'Acquiring GPS...' : 'Use Live GPS Pickup'}</span>
              </button>
            )}
          </div>
        </div>
      </Glass>

      {!user && !useCustomPickup && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">
                Using City-Center Fallback Pickup (Kakinada Town Station · 16.9602°N, 82.2410°E):
              </span>{' '}
              <span>
                Live GPS permission has not been granted yet. Click "Use Live GPS Pickup" above for exact coordinates, or edit your pickup manually below.
              </span>
            </div>
          </div>
          {geo.error && <span className="font-semibold text-red-600 shrink-0">{geo.error}</span>}
        </div>
      )}

      <div className="flex justify-start sm:justify-center overflow-x-auto pb-1">
        <Segmented
          label="Transport category"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rides', label: 'Smart Cab & Auto Booking', icon: <Car className="h-4 w-4" /> },
            { value: 'flights', label: 'Flights & Airports', icon: <Plane className="h-4 w-4" /> },
            { value: 'metro', label: 'City Metros', icon: <TrainFront className="h-4 w-4" /> },
            { value: 'trains', label: 'Railways (IRCTC)', icon: <Compass className="h-4 w-4" /> },
            { value: 'buses', label: 'State Buses', icon: <Navigation className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'rides' && (
        <div className="space-y-6">
          <Card
            title="1. Pickup & Destination Coordinates"
            subtitle="Both locations are resolved to exact WGS84 coordinates before launching your ride service."
            icon={<MapPin className="h-5 w-5" />}
            action={
              <button
                type="button"
                onClick={handleCopyRouteDetails}
                className="inline-flex items-center gap-1.5 rounded-xl bg-black/5 px-3 py-1.5 text-xs font-semibold hover:bg-black/10 dark:bg-white/10"
              >
                {copiedCoords ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCoords ? 'Copied' : 'Copy Route'}</span>
              </button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-11 lg:items-center">
              <div className="lg:col-span-5 rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    ● Pickup Location
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseCustomPickup((v) => !v)}
                    className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                  >
                    {useCustomPickup ? 'Use Live GPS Instead' : 'Edit Pickup Manually'}
                  </button>
                </div>

                {!useCustomPickup ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">{activeOrigin.name}</div>
                      <div className="font-mono text-xs text-muted mt-0.5">
                        Lat: {activeOrigin.lat.toFixed(5)}, Lon: {activeOrigin.lon.toFixed(5)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => geo.locate()}
                      className="rounded-xl bg-brand-600/10 px-3 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-300"
                    >
                      Refresh GPS
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={pickupInput}
                      onChange={(e) => {
                        setPickupInput(e.target.value);
                        const match = resolveKnownPlaceCoords(e.target.value);
                        if (match) setPickupCoords(match);
                      }}
                      placeholder="Enter pickup landmark..."
                      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-xs font-semibold focus:outline-none dark:border-white/10 dark:bg-slate-900"
                    />
                    <div className="font-mono text-[11px] text-muted">
                      Coordinates: {activeOrigin.lat.toFixed(5)}, {activeOrigin.lon.toFixed(5)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center lg:col-span-1">
                <button
                  type="button"
                  onClick={handleSwapPickupAndDest}
                  title="Swap Pickup and Destination"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-black/[0.04] transition hover:bg-brand-600 hover:text-white dark:border-white/10"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </div>

              <div className="lg:col-span-5 rounded-3xl border border-brand-500/30 bg-brand-500/[0.04] p-4 dark:border-brand-400/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                    ⚑ Destination Location
                  </span>
                  <span className="font-mono text-[11px] text-muted">~{distanceKm} km road est.</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={destInput}
                      onChange={(e) => {
                        setDestInput(e.target.value);
                        const match = resolveKnownPlaceCoords(e.target.value);
                        if (match) setDestCoords(match);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupDestination()}
                      placeholder="Where to? (e.g. Subbayya Hotel, Coringa)..."
                      className="h-10 w-full rounded-2xl border border-black/10 bg-white pl-9 pr-3 text-xs font-semibold focus:outline-none dark:border-white/10 dark:bg-slate-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLookupDestination}
                    disabled={searchingPlace}
                    className="rounded-2xl bg-brand-600 px-3.5 text-xs font-bold text-white hover:bg-brand-700"
                  >
                    {searchingPlace ? '...' : 'Locate'}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted">
                  <span>
                    Lat: {activeDest.lat.toFixed(5)}, Lon: {activeDest.lon.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/map?lat=${activeDest.lat.toFixed(5)}&lon=${activeDest.lon.toFixed(5)}&z=15&name=${encodeURIComponent(destInput)}`,
                      )
                    }
                    className="font-sans font-bold text-brand-600 hover:underline dark:text-brand-300"
                  >
                    Pin on Map ↗
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t hairline">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted">
                Quick-Select Popular Destinations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LOCATIONS.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setDestInput(place.name);
                      setDestCoords({ lat: place.lat, lon: place.lon });
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      destInput === place.name
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-black/5 hover:bg-black/10 dark:bg-white/10'
                    }`}
                  >
                    {place.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card
            title="2. Select Transport Service (Pre-Filled Pickup & Destination)"
            subtitle="Click any option to open the provider with your coordinates transferred."
            icon={<Car className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {comparison.map((opt, idx) => {
                const isCheapest = idx === 0;
                return (
                  <div
                    key={opt.id}
                    className={`relative flex flex-col justify-between rounded-3xl border p-5 transition hover:shadow-md ${
                      isCheapest
                        ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                        : 'border-black/10 bg-black/[0.02] dark:border-white/10'
                    }`}
                  >
                    {isCheapest && (
                      <div className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        <Award className="h-3 w-3" /> Lowest Estimated Fare
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge tone={opt.supportsWebAutoFill ? 'green' : 'amber'}>{opt.badge}</Badge>
                          <h3 className="mt-2 text-base font-bold">{opt.name}</h3>
                          <p className="text-xs text-muted">{opt.vehicle}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-brand-600 dark:text-brand-300">
                            ₹{opt.estimatedPrice}
                          </span>
                          <span className="block text-[10px] text-muted">est. fare</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5" /> ~{opt.etaMins} mins
                        </span>
                        <span>·</span>
                        <span>~{distanceKm} km</span>
                      </div>

                      <p className="mt-2.5 text-[11px] text-muted leading-relaxed">{opt.limitationNote}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t hairline">
                      <button
                        type="button"
                        onClick={() => handleLaunchRideService(opt)}
                        className={`w-full flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white transition ${
                          isCheapest ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-600 hover:bg-brand-700'
                        }`}
                      >
                        <Smartphone className="h-4 w-4" />
                        <span>Book with {opt.name.split(' ')[0]}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10">
              <div className="text-xs">
                <span className="font-bold">Universal Route Fallback:</span> Open turn-by-turn directions from{' '}
                <strong>{activeOrigin.name}</strong> to <strong>{destInput}</strong> in Google Maps.
              </div>
              <a
                href={links.gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700"
              >
                <MapIcon className="h-4 w-4" />
                <span>Open in Google Maps</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </Card>
        </div>
      )}

      {tab === 'flights' && (
        <div className="space-y-6">
          <Card title="Airlines & Air Ticket Booking" icon={<Plane className="h-5 w-5" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AIRLINE_SERVICES.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10"
                >
                  <div>
                    <h4 className="font-bold text-base">{a.name}</h4>
                    <p className="mt-1 text-xs text-muted">{a.description}</p>
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-semibold text-white"
                  >
                    <span>Search Flights</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'metro' && (
        <Card title="Indian City Metro Networks" icon={<TrainFront className="h-5 w-5" />}>
          <div className="mb-4">
            <input
              type="text"
              value={metroSearch}
              onChange={(e) => setMetroSearch(e.target.value)}
              placeholder="Filter metro by city..."
              className="h-10 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-xs"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMetros.map((m) => (
              <div
                key={m.city}
                className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10"
              >
                <div>
                  <Badge tone="brand">{m.city}</Badge>
                  <h4 className="mt-1 font-bold text-sm">{m.name}</h4>
                  <p className="mt-1 text-xs text-muted">{m.lines}</p>
                </div>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-8 items-center justify-center gap-1 rounded-xl bg-brand-600 text-xs font-semibold text-white"
                >
                  <span>Official Metro Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'trains' && (
        <Card title="Indian Railways (IRCTC) Services" icon={<Compass className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {RAIL_SERVICES.map((r) => (
              <div
                key={r.name}
                className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10"
              >
                <div>
                  <h4 className="font-bold text-sm">{r.name}</h4>
                  <p className="mt-1 text-xs text-muted">{r.description}</p>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-9 items-center justify-center gap-1 rounded-xl bg-brand-600 text-xs font-semibold text-white"
                >
                  <span>Open Service</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'buses' && (
        <Card title="State RTC & Intercity Bus Portals" icon={<Navigation className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUS_SERVICES.map((b) => (
              <div
                key={b.name}
                className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10"
              >
                <div>
                  <Badge tone="neutral">{b.region}</Badge>
                  <h4 className="mt-1 font-bold text-sm">{b.name}</h4>
                  <p className="mt-1 text-xs text-muted">{b.description}</p>
                </div>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-8 items-center justify-center gap-1 rounded-xl bg-brand-600 text-xs font-semibold text-white"
                >
                  <span>Book Bus Tickets</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
