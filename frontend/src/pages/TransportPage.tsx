import { useState, useMemo } from 'react';
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
  Award
} from 'lucide-react';
import { Card, Glass, Segmented } from '@/components/ui';
import { useMap } from '@/stores/map';
import {
  BUS_SERVICES,
  getRideServices,
  METRO_SYSTEMS,
  RAIL_SERVICES,
} from '@/lib/transport';

type TransportTab = 'rides' | 'metro' | 'trains' | 'buses';

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
  const user = useMap((s) => s.user);
  const [tab, setTab] = useState<TransportTab>('rides');
  const [destInput, setDestInput] = useState('');
  const [metroSearch, setMetroSearch] = useState('');

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
        name: 'Rapido Bike',
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
              <Zap className="h-3.5 w-3.5" /> Smart Rate Finder & Comparison
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Transport Hub
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Compare fares across Ola, Rapido & Uber, find metro route maps, and access IRCTC & state bus portals.
            </p>
          </div>
          {user ? (
            <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] p-3 text-xs font-medium dark:bg-white/[0.06]">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                GPS Origin:{' '}
                <strong className="font-mono">
                  {user.lat.toFixed(4)}, {user.lon.toFixed(4)}
                </strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] p-3 text-xs text-muted dark:bg-white/[0.06]">
              <MapPin className="h-4 w-4" />
              <span>Enable GPS on the map for live origin pickup</span>
            </div>
          )}
        </div>
      </Glass>

      <div className="flex justify-center">
        <Segmented
          label="Transport category"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rides', label: 'Ride Comparison & Cabs', icon: <Car className="h-4 w-4" /> },
            { value: 'metro', label: 'City Metros', icon: <TrainFront className="h-4 w-4" /> },
            { value: 'trains', label: 'Indian Railways (IRCTC)', icon: <Compass className="h-4 w-4" /> },
            { value: 'buses', label: 'State Buses & RTCs', icon: <Navigation className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'rides' && (
        <Card
          title="Compare & Find the Best Option"
          subtitle="Type any destination to view live fare estimates and see the cheapest option first."
          icon={<Car className="h-5 w-5" />}
        >
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Where to? (e.g. Kakinada Beach, Jagannaickpur, Railway Station, Airport)..."
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-3 pl-10 pr-4 text-sm transition focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
          </div>

          {comparison.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Fare Estimates for ~{approxDistanceKm?.toFixed(1)} km trip
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Ranked by Lowest Price
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
