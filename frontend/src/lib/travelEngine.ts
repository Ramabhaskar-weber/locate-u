export interface TouristPlace {
  id: string;
  name: string;
  category: 'Heritage' | 'Temple' | 'Beach' | 'Nature' | 'Hill Station';
  state: string;
  district: string;
  lat: number;
  lon: number;
  description: string;
  bestTime: string;
  famousFor: string;
  ticketPrice: string;
}

export interface FoodSpot {
  id: string;
  name: string;
  type: 'Local Mess' | 'Vegetarian' | 'Biryani & Non-Veg' | 'Street Food' | 'Cafe';
  city: string;
  lat: number;
  lon: number;
  specialty: string;
  priceRange: '₹' | '₹₹' | '₹₹₹';
  mustTry: string;
}

export interface StayOption {
  id: string;
  name: string;
  type: 'Budget Lodge' | 'Homestay' | 'Hotel' | 'Resort';
  location: string;
  pricePerNight: string;
  amenities: string[];
  bookingUrl: string;
}

export interface TravelPackage {
  id: string;
  title: string;
  provider: 'IRCTC Tourism' | 'AP Tourism (APTDC)' | 'MakeMyTrip' | 'Yatra';
  duration: string;
  price: string;
  highlights: string[];
  includes: string[];
  bookingUrl: string;
}

export interface FestivalEvent {
  id: string;
  name: string;
  month: string;
  location: string;
  significance: string;
  tips: string;
}

export interface SouvenirItem {
  id: string;
  item: string;
  region: string;
  category: 'Handloom Silk' | 'Handicrafts & Toys' | 'Jewellery & Pearls' | 'Spices & Food';
  whereToBuy: string;
  estimatedPrice: string;
  buyingTip: string;
}

export interface LocalPhrase {
  id: string;
  category: 'Driver & Cab' | 'Restaurant & Food' | 'Shopping & Bargaining' | 'Directions & Help';
  english: string;
  telugu: string;
  teluguScript: string;
  hindi: string;
}

export interface SeasonalGuide {
  season: string;
  months: string;
  climate: string;
  bestRegions: string[];
  travelTip: string;
}

export interface PublicUtility {
  id: string;
  name: string;
  category: 'toilets' | 'petrol' | 'hospitals' | 'water' | 'atm' | 'police';
  address: string;
  city: string;
  timings: string;
  phone?: string;
  rating?: string;
  facilities: string[];
}

export const ATTRACTIONS: TouristPlace[] = [
  { id: '1', name: 'Coringa Wildlife Sanctuary & Mangroves', category: 'Nature', state: 'Andhra Pradesh', district: 'Kakinada', lat: 16.8924, lon: 82.2858, description: 'Second largest mangrove forest in India with scenic wooden boardwalks, estuary boat safaris, and endangered fishing cats.', bestTime: 'Oct - March', famousFor: 'Mangrove Boating Safari & Olive Ridley Turtles', ticketPrice: '₹50 entry + ₹150 boat' },
  { id: '2', name: 'Uppada Beach & Handloom Silk Village', category: 'Beach', state: 'Andhra Pradesh', district: 'Kakinada', lat: 17.0862, lon: 82.3275, description: 'Famous coastal stretch and home to UNESCO-recognized traditional Jamdani Uppada silk weavers.', bestTime: 'Nov - Feb', famousFor: 'Sunrise Drive, Beach Breeze & Pure Silk Sarees', ticketPrice: 'Free' },
  { id: '3', name: 'Draksharamam Bheemeswara Temple', category: 'Temple', state: 'Andhra Pradesh', district: 'Konaseema', lat: 16.7933, lon: 82.0622, description: 'Sacred Pancharama Kshetra Shiva temple constructed by Eastern Chalukya king Bhima with towering 14-foot lingam.', bestTime: 'All Year', famousFor: 'Ancient Chalukyan Stone Architecture & Dakshayajna Site', ticketPrice: 'Free (Special Darshan ₹50)' },
  { id: '4', name: 'Dindi Backwaters & River Houseboats', category: 'Nature', state: 'Andhra Pradesh', district: 'Konaseema', lat: 16.4822, lon: 81.9328, description: 'Scenic Godavari river estuary flanked by coconut groves, lush green paddy fields and peaceful backwater cruises.', bestTime: 'Oct - Feb', famousFor: 'Godavari Houseboat Cruises & Coconut Plantations', ticketPrice: 'Cruise packages from ₹800' },
  { id: '5', name: 'Charminar & Laad Bazaar', category: 'Heritage', state: 'Telangana', district: 'Hyderabad', lat: 17.3616, lon: 78.4747, description: '16th-century grand monument and bustling historic market renowned for Hyderabadi pearls, glass bangles, and street food.', bestTime: 'Oct - March', famousFor: 'Historic Arches, Pearls & Night Bazaar', ticketPrice: '₹25 (Indians), ₹300 (Foreigners)' },
  { id: '6', name: 'Hampi UNESCO Heritage Complex', category: 'Heritage', state: 'Karnataka', district: 'Vijayanagara', lat: 15.3350, lon: 76.4600, description: 'Magnificent ruins of the Vijayanagara Empire amidst surreal granite boulder landscapes and temples along Tungabhadra.', bestTime: 'Nov - Feb', famousFor: 'Stone Chariot, Virupaksha Temple & Musical Pillars', ticketPrice: '₹40 entry' },
  { id: '7', name: 'Araku Valley & Borra Caves', category: 'Hill Station', state: 'Andhra Pradesh', district: 'Alluri Sitharama Raju', lat: 18.3273, lon: 82.8775, description: 'Misty Eastern Ghats hill station famous for organic Araku coffee plantations, tribal culture, and ancient million-year limestone Borra Caves.', bestTime: 'Sep - March', famousFor: 'Organic Coffee Estates & Million-year Caves', ticketPrice: '₹80 Borra Caves entry' },
  { id: '8', name: 'Meenakshi Amman Temple', category: 'Temple', state: 'Tamil Nadu', district: 'Madurai', lat: 9.9195, lon: 78.1194, description: 'Historic Dravidian temple with 14 towering colorful gopurams dedicated to Goddess Meenakshi and Lord Sundareswarar.', bestTime: 'Oct - March', famousFor: 'Gopuram Sculptures & Thousand Pillar Hall', ticketPrice: 'Free entry' },
  { id: '9', name: 'Munnar Tea Hills & Eravikulam', category: 'Hill Station', state: 'Kerala', district: 'Idukki', lat: 10.0889, lon: 77.0595, description: 'Emerald rolling tea gardens, mist-capped peaks, and sanctuary for the endangered Nilgiri Tahr.', bestTime: 'Sep - May', famousFor: 'Tea Plantations, Neelakurinji Bloom & Waterfalls', ticketPrice: '₹200 Eravikulam entry' },
];

export const FOOD_SPOTS: FoodSpot[] = [
  { id: 'f1', name: 'Subbayya Gari Hotel', type: 'Local Mess', city: 'Kakinada', lat: 16.9891, lon: 82.2475, specialty: 'Authentic 30-item Andhra Bhojanam on banana leaf with podi, ghee, gutti vankaya & sweets', priceRange: '₹₹', mustTry: 'Butta Bhojanam with Potharekulu & Avakaya' },
  { id: 'f2', name: 'Kotaiah Kaja Sweet Stall', type: 'Street Food', city: 'Kakinada', lat: 16.9530, lon: 82.2380, specialty: 'World-famous authentic hot Kakinada Gottam Kaja (century-old traditional sweet delicacy)', priceRange: '₹', mustTry: 'Hot Gottam Kaja fresh from sugar syrup' },
  { id: 'f3', name: 'Yati Mess & Coastal Seafood', type: 'Biryani & Non-Veg', city: 'Kakinada Coast', lat: 16.9602, lon: 82.2410, specialty: 'Fresh Godavari seafood thali, Royyala vepudu (Prawns fry) and Peethala pulusu (Crab curry)', priceRange: '₹₹', mustTry: 'Prawns Fry & Godavari Fish Pulusu' },
  { id: 'f4', name: 'Paradise & Bawarchi', type: 'Biryani & Non-Veg', city: 'Hyderabad', lat: 17.4399, lon: 78.4983, specialty: 'Authentic Hyderabadi Mutton & Chicken Dum Biryani with mirchi ka salan and raita', priceRange: '₹₹', mustTry: 'Special Mutton Dum Biryani' },
  { id: 'f5', name: 'Vidyarthi Bhavan', type: 'Vegetarian', city: 'Bengaluru', lat: 12.9438, lon: 77.5684, specialty: 'Legendary crispy heritage Masala Dosa served with rich potato sagu and fresh chutney', priceRange: '₹', mustTry: 'Crispy Butter Masala Dosa & Filter Coffee' },
  { id: 'f6', name: 'Murugan Idli Shop', type: 'Vegetarian', city: 'Chennai / Madurai', lat: 13.0418, lon: 80.2341, specialty: 'Pillowy soft steamed idlis served with four signature chutneys, sambar and gunpowder podi', priceRange: '₹', mustTry: 'Podi Ghee Idli & Jigarthanda' },
];

export const STAYS: StayOption[] = [
  { id: 's1', name: 'AP Tourism Haritha Beach Resort', type: 'Resort', location: 'Kakinada Beach Road', pricePerNight: '₹2,200 - ₹3,800', amenities: ['Beachfront View', 'Restaurant', 'Free Parking', 'AC Rooms'], bookingUrl: 'https://tourism.ap.gov.in/' },
  { id: 's2', name: 'Royal Park Hotel Kakinada', type: 'Hotel', location: 'Main Town, Kakinada', pricePerNight: '₹2,800 - ₹4,500', amenities: ['Multi-cuisine Dining', 'Free Wi-Fi', '24/7 Room Service', 'AC'], bookingUrl: 'https://www.makemytrip.com/hotels/' },
  { id: 's3', name: 'Green Coconut Backwater Homestay', type: 'Homestay', location: 'Dindi / Konaseema Delta', pricePerNight: '₹1,800 - ₹2,800', amenities: ['River Backwaters', 'Home Cooked Andhra Food', 'Boat Rides', 'Garden'], bookingUrl: 'https://www.makemytrip.com/homestays/' },
  { id: 's4', name: 'Zostel Backpacker Hostels', type: 'Budget Lodge', location: 'Hampi / Araku / Goa', pricePerNight: '₹799 - ₹1,499', amenities: ['Backpacker Bunks', 'High Speed Wi-Fi', 'Lockers', 'Community Cafe'], bookingUrl: 'https://www.zostel.com/' },
];

export const TRAVEL_PACKAGES: TravelPackage[] = [
  {
    id: 'p1',
    title: 'Konaseema Backwaters & Coastal Temple Tour',
    provider: 'AP Tourism (APTDC)',
    duration: '2 Days / 1 Night',
    price: '₹3,499 per person',
    highlights: ['Dindi River Houseboat Cruise', 'Draksharamam Temple Darshan', 'Uppada Beach Sunset', 'Authentic Godavari Andhra Meals'],
    includes: ['AC Coach Transport', 'AP Tourism Resort Stay', 'All Meals', 'Sightseeing Entry'],
    bookingUrl: 'https://tourism.ap.gov.in/',
  },
  {
    id: 'p2',
    title: 'Araku Valley Hill Safari & Vistadome Train',
    provider: 'IRCTC Tourism',
    duration: '3 Days / 2 Nights',
    price: '₹5,850 per person',
    highlights: ['Vistadome Glass-top Train through 58 tunnels', 'Borra Caves & Katiki Waterfalls', 'Coffee Plantation Walk', 'Dhimsa Tribal Dance'],
    includes: ['Vistadome Train Tickets', 'Hotel Stay', 'Private Cab', 'Breakfast & Dinner'],
    bookingUrl: 'https://www.irctctourism.com/',
  },
  {
    id: 'p3',
    title: 'Tirupati Balaji VIP Darshan & Temple Circuit',
    provider: 'AP Tourism (APTDC)',
    duration: '2 Days / 1 Night',
    price: '₹4,200 per person',
    highlights: ['Confirmed Special Entry Darshan (₹300 ticket included)', 'Tirumala Hill Stay', 'Padmavathi Ammavari Temple', 'Sri Kalahasti Rahu-Ketu Kshetra'],
    includes: ['Volvo AC Coach', 'Haritha Hotel Stay', 'Confirmed Darshan', 'Guide Assistance'],
    bookingUrl: 'https://tourism.ap.gov.in/',
  },
  {
    id: 'p4',
    title: 'Heritage Hampi & Badami Cave Expedition',
    provider: 'MakeMyTrip',
    duration: '3 Days / 2 Nights',
    price: '₹7,999 per person',
    highlights: ['Virupaksha & Vittala Temple Complex', 'Badami Rock-cut Caves', 'Aihole & Pattadakal UNESCO monuments', 'Sunset from Matanga Hill'],
    includes: ['3-Star Resort Stay', 'AC Sedan Transport', 'Monument Guides', 'Daily Breakfast'],
    bookingUrl: 'https://www.makemytrip.com/holidays-india/',
  },
];

export const EVENTS_FESTIVALS: FestivalEvent[] = [
  {
    id: 'fe1',
    name: 'Makar Sankranti & Konaseema Prabhalu',
    month: 'January (13th - 16th)',
    location: 'Konaseema & Godavari Districts (AP)',
    significance: 'Grand harvest celebration with 40-foot decorated bamboo arches (Prabhalu) carried across paddy fields, Haridasu singing, and Rangoli.',
    tips: 'Best witnessed in Jaggannapeta and Kakinada rural areas. Reserve stays 3 weeks ahead.',
  },
  {
    id: 'fe2',
    name: 'Sirimanotsavam & Vizianagaram Jathara',
    month: 'October',
    location: 'Vizianagaram (Near Vizag)',
    significance: 'Historic devotional chariot festival honoring Goddess Pydithalli Ammavaru with a 60-foot swaying neem tree pole procession.',
    tips: 'Over 2 lakh devotees attend. Combine with a visit to Vizianagaram Fort.',
  },
  {
    id: 'fe3',
    name: 'Godavari Pushkaram & River Aarti',
    month: 'July (Periodic / Annual Maha Aartis)',
    location: 'Rajahmundry Pushkar Ghat (60 km from Kakinada)',
    significance: 'Grand river festival worshipping holy River Godavari with daily evening musical Maha Aartis on scenic bathing ghats.',
    tips: 'Evening river breeze at Kotilingala Ghat is spectacular. Try local pootharekulu sweets.',
  },
  {
    id: 'fe4',
    name: 'Hampi Utsav Cultural Extravaganza',
    month: 'November',
    location: 'Hampi Ruins, Karnataka',
    significance: 'Three-day mega festival with illuminated ruins, classical concerts, puppet shows, fireworks, and laser displays.',
    tips: 'Nights get pleasantly cool. Book auto-rickshaws for full-day monument trails.',
  },
  {
    id: 'fe5',
    name: 'Mysuru Dasara & Royal Palace Lights',
    month: 'October / Navratri',
    location: 'Mysuru Palace, Karnataka',
    significance: '10-day state festival concluding with the grand Jumboo Savari elephant procession carrying the golden idol of Goddess Chamundeshwari.',
    tips: 'Palace illuminated with 100,000 bulbs is mesmerizing between 7:00 PM and 9:00 PM.',
  },
];

export const SOUVENIR_ITEMS: SouvenirItem[] = [
  {
    id: 'sv1',
    item: 'Uppada Jamdani Handloom Silk Saree',
    region: 'Uppada (Kakinada)',
    category: 'Handloom Silk',
    whereToBuy: 'Uppada Village Master Weavers Cooperative & Lepakshi Emporium',
    estimatedPrice: '₹3,500 - ₹25,000',
    buyingTip: 'Look for the official Silk Mark tag. Authentic Jamdani has intricate gold zari woven seamlessly into fine cotton-silk.',
  },
  {
    id: 'sv2',
    item: 'Kondapalli Traditional Wooden Toys',
    region: 'Kondapalli / Krishna District (AP)',
    category: 'Handicrafts & Toys',
    whereToBuy: 'Kondapalli artisan street & Lepakshi Government Showrooms',
    estimatedPrice: '₹250 - ₹2,500',
    buyingTip: 'Carved from soft Tella Poniki wood and painted with natural vegetable dyes. The Ambari Elephant and village figures are classics.',
  },
  {
    id: 'sv3',
    item: 'Atreyapuram Sugar & Jaggery Pootharekulu',
    region: 'Atreyapuram (Konaseema)',
    category: 'Spices & Food',
    whereToBuy: 'Atreyapuram village sweet makers & sweet shops across Godavari',
    estimatedPrice: '₹200 - ₹600 per box',
    buyingTip: 'Known as "paper sweet", made of paper-thin rice starch wrappers filled with powdered dry fruits, ghee, and pure jaggery.',
  },
  {
    id: 'sv4',
    item: 'Hyderabadi Natural Freshwater Pearls',
    region: 'Laad Bazaar / Charminar (Hyderabad)',
    category: 'Jewellery & Pearls',
    whereToBuy: 'Government-certified pearl jewelers around Pathergatti and Basheerbagh',
    estimatedPrice: '₹1,200 - ₹15,000',
    buyingTip: 'Rub two pearls gently against each other—authentic pearls produce fine chalky powder, while synthetic plastic pearls slip smoothly.',
  },
  {
    id: 'sv5',
    item: 'Araku Valley Organic Coffee Beans & Pepper',
    region: 'Araku Tribal Co-operatives',
    category: 'Spices & Food',
    whereToBuy: 'Araku Coffee Museum and GCC (Girijan Cooperative Corporation) stores',
    estimatedPrice: '₹280 - ₹550 per 250g',
    buyingTip: 'Single-origin Arabica coffee grown in shade by local indigenous tribal farmers. Excellent chocolatey and nutty aroma.',
  },
];

export const LOCAL_PHRASES: LocalPhrase[] = [
  {
    id: 'lp1',
    category: 'Driver & Cab',
    english: 'How much to go to [Destination]?',
    telugu: 'Ikkada nundi [place] ki entha theesukuntaaru?',
    teluguScript: 'ఇక్కడి నుంచి [స్థలం]కి ఎంత తీసుకుంటారు?',
    hindi: 'Yahan se [Jagah] ka kitna loge?',
  },
  {
    id: 'lp2',
    category: 'Driver & Cab',
    english: 'Please turn on the meter.',
    telugu: 'Meter veyandi please.',
    teluguScript: 'దయచేసి మీటర్ వేయండి.',
    hindi: 'Meter chalu kijiye please.',
  },
  {
    id: 'lp3',
    category: 'Driver & Cab',
    english: 'Please stop here.',
    telugu: 'Ikkada aapandi please.',
    teluguScript: 'ఇక్కడ ఆపండి ప్లీజ్.',
    hindi: 'Yahan rokiye please.',
  },
  {
    id: 'lp4',
    category: 'Restaurant & Food',
    english: 'Is this purely vegetarian?',
    telugu: 'Idi pure vegetarian-aa?',
    teluguScript: 'ఇది ప్యూర్ వెజిటేరియనా?',
    hindi: 'Yeh shuddh shakahari hai kya?',
  },
  {
    id: 'lp5',
    category: 'Restaurant & Food',
    english: 'Make it less spicy please.',
    telugu: 'Kaaram thakkuva veyandi please.',
    teluguScript: 'కారం కొంచెం తక్కువ వేయండి.',
    hindi: 'Mirchi kam daaliye please.',
  },
  {
    id: 'lp6',
    category: 'Restaurant & Food',
    english: 'Please give me the bill.',
    telugu: 'Bill ivvandi please.',
    teluguScript: 'బిల్ ఇవ్వండి ప్లీజ్.',
    hindi: 'Bill de dijiye please.',
  },
  {
    id: 'lp7',
    category: 'Shopping & Bargaining',
    english: 'How much does this cost?',
    telugu: 'Deeni vela / khareedu entha?',
    teluguScript: 'దీని ఖరీదు ఎంత?',
    hindi: 'Iska daam kya hai?',
  },
  {
    id: 'lp8',
    category: 'Shopping & Bargaining',
    english: 'Can you give a little discount?',
    telugu: 'Konchem thagginchi ivvandi.',
    teluguScript: 'కొంచెం తగ్గించి ఇవ్వండి.',
    hindi: 'Thoda kam kijiye na.',
  },
  {
    id: 'lp9',
    category: 'Shopping & Bargaining',
    english: 'Do you accept UPI / PhonePe / GPay?',
    telugu: 'PhonePe leda GPay undaa?',
    teluguScript: 'ఫోన్‌పే లేదా గూగుల్‌పే ఉందా?',
    hindi: 'Online / PhonePe / GPay chalega?',
  },
  {
    id: 'lp10',
    category: 'Directions & Help',
    english: 'Where is the nearest clean restroom / toilet?',
    telugu: 'Daggarloni washroom / toilet ekkada undi?',
    teluguScript: 'దగ్గర్లో వాష్‌రూమ్ / టాయిలెట్ ఎక్కడ ఉంది?',
    hindi: 'Pass mein saaf bathroom kahan hai?',
  },
  {
    id: 'lp11',
    category: 'Directions & Help',
    english: 'Where is the nearest hospital or medical shop?',
    telugu: 'Daggarloni hospital leda medical shop ekkada?',
    teluguScript: 'దగ్గర్లో హాస్పిటల్ లేదా మందుల షాప్ ఎక్కడ ఉంది?',
    hindi: 'Pass mein hospital ya medical shop kahan hai?',
  },
];

export const SEASONAL_GUIDE: SeasonalGuide[] = [
  {
    season: 'Winter & Pleasant (Peak Travel)',
    months: 'October to February',
    climate: '18°C - 28°C · Cool breeze, low humidity & sunny days',
    bestRegions: ['Coastal Andhra (Kakinada, Vizag, Konaseema)', 'Hampi & Deccan Plateau', 'Kerala Backwaters & Goa', 'Rajasthan Deserts & Heritage'],
    travelTip: 'Ideal season for boat safaris, temple walks, and beach camping. Always book trains 30-40 days early.',
  },
  {
    season: 'Summer (Hill Retreats)',
    months: 'March to June',
    climate: '32°C - 41°C (Plains) · 16°C - 24°C (Hills)',
    bestRegions: ['Araku Valley (AP)', 'Munnar & Wayanad (Kerala)', 'Ooty & Kodaikanal (Tamil Nadu)', 'Himachal & Kashmir'],
    travelTip: 'Carry light cotton clothing, UV sunglasses, and stay hydrated with fresh tender coconut water.',
  },
  {
    season: 'Monsoon (Green Cascades)',
    months: 'July to September',
    climate: '24°C - 30°C · Lush greenery, full waterfalls & swelling rivers',
    bestRegions: ['Papikondalu Godavari Gorges', 'Western Ghats Waterfalls', 'Malshej Ghat & Coorg', 'Valley of Flowers'],
    travelTip: 'Check local weather radar and cyclone alerts before open-sea boat rides.',
  },
];

export const PUBLIC_UTILITIES: PublicUtility[] = [
  {
    id: 'u1',
    name: 'Swachh Bharat Clean Public Restroom',
    category: 'toilets',
    address: 'Near Beach Road Promenade',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    facilities: ['Western & Indian Toilets', 'Water Available', 'Handwash Station', 'Wheelchair Ramp'],
    rating: '4.4 ★',
  },
  {
    id: 'u2',
    name: 'Railway Station Executive Lounge & Restrooms',
    category: 'toilets',
    address: 'Kakinada Town Railway Station (Platform 1)',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    facilities: ['Clean Restrooms', 'Shower Available', 'Air Conditioned', 'Charging Points'],
    rating: '4.6 ★',
  },
  {
    id: 'u3',
    name: 'Indian Oil & Tata Power EV Fast Charging Station',
    category: 'petrol',
    address: 'Bhanugudi Junction / Main Road',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    facilities: ['Petrol & Diesel', '60kW EV Fast Charger', 'Free Air & Water', 'Clean Washroom'],
    rating: '4.5 ★',
  },
  {
    id: 'u4',
    name: 'HPCL Auto LPG & Fuel Station',
    category: 'petrol',
    address: 'Port Road Near Old Bus Stand',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    facilities: ['Petrol', 'Diesel', 'Air Pressure Gauge', 'Digital Payments'],
    rating: '4.3 ★',
  },
  {
    id: 'u5',
    name: 'Government General Hospital (GGH) - Trauma & Emergency',
    category: 'hospitals',
    address: 'Rangampeta, Medical College Road',
    city: 'Kakinada',
    timings: 'Open 24 Hours (Emergency)',
    phone: '0884-2362244',
    facilities: ['24/7 Trauma Care', 'Blood Bank', 'Free Emergency Services', 'Ambulance On-Call'],
    rating: '4.2 ★',
  },
  {
    id: 'u6',
    name: 'Apollo 24/7 Pharmacy & First Aid Clinic',
    category: 'hospitals',
    address: 'Cinema Road, Near RTC Complex',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    phone: '1860-500-0101',
    facilities: ['24/7 Medicines', 'First Aid Dressing', 'Baby Care Essentials', 'Doctor Consultation'],
    rating: '4.7 ★',
  },
  {
    id: 'u7',
    name: 'Municipal RO Purified Drinking Water ATM',
    category: 'water',
    address: 'Gandhi Nagar Central Park & Market',
    city: 'Kakinada',
    timings: '6:00 AM - 10:00 PM',
    facilities: ['Chilled RO Water', '₹1 per Liter', 'Contactless Coin / UPI Dispenser'],
    rating: '4.5 ★',
  },
  {
    id: 'u8',
    name: 'State Bank of India (SBI) 24/7 ATM & CDM',
    category: 'atm',
    address: 'Main Road Branch, Near Town Hall',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    facilities: ['Cash Withdrawal', 'Cash Deposit (CDM)', 'Passbook Printing', 'Security Guard'],
    rating: '4.4 ★',
  },
  {
    id: 'u9',
    name: 'One Town Police Station & Tourist Assistance',
    category: 'police',
    address: 'Main Bazaar Road',
    city: 'Kakinada',
    timings: 'Open 24 Hours',
    phone: '0884-2373333',
    facilities: ['24/7 Tourist Assistance', 'Lost & Found Reporting', 'Emergency Police Patrol'],
    rating: '4.3 ★',
  },
];

export const EMERGENCY_CONTACTS = [
  { label: 'National Emergency Helpline', number: '112', desc: 'All-in-one helpline for police, fire, and medical aid' },
  { label: 'Police Control Room', number: '100', desc: 'Immediate police response' },
  { label: 'Ambulance & Medical Emergency', number: '108', desc: 'Government emergency ambulance service' },
  { label: 'Women Helpline', number: '1091', desc: '24/7 dedicated support for women' },
  { label: 'Railway Security & Assistance', number: '139', desc: 'On-train security, medical, and complaints' },
  { label: 'Tourist Police Helpline', number: '1363', desc: 'Multilingual tourist advisory & safety' },
];
