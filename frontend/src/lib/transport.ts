import type { LatLon } from './geo';

export interface RideService {
  id: string;
  name: string;
  category: string;
  description: string;
  webUrl: string;
  badge: string;
  color: string;
}

export interface MetroService {
  id: string;
  city: string;
  name: string;
  agency: string;
  lines: number;
  stations: number;
  portalUrl: string;
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
}

export interface AirportHub {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  distanceFromRegion: string;
  type: 'Domestic' | 'International';
  popularRoutes: string;
  flightSearchUrl: string;
}

const f = (n: number) => n.toFixed(6);

export function getRideServices(dest?: LatLon | null, origin?: LatLon | null, placeName?: string): RideService[] {
  const dLat = dest ? f(dest.lat) : '';
  const dLon = dest ? f(dest.lon) : '';
  const oLat = origin ? f(origin.lat) : '';
  const oLon = origin ? f(origin.lon) : '';
  const query = encodeURIComponent(placeName || 'Destination');

  const olaWeb = dest
    ? origin
      ? `https://book.olacabs.com/?pickup_lat=${oLat}&pickup_lng=${oLon}&lat=${dLat}&lng=${dLon}&drop_name=${query}`
      : `https://book.olacabs.com/?lat=${dLat}&lng=${dLon}&drop_name=${query}`
    : 'https://book.olacabs.com/';

  const rapidoWeb = dest
    ? `https://www.rapido.bike/?drop_lat=${dLat}&drop_lng=${dLon}&drop_name=${query}`
    : 'https://www.rapido.bike/';

  const uberWeb = dest
    ? origin
      ? `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLon}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLon}&dropoff[formatted_address]=${query}`
      : `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLon}&dropoff[formatted_address]=${query}`
    : 'https://m.uber.com/ul/?action=setPickup';

  return [
    {
      id: 'ola',
      name: 'Ola Cabs',
      category: 'Cab & Auto',
      description: 'Book Ola Auto, Mini, Prime, or Outstation directly',
      webUrl: olaWeb,
      color: '#00D166',
      badge: 'Cabs & Autos',
    },
    {
      id: 'rapido',
      name: 'Rapido',
      category: 'Bike Taxi',
      description: 'Fast and affordable bike taxis and autos across India',
      webUrl: rapidoWeb,
      color: '#F4B400',
      badge: 'Fastest in Traffic',
    },
    {
      id: 'uber',
      name: 'Uber',
      category: 'All Rides',
      description: 'Reliable rides: Uber Auto, Go, Premier & Moto',
      webUrl: uberWeb,
      color: '#000000',
      badge: 'Nationwide',
    },
  ];
}

export const AIRLINE_SERVICES: TransitService[] = [
  {
    id: 'indigo',
    name: 'IndiGo Airlines',
    category: 'flight',
    description: "India's largest domestic carrier with maximum direct flights & connectivity",
    url: 'https://www.goindigo.in/',
    official: true,
  },
  {
    id: 'airindia',
    name: 'Air India',
    category: 'flight',
    description: 'National flag carrier with domestic flights and major international destinations',
    url: 'https://www.airindia.com/',
    official: true,
  },
  {
    id: 'akasa',
    name: 'Akasa Air',
    category: 'flight',
    description: 'Budget-friendly domestic airline with warm service & comfortable seating',
    url: 'https://www.akasaair.com/',
    official: true,
  },
  {
    id: 'google-flights',
    name: 'Google Flights Compare',
    category: 'flight',
    description: 'Real-time fare calendar, cheapest dates & flight comparison across all airlines',
    url: 'https://www.google.com/travel/flights',
    official: false,
  },
  {
    id: 'skyscanner',
    name: 'Skyscanner India',
    category: 'flight',
    description: 'Compare cheapest domestic and international air tickets with price alerts',
    url: 'https://www.skyscanner.co.in/',
    official: false,
  },
];

export const AIRPORT_HUBS: AirportHub[] = [
  {
    id: 'rja',
    code: 'RJA',
    name: 'Rajahmundry Domestic Airport',
    city: 'Rajahmundry (Madhurapudi)',
    state: 'Andhra Pradesh',
    distanceFromRegion: '~60 km from Kakinada (Nearest Airport)',
    type: 'Domestic',
    popularRoutes: 'Hyderabad (HYD), Bengaluru (BLR), Chennai (MAA)',
    flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+RJA',
  },
  {
    id: 'vtz',
    code: 'VTZ',
    name: 'Visakhapatnam International Airport',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    distanceFromRegion: '~145 km from Kakinada',
    type: 'International',
    popularRoutes: 'Delhi, Mumbai, Bengaluru, Hyderabad, Singapore, Dubai',
    flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+VTZ',
  },
  {
    id: 'vga',
    code: 'VGA',
    name: 'Vijayawada International Airport (Gannavaram)',
    city: 'Vijayawada / Amaravati',
    state: 'Andhra Pradesh',
    distanceFromRegion: '~200 km from Kakinada',
    type: 'International',
    popularRoutes: 'Hyderabad, Bengaluru, Delhi, Tirupati, Sharjah',
    flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+VGA',
  },
  {
    id: 'hyd',
    code: 'HYD',
    name: 'Rajiv Gandhi International Airport (RGIA)',
    city: 'Hyderabad',
    state: 'Telangana',
    distanceFromRegion: 'Major Southern Hub',
    type: 'International',
    popularRoutes: 'All major Indian cities, USA, Europe, Gulf, Southeast Asia',
    flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+HYD',
  },
  {
    id: 'blr',
    code: 'BLR',
    name: 'Kempegowda International Airport',
    city: 'Bengaluru',
    state: 'Karnataka',
    distanceFromRegion: 'Major Tech & Flight Hub',
    type: 'International',
    popularRoutes: 'Direct flights to over 100 domestic and global destinations',
    flightSearchUrl: 'https://www.google.com/travel/flights?q=flights+from+BLR',
  },
];

export const METRO_SYSTEMS: MetroService[] = [
  {
    id: 'hyderabad',
    city: 'Hyderabad',
    name: 'Hyderabad Metro Rail',
    agency: 'L&T Metro Rail',
    lines: 3,
    stations: 57,
    portalUrl: 'https://www.ltmetro.com/',
    ticketBookingUrl: 'https://www.ltmetro.com/passenger-services/fare-calculator/',
    routeMapUrl: 'https://www.ltmetro.com/metro-network-map/',
  },
  {
    id: 'bengaluru',
    city: 'Bengaluru',
    name: 'Namma Metro',
    agency: 'BMRCL',
    lines: 2,
    stations: 66,
    portalUrl: 'https://english.bmrc.co.in/',
    routeMapUrl: 'https://english.bmrc.co.in/RouteMap',
  },
  {
    id: 'delhi',
    city: 'Delhi NCR',
    name: 'Delhi Metro (DMRC)',
    agency: 'Delhi Metro Rail Corporation',
    lines: 12,
    stations: 288,
    portalUrl: 'https://www.delhimetrorail.com/',
    routeMapUrl: 'https://www.delhimetrorail.com/network_map',
  },
  {
    id: 'chennai',
    city: 'Chennai',
    name: 'Chennai Metro (CMRL)',
    agency: 'Chennai Metro Rail Limited',
    lines: 2,
    stations: 41,
    portalUrl: 'https://chennaimetrorail.org/',
    routeMapUrl: 'https://chennaimetrorail.org/wp-content/uploads/2021/04/Route-Map-1.pdf',
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    name: 'Mumbai Metro',
    agency: 'Maha Mumbai Metro / MMRDA',
    lines: 4,
    stations: 43,
    portalUrl: 'https://www.mmmocl.co.in/',
    routeMapUrl: 'https://www.mmmocl.co.in/our-network.html',
  },
  {
    id: 'kolkata',
    city: 'Kolkata',
    name: 'Kolkata Metro',
    agency: 'Metro Railway Kolkata',
    lines: 4,
    stations: 48,
    portalUrl: 'https://mtp.indianrailways.gov.in/',
  },
  {
    id: 'kochi',
    city: 'Kochi',
    name: 'Kochi Metro & Water Metro',
    agency: 'KMRL',
    lines: 1,
    stations: 25,
    portalUrl: 'https://kochimetro.org/',
    routeMapUrl: 'https://kochimetro.org/route-map/',
  },
  {
    id: 'ahmedabad',
    city: 'Ahmedabad - Gandhinagar',
    name: 'Gujarat Metro (GMRC)',
    agency: 'Gujarat Metro Rail',
    lines: 2,
    stations: 32,
    portalUrl: 'https://www.gujaratmetrorail.com/',
  },
  {
    id: 'pune',
    city: 'Pune',
    name: 'Pune Metro',
    agency: 'Maha Metro',
    lines: 2,
    stations: 30,
    portalUrl: 'https://www.punemetrorail.org/',
    routeMapUrl: 'https://www.punemetrorail.org/route-map',
  },
];

export const RAIL_SERVICES: TransitService[] = [
  {
    id: 'irctc',
    name: 'IRCTC e-Ticketing',
    category: 'train',
    description: 'Official Indian Railways ticket reservation & Tatkal booking portal',
    url: 'https://www.irctc.co.in/nget/train-search',
    official: true,
  },
  {
    id: 'ntes',
    name: 'Live Train Status (NTES)',
    category: 'train',
    description: 'Real-time train running status, delays, and platform numbers',
    url: 'https://enquiry.indianrail.gov.in/',
    official: true,
  },
  {
    id: 'pnr',
    name: 'PNR Status Check',
    category: 'train',
    description: 'Check reservation confirmation, coach, and berth details',
    url: 'https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en',
    official: true,
  },
  {
    id: 'uts',
    name: 'UTS on Mobile',
    category: 'train',
    description: 'Book unreserved general & suburban local train tickets online',
    url: 'https://www.utsonmobile.indianrail.gov.in/',
    official: true,
  },
];

export const BUS_SERVICES: TransitService[] = [
  {
    id: 'apsrtc',
    name: 'APSRTC (Andhra Pradesh)',
    category: 'bus',
    description: 'Amaravati, Garuda, Super Luxury & Ultra Deluxe state bus bookings',
    url: 'https://www.apsrtconline.in/',
    official: true,
  },
  {
    id: 'tsrtc',
    name: 'TSRTC (Telangana)',
    category: 'bus',
    description: 'Telangana State RTC Garuda, Rajadhani & Express bus booking portal',
    url: 'https://www.tsrtconline.in/',
    official: true,
  },
  {
    id: 'ksrtc',
    name: 'KSRTC (Karnataka)',
    category: 'bus',
    description: 'Airavat Club Class, Flybus & Rajahamsa express reservation',
    url: 'https://www.ksrtc.in/',
    official: true,
  },
  {
    id: 'redbus',
    name: 'redBus India',
    category: 'bus',
    description: 'Search & compare private and government intercity buses nationwide',
    url: 'https://www.redbus.in/',
    official: false,
  },
  {
    id: 'abhibus',
    name: 'AbhiBus',
    category: 'bus',
    description: 'Popular bus ticket bookings with live bus tracking and offers',
    url: 'https://www.abhibus.com/',
    official: false,
  },
];
