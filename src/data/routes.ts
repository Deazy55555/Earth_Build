/**
 * Planes, ships, trains and balloons that travel real routes.
 * Points are [lat, lon]; segments between points follow the shortest path over the globe.
 */
export type VehicleKind = 'plane' | 'ship' | 'train' | 'balloon' | 'sub';

export interface Route {
  id: string;
  name: string;
  kind: VehicleKind;
  emoji: string;
  model: string;
  /** for trains: the cars that follow the engine */
  cars?: { model: string; count: number };
  pts: [number, number][];
  /** go round and round (true) or there and back (false) */
  loop?: boolean;
  /** degrees of arc per second at normal speed */
  speed: number;
  from: string;
  to: string;
  fact: string;
  /** how to say it in a sentence, if not "a/the <name>" */
  call?: string;
  /** model size (globe units) */
  size?: number;
  /** segment indexes that run through a tunnel (train goes underground) */
  tunnels?: number[];
  /** segment indexes where a ship sails through a canal across the land */
  canals?: number[];
  /** segment indexes where a train crosses water on a bridge */
  bridges?: number[];
}

export const ROUTES: Route[] = [
  // ------------------------------------------------------------- planes
  { id: 'fly-nyc-lon', name: 'Jumbo Jet', kind: 'plane', emoji: '✈️', model: 'jumbo', pts: [[40.64, -73.78], [51.47, -0.45]], speed: 1.4, from: 'New York', to: 'London', fact: 'Planes cross the Atlantic Ocean in about 7 hours, flying about 6 miles high!' },
  { id: 'fly-lax-tyo', name: 'Airliner', kind: 'plane', emoji: '✈️', model: 'airliner', pts: [[33.94, -118.41], [35.55, 139.78]], speed: 1.8, from: 'Los Angeles', to: 'Tokyo', fact: 'This flight crosses the whole Pacific Ocean. It takes about 12 hours!' },
  { id: 'fly-dxb-syd', name: 'Jumbo Jet', kind: 'plane', emoji: '✈️', model: 'jumbo', pts: [[25.25, 55.36], [-33.94, 151.18]], speed: 1.8, from: 'Dubai', to: 'Sydney', fact: 'This is one of the longest flights in the world — about 14 hours without stopping!' },
  { id: 'fly-par-cai', name: 'Airliner', kind: 'plane', emoji: '✈️', model: 'airliner', pts: [[49.01, 2.55], [30.12, 31.41]], speed: 1.2, from: 'Paris', to: 'Cairo', fact: 'A big passenger plane flies at about 550 miles per hour — that is about 8 times faster than a car on the highway!' },
  { id: 'fly-gru-jnb', name: 'Airliner', kind: 'plane', emoji: '✈️', model: 'airliner', pts: [[-23.43, -46.47], [-26.14, 28.25]], speed: 1.5, from: 'São Paulo', to: 'Johannesburg', fact: 'This plane flies all the way across the South Atlantic Ocean, from South America to Africa, in about 10 hours.' },
  { id: 'fly-sin-pek', name: 'Airliner', kind: 'plane', emoji: '✈️', model: 'airliner', pts: [[1.36, 103.99], [40.08, 116.58]], speed: 1.4, from: 'Singapore', to: 'Beijing', fact: 'From Singapore near the equator to Beijing takes about 6 hours by plane.' },
  { id: 'fly-chi-mia', name: 'Airliner', kind: 'plane', emoji: '✈️', model: 'airliner', pts: [[41.98, -87.9], [25.79, -80.29]], speed: 1.0, from: 'Chicago', to: 'Miami', fact: 'Flying from chilly Chicago to sunny Miami takes about 3 hours.' },

  // ------------------------------------------------------------- ships
  {
    id: 'ship-container', name: 'Container Ship', kind: 'ship', emoji: '🚢', model: 'containership', speed: 0.45, size: 0.05, canals: [31],
    from: 'Shanghai, China', to: 'Rotterdam, Netherlands',
    fact: 'This giant ship carries thousands of boxes from China to Europe through the Suez Canal. The trip takes about a month!',
    pts: [[31.0, 122.6], [27.5, 122.0], [24.0, 119.6], [21.5, 117.0], [15.0, 112.5], [8.0, 107.5], [3.2, 105.3], [1.45, 104.7], [1.27, 104.25], [1.2, 103.85], [1.15, 103.55], [1.55, 102.85], [2.2, 101.75], [3.0, 100.8], [5.6, 97.8], [6.2, 93.5], [5.6, 82.0], [5.5, 80.0], [7.5, 76.0], [12.5, 52.0], [12.0, 45.0], [12.45, 43.55], [13.2, 43.0], [15.5, 41.7], [20.0, 38.6], [24.5, 36.1], [27.3, 34.2], [27.62, 34.1], [27.85, 33.6], [28.6, 33.05], [29.3, 32.7], [29.85, 32.57], [31.3, 32.35], [31.75, 32.2], [33.0, 28.0], [35.5, 20.0], [37.2, 11.5], [37.8, 7.5], [37.0, 1.0], [36.0, -5.6], [36.3, -9.5], [38.8, -10.0], [43.5, -10.0], [48.3, -6.0], [49.8, -2.0], [51.0, 1.5], [52.0, 3.9]],
  },
  {
    id: 'ship-cruise', name: 'Cruise Ship', kind: 'ship', emoji: '🛳️', model: 'cruiseship', speed: 0.35, size: 0.05,
    from: 'Miami, USA', to: 'Mexico, the Cayman Islands and Jamaica',
    fact: 'The biggest cruise ships carry more than 6,000 passengers and have pools, water slides and even ice rinks!',
    pts: [[25.75, -80.05], [25.0, -79.95], [24.3, -80.9], [24.3, -81.8], [23.9, -83.8], [22.4, -85.6], [20.5, -86.75], [19.8, -85.5], [19.15, -81.4], [18.7, -78.2]],
  },
  {
    id: 'ship-liner', name: 'Ocean Liner', kind: 'ship', emoji: '🛳️', model: 'liner', speed: 0.45, size: 0.05,
    from: 'Southampton, England', to: 'New York, USA',
    fact: 'Ocean liners sail across the Atlantic from England to New York in about 7 days.',
    pts: [[50.55, -0.9], [50.25, -2.5], [49.8, -5.5], [48.0, -15.0], [45.0, -35.0], [41.5, -55.0], [40.3, -70.0], [40.45, -73.85]],
  },
  {
    id: 'ship-carrier', name: 'Aircraft Carrier', kind: 'ship', emoji: '🛥️', model: 'carrier', speed: 0.25, loop: true, size: 0.05,
    from: 'San Diego, USA', to: 'the Pacific Ocean',
    fact: 'An aircraft carrier is like a floating airport. Planes landing on it are stopped by a strong wire!',
    pts: [[32.55, -117.4], [31.8, -118.6], [32.2, -120.6], [32.6, -119.6], [32.45, -118.2], [32.55, -117.4]],
  },
  {
    id: 'ship-carrier2', name: 'Aircraft Carrier', kind: 'ship', emoji: '🛥️', model: 'carrier', speed: 0.25, loop: true, size: 0.05,
    from: 'Norfolk, Virginia, USA', to: 'the Atlantic Ocean',
    fact: 'Norfolk, Virginia has the biggest navy base in the world, where many aircraft carriers live.',
    pts: [[36.95, -75.8], [36.3, -74.0], [37.4, -72.4], [38.0, -74.2], [36.95, -75.8]],
  },
  {
    id: 'sub-hawaii', name: 'Submarine', kind: 'sub', emoji: '⚓', model: 'submarine', speed: 0.2, loop: true,
    from: 'Pearl Harbor, Hawaii', to: 'the Pacific Ocean',
    fact: 'Submarines fill special tanks with water to sink, then blow the water out to float back up!',
    pts: [[21.05, -158.0], [20.6, -158.8], [21.1, -159.9], [21.7, -159.6], [21.6, -158.5], [21.05, -158.0]],
  },
  {
    id: 'ship-panama', name: 'Canal Ship', kind: 'ship', emoji: '🚢', model: 'containership', speed: 0.12, size: 0.045, canals: [1, 2, 3, 4],
    from: 'the Atlantic Ocean', to: 'the Pacific Ocean, through the Panama Canal',
    fact: 'Ships use the Panama Canal as a shortcut between two oceans. Water locks lift them up and down like giant elevators!',
    pts: [[10.2, -80.0], [9.45, -79.92], [9.27, -79.92], [9.1, -79.68], [8.95, -79.57], [8.85, -79.53], [8.3, -79.4], [7.6, -79.3]],
  },

  // ------------------------------------------------------------- trains
  {
    id: 'train-transsib', name: 'Trans-Siberian Railway', kind: 'train', emoji: '🚂', model: 'loco', cars: { model: 'coach', count: 4 }, speed: 0.35,
    from: 'Moscow', to: 'Vladivostok',
    fact: 'This is the longest railway in the world — about 5,770 miles! The whole trip takes about a week.',
    pts: [[55.75, 37.65], [57.6, 39.9], [58.6, 49.7], [58.0, 56.2], [56.84, 60.6], [57.15, 65.5], [54.98, 73.37], [55.03, 82.92], [56.0, 92.9], [56.1, 101.6], [52.29, 104.3], [51.83, 107.6], [52.03, 113.5], [53.98, 123.9], [50.3, 127.5], [48.48, 135.07], [43.12, 131.9]],
  },
  {
    id: 'train-shinkansen', name: 'Bullet Train', call: 'a bullet train', kind: 'train', emoji: '🚅', model: 'bulletnose', cars: { model: 'bulletcar', count: 2 }, speed: 0.22,
    from: 'Tokyo', to: 'Osaka',
    fact: "Japan's bullet trains are super on time — on average they are late by less than a minute!",
    pts: [[35.68, 139.77], [35.47, 139.62], [35.26, 139.15], [35.1, 139.07], [35.13, 138.91], [35.15, 138.66], [35.13, 138.52], [35.02, 138.45], [34.97, 138.39], [34.7, 137.73], [34.76, 137.38], [35.17, 136.88], [35.32, 136.69], [35.31, 136.29], [34.99, 135.76], [34.73, 135.5]],
  },
  {
    id: 'train-eurostar', name: 'Eurostar', kind: 'train', emoji: '🚄', model: 'eurostarnose', cars: { model: 'eurostarcar', count: 2 }, speed: 0.15, tunnels: [3],
    from: 'London', to: 'Paris',
    fact: 'This train zooms under the sea through the Channel Tunnel, which is about 31 miles long!',
    pts: [[51.53, -0.13], [51.4, 0.4], [51.14, 0.87], [51.09, 1.15], [50.93, 1.81], [50.64, 3.07], [49.85, 2.75], [48.88, 2.36]],
  },
  {
    id: 'train-zephyr', name: 'California Zephyr', kind: 'train', emoji: '🚆', model: 'loco', cars: { model: 'silvercoach', count: 4 }, speed: 0.3, bridges: [16],
    from: 'Chicago', to: 'San Francisco',
    fact: 'This train crosses the Rocky Mountains and the Sierra Nevada on its way to California. The trip takes about 2 days.',
    pts: [[41.88, -87.64], [41.0, -91.0], [40.8, -96.7], [41.25, -95.93], [40.6, -100.0], [40.6, -103.5], [39.76, -104.99], [39.9, -105.8], [39.55, -107.3], [39.1, -108.55], [39.6, -110.8], [40.76, -111.89], [40.8, -115.8], [39.53, -119.81], [39.3, -120.6], [38.58, -121.5], [38.24, -121.95], [38.02, -122.13], [37.84, -122.29]],
  },
  {
    id: 'train-indianpacific', name: 'Indian Pacific', kind: 'train', emoji: '🚆', model: 'loco', cars: { model: 'silvercoach', count: 4 }, speed: 0.3,
    from: 'Sydney', to: 'Perth',
    fact: 'This train crosses all of Australia. On the flat Nullarbor Plain the track runs dead straight for about 297 miles!',
    pts: [[-33.88, 151.2], [-33.7, 150.3], [-33.4, 149.1], [-32.5, 147.0], [-31.95, 141.47], [-33.3, 139.0], [-34.92, 138.6], [-34.2, 138.6], [-33.2, 138.2], [-32.49, 137.77], [-30.7, 134.5], [-30.6, 129.0], [-30.75, 121.47], [-31.6, 117.0], [-31.95, 115.86]],
  },

  // ------------------------------------------------------------- balloons
  {
    id: 'balloon-cappadocia', name: 'Hot Air Balloons', call: 'hot air balloons', kind: 'balloon', emoji: '🎈', model: 'balloon', speed: 0.05, loop: true, size: 0.045,
    from: 'Cappadocia, Turkey', to: 'the sky',
    fact: 'At sunrise, about 100 hot air balloons float over the rocky "fairy chimneys" of Cappadocia!',
    pts: [[38.65, 34.83], [38.75, 35.05], [38.6, 35.25], [38.45, 35.0], [38.65, 34.83]],
  },
];

export const KIND_NAME: Record<VehicleKind, string> = {
  plane: 'Plane',
  ship: 'Ship',
  sub: 'Submarine',
  train: 'Train',
  balloon: 'Balloon',
};
