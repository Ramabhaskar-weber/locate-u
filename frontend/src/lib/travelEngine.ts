export interface TouristPlace {
  id: string;
  name: string;
  category: 'Heritage' | 'Temple' | 'Beach' | 'Nature' | 'Hill Station';
  state: string;
  district: string;
  description: string;
  bestTime: string;
  famousFor: string;
}

export interface FoodSpot {
  id: string;
  name: string;
  type: 'Local Mess' | 'Vegetarian' | 'Biryani & Non-Veg' | 'Street Food' | 'Cafe';
  city: string;
  specialty: string;
  priceRange: '₹' | '₹₹' | '₹₹₹';
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
  { id: '1', name: 'Coringa Wildlife Sanctuary & Mangroves', category: 'Nature', state: 'Andhra Pradesh', district: 'Kakinada', description: 'Second largest mangrove forest in India with scenic boardwalks, boat rides and rare birds.', bestTime: 'Oct - March', famousFor: 'Mangrove Boating & Fishing Cat' },
  { id: '2', name: 'Uppada Beach & Handloom Silk Village', category: 'Beach', state: 'Andhra Pradesh', district: 'Kakinada', description: 'Famous coastal stretch and home to UNESCO-recognized Jamdani Uppada silk sarees.', bestTime: 'Nov - Feb', famousFor: 'Sunrise, Beach Drive & Silk Weaving' },
  { id: '3', name: 'Draksharamam Bheemeswara Temple', category: 'Temple', state: 'Andhra Pradesh', district: 'Konaseema', description: 'Ancient Pancharama Kshetra Shiva temple constructed by Eastern Chalukyas.', bestTime: 'All Year', famousFor: 'Pancharama Temple Architecture' },
  { id: '4', name: 'Charminar & Laad Bazaar', category: 'Heritage', state: 'Telangana', district: 'Hyderabad', description: '16th-century monument and bustling historic market famous for pearls and bangles.', bestTime: 'Oct - March', famousFor: 'Historic Monument & Night Bazaar' },
  { id: '5', name: 'Hampi UNESCO Heritage Complex', category: 'Heritage', state: 'Karnataka', district: 'Vijayanagara', description: 'Magnificent ruins of the Vijayanagara Empire amidst surreal boulder landscapes.', bestTime: 'Nov - Feb', famousFor: 'Stone Chariot & Virupaksha Temple' },
  { id: '6', name: 'Meenakshi Amman Temple', category: 'Temple', state: 'Tamil Nadu', district: 'Madurai', description: 'Historic Hindu temple with 14 towering colorful gopurams.', bestTime: 'Oct - March', famousFor: 'Dravidian Architecture & Sculptures' },
  { id: '7', name: 'Munnar Tea Hills', category: 'Hill Station', state: 'Kerala', district: 'Idukki', description: 'Sprawling green tea plantations, misty valleys and waterfalls.', bestTime: 'Sep - May', famousFor: 'Tea Gardens & Cool Climate' },
  { id: '8', name: 'Konark Sun Temple', category: 'Heritage', state: 'Odisha', district: 'Puri', description: '13th-century chariot-shaped Sun temple with intricately carved stone wheels.', bestTime: 'Nov - Feb', famousFor: 'Stone Wheels & Kalinga Architecture' },
];

export const FOOD_SPOTS: FoodSpot[] = [
  { id: 'f1', name: 'Subbayya Gari Hotel', type: 'Local Mess', city: 'Kakinada', specialty: 'Authentic 30-item Andhra Bhojanam on banana leaf with podi, ghee, gutti vankaya & sweets', priceRange: '₹₹' },
  { id: 'f2', name: 'Kotaiah Kaja Sweet Stall', type: 'Street Food', city: 'Kakinada', specialty: 'World-famous authentic hot Kakinada Gottam Kaja (century-old sweet legacy)', priceRange: '₹' },
  { id: 'f3', name: 'Yati Mess & Seafood', type: 'Biryani & Non-Veg', city: 'Kakinada Coast', specialty: 'Fresh Godavari seafood thali, Royyala vepudu (Prawns fry) and Crab curry', priceRange: '₹₹' },
  { id: 'f4', name: 'Paradise & Bawarchi', type: 'Biryani & Non-Veg', city: 'Hyderabad', specialty: 'Authentic Hyderabadi Mutton & Chicken Dum Biryani with mirchi ka salan', priceRange: '₹₹' },
  { id: 'f5', name: 'Vidyarthi Bhavan', type: 'Vegetarian', city: 'Bengaluru', specialty: 'Crispy heritage Masala Dosa with rich potato filling and coconut chutney', priceRange: '₹' },
  { id: 'f6', name: 'Murugan Idli Shop', type: 'Vegetarian', city: 'Chennai / Madurai', specialty: 'Pillowy soft steamed idlis served with four signature chutneys and spicy podi', priceRange: '₹' },
];

export const STAYS: StayOption[] = [
  { id: 's1', name: 'AP Tourism Haritha Beach Resort', type: 'Resort', location: 'Kakinada Beach Road', pricePerNight: '₹2,200 - ₹3,800', amenities: ['Beachfront View', 'Restaurant', 'Free Parking', 'AC Rooms'], bookingUrl: 'https://tourism.ap.gov.in/' },
  { id: 's2', name: 'Royal Park & Grand Kakinada', type: 'Hotel', location: 'Main Town, Kakinada', pricePerNight: '₹2,800 - ₹4,500', amenities: ['Multi-cuisine Dining', 'Free Wi-Fi', '24/7 Room Service', 'AC'], bookingUrl: 'https://www.makemytrip.com/hotels/' },
  { id: 's3', name: 'Green Coconut Backwater Homestay', type: 'Homestay', location: 'Dindi / Konaseema Delta', pricePerNight: '₹1,800 - ₹2,800', amenities: ['River Backwaters', 'Home Cooked Andhra Food', 'Boat Rides', 'Garden'], bookingUrl: 'https://www.makemytrip.com/homestays/' },
  { id: 's4', name: 'Zostel Backpacker Hostels', type: 'Budget Lodge', location: 'Major Indian Tourist Cities', pricePerNight: '₹799 - ₹1,499', amenities: ['Backpacker Bunks', 'High Speed Wi-Fi', 'Lockers', 'Community Cafe'], bookingUrl: 'https://www.zostel.com/' },
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
