/**
 * Real-World Highway Corridors & Location Presets
 * Allows one-click positioning anywhere on earth or instantly locking to live device GPS.
 */

export interface RealWorldLocationPreset {
  id: string;
  name: string;
  category: 'gps' | 'india' | 'international';
  badge: string;
  region: string;
  latitude: number;
  longitude: number;
  heading: number; // Highway alignment bearing
  speedLimitKmh: number;
  description: string;
}

export const REAL_WORLD_PRESETS: RealWorldLocationPreset[] = [
  {
    id: 'hyderabad-orr',
    name: 'Hyderabad Outer Ring Road (ORR)',
    category: 'india',
    badge: '🛣️ NH-765D · 8-Lane Expressway',
    region: 'Hyderabad, Telangana, India',
    latitude: 17.4485,
    longitude: 78.3742,
    heading: 45,
    speedLimitKmh: 100,
    description: 'High-speed 158 km ring expressway encircling Hyderabad with smart ITS surveillance.',
  },
  {
    id: 'mumbai-pune-exp',
    name: 'Mumbai–Pune Expressway',
    category: 'india',
    badge: '🛣️ National Expressway 2',
    region: 'Maharashtra, India',
    latitude: 18.75,
    longitude: 73.4,
    heading: 110,
    speedLimitKmh: 100,
    description: "India's first 6-lane access-controlled concrete highway through the Western Ghats.",
  },
  {
    id: 'bengaluru-nice',
    name: 'Bengaluru NICE Road Corridor',
    category: 'india',
    badge: '🛣️ Peripheral Ring Road',
    region: 'Bengaluru, Karnataka, India',
    latitude: 12.89,
    longitude: 77.53,
    heading: 90,
    speedLimitKmh: 80,
    description: 'Arterial tollway connecting Electronic City, Bannerghatta, and Tumakuru highways.',
  },
  {
    id: 'delhi-meerut-exp',
    name: 'Delhi–Meerut Expressway',
    category: 'india',
    badge: '🛣️ National Expressway 3 · 14 Lanes',
    region: 'NCR, Uttar Pradesh, India',
    latitude: 28.69,
    longitude: 77.4,
    heading: 65,
    speedLimitKmh: 120,
    description: "India's widest 14-lane high-speed expressway with dedicated high-speed camera corridors.",
  },
  {
    id: 'us-101-silicon-valley',
    name: 'US-101 Highway (Silicon Valley)',
    category: 'international',
    badge: '🛣️ Bayshore Freeway',
    region: 'Mountain View, California, USA',
    latitude: 37.3861,
    longitude: -122.0839,
    heading: 315,
    speedLimitKmh: 105,
    description: 'Key coastal arterial freeway connecting San Jose, Mountain View, and San Francisco.',
  },
  {
    id: 'german-autobahn-a8',
    name: 'German Autobahn A8',
    category: 'international',
    badge: '🛣️ Bundesautobahn 8',
    region: 'Stuttgart / Ulm, Germany',
    latitude: 48.45,
    longitude: 10.0,
    heading: 85,
    speedLimitKmh: 130,
    description: 'High-speed European trans-highway corridor with electronic variable speed controls.',
  },
];
