import type { LatLon } from './geo';

export interface RideService {
  id: 'uber' | 'ola' | 'rapido' | 'google_maps';
  name: string;
  category: string;
  description: string;
  webUrl: string;
  appDeepLink: string;
  androidIntent: string;
  supportsAutoFillWeb: boolean;
  supportsAutoFillApp: boolean;
  limitationNote: string;
  badge: string;
  color: string;
}

export interface MetroService {
  id: string;
  city: string;
  name: string;
  agency: string;
  lines: string | number;
  stations: number;
  portalUrl: string;
  url: string;
  ticketBookingUrl?: string;
  routeMapUrl?: string;
}

export interface TransitService {
  id: string;
  name: string;
  category: 'train' | 'bus' | 'flight';
  description: string;
  url: string;
  official: boolean;
  region?: string;
}

export interface AirportHub {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  distanceFromRegion: string;
  type: 'Domestic' | 'International';
  popularRoutes: string;
  flightSearchUrl: string;
}

export interface PresetPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
}

export const PRESET_LOCATIONS: PresetPlace[] = [
  { id: 'kakinada-station', name: 'Kakinada Town Railway Station', category: 'Transit Hub', lat: 16.9602, lon: 82.2410 },
  { id: 'subbayya-hotel', name: 'Subbayya Gari Hotel, Kakinada', category: 'Restaurant', lat: 16.9891, lon: 82.2475 },
  { id: 'kotaiah-kaja', name: 'Kotaiah Sweets (Main Road)', category: 'Food & Sweets', lat: 16.9530, lon: 82.2380 },
  { id: 'uppada-beach', name: 'Uppada Golden Beach', category: 'Beach', lat: 17.0862, lon: 82.3275 },
  { id: 'coringa-sanctuary', name: 'Coringa Wildlife Sanctuary', category: 'Eco-Tourism', lat: 16.8924, lon: 82.2858 },
  { id: 'hope-island', name: 'Hope Island Boat Jetty', category: 'Attraction', lat: 16.9780, lon: 82.3450 },
  { id: 'draksharamam', name: 'Draksharamam Temple', category: 'Heritage Temple', lat: 16.7933, lon: 82.0622 },
  { id: 'annavaram', name: 'Annavaram Satyanarayana Temple', category: 'Hilltop Temple', lat: 17.2816, lon: 82.4017 },
  { id: 'rja-airport', name: 'Rajahmundry Airport (RJA)', category: 'Airport', lat: 17.1104, lon: 81.8182 },
  { id: 'araku-valley', name: 'Araku Valley Railway Station', category: 'Hill Station', lat: 18.3273, lon: 82.8775 },
  { id: 'charminar-hyd', name: 'Charminar, Hyderabad', category: 'Monument', lat: 17.3616, lon: 78.4747 },
];

const f = (n: number) => n.toFixed(6);
const DEFAULT_ORIGIN: LatLon = { lat: 16.9891, lon: 82.2475 };
const DEFAULT_DEST: LatLon = { lat: 17.0862, lon: 82.3275 };

export function resolveKnownPlaceCoords(query: string): LatLon | null {
  const lower = query.trim().toLowerCase();
  if (!lower) return null;
  const match = PRESET_LOCATIONS.find(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      lower.includes(p.name.toLowerCase().split(' ')[0]),
  );
  if (match) return { lat: match.lat, lon: match.lon };
  return null;
}

export function getRideServices(
  dest?: LatLon | null,
  origin?: LatLon | null,
  destName?: string,
  originName?: string,
): RideService[] {
  const activeOrigin = origin || DEFAULT_ORIGIN;
  const activeDest = dest || resolveKnownPlaceCoords(destName || '') || DEFAULT_DEST;

  const oLat = f(activeOrigin.lat);
  const oLon = f(activeOrigin.lon);
  const dLat = f(activeDest.lat);
  const dLon = f(activeDest.lon);

  const pName = encodeURIComponent(originName || 'Current Pickup Location');
  const dName = encodeURIComponent(destName || 'Selected Destination');

  const uberQuery = `action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLon}&pickup[formatted_address]=${pName}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLon}&dropoff[formatted_address]=${dName}`;
  const uberWeb = `https://m.uber.com/ul/?${uberQuery}`;
  const uberApp = `uber://?${uberQuery}`;
  const uberIntent = `intent://?${uberQuery}#Intent;scheme=uber;package=com.ubercab;S.browser_fallback_url=${encodeURIComponent(uberWeb)};end`;

  const olaQuery = `pickup_lat=${oLat}&pickup_lng=${oLon}&pickup_name=${pName}&lat=${dLat}&lng=${dLon}&drop_lat=${dLat}&drop_lng=${dLon}&drop_name=${dName}&utm_source=locate_u`;
  const olaWeb = `https://book.olacabs.com/?${olaQuery}`;
  const olaApp = `olacabs://app/launch?lat=${oLat}&lng=${oLon}&drop_lat=${dLat}&drop_lng=${dLon}&dsw=yes`;
  const olaIntent = `intent://app/launch?lat=${oLat}&lng=${oLon}&drop_lat=${dLat}&drop_lng=${dLon}#Intent;scheme=olacabs;package=com.olacabs.customer;S.browser_fallback_url=${encodeURIComponent(olaWeb)};end`;

  const rapidoWeb = `https://www.rapido.bike`;
  const rapidoApp = `rapido://open?pickup_lat=${oLat}&pickup_lng=${oLon}&pickup_name=${pName}&drop_lat=${dLat}&drop_lng=${dLon}&drop_name=${dName}`;
  const rapidoIntent = `intent://open?pickup_lat=${oLat}&pickup_lng=${oLon}&drop_lat=${dLat}&drop_lng=${dLon}#Intent;scheme=rapido;package=com.rapido.passenger;S.browser_fallback_url=${encodeURIComponent(rapidoWeb)};end`;

  const gmapsWeb = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLon}&destination=${dLat},${dLon}&destination_place_id=${dName}&travelmode=driving`;

  return [
    {
      id: 'uber',
      name: 'Uber (Go, Auto & Moto)',
      category: 'Cab, Auto & Bike',
      description: 'Official Uber Universal Link — pre-fills both pickup and dropoff on app and web.',
      webUrl: uberWeb,
      appDeepLink: uberApp,
      androidIntent: uberIntent,
      supportsAutoFillWeb: true,
      supportsAutoFillApp: true,
      limitationNote: 'Full coordinate & address transfer supported on both Uber mobile app and web.',
      color: '#000000',
      badge: 'Full Auto-Fill (App + Web)',
    },
    {
      id: 'ola',
      name: 'Ola Cabs & Ola Auto',
      category: 'Cab & Auto',
      description: 'Official Ola Web & App launcher with pickup and drop coordinates pre-loaded.',
      webUrl: olaWeb,
      appDeepLink: olaApp,
      androidIntent: olaIntent,
      supportsAutoFillWeb: true,
      supportsAutoFillApp: true,
      limitationNote: 'Pre-fills pickup & dropoff coordinates on book.olacabs.com and the Ola mobile app.',
      color: '#00D166',
      badge: 'Full Auto-Fill (App + Web)',
    },
    {
      id: 'rapido',
      name: 'Rapido Bike Taxi & Auto',
      category: 'Bike & Auto',
      description: 'Opens the Rapido mobile app and copies your exact drop address for instant paste.',
      webUrl: rapidoWeb,
      appDeepLink: rapidoApp,
      androidIntent: rapidoIntent,
      supportsAutoFillWeb: false,
      supportsAutoFillApp: true,
      limitationNote: 'Rapido supports bookings inside its mobile app; destination is also copied to clipboard automatically.',
      color: '#F4B400',
      badge: 'Mobile App + Auto-Copy',
    },
    {
      id: 'google_maps',
      name: 'Google Maps Route & Transit',
      category: 'Universal Navigation',
      description: 'Guaranteed route preview with exact pickup & destination pins on any device.',
      webUrl: gmapsWeb,
      appDeepLink: gmapsWeb,
      androidIntent: gmapsWeb,
      supportsAutoFillWeb: true,
      supportsAutoFillApp: true,
      limitationNote: 'Works universally on Android, iOS, and desktop browsers with exact coordinates.',
      color: '#1A73E8',
      badge: '100% Universal',
    },
  ];
}

export const AIRLINE_SERVICES: TransitService[] = [
  { id: 'indigo', name: 'IndiGo Airlines', category: 'flight', description: "India's largest domestic carrier with direct flights from Rajahmundry & Vizag", url: 'https://www.goindigo.in/', official: true },
  { id: 'airindia', name: 'Air India', category: 'flight', description: 'National flag carrier with domestic flights and international connections', url: 'https://www.airindia.com/', official: true },
  { id: 'akasa', name: 'Akasa Air', category: 'flight', description: 'Budget-friendly modern airline with comfortable seating', url: 'https://www.akasaair.com/', official: true },
  { id: 'google-flights', name: 'Google Flights Compare', category: 'flight', description: 'Real-time fare tracker with cheapest dates across all airlines', url: 'https://www.google.com/travel/flights', official: false },
];

export const AIRPORT_HUBS: AirportHub[] = [
  { id: 'rja', code: 'RJA', name: 'Rajahmundry Domestic Airport', city: 'Rajahmundry', state: 'Andhra Pradesh', lat: 17.1104, lon: 81.8182, distanceFromRegion: '~60 km from Kakinada', type: 'Domestic', popularRoutes: 'Hyderabad (HYD), Bengaluru (BLR), Chennai (MAA)', flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+RJA' },
  { id: 'vtz', code: 'VTZ', name: 'Visakhapatnam International Airport', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.7212, lon: 83.2245, distanceFromRegion: '~145 km from Kakinada', type: 'International', popularRoutes: 'Delhi, Mumbai, Bengaluru, Hyderabad, Singapore', flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+VTZ' },
  { id: 'hyd', code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', state: 'Telangana', lat: 17.2403, lon: 78.4294, distanceFromRegion: 'Major Southern Air Hub', type: 'International', popularRoutes: 'All major Indian & global cities', flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+HYD' },
];

export const METRO_SYSTEMS: MetroService[] = [
  { id: 'hyderabad', city: 'Hyderabad', name: 'Hyderabad Metro Rail', agency: 'L&T Metro Rail', lines: '3 Lines · 57 Stations', stations: 57, portalUrl: 'https://www.ltmetro.com/', url: 'https://www.ltmetro.com/' },
  { id: 'bengaluru', city: 'Bengaluru', name: 'Namma Metro', agency: 'BMRCL', lines: '2 Lines · 66 Stations', stations: 66, portalUrl: 'https://english.bmrc.co.in/', url: 'https://english.bmrc.co.in/' },
  { id: 'delhi', city: 'Delhi NCR', name: 'Delhi Metro (DMRC)', agency: 'DMRC', lines: '12 Lines · 288 Stations', stations: 288, portalUrl: 'https://www.delhimetrorail.com/', url: 'https://www.delhimetrorail.com/' },
  { id: 'chennai', city: 'Chennai', name: 'Chennai Metro (CMRL)', agency: 'CMRL', lines: '2 Lines · 41 Stations', stations: 41, portalUrl: 'https://chennaimetrorail.org/', url: 'https://chennaimetrorail.org/' },
  { id: 'mumbai', city: 'Mumbai', name: 'Mumbai Metro', agency: 'MMRDA', lines: '4 Lines · 43 Stations', stations: 43, portalUrl: 'https://www.mmmocl.co.in/', url: 'https://www.mmmocl.co.in/' },
  { id: 'kochi', city: 'Kochi', name: 'Kochi Metro & Water Metro', agency: 'KMRL', lines: '1 Line · 25 Stations', stations: 25, portalUrl: 'https://kochimetro.org/', url: 'https://kochimetro.org/' },
];

export const RAIL_SERVICES: TransitService[] = [
  { id: 'irctc', name: 'IRCTC e-Ticketing', category: 'train', description: 'Official Indian Railways ticket reservation & Tatkal booking portal', url: 'https://www.irctc.co.in/nget/train-search', official: true },
  { id: 'ntes', name: 'Live Train Status (NTES)', category: 'train', description: 'Real-time train running status, delays, and platform numbers', url: 'https://enquiry.indianrail.gov.in/', official: true },
  { id: 'pnr', name: 'PNR Status Check', category: 'train', description: 'Check reservation confirmation, coach, and berth details', url: 'https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en', official: true },
];

export const BUS_SERVICES: TransitService[] = [
  { id: 'apsrtc', name: 'APSRTC (Andhra Pradesh)', region: 'Andhra Pradesh', category: 'bus', description: 'Amaravati, Garuda, Super Luxury & Ultra Deluxe state bus bookings', url: 'https://www.apsrtconline.in/', official: true },
  { id: 'tsrtc', name: 'TSRTC (Telangana)', region: 'Telangana', category: 'bus', description: 'Telangana State RTC Garuda & Rajadhani bus booking portal', url: 'https://www.tsrtconline.in/', official: true },
  { id: 'ksrtc', name: 'KSRTC (Karnataka)', region: 'Karnataka', category: 'bus', description: 'Airavat Club Class, Flybus & Rajahamsa express reservation', url: 'https://www.ksrtc.in/', official: true },
  { id: 'redbus', name: 'redBus India', region: 'All India', category: 'bus', description: 'Search & compare private and government intercity buses nationwide', url: 'https://www.redbus.in/', official: false },
];
