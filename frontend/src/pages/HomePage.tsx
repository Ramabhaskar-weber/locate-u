import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Compass,
  Crosshair,
  Map as MapIcon,
  MapPin,
  Search,
  Car,
  Utensils,
  Bot,
  Sparkles,
  Languages,
  Settings,
  Hotel,
  Navigation,
  CheckCircle2,
  Sun,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '@/components/ui';
import { useGeolocation } from '@/hooks';
import { useOpenOnMap } from '@/hooks/useOpenOnMap';
import { api } from '@/lib/api';
import { listHistory } from '@/lib/db';
import { timeAgo } from '@/lib/format';
import { haversineKm, formatDistance } from '@/lib/geo';
import { useSaved } from '@/stores/saved';
import { useProfile } from '@/stores/profile';
import { useAuth } from '@/stores/auth';
import { useSettings } from '@/stores/settings';
import { useMap } from '@/stores/map';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const DISCOVERY_PLACES = [
  {
    id: 'coringa-wildlife',
    name: 'Coringa Wildlife Sanctuary',
    category: 'destination',
    subCategory: 'Eco-Tourism & Mangroves',
    region: 'Kakinada, Andhra Pradesh',
    description: 'India’s second-largest mangrove forest featuring a 2.6 km wooden boardwalk and boat safaris.',
    rating: 4.8,
    lat: 16.8924,
    lon: 82.2858,
    accentIcon: '🌿',
  },
  {
    id: 'araku-valley',
    name: 'Araku Valley & Borra Caves',
    category: 'destination',
    subCategory: 'Hill Station & Heritage',
    region: 'Eastern Ghats, Andhra Pradesh',
    description: 'Misty coffee plantations, waterfalls, and million-year-old stalactite caves.',
    rating: 4.9,
    lat: 18.3273,
    lon: 82.8775,
    accentIcon: '⛰️',
  },
  {
    id: 'uppada-beach',
    name: 'Uppada Golden Beach',
    category: 'destination',
    subCategory: 'Coastal Drive & Silk Town',
    region: 'East Godavari, Andhra Pradesh',
    description: 'Wide sandy shoreline famous for sunrise views and UNESCO-recognized Jamdani handloom sarees.',
    rating: 4.6,
    lat: 17.0862,
    lon: 82.3275,
    accentIcon: '🏖️',
  },
  {
    id: 'subbayya-hotel',
    name: 'Subbayya Gari Hotel (Original)',
    category: 'restaurant',
    subCategory: 'Traditional Andhra Bhojanam',
    region: 'Rama Rao Peta, Kakinada',
    description: 'Legendary 1950s banana-leaf feast serving 30+ authentic vegetarian Andhra delicacies.',
    rating: 4.7,
    lat: 16.9891,
    lon: 82.2475,
    accentIcon: '🍛',
  },
  {
    id: 'grt-grand-kakinada',
    name: 'Grand Kakinada by GRT Hotels',
    category: 'hotel',
    subCategory: '4-Star Business & Leisure Hotel',
    region: 'Cinema Road, Kakinada',
    description: 'Upscale full-service hotel featuring swimming pool, rooftop dining, and spa.',
    rating: 4.6,
    lat: 16.9685,
    lon: 82.2351,
    accentIcon: '🏨',
  },
  {
    id: 'draksharamam-temple',
    name: 'Draksharamam Bhimeswara Temple',
    category: 'attraction',
    subCategory: 'Pancharama Kshetram',
    region: 'Draksharamam, Konaseema',
    description: '9th-century Eastern Chalukyan architectural marvel with ancient inscriptions.',
    rating: 4.9,
    lat: 16.7933,
    lon: 82.0622,
    accentIcon: '🛕',
  },
];

const QUICK_CATEGORIES = [
  { to: '/india', label: 'Explore Destinations', sub: '28 States & 8 UTs', icon: Compass, tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { to: '/map', label: 'Live Maps', sub: 'OpenStreetMap & GPS', icon: MapIcon, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { to: '/explore?tab=stays', label: 'Hotels', sub: 'Resorts & Homestays', icon: Hotel, tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { to: '/explore?tab=food', label: 'Restaurants', sub: 'Local Mess & Dining', icon: Utensils, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { to: '/transport', label: 'Transport', sub: 'Rapido, Ola & Uber', icon: Car, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { to: '/explore', label: 'Travel Guide', sub: 'Itineraries & Events', icon: Bot, tone: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { to: '/language', label: 'Language Assistant', sub: 'Telugu & Hindi Speech', icon: Languages, tone: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { to: '/settings', label: 'My Account', sub: 'Profile & Phone Login', icon: Settings, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const openOnMap = useOpenOnMap();
  const geo = useGeolocation();
  const mapUser = useMap((s) => s.user);
  const saved = useSaved((s) => s.items);
  const { profile } = useProfile();
  const authUser = useAuth((s) => s.user);
  const units = useSettings((s) => s.units);

  const activeUserName = authUser?.display_name || profile.name || 'Traveler';
  const activeOrigin = mapUser || { lat: 16.9891, lon: 82.2475 };

  const coverage = useQuery({
    queryKey: ['india-coverage'],
    queryFn: () => api.coverage(),
    staleTime: 60_000,
  });
  const c = coverage.data?.data;

  const historyQuery = useQuery({
    queryKey: ['recent-history'],
    queryFn: () => listHistory(4),
    staleTime: 10_000,
  });
  const recentPlaces = historyQuery.data ?? [];

  const enrichedPlaces = useMemo(() => {
    return DISCOVERY_PLACES.map((item) => ({
      ...item,
      distKm: haversineKm(activeOrigin, { lat: item.lat, lon: item.lon }),
    })).sort((a, b) => a.distKm - b.distKm);
  }, [activeOrigin]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/map?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 w-full max-w-full overflow-x-hidden">
      <section className="relative overflow-hidden rounded-4xl border border-black/10 bg-gradient-to-br from-slate-950 via-blue-950 to-teal-950 p-5 sm:p-10 text-white shadow-2xl dark:border-white/10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                {greeting()}, {activeUserName}
              </span>

              {mapUser ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Live GPS Active ({mapUser.lat.toFixed(3)}°N, {mapUser.lon.toFixed(3)}°E)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => geo.locate()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Detect Current Location
                </button>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl leading-[1.12]">
              Discover Places, Stays &{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                Smart Rides Across India
              </span>
            </h1>

            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
              Search destinations, iconic restaurants, hotels, and nearby essentials—then pre-fill your ride on Rapido, Ola, or Uber or translate live with local drivers.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center rounded-3xl sm:rounded-full bg-white/15 p-2 sm:pl-5 backdrop-blur-md ring-1 ring-white/25"
            >
              <div className="flex flex-1 items-center gap-2.5 px-2 sm:px-0">
                <Search className="h-5 w-5 shrink-0 text-cyan-300" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search places, restaurants, hotels, or coordinates..."
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-slate-300/80 outline-none"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="rounded-full bg-brand-600 hover:bg-brand-500 text-white px-5"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Explore
              </Button>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <Sun className="h-4 w-4" /> Featured Destination
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  ★ 4.9 Top Rated
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white">Coringa Mangrove Boardwalk</h3>
              <p className="text-xs text-slate-200">
                Walk through canopy mangroves and cruise towards Hope Island where the Godavari meets the Bay of Bengal.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openOnMap({
                      kind: 'search',
                      lat: 16.8924,
                      lon: 82.2858,
                      name: 'Coringa Wildlife Sanctuary',
                      zoom: 14,
                    })
                  }
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white text-slate-950 text-xs font-bold"
                >
                  <MapPin className="h-3.5 w-3.5" /> View on Map
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/transport?dest=Coringa%20Wildlife%20Sanctuary&lat=16.8924&lon=82.2858')
                  }
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold"
                >
                  <Car className="h-3.5 w-3.5" /> Book Ride
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Quick-access service categories">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {QUICK_CATEGORIES.map((cat) => (
            <Link
              key={cat.to}
              to={cat.to}
              className="group flex flex-col items-center rounded-3xl border border-black/10 bg-black/[0.02] p-3.5 text-center transition hover:-translate-y-0.5 hover:border-brand-500/40 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${cat.tone}`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-2.5 text-xs font-bold leading-tight">{cat.label}</h3>
              <p className="mt-0.5 text-[10px] text-muted line-clamp-1">{cat.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      <Card
        icon={<Navigation className="h-5 w-5" />}
        title="Explore Nearby Destinations, Food & Stays"
        subtitle={
          mapUser
            ? `Sorted by live distance from your GPS (${mapUser.lat.toFixed(3)}°N, ${mapUser.lon.toFixed(3)}°E)`
            : 'Sorted around Kakinada center — click Detect Current Location above for live GPS distance'
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrichedPlaces.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black/5 text-xl dark:bg-white/10">
                      {item.accentIcon}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-brand-600 dark:text-brand-300">
                        {item.subCategory}
                      </span>
                      <h3 className="text-sm font-bold">{item.name}</h3>
                    </div>
                  </div>
                  <Badge tone="amber">★ {item.rating}</Badge>
                </div>
                <p className="mt-2.5 text-xs text-muted">{item.description}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                  <span className="font-semibold text-foreground">
                    {formatDistance(item.distKm, units)} away
                  </span>
                  <span>{item.region}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t hairline">
                <button
                  type="button"
                  onClick={() =>
                    openOnMap({
                      kind: 'search',
                      lat: item.lat,
                      lon: item.lon,
                      name: item.name,
                      address: item.region,
                      zoom: 14,
                    })
                  }
                  className="flex h-8 items-center justify-center gap-1 rounded-xl bg-black/5 text-xs font-semibold dark:bg-white/10"
                >
                  <MapPin className="h-3.5 w-3.5" /> Map Pin
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/transport?dest=${encodeURIComponent(item.name)}&lat=${item.lat}&lon=${item.lon}`)
                  }
                  className="flex h-8 items-center justify-center gap-1 rounded-xl bg-brand-600 text-xs font-bold text-white"
                >
                  <Car className="h-3.5 w-3.5" /> Book Ride
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(recentPlaces.length > 0 || saved.length > 0 || c) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Recently Viewed Places" subtitle="Your local activity history">
            {recentPlaces.length === 0 ? (
              <p className="text-xs text-muted">Search or pin a place on the map to see it here.</p>
            ) : (
              <div className="space-y-2">
                {recentPlaces.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-xs border-b hairline pb-2">
                    <span className="font-semibold truncate">{h.label}</span>
                    <span className="text-muted">{timeAgo(new Date(h.at).getTime())}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="India Dataset Coverage" subtitle="Verified offline-ready regional dataset">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <div className="text-lg font-extrabold text-brand-600">{c?.states ?? 28}</div>
                <div className="text-muted">States</div>
              </div>
              <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <div className="text-lg font-extrabold text-brand-600">{c?.union_territories ?? 8}</div>
                <div className="text-muted">Union Territories</div>
              </div>
              <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <div className="text-lg font-extrabold text-brand-600">{saved.length}</div>
                <div className="text-muted">Saved Places</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
