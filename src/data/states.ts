/**
 * The 50 US states: shapes (US Census, via us-atlas), capitals and kid facts.
 */
import { feature, neighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { geoBounds, geoContains, geoArea } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import statesData from 'us-atlas/states-10m.json';
import { mainland, labelPoint } from './countries';
import { COUNTRY_COLORS } from './palette';

export interface StateInfo {
  abbr: string;
  name: string;
  emoji: string;
  capital: string;
  /** capital city [lat, lon] */
  at: [number, number];
  nickname: string;
  bird: string;
  fact: string;
}

/** By FIPS code. */
const INFO: Record<string, StateInfo> = {
  '01': { abbr: 'AL', name: 'Alabama', emoji: '🚀', capital: 'Montgomery', at: [32.377, -86.3], nickname: 'the Yellowhammer State', bird: 'Yellowhammer', fact: 'The giant rockets that took astronauts to the Moon were designed in Huntsville, Alabama.' },
  '02': { abbr: 'AK', name: 'Alaska', emoji: '🐻', capital: 'Juneau', at: [58.302, -134.42], nickname: 'the Last Frontier', bird: 'Willow ptarmigan', fact: "Alaska is the biggest state — more than twice as big as Texas! There are no roads to its capital, so you get there by boat or plane." },
  '04': { abbr: 'AZ', name: 'Arizona', emoji: '🌵', capital: 'Phoenix', at: [33.448, -112.074], nickname: 'the Grand Canyon State', bird: 'Cactus wren', fact: 'The Grand Canyon is in Arizona. It is about one mile deep!' },
  '05': { abbr: 'AR', name: 'Arkansas', emoji: '💎', capital: 'Little Rock', at: [34.747, -92.29], nickname: 'the Natural State', bird: 'Mockingbird', fact: 'Arkansas has a park where you can dig for real diamonds and keep what you find!' },
  '06': { abbr: 'CA', name: 'California', emoji: '🌴', capital: 'Sacramento', at: [38.576, -121.494], nickname: 'the Golden State', bird: 'California quail', fact: 'More people live in California than in any other state. The tallest trees in the world, the redwoods, grow here.' },
  '08': { abbr: 'CO', name: 'Colorado', emoji: '🏔️', capital: 'Denver', at: [39.739, -104.99], nickname: 'the Centennial State', bird: 'Lark bunting', fact: 'Denver is called the Mile High City because it sits one mile above the sea.' },
  '09': { abbr: 'CT', name: 'Connecticut', emoji: '🚢', capital: 'Hartford', at: [41.764, -72.682], nickname: 'the Constitution State', bird: 'American robin', fact: "The world's first nuclear-powered submarine, the Nautilus, was built in Connecticut." },
  '10': { abbr: 'DE', name: 'Delaware', emoji: '🥇', capital: 'Dover', at: [39.157, -75.52], nickname: 'the First State', bird: 'Blue hen chicken', fact: 'Delaware was the very first state to join the United States!' },
  '12': { abbr: 'FL', name: 'Florida', emoji: '🐊', capital: 'Tallahassee', at: [30.438, -84.281], nickname: 'the Sunshine State', bird: 'Mockingbird', fact: 'Rockets blast off into space from Florida, and alligators live in its swamps!' },
  '13': { abbr: 'GA', name: 'Georgia', emoji: '🍑', capital: 'Atlanta', at: [33.749, -84.388], nickname: 'the Peach State', bird: 'Brown thrasher', fact: 'Georgia grows lots of peaches and peanuts!' },
  '15': { abbr: 'HI', name: 'Hawaii', emoji: '🌋', capital: 'Honolulu', at: [21.307, -157.858], nickname: 'the Aloha State', bird: 'Nene, the Hawaiian goose', fact: 'Hawaii is a chain of islands made by volcanoes, and some of them are still erupting!' },
  '16': { abbr: 'ID', name: 'Idaho', emoji: '🥔', capital: 'Boise', at: [43.615, -116.202], nickname: 'the Gem State', bird: 'Mountain bluebird', fact: 'Idaho grows more potatoes than any other state!' },
  '17': { abbr: 'IL', name: 'Illinois', emoji: '🏙️', capital: 'Springfield', at: [39.798, -89.654], nickname: 'the Prairie State', bird: 'Northern cardinal', fact: "One of the world's first skyscrapers was built in Chicago, Illinois." },
  '18': { abbr: 'IN', name: 'Indiana', emoji: '🏎️', capital: 'Indianapolis', at: [39.768, -86.158], nickname: 'the Hoosier State', bird: 'Northern cardinal', fact: 'Indiana has a famous car race, the Indianapolis 500, where race cars zoom 500 miles!' },
  '19': { abbr: 'IA', name: 'Iowa', emoji: '🌽', capital: 'Des Moines', at: [41.591, -93.604], nickname: 'the Hawkeye State', bird: 'American goldfinch', fact: 'Iowa grows tons of corn and raises more pigs than any other state!' },
  '20': { abbr: 'KS', name: 'Kansas', emoji: '🌾', capital: 'Topeka', at: [39.048, -95.678], nickname: 'the Sunflower State', bird: 'Western meadowlark', fact: 'Kansas is right in the middle of the lower 48 states, and it grows lots of wheat for bread.' },
  '21': { abbr: 'KY', name: 'Kentucky', emoji: '🐎', capital: 'Frankfort', at: [38.187, -84.875], nickname: 'the Bluegrass State', bird: 'Northern cardinal', fact: 'Kentucky has Mammoth Cave, the longest cave system in the world!' },
  '22': { abbr: 'LA', name: 'Louisiana', emoji: '🎺', capital: 'Baton Rouge', at: [30.457, -91.187], nickname: 'the Pelican State', bird: 'Brown pelican', fact: 'The mighty Mississippi River flows into the sea in Louisiana.' },
  '23': { abbr: 'ME', name: 'Maine', emoji: '🦞', capital: 'Augusta', at: [44.307, -69.782], nickname: 'the Pine Tree State', bird: 'Black-capped chickadee', fact: 'Maine catches more lobsters than any other state!' },
  '24': { abbr: 'MD', name: 'Maryland', emoji: '🦀', capital: 'Annapolis', at: [38.979, -76.491], nickname: 'the Old Line State', bird: 'Baltimore oriole', fact: 'Maryland is famous for the blue crabs that live in the Chesapeake Bay.' },
  '25': { abbr: 'MA', name: 'Massachusetts', emoji: '⛵', capital: 'Boston', at: [42.358, -71.064], nickname: 'the Bay State', bird: 'Black-capped chickadee', fact: 'The Pilgrims sailed to Massachusetts on the Mayflower more than 400 years ago.' },
  '26': { abbr: 'MI', name: 'Michigan', emoji: '🧤', capital: 'Lansing', at: [42.733, -84.555], nickname: 'the Great Lakes State', bird: 'American robin', fact: 'Michigan is shaped like a mitten, and it touches four of the five Great Lakes!' },
  '27': { abbr: 'MN', name: 'Minnesota', emoji: '🛶', capital: 'Saint Paul', at: [44.955, -93.102], nickname: 'the Land of 10,000 Lakes', bird: 'Common loon', fact: 'Minnesota has more than 10,000 lakes!' },
  '28': { abbr: 'MS', name: 'Mississippi', emoji: '🌸', capital: 'Jackson', at: [32.303, -90.182], nickname: 'the Magnolia State', bird: 'Mockingbird', fact: 'Mississippi is named after the great Mississippi River, which runs all along its side.' },
  '29': { abbr: 'MO', name: 'Missouri', emoji: '🌉', capital: 'Jefferson City', at: [38.579, -92.173], nickname: 'the Show-Me State', bird: 'Eastern bluebird', fact: 'The Gateway Arch in Saint Louis, Missouri, is the tallest arch in the world!' },
  '30': { abbr: 'MT', name: 'Montana', emoji: '🦖', capital: 'Helena', at: [46.586, -112.018], nickname: 'the Treasure State', bird: 'Western meadowlark', fact: 'The very first T. rex bones ever found were dug up in Montana!' },
  '31': { abbr: 'NE', name: 'Nebraska', emoji: '🍹', capital: 'Lincoln', at: [40.808, -96.7], nickname: 'the Cornhusker State', bird: 'Western meadowlark', fact: 'Kool-Aid was invented in Nebraska!' },
  '32': { abbr: 'NV', name: 'Nevada', emoji: '🏜️', capital: 'Carson City', at: [39.164, -119.766], nickname: 'the Silver State', bird: 'Mountain bluebird', fact: 'Nevada is the driest state, and most of it is desert.' },
  '33': { abbr: 'NH', name: 'New Hampshire', emoji: '💨', capital: 'Concord', at: [43.207, -71.538], nickname: 'the Granite State', bird: 'Purple finch', fact: 'Mount Washington in New Hampshire has some of the strongest winds ever measured!' },
  '34': { abbr: 'NJ', name: 'New Jersey', emoji: '💡', capital: 'Trenton', at: [40.221, -74.756], nickname: 'the Garden State', bird: 'American goldfinch', fact: 'Thomas Edison worked on his famous light bulb in New Jersey.' },
  '35': { abbr: 'NM', name: 'New Mexico', emoji: '🌶️', capital: 'Santa Fe', at: [35.687, -105.938], nickname: 'the Land of Enchantment', bird: 'Roadrunner', fact: 'Santa Fe is the oldest capital city in the United States — more than 400 years old!' },
  '36': { abbr: 'NY', name: 'New York', emoji: '🗽', capital: 'Albany', at: [42.653, -73.757], nickname: 'the Empire State', bird: 'Eastern bluebird', fact: 'The Statue of Liberty stands in New York Harbor, and New York City has more people than any other city in the country.' },
  '37': { abbr: 'NC', name: 'North Carolina', emoji: '✈️', capital: 'Raleigh', at: [35.78, -78.639], nickname: 'the Tar Heel State', bird: 'Northern cardinal', fact: 'The Wright brothers flew the very first airplane in North Carolina in 1903!' },
  '38': { abbr: 'ND', name: 'North Dakota', emoji: '🌻', capital: 'Bismarck', at: [46.821, -100.783], nickname: 'the Peace Garden State', bird: 'Western meadowlark', fact: 'North Dakota grows more sunflowers than any other state!' },
  '39': { abbr: 'OH', name: 'Ohio', emoji: '👨‍🚀', capital: 'Columbus', at: [39.961, -82.999], nickname: 'the Buckeye State', bird: 'Northern cardinal', fact: 'Neil Armstrong, the first person to walk on the Moon, was from Ohio!' },
  '40': { abbr: 'OK', name: 'Oklahoma', emoji: '🌪️', capital: 'Oklahoma City', at: [35.492, -97.503], nickname: 'the Sooner State', bird: 'Scissor-tailed flycatcher', fact: 'Oklahoma gets lots of tornadoes in the spring.' },
  '41': { abbr: 'OR', name: 'Oregon', emoji: '🌲', capital: 'Salem', at: [44.938, -123.03], nickname: 'the Beaver State', bird: 'Western meadowlark', fact: 'Crater Lake in Oregon is the deepest lake in the United States.' },
  '42': { abbr: 'PA', name: 'Pennsylvania', emoji: '🔔', capital: 'Harrisburg', at: [40.264, -76.884], nickname: 'the Keystone State', bird: 'Ruffed grouse', fact: 'The Liberty Bell is in Philadelphia. And the town of Hershey is famous for chocolate!' },
  '44': { abbr: 'RI', name: 'Rhode Island', emoji: '⚓', capital: 'Providence', at: [41.831, -71.415], nickname: 'the Ocean State', bird: 'Rhode Island Red chicken', fact: 'Rhode Island is the smallest state!' },
  '45': { abbr: 'SC', name: 'South Carolina', emoji: '🐢', capital: 'Columbia', at: [34.0, -81.033], nickname: 'the Palmetto State', bird: 'Carolina wren', fact: 'Sea turtles crawl up onto the sandy beaches of South Carolina to lay their eggs.' },
  '46': { abbr: 'SD', name: 'South Dakota', emoji: '🗿', capital: 'Pierre', at: [44.367, -100.346], nickname: 'the Mount Rushmore State', bird: 'Ring-necked pheasant', fact: "Mount Rushmore, with four presidents' faces carved into the mountain, is in South Dakota." },
  '47': { abbr: 'TN', name: 'Tennessee', emoji: '🎸', capital: 'Nashville', at: [36.165, -86.784], nickname: 'the Volunteer State', bird: 'Mockingbird', fact: 'Nashville, Tennessee, is called Music City!' },
  '48': { abbr: 'TX', name: 'Texas', emoji: '🤠', capital: 'Austin', at: [30.274, -97.74], nickname: 'the Lone Star State', bird: 'Mockingbird', fact: 'Texas is the second-biggest state. Astronauts in space talk to Mission Control in Houston, Texas!' },
  '49': { abbr: 'UT', name: 'Utah', emoji: '🐝', capital: 'Salt Lake City', at: [40.777, -111.888], nickname: 'the Beehive State', bird: 'California gull', fact: 'The Great Salt Lake in Utah is so salty that you float really easily!' },
  '50': { abbr: 'VT', name: 'Vermont', emoji: '🍁', capital: 'Montpelier', at: [44.26, -72.576], nickname: 'the Green Mountain State', bird: 'Hermit thrush', fact: 'Vermont makes more maple syrup than any other state!' },
  '51': { abbr: 'VA', name: 'Virginia', emoji: '🎩', capital: 'Richmond', at: [37.539, -77.434], nickname: 'the Old Dominion', bird: 'Northern cardinal', fact: 'Eight presidents were born in Virginia — more than in any other state!' },
  '53': { abbr: 'WA', name: 'Washington', emoji: '🍎', capital: 'Olympia', at: [47.035, -122.905], nickname: 'the Evergreen State', bird: 'American goldfinch', fact: 'Washington is the only state named after a president, George Washington. It grows more apples than any other state!' },
  '54': { abbr: 'WV', name: 'West Virginia', emoji: '⛰️', capital: 'Charleston', at: [38.336, -81.612], nickname: 'the Mountain State', bird: 'Northern cardinal', fact: 'West Virginia is almost all mountains!' },
  '55': { abbr: 'WI', name: 'Wisconsin', emoji: '🧀', capital: 'Madison', at: [43.075, -89.384], nickname: 'the Badger State', bird: 'American robin', fact: 'Wisconsin makes more cheese than any other state!' },
  '56': { abbr: 'WY', name: 'Wyoming', emoji: '🦬', capital: 'Cheyenne', at: [41.14, -104.82], nickname: 'the Equality State', bird: 'Western meadowlark', fact: 'Yellowstone, the first national park in the world, is mostly in Wyoming. Its geysers shoot hot water high into the air!' },
};

/** Same toy colours as the countries (neighbouring states never match). */
const STATE_COLORS = COUNTRY_COLORS;

export interface UsState extends StateInfo {
  /** 1..50, also written into the picking texture (green channel) */
  index: number;
  fips: string;
  color: string;
  feature: Feature<Geometry>;
  /** where to write the name [lon, lat] */
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
  area: number;
}

let cache: UsState[] | null = null;
let topoCache: Topology<{ states: GeometryCollection<{ name: string }> }> | null = null;

export function statesTopology() {
  if (!topoCache) {
    const t = statesData as unknown as Topology<{ states: GeometryCollection<{ name: string }> }>;
    // just the 50 states (no Washington DC or the territories)
    topoCache = { ...t, objects: { states: { ...t.objects.states, geometries: t.objects.states.geometries.filter((g) => INFO[g.id as string]) } } } as typeof t;
  }
  return topoCache;
}

/** Hand-placed name spots where the middle of the shape isn't a good place. */
const LABEL_AT: Record<string, [number, number]> = {
  FL: [-81.6, 28.3],
  MI: [-84.7, 43.6],
  LA: [-92.4, 31.0],
  MD: [-76.8, 39.4],
  HI: [-155.5, 19.7],
  AK: [-152, 64.5],
};

export function loadStates(): UsState[] {
  if (cache) return cache;
  const topo = statesTopology();
  const geoms = topo.objects.states.geometries;
  const fc = feature(topo, topo.objects.states);
  const adj = neighbors(geoms as never);
  const colorIdx: number[] = new Array(geoms.length).fill(-1);
  const order = geoms.map((_, i) => i).sort((a, b) => adj[b].length - adj[a].length);
  for (const i of order) {
    const used = new Set(adj[i].map((j) => colorIdx[j]));
    let c = (i * 3) % STATE_COLORS.length;
    for (let k = 0; k < STATE_COLORS.length && used.has(c); k++) c = (c + 1) % STATE_COLORS.length;
    colorIdx[i] = c;
  }
  cache = fc.features
    .map((f, i) => {
      const fips = geoms[i].id as string;
      const info = INFO[fips];
      const main = mainland(f as Feature<Geometry>);
      return {
        ...info,
        index: 0,
        fips,
        color: STATE_COLORS[colorIdx[i]],
        feature: f as Feature<Geometry>,
        centroid: LABEL_AT[info.abbr] ?? labelPoint(main),
        bounds: geoBounds(f) as [[number, number], [number, number]],
        area: geoArea(main),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s, i) => ({ ...s, index: i + 1 }));
  return cache;
}

function inBounds(s: UsState, lon: number, lat: number, pad = 0.2): boolean {
  const [[x0, y0], [x1, y1]] = s.bounds;
  if (lat < y0 - pad || lat > y1 + pad) return false;
  if (x0 <= x1) return lon >= x0 - pad && lon <= x1 + pad;
  return lon >= x0 - pad || lon <= x1 + pad; // Alaska crosses the date line
}

/** Which state is at this spot? */
export function stateAt(lon: number, lat: number): UsState | null {
  for (const s of loadStates()) if (inBounds(s, lon, lat) && geoContains(s.feature, [lon, lat])) return s;
  return null;
}

/** Is this state within `deg` degrees of the spot? (forgiving taps on tiny states) */
export function stateNear(s: UsState, lon: number, lat: number, deg: number): boolean {
  if (!inBounds(s, lon, lat, deg + 0.2)) return false;
  if (geoContains(s.feature, [lon, lat])) return true;
  const k = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  for (const r of [deg * 0.5, deg])
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2;
      if (geoContains(s.feature, [lon + (Math.cos(t) * r) / k, lat + Math.sin(t) * r])) return true;
    }
  return false;
}

/** US country id in world-atlas. */
export const USA_ID = '840';
