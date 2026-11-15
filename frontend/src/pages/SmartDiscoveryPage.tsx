import {
  Accessibility, AlertTriangle, Bike, Bookmark, Camera, Car, CloudSun, Compass,
  Download, Flag, Footprints, Gem, Hotel, MapPin, Navigation, PhoneCall,
  Share2, ShieldAlert, Sparkles, Star, StopCircle, Users, Utensils, Calendar, WifiOff,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Glass } from '@/components/ui';
import { useGeolocation } from '@/hooks';
import { useOpenOnMap } from '@/hooks/useOpenOnMap';
import { formatDistance, haversineKm } from '@/lib/geo';
import { useMap } from '@/stores/map';
import { useSaved } from '@/stores/saved';
import { toast } from '@/stores/toast';

interface DestinationGuide {
  id: string; name: string; state: string; lat: number; lon: number; address: string;
  bestMonths: string; seasonNote: string; hiddenGem: boolean;
  wheelchairFriendly: boolean; familyFriendly: boolean;
  familyFacilities: string; accessibilityNote: string; summary: string;
  dishes: Array<{ name: string; type: 'Veg' | 'Non-Veg'; price: string; spot: string }>;
  hotels: Array<{ name: string; tier: string; pricePerNight: string; rating: string; wheelchair: boolean; family: boolean }>;
}

interface PlaceReview {
  id: string; placeId: string; author: string; text: string;
  cleanliness: number; accessibility: number; photo?: string | null; date: string;
}

const DESTINATIONS: DestinationGuide[] = [
  {
    id: 'kakinada-coringa', name: 'Coringa & Kakinada Coast', state: 'Andhra Pradesh', lat: 16.8924, lon: 82.2858,
    address: 'Coringa Wildlife Sanctuary, Kakinada-Yanam Rd, AP 533461',
    bestMonths: 'Nov - Feb', seasonNote: 'Pleasant coastal breeze (22-29 C); avoid peak May heat and October cyclone alerts.',
    hiddenGem: true, wheelchairFriendly: true, familyFriendly: true,
    familyFacilities: '2.6 km wooden boardwalk, shaded gazebos, kids eco-park & boat jetty',
    accessibilityNote: 'Flat paved entry path and wide wooden boardwalk ramp at Coringa.',
    summary: 'Second-largest mangrove ecosystem in India with peaceful backwater boat rides and Hope Island.',
    dishes: [
      { name: 'Kakinada Kaja (Gottam & Madatha)', type: 'Veg', price: 'Rs 120/box', spot: 'Kotaiah Sweets, Main Road' },
      { name: 'Butta Bhojanam (Traditional Thali)', type: 'Veg', price: 'Rs 240', spot: 'Subbayya Gari Hotel' },
      { name: 'Godavari Prawn Fry & Fish Curry', type: 'Non-Veg', price: 'Rs 350', spot: 'Beach Road Kitchens' },
    ],
    hotels: [
      { name: 'GRT Grand Kakinada', tier: '4-Star', pricePerNight: 'Rs 4,200', rating: '4.5', wheelchair: true, family: true },
      { name: 'Svenska Design Hotel', tier: 'Boutique', pricePerNight: 'Rs 3,600', rating: '4.4', wheelchair: true, family: true },
      { name: 'Haritha Beach Resort (APTDC)', tier: 'Budget', pricePerNight: 'Rs 1,800', rating: '4.1', wheelchair: false, family: true },
    ],
  },
  {
    id: 'araku-valley', name: 'Araku Valley & Borra Caves', state: 'Andhra Pradesh', lat: 18.3273, lon: 82.8775,
    address: 'Araku Valley, Alluri Sitharama Raju District, AP 531149',
    bestMonths: 'Oct - Mar', seasonNote: 'Misty mornings (12-24 C) and blooming coffee estates; monsoon brings lush waterfalls.',
    hiddenGem: false, wheelchairFriendly: false, familyFriendly: true,
    familyFacilities: 'Vistadome scenic train, Tribal Museum, Padmapuram Gardens & toy train',
    accessibilityNote: 'Borra Caves have steep stone steps; Tribal Museum & Gardens are flat.',
    summary: 'Cool Eastern Ghats hill station famous for organic Araku coffee and million-year-old caves.',
    dishes: [
      { name: 'Bamboo Chicken (Bongulo Chicken)', type: 'Non-Veg', price: 'Rs 280', spot: 'Valley Roadside Stalls' },
      { name: 'Araku Organic Filter Coffee', type: 'Veg', price: 'Rs 60', spot: 'Coffee Museum Cafe' },
      { name: 'Ragi Sangati & Millet Meals', type: 'Veg', price: 'Rs 160', spot: 'Tribal Co-op Kitchen' },
    ],
    hotels: [
      { name: 'Haritha Valley Resort (APTDC)', tier: 'Resort', pricePerNight: 'Rs 2,600', rating: '4.2', wheelchair: true, family: true },
      { name: 'Casa Holiday Resorts', tier: 'Mid-Range', pricePerNight: 'Rs 3,100', rating: '4.3', wheelchair: false, family: true },
      { name: 'Vanjangi Hill Homestay', tier: 'Eco Stay', pricePerNight: 'Rs 1,500', rating: '4.4', wheelchair: false, family: false },
    ],
  },
  {
    id: 'gandikota', name: 'Gandikota Canyon (Hidden Gem)', state: 'Andhra Pradesh', lat: 14.8145, lon: 78.2869,
    address: 'Gandikota Fort & Penna Gorge, YSR Kadapa District, AP 516434',
    bestMonths: 'Nov - Feb', seasonNote: 'Cool evenings for fort walks; summer exceeds 40 C.',
    hiddenGem: true, wheelchairFriendly: false, familyFriendly: true,
    familyFacilities: 'Fort courtyard, Penna River viewpoint & APTDC Haritha camp',
    accessibilityNote: 'Uneven heritage fort stones; main viewpoint road is drivable.',
    summary: 'Dramatic red-sandstone gorge carved by the Penna River, known as the Grand Canyon of India.',
    dishes: [
      { name: 'Rayalaseema Ragi Mudde & Natukodi', type: 'Non-Veg', price: 'Rs 260', spot: 'Jammalamadugu Dhabas' },
      { name: 'Uggani Bajji', type: 'Veg', price: 'Rs 70', spot: 'Fort Gate Tiffin Center' },
    ],
    hotels: [
      { name: 'APTDC Haritha Gandikota', tier: 'Govt Resort', pricePerNight: 'Rs 2,100', rating: '4.1', wheelchair: true, family: true },
      { name: 'Penna Gorge Camp Tents', tier: 'Camping', pricePerNight: 'Rs 1,400', rating: '4.3', wheelchair: false, family: true },
    ],
  },
  {
    id: 'hampi', name: 'Hampi Heritage Ruins', state: 'Karnataka', lat: 15.3350, lon: 76.4600,
    address: 'Hampi World Heritage Area, Vijayanagara, KA 583239',
    bestMonths: 'Oct - Feb', seasonNote: 'Dry winter sunshine ideal for temple cycling; Hampi Utsav usually held in Nov/Jan.',
    hiddenGem: false, wheelchairFriendly: true, familyFriendly: true,
    familyFacilities: 'Electric buggies at Vittala Temple, coracle river rides & open lawns',
    accessibilityNote: 'Vittala Temple & Lotus Mahal offer paved paths and electric shuttle carts.',
    summary: 'UNESCO World Heritage boulder landscape of the Vijayanagara Empire.',
    dishes: [
      { name: 'Jolada Rotti & Ennegayi', type: 'Veg', price: 'Rs 150', spot: 'Hampi Bazaar Kitchens' },
      { name: 'Banana Leaf South Indian Thali', type: 'Veg', price: 'Rs 180', spot: 'Mango Tree Restaurant' },
    ],
    hotels: [
      { name: 'Evolve Back Kamalapura Palace', tier: 'Luxury', pricePerNight: 'Rs 18,500', rating: '4.9', wheelchair: true, family: true },
      { name: 'Heritage Resort Hampi', tier: 'Resort', pricePerNight: 'Rs 5,400', rating: '4.5', wheelchair: true, family: true },
      { name: 'Hampi Boulders Homestay', tier: 'Budget', pricePerNight: 'Rs 2,000', rating: '4.2', wheelchair: false, family: true },
    ],
  },
  {
    id: 'ziro-valley', name: 'Ziro Valley (Hidden Gem)', state: 'Arunachal Pradesh', lat: 27.5449, lon: 93.8197,
    address: 'Hapoli / Ziro Valley, Lower Subansiri, AR 791120',
    bestMonths: 'Mar - May & Sep - Nov', seasonNote: 'Crisp mountain air; September hosts the famous Ziro Music Festival.',
    hiddenGem: true, wheelchairFriendly: false, familyFriendly: true,
    familyFacilities: 'Pine grove walks, paddy-cum-fish farms & Apatani cultural villages',
    accessibilityNote: 'Hilly terrain; village roads are paved for cars.',
    summary: 'Serene emerald pine valley home to the Apatani cultural landscape.',
    dishes: [
      { name: 'Bamboo Shoot Rice & Apatani Platter', type: 'Veg', price: 'Rs 220', spot: 'Hapoli Local Kitchen' },
      { name: 'Smoked Pork with Lai Saag', type: 'Non-Veg', price: 'Rs 320', spot: 'Ziro Heritage Homestay' },
    ],
    hotels: [
      { name: 'Ziro Palace Inn', tier: 'Mid-Range', pricePerNight: 'Rs 2,800', rating: '4.3', wheelchair: false, family: true },
      { name: 'Abasa Homestay', tier: 'Homestay', pricePerNight: 'Rs 1,700', rating: '4.6', wheelchair: false, family: true },
    ],
  },
];

const REVIEWS_KEY = 'locate_u:place_reviews:v1';
const OFFLINE_KEY = 'locate_u:offline_packs:v1';

interface LiveWeather { temp: number; wind: number; humidity: number; code: number; }

function weatherLabel(code: number): { label: string; alert?: string } {
  if (code >= 95) return { label: 'Thunderstorm', alert: 'Thunderstorm alert: avoid open water & hill treks.' };
  if (code >= 61) return { label: 'Rain / Showers', alert: 'Rain alert: roads may be slippery; carry rain gear.' };
  if (code >= 45) return { label: 'Fog / Mist', alert: 'Low visibility fog advisory for morning highway drives.' };
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy' };
  return { label: 'Clear Sky' };
}

export default function SmartDiscoveryPage() {
  const navigate = useNavigate();
  const openOnMap = useOpenOnMap();
  const mapUser = useMap((s) => s.user);
  const geo = useGeolocation();
  const addSaved = useSaved((s) => s.add);

  const [selectedId, setSelectedId] = useState<string>(DESTINATIONS[0].id);
  const [onlyHiddenGems, setOnlyHiddenGems] = useState(false);
  const [wheelchairMode, setWheelchairMode] = useState(false);
  const [familyMode, setFamilyMode] = useState(false);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoGuess, setPhotoGuess] = useState<string>('');

  // Live Trip Sharing state
  const [liveSharingActive, setLiveSharingActive] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState('25');

  // Tourist Reviews & Ratings state
  const [reviews, setReviews] = useState<PlaceReview[]>(() => {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]'); } catch { return []; }
  });
  const [revText, setRevText] = useState('');
  const [cleanRating, setCleanRating] = useState(5);
  const [accessRating, setAccessRating] = useState(4);
  const [revPhoto, setRevPhoto] = useState<string | null>(null);

  // Offline Travel Mode state
  const [offlinePacks, setOfflinePacks] = useState<DestinationGuide[]>(() => {
    try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); } catch { return []; }
  });

  const filteredDestinations = useMemo(
    () => DESTINATIONS.filter((d) => (!onlyHiddenGems || d.hiddenGem) && (!wheelchairMode || d.wheelchairFriendly) && (!familyMode || d.familyFriendly)),
    [onlyHiddenGems, wheelchairMode, familyMode],
  );

  const active = useMemo(
    () => filteredDestinations.find((d) => d.id === selectedId) || filteredDestinations[0] || DESTINATIONS[0],
    [filteredDestinations, selectedId],
  );

  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${active.lat}&longitude=${active.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.current) return;
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: Math.round(data.current.relative_humidity_2m),
          wind: Math.round(data.current.wind_speed_10m),
          code: Number(data.current.weather_code ?? 0),
        });
      })
      .catch(() => { if (!cancelled) setWeather(null); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [active.lat, active.lon]);

  const origin = mapUser || { lat: 16.9891, lon: 82.2475 };
  const distKm = useMemo(() => haversineKm(origin, { lat: active.lat, lon: active.lon }), [origin, active]);
  const wInfo = weather ? weatherLabel(weather.code) : { label: 'Checking...' };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
    const fname = file.name.toLowerCase();
    const matched = DESTINATIONS.find((d) => d.name.toLowerCase().split(' ').some((w) => w.length > 3 && fname.includes(w)));
    setPhotoGuess(matched ? matched.name : active.name);
  };

  const handleReviewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRevPhoto(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revText.trim()) return;
    const next: PlaceReview = {
      id: 'rev_' + Date.now(),
      placeId: active.id,
      author: 'Traveler',
      text: revText.trim(),
      cleanliness: cleanRating,
      accessibility: accessRating,
      photo: revPhoto,
      date: new Date().toLocaleDateString('en-IN'),
    };
    const updated = [next, ...reviews];
    setReviews(updated);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(updated));
    setRevText('');
    setRevPhoto(null);
    toast('Review & ratings saved!', { tone: 'success' });
  };

  const saveForOffline = (dest: DestinationGuide) => {
    if (offlinePacks.some((p) => p.id === dest.id)) {
      toast(`${dest.name} is already saved offline!`, { tone: 'info' });
      return;
    }
    const updated = [...offlinePacks, dest];
    setOfflinePacks(updated);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(updated));
    toast(`${dest.name} saved for Offline Travel Mode!`, { tone: 'success' });
  };

  const downloadOfflinePack = (dest: DestinationGuide) => {
    const blob = new Blob([JSON.stringify(dest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dest.id}-offline-pack.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Offline destination pack downloaded!', { tone: 'success' });
  };

  const activeReviews = reviews.filter((r) => r.placeId === active.id);
  const shareUrl = `https://www.google.com/maps?q=${origin.lat},${origin.lon}`;
  const etaWhatsApp = `https://wa.me/?text=${encodeURIComponent(
    `📍 Locate U Live Trip Update:\nHeading to: ${active.name} (${active.address})\nEstimated ETA: ~${etaMinutes} mins\n${liveSharingActive ? `Live Location: ${shareUrl}` : ''}`,
  )}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 w-full overflow-x-hidden">
      <header className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-400/30 px-3 py-1 text-xs font-semibold text-cyan-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Travel Suite · Live Weather, Sharing, Reviews &amp; Offline Mode
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Smart Discovery &amp; Planner</h1>
          <p className="mt-1 text-sm text-muted">
            Weather alerts, tourist seasons, hidden gems, hotels, food, photo nav, live trip sharing, reviews &amp; offline mode.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOnlyHiddenGems((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${onlyHiddenGems ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'glass hover:bg-white/10'}`}>
            <Gem className="h-3.5 w-3.5" /> Hidden Gems
          </button>
          <button type="button" onClick={() => setWheelchairMode((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${wheelchairMode ? 'bg-sky-500/20 border-sky-400/50 text-sky-300' : 'glass hover:bg-white/10'}`}>
            <Accessibility className="h-3.5 w-3.5" /> Accessibility Mode
          </button>
          <button type="button" onClick={() => setFamilyMode((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${familyMode ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'glass hover:bg-white/10'}`}>
            <Users className="h-3.5 w-3.5" /> Family Mode
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(filteredDestinations.length ? filteredDestinations : DESTINATIONS).map((d) => (
          <button key={d.id} type="button" onClick={() => setSelectedId(d.id)} className={`rounded-2xl px-3.5 py-2 text-xs font-semibold border transition text-left ${active.id === d.id ? 'bg-brand-600 text-white border-brand-400 shadow-md' : 'glass hover:bg-white/10'}`}>
            <div className="flex items-center gap-1.5"><span>{d.name}</span>{d.hiddenGem && <Gem className="h-3 w-3 text-amber-300" />}</div>
            <div className="text-[10px] opacity-75">{d.state}</div>
          </button>
        ))}
      </div>

      {/* Weather, Seasons & Alerts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={<CloudSun className="h-5 w-5" />} title="Live Destination Weather" subtitle={active.name}>
          {weatherLoading ? <p className="text-xs text-muted">Fetching live Open-Meteo weather...</p> : weather ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between"><span className="text-3xl font-extrabold">{weather.temp}°C</span><Badge tone="brand">{wInfo.label}</Badge></div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1">
                <div>Humidity: <strong className="text-[rgb(var(--fg))]">{weather.humidity}%</strong></div>
                <div>Wind: <strong className="text-[rgb(var(--fg))]">{weather.wind} km/h</strong></div>
              </div>
            </div>
          ) : <p className="text-xs text-muted">Offline mode: live weather unavailable.</p>}
        </Card>

        <Card icon={<Calendar className="h-5 w-5" />} title="Tourist Seasons" subtitle={`Best months: ${active.bestMonths}`}>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">{active.seasonNote}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {active.wheelchairFriendly && <Badge tone="green">Wheelchair Friendly</Badge>}
            {active.familyFriendly && <Badge tone="brand">Family Friendly</Badge>}
            {active.hiddenGem && <Badge tone="amber">Hidden Gem</Badge>}
          </div>
        </Card>

        <Card icon={<AlertTriangle className="h-5 w-5" />} title="Travel Alerts" subtitle="Weather & disruption check">
          {wInfo.alert ? (
            <div className="rounded-2xl bg-amber-500/15 border border-amber-400/30 p-3 text-xs text-amber-200">{wInfo.alert}</div>
          ) : (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-xs text-emerald-300">No active weather disruptions at {active.name}. Safe for outdoor visits.</div>
          )}
          <p className="mt-2.5 text-[11px] text-muted"><strong>Accessibility:</strong> {active.accessibilityNote}</p>
        </Card>
      </div>

      {/* Route Comparison */}
      <Card
        icon={<Navigation className="h-5 w-5" />}
        title="Route Comparison (Walking vs Cycling vs Driving)"
        subtitle={`To ${active.name} (${formatDistance(distKm)})`}
        action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => geo.locate()}>Use My GPS</Button><Button size="sm" variant="primary" onClick={() => navigate(`/transport?dest=${encodeURIComponent(active.name)}&lat=${active.lat}&lon=${active.lon}`)}>Book Ride</Button></div>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Glass className="p-3.5 border hairline">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1"><Footprints className="h-4 w-4" /> Walking (~4.5 km/h)</div>
            <div className="text-lg font-bold">{distKm < 1 ? `${Math.max(2, Math.round((distKm / 4.5) * 60))} mins` : `${(distKm / 4.5).toFixed(1)} hrs`}</div>
            <p className="text-[11px] text-muted mt-0.5">{formatDistance(distKm)} · Zero cost</p>
          </Glass>
          <Glass className="p-3.5 border hairline">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1"><Bike className="h-4 w-4" /> Cycling (~15 km/h)</div>
            <div className="text-lg font-bold">{distKm < 15 ? `${Math.max(3, Math.round((distKm / 15) * 60))} mins` : `${(distKm / 15).toFixed(1)} hrs`}</div>
            <p className="text-[11px] text-muted mt-0.5">{formatDistance(distKm)} · Eco-friendly</p>
          </Glass>
          <Glass className="p-3.5 border hairline">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1"><Car className="h-4 w-4" /> Driving / Cab (~42 km/h)</div>
            <div className="text-lg font-bold">{distKm < 42 ? `${Math.max(4, Math.round((distKm / 42) * 60))} mins` : `${(distKm / 42).toFixed(1)} hrs`}</div>
            <p className="text-[11px] text-muted mt-0.5">Est. cab Rs {Math.max(45, Math.round(distKm * 15))} · Auto Rs {Math.max(30, Math.round(distKm * 11))}</p>
          </Glass>
        </div>
      </Card>

      {/* Live Trip Sharing + Offline Travel Mode */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card icon={<Share2 className="h-5 w-5" />} title="Live Trip Sharing &amp; Safety" subtitle="Share itinerary, live GPS &amp; ETA with family (stop anytime)">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {!liveSharingActive ? (
                <Button size="sm" variant="primary" icon={<MapPin className="h-4 w-4" />} onClick={() => { geo.locate(); setLiveSharingActive(true); toast('Live GPS sharing enabled with your permission', { tone: 'success' }); }}>
                  Start Live Location Sharing
                </Button>
              ) : (
                <Button size="sm" variant="danger" icon={<StopCircle className="h-4 w-4" />} onClick={() => { setLiveSharingActive(false); toast('Live location sharing stopped'); }}>
                  Stop Sharing Anytime
                </Button>
              )}
              <a href="tel:112">
                <Button size="sm" variant="secondary" icon={<PhoneCall className="h-4 w-4 text-red-400" />}>SOS 112</Button>
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">ETA (mins):</span>
              <input value={etaMinutes} onChange={(e) => setEtaMinutes(e.target.value)} className="w-20 rounded-xl border hairline bg-white/10 px-2.5 py-1 text-xs font-bold outline-none" />
              <a href={etaWhatsApp} target="_blank" rel="noopener noreferrer" className="ml-auto">
                <Button size="sm" variant="glass" icon={<Share2 className="h-3.5 w-3.5" />}>Send ETA &amp; Itinerary on WhatsApp</Button>
              </a>
            </div>
            {liveSharingActive && (
              <p className="text-[11px] text-emerald-300">● Live coordinates active ({origin.lat.toFixed(4)}, {origin.lon.toFixed(4)}). Tap Stop Sharing anytime.</p>
            )}
          </div>
        </Card>

        <Card icon={<WifiOff className="h-5 w-5" />} title="Offline Travel Mode" subtitle="Save places &amp; addresses before travelling">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button size="sm" variant="primary" icon={<Bookmark className="h-4 w-4" />} onClick={() => saveForOffline(active)}>
              Save {active.name.split(' ')[0]} Offline
            </Button>
            <Button size="sm" variant="glass" icon={<Download className="h-4 w-4" />} onClick={() => downloadOfflinePack(active)}>
              Download Offline Pack
            </Button>
          </div>
          <p className="text-[11px] text-muted mb-2">
            Saved destinations, addresses &amp; India dataset boundaries work offline. (OSM map tiles follow standard HTTP cache policy.)
          </p>
          {offlinePacks.length > 0 && (
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {offlinePacks.map((p) => (
                <div key={p.id} className="rounded-xl border hairline bg-white/[0.03] px-3 py-1.5 text-xs flex justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted truncate ml-2">{p.address}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Hotel Comparison + Food Discovery */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card icon={<Hotel className="h-5 w-5" />} title="Hotel Comparison" subtitle={`Stays near ${active.name}`}>
          <div className="space-y-2.5">
            {active.hotels.map((h) => (
              <div key={h.name} className="flex items-center justify-between gap-3 rounded-2xl border hairline bg-white/[0.03] p-3">
                <div>
                  <div className="text-sm font-semibold">{h.name}</div>
                  <div className="text-[11px] text-muted flex flex-wrap gap-2 mt-0.5"><span>{h.tier}</span><span>★ {h.rating}</span>{h.wheelchair && <span className="text-emerald-400">Accessible</span>}{h.family && <span className="text-sky-400">Family</span>}</div>
                </div>
                <div className="text-right shrink-0"><div className="text-sm font-bold text-cyan-300">{h.pricePerNight}</div><div className="text-[10px] text-muted">per night</div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card icon={<Utensils className="h-5 w-5" />} title="Food Discovery" subtitle={`Popular local dishes in ${active.state}`}>
          <div className="space-y-2.5">
            {active.dishes.map((dish) => (
              <div key={dish.name} className="flex items-center justify-between gap-3 rounded-2xl border hairline bg-white/[0.03] p-3">
                <div><div className="text-sm font-semibold">{dish.name}</div><div className="text-[11px] text-muted mt-0.5">Famous at: {dish.spot}</div></div>
                <div className="text-right shrink-0"><Badge tone={dish.type === 'Veg' ? 'green' : 'amber'}>{dish.type}</Badge><div className="text-xs font-bold mt-1">{dish.price}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tourist Reviews & Ratings + Photo Navigation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          icon={<Star className="h-5 w-5" />}
          title="Tourist Reviews &amp; Ratings"
          subtitle={`Cleanliness, accessibility &amp; photos for ${active.name}`}
          action={
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" icon={<Bookmark className="h-3.5 w-3.5" />} onClick={() => { addSaved({ kind: 'place', name: active.name, lat: active.lat, lon: active.lon, address: active.address }); toast('Saved to Favorites!', { tone: 'success' }); }}>
                Favorite
              </Button>
              <Button size="sm" variant="ghost" icon={<Flag className="h-3.5 w-3.5 text-amber-400" />} onClick={() => toast(`Report logged for ${active.name} — thank you for keeping Locate U accurate!`, { tone: 'info' })}>
                Report Issue
              </Button>
            </div>
          }
        >
          <form onSubmit={submitReview} className="space-y-2.5">
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1.5">Cleanliness:
                <select value={cleanRating} onChange={(e) => setCleanRating(Number(e.target.value))} className="rounded-xl border hairline bg-slate-900 px-2 py-1 text-xs">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5">Accessibility:
                <select value={accessRating} onChange={(e) => setAccessRating(Number(e.target.value))} className="rounded-xl border hairline bg-slate-900 px-2 py-1 text-xs">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </label>
              <label className="cursor-pointer rounded-xl border hairline px-2.5 py-1 hover:bg-white/10">
                + Upload Photo
                <input type="file" accept="image/*" onChange={handleReviewPhoto} className="hidden" />
              </label>
            </div>
            <div className="flex gap-2">
              <input value={revText} onChange={(e) => setRevText(e.target.value)} placeholder="Share a tip or review about this place..." className="flex-1 rounded-2xl border hairline bg-white/10 px-3 py-2 text-xs outline-none" />
              <Button type="submit" size="sm" variant="primary">Post</Button>
            </div>
          </form>
          {activeReviews.length > 0 && (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {activeReviews.map((r) => (
                <div key={r.id} className="rounded-2xl border hairline bg-white/[0.03] p-2.5 text-xs flex gap-2.5">
                  {r.photo && <img src={r.photo} alt="User upload" className="h-12 w-12 rounded-lg object-cover shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-semibold">Cleanliness {r.cleanliness}★ · Access {r.accessibility}★ <span className="text-muted font-normal">({r.date})</span></div>
                    <p className="text-muted mt-0.5">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card icon={<Camera className="h-5 w-5" />} title="Photo Navigation &amp; Facilities" subtitle="Identify landmark photo or view family/accessibility info">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-400/40 bg-sky-500/5 p-3.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/10 transition">
              <Camera className="h-4 w-4" /><span>Choose or Capture Attraction Photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </label>
            {photoPreview && (
              <div className="flex items-center gap-3 rounded-2xl border hairline p-2.5 bg-white/[0.03]">
                <img src={photoPreview} alt="Landmark" className="h-14 w-14 rounded-xl object-cover" />
                <input value={photoGuess} onChange={(e) => setPhotoGuess(e.target.value)} className="flex-1 rounded-xl border hairline bg-black/20 px-2.5 py-1 text-xs font-semibold outline-none" />
                <Button size="sm" variant="primary" icon={<MapPin className="h-3.5 w-3.5" />} onClick={() => openOnMap({ kind: 'search', lat: active.lat, lon: active.lon, name: photoGuess || active.name, address: active.state, zoom: 14 })}>Navigate</Button>
              </div>
            )}
            <div className="rounded-2xl bg-white/[0.04] p-2.5 border hairline text-xs"><strong>Family Facilities:</strong> {active.familyFacilities}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
