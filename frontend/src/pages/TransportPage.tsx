import { useState } from 'react';
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

export default function TransportPage() {
  const user = useMap((s) => s.user);
  const [tab, setTab] = useState<TransportTab>('rides');
  const [destInput, setDestInput] = useState('');
  const [metroSearch, setMetroSearch] = useState('');

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
              <Zap className="h-3.5 w-3.5" /> One-Click Mobility Hub
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Transport Hub
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Book rides on Ola, Rapido & Uber, find metro route maps, and access IRCTC & state bus portals in one place.
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
              <span>Enable GPS on the map for pre-filled pickup</span>
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
            { value: 'rides', label: '1-Click Cabs & Autos', icon: <Car className="h-4 w-4" /> },
            { value: 'metro', label: 'City Metros', icon: <TrainFront className="h-4 w-4" /> },
            { value: 'trains', label: 'Indian Railways (IRCTC)', icon: <Compass className="h-4 w-4" /> },
            { value: 'buses', label: 'State Buses & RTCs', icon: <Navigation className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'rides' && (
        <Card
          title="Book a Ride Directly"
          subtitle="Opens directly in Ola, Rapido, or Uber with no extra steps."
          icon={<Car className="h-5 w-5" />}
        >
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Where are you going? (e.g., Kakinada Beach, MG Road, Airport)"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2.5 pl-10 pr-4 text-sm transition focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {rides.map((r) => (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 transition hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{r.name}</span>
                    <span className="rounded-full bg-brand-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
                      {r.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">{r.description}</p>
                </div>

                <div className="mt-6">
                  <a
                    href={r.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                  >
                    <span>Book on {r.name}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
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
