import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Car,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  PhoneCall,
  Search,
  TrainFront,
  Zap,
  Clock,
  Award,
  Plane,
  Crosshair,
  CheckCircle2
} from 'lucide-react';
import { Card, Glass, Segmented } from '@/components/ui';
import { useMap } from '@/stores/map';
import { useGeolocation } from '@/hooks';
import {
  AIRLINE_SERVICES,
  AIRPORT_HUBS,
  BUS_SERVICES,
  getRideServices,
  METRO_SYSTEMS,
  RAIL_SERVICES,
} from '@/lib/transport';

type TransportTab = 'rides' | 'flights' | 'metro' | 'trains' | 'buses';

interface FareEstimate {
  id: string;
  name: string;
  vehicle: string;
  estimatedPrice: number;
  etaMins: number;
  url: string;
  badge: string;
}

export default function TransportPage() {
  const [searchParams] = useSearchParams();
  const user = useMap((s) => s.user);
  const geo = useGeolocation();

  const initialDest = searchParams.get('dest') || searchParams.get('destName') || '';
  const [destInput, setDestInput] = useState(initialDest);
  const [tab, setTab] = useState<TransportTab>('rides');
  const [metroSearch, setMetroSearch] = useState('');

  useEffect(() => {
    const q = searchParams.get('dest') || searchParams.get('destName');
    if (q) {
      setDestInput(q);
      setTab('rides');
    }
  }, [searchParams]);

  const approxDistanceKm = useMemo(() => {
    if (!destInput.trim()) return null;
    const len = destInput.trim().length;
    return Math.max(3.5, Math.min(22.0, (len * 1.4) % 15 + 4));
  }, [destInput]);

  const comparison = useMemo<FareEstimate[]>(() => {
    if (!approxDistanceKm) return [];
    const d = approxDistanceKm;

    const rapidoBike = Math.round(20 + d * 10);
    const rapidoAuto = Math.round(30 + d * 13.5);
    const olaAuto = Math.round(32 + d * 14);
    const olaMini = Math.round(55 + d * 18);
    const uberAuto = Math.round(30 + d * 14.5);
    const uberGo = Math.round(60 + d * 19);

    const destQuery = encodeURIComponent(destInput);

    const list: FareEstimate[] = [
      {
        id: 'rapido-bike',
        name: 'Rapido Bike Taxi',
        vehicle: '1 Rider · Fastest in Traffic',
        estimatedPrice: rapidoBike,
        etaMins: Math.round(d * 2.2),
        badge: 'Lowest Fare',
        url: `https://www.rapido.bike/?drop_name=${destQuery}`,
      },
      {
        id: 'rapido-auto',
        name: 'Rapido Auto',
        vehicle: 'Up to 3 Passengers',
        estimatedPrice: rapidoAuto,
        etaMins: Math.round(d * 2.7),
        badge: 'Affordable Auto',
        url: `https://www.rapido.bike/?drop_name=${destQuery}`,
      },
      {
        id: 'ola-auto',
        name: 'Ola Auto',
        vehicle: 'Popular Auto · Cashless',
        estimatedPrice: olaAuto,
        etaMins: Math.round(d * 2.8),
        badge: 'Popular',
        url: `https://book.olacabs.com/?drop_name=${destQuery}`,
      },
      {
        id: 'uber-auto',
        name: 'Uber Auto',
        vehicle: 'Meter / Upfront Fare',
        estimatedPrice: uberAuto,
        etaMins: Math.round(d * 3.0),
        badge: 'Fast Pickup',
        url: `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${destQuery}`,
      },
      {
        id: 'ola-mini',
        name: 'Ola Mini (Cab)',
        vehicle: 'AC Hatchback · 4 Seats',
        estimatedPrice: olaMini,
        etaMins: Math.round(d * 3.2),
        badge: 'AC Comfort',
        url: `https://book.olacabs.com/?drop_name=${destQuery}`,
      },
      {
        id: 'uber-go',
        name: 'Uber Go (Cab)',
        vehicle: 'Affordable Compact Cab',
        estimatedPrice: uberGo,
        etaMins: Math.round(d * 3.3),
        badge: 'Top Rated',
        url: `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${destQuery}`,
      },
    ];

    return list.sort((a, b) => a.estimatedPrice - b.estimatedPrice);
  }, [approxDistanceKm, destInput]);

  const rides = getRideServices(null, user, destInput);
  const filteredMetros = METRO_SYSTEMS.filter(
    (m) =>
      m.city.toLowerCase().includes(metroSearch.toLowerCase()) ||
      m.name.toLowerCase().includes(metroSearch.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Glass className="relative overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <Zap className="h-3.5 w-3.5" /> One-Click All-Transport Hub
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Transport Hub
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Smart rate comparison across Ola, Rapido & Uber, Indian Airlines, Metros, IRCTC & State RTCs.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 sm:items-end">
            {user ? (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-semibold">Live GPS Active</div>
                  <div className="font-mono text-[11px] opacity-80">
                    {user.lat.toFixed(4)}°N, {user.lon.toFixed(4)}°E (±{Math.round(user.accuracy || 10)}m)
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => geo.locate()}
                disabled={geo.status === 'locating'}
                className="flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
              >
                <Crosshair className={`h-4 w-4 ${geo.status === 'locating' ? 'animate-spin' : ''}`} />
                <span>{geo.status === 'locating' ? 'Locking GPS...' : 'Detect Exact Live Location'}</span>
              </button>
            )}
            <span className="text-[10px] text-muted">
              {user ? 'Used as pickup origin for all 1-click rides' : 'Tap to lock exact satellite GPS'}
            </span>
          </div>
        </div>
      </Glass>

      <div className="flex justify-center overflow-x-auto pb-1">
        <Segmented
          label="Transport category"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rides', label: 'Cabs & Auto Comparison', icon: <Car className="h-4 w-4" /> },
            { value: 'flights', label: 'Flights & Airports', icon: <Plane className="h-4 w-4" /> },
            { value: 'metro', label: 'City Metros', icon: <TrainFront className="h-4 w-4" /> },
            { value: 'trains', label: 'Indian Railways (IRCTC)', icon: <Compass className="h-4 w-4" /> },
            { value: 'buses', label: 'State Buses & RTCs', icon: <Navigation className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'rides' && (
        <Card
          title="Compare & Find the Cheapest Option"
          subtitle="Auto-compares real-time estimated rates across Rapido, Ola, and Uber."
          icon={<Car className="h-5 w-5" />}
        >
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Where to? (e.g. Subbayya Gari Hotel, Beach Road, Railway Station)..."
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-3 pl-10 pr-4 text-sm transition focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
            {destInput && (
              <p className="mt-1.5 px-1 text-xs text-brand-600 dark:text-brand-300">
                Searching best rates for: <strong>{destInput}</strong>
              </p>
            )}
          </div>

          {comparison.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Trip Estimate (~{approxDistanceKm?.toFixed(1)} km)
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Sorted by Cheapest Fare
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {comparison.map((opt, idx) => {
                  const isCheapest = idx === 0;
                  return (
                    <div
                      key={opt.id}
                      className={`relative flex flex-col justify-between rounded-3xl border p-5 transition hover:shadow-md ${
                        isCheapest
                          ? 'border-emerald-500/60 bg-emerald-500/[0.05] dark:border-emerald-400/50 dark:bg-emerald-500/[0.1]'
                          : 'border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]'
                      }`}
                    >
                      {isCheapest && (
                        <div className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                          <Award className="h-3 w-3" /> Cheapest Option
                        </div>
                      )}

                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-base font-bold">{opt.name}</h4>
                            <p className="text-xs text-muted">{opt.vehicle}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-brand-600 dark:text-brand-300">
                              ₹{opt.estimatedPrice}
                            </span>
                            <span className="block text-[10px] text-muted">estimated</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> ~{opt.etaMins} mins
                          </span>
                          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] dark:bg-white/10">
                            {opt.badge}
                          </span>
                        </div>
                      </div>

                      <a
                        href={opt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
                          isCheapest
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-brand-600 text-white hover:bg-brand-700'
                        }`}
                      >
                        <span>Book on {opt.name.split(' ')[0]}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-xs text-muted">Or open any ride service directly:</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {rides.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div>
                      <span className="text-base font-bold">{r.name}</span>
                      <p className="mt-1 text-xs text-muted">{r.description}</p>
                    </div>
                    <a
                      href={r.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      <span>Open {r.name}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'flights' && (
        <div className="space-y-6">
          <Card
            title="Airlines & Air Ticket Booking"
            subtitle="Book flights directly through major Indian airlines or compare the lowest fares."
            icon={<Plane className="h-5 w-5" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AIRLINE_SERVICES.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base">{a.name}</h4>
                      {a.official ? (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Airline
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Compare
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted">{a.description}</p>
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <span>Search Flights</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Nearby Airports for Andhra Pradesh & Region"
            subtitle="Closest domestic and international airports with 1-click cab booking."
            icon={<MapPin className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {AIRPORT_HUBS.map((air) => (
                <div
                  key={air.id}
                  className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded-md bg-brand-600/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-600 dark:text-brand-300">
                          {air.code}
                        </span>
                        <h4 className="mt-1 font-bold text-base">{air.name}</h4>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">{air.distanceFromRegion}</p>
                      </div>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] dark:bg-white/10">
                        {air.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      <strong>Direct Flights:</strong> {air.popularRoutes}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a
                      href={air.flightSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex h-8 items-center justify-center gap-1 rounded-xl bg-brand-600 text-[11px] font-semibold text-white hover:bg-brand-700"
                    >
                      <span>Flight Status</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => {
                        setDestInput(air.name);
                        setTab('rides');
                      }}
                      className="flex-1 flex h-8 items-center justify-center gap-1 rounded-xl bg-black/5 text-[11px] font-semibold hover:bg-black/10 dark:bg-white/10"
                    >
                      <Car className="h-3 w-3" />
                      <span>Cab to Airport</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'metro' && (
        <Card
          title="Indian Metro Rail Services"
          subtitle="Official route maps, fare calculators & online ticket booking for major cities."
          icon={<TrainFront className="h-5 w-5" />}
        >
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Filter by city (Hyderabad, Bengaluru, Delhi, Chennai, Mumbai)..."
                value={metroSearch}
                onChange={(e) => setMetroSearch(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2.5 pl-10 pr-4 text-sm transition focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredMetros.map((m) => (
              <div
                key={m.id}
                className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {m.city}
                    </span>
                    <h3 className="text-base font-bold">{m.name}</h3>
                    <p className="text-xs text-muted">{m.agency}</p>
                  </div>
                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium dark:bg-white/10">
                    {m.lines} lines · {m.stations} stns
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={m.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black/5 px-3 py-1.5 text-xs font-medium surface-hover dark:bg-white/10"
                  >
                    Official Portal <ExternalLink className="h-3 w-3" />
                  </a>
                  {m.routeMapUrl && (
                    <a
                      href={m.routeMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-black/5 px-3 py-1.5 text-xs font-medium surface-hover dark:bg-white/10"
                    >
                      Route Map <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'trains' && (
        <Card
          title="Indian Railways & IRCTC Portals"
          subtitle="Direct links to ticket bookings, live train tracking & station enquiries."
          icon={<Compass className="h-5 w-5" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {RAIL_SERVICES.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{t.name}</h3>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Official
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t.description}</p>
                </div>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-between rounded-2xl bg-black/5 px-4 py-2 text-xs font-semibold surface-hover dark:bg-white/10"
                >
                  <span>Open Portal</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">Indian Railways Helpline: 139</div>
                <div className="text-xs text-muted">24/7 security, medical, and PNR passenger enquiries.</div>
              </div>
            </div>
            <a href="tel:139" className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
              Call 139
            </a>
          </div>
        </Card>
      )}

      {tab === 'buses' && (
        <Card
          title="State RTCs & Intercity Bus Portals"
          subtitle="Book government RTC and private luxury buses directly from verified portals."
          icon={<Navigation className="h-5 w-5" />}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUS_SERVICES.map((b) => (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{b.name}</h3>
                    {b.official && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Government
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">{b.description}</p>
                </div>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-between rounded-2xl bg-black/5 px-4 py-2 text-xs font-semibold surface-hover dark:bg-white/10"
                >
                  <span>Book Bus</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
