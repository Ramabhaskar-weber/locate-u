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
  { id: 'f1', name: 'Subbayya Gari Hotel', type: 'Local Mess', city: 'Kakinada & AP', specialty: 'Authentic 30-item Andhra Bhojanam served on banana leaf with podi, ghee & sweets', priceRange: '₹₹' },
  { id: 'f2', name: 'Kotaiah Kaja Sweet Stall', type: 'Street Food', city: 'Kakinada', specialty: 'World-famous Kakinada Gottam Kaja (hot, juicy traditional sweet delicacy)', priceRange: '₹' },
  { id: 'f3', name: 'Paradise & Bawarchi', type: 'Biryani & Non-Veg', city: 'Hyderabad', specialty: 'Hyderabadi Dum Biryani with mirchi ka salan and dahi chutney', priceRange: '₹₹' },
  { id: 'f4', name: 'Vidyarthi Bhavan', type: 'Vegetarian', city: 'Bengaluru', specialty: 'Crispy heritage Masala Dosa with rich potato filling and chutney', priceRange: '₹' },
  { id: 'f5', name: 'Murugan Idli Shop', type: 'Vegetarian', city: 'Chennai / Madurai', specialty: 'Soft steamed idlis served with four signature chutneys and spicy podi', priceRange: '₹' },
];

export const STAYS: StayOption[] = [
  { id: 's1', name: 'AP Tourism Haritha Beach Resort', type: 'Resort', location: 'Kakinada / Coastal AP', pricePerNight: '₹2,200 - ₹3,800', amenities: ['Beachfront View', 'Restaurant', 'Free Parking', 'AC'], bookingUrl: 'https://tourism.ap.gov.in/' },
  { id: 's2', name: 'Green Coconut Homestay', type: 'Homestay', location: 'Konaseema Delta', pricePerNight: '₹1,800 - ₹2,500', amenities: ['River Backwaters', 'Home Cooked Food', 'Garden', 'Wi-Fi'], bookingUrl: 'https://www.makemytrip.com/homestays/' },
  { id: 's3', name: 'Zostel Backpacker Hostel', type: 'Budget Lodge', location: 'Popular Tourist Cities', pricePerNight: '₹799 - ₹1,499', amenities: ['Common Room', 'High Speed Wi-Fi', 'Lockers', 'Cafe'], bookingUrl: 'https://www.zostel.com/' },
  { id: 's4', name: 'ITC Grand & Heritage Palace Hotels', type: 'Hotel', location: 'Hyderabad / Bengaluru / Delhi', pricePerNight: '₹6,500 - ₹12,000', amenities: ['Luxury Spa', 'Swimming Pool', 'Fine Dining', 'Gym'], bookingUrl: 'https://www.booking.com/' },
];

export const EMERGENCY_CONTACTS = [
  { label: 'National Emergency Helpline', number: '112', desc: 'All-in-one helpline for police, fire, and medical aid' },
  { label: 'Police Control Room', number: '100', desc: 'Immediate police response' },
  { label: 'Ambulance & Medical Emergency', number: '108', desc: 'Government emergency ambulance service' },
  { label: 'Women Helpline', number: '1091', desc: '24/7 dedicated support for women' },
  { label: 'Railway Security & Assistance', number: '139', desc: 'On-train security, medical, and complaints' },
  { label: 'Tourist Police Helpline', number: '1363', desc: 'Multilingual tourist advisory & safety' },
];
