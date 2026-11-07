import { feature, neighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { geoBounds, geoCentroid, geoContains, geoArea } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import countries from 'i18n-iso-countries';
import worldData from 'world-atlas/countries-50m.json';
import { COUNTRY_COLORS } from './palette';

export interface Country {
  /** 1-based index, also written into the picking/highlight texture */
  index: number;
  name: string;
  flag: string;
  color: string;
  feature: Feature<Geometry>;
  centroid: [number, number]; // [lon, lat]
  bounds: [[number, number], [number, number]];
  /** spherical area in steradians — used to pick a nice zoom distance */
  area: number;
}

/** Kid-friendly names for the abbreviated ones in Natural Earth. */
const NAME_FIXES: Record<string, string> = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Central African Rep.': 'Central African Republic',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  'N. Cyprus': 'Northern Cyprus',
  'Marshall Is.': 'Marshall Islands',
  'N. Mariana Is.': 'Northern Mariana Islands',
  'U.S. Virgin Is.': 'U.S. Virgin Islands',
  'British Virgin Is.': 'British Virgin Islands',
  'S. Geo. and the Is.': 'South Georgia',
  'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
  'Indian Ocean Ter.': 'Australian Indian Ocean Territories',
  'Pitcairn Is.': 'Pitcairn Islands',
  'Falkland Is.': 'Falkland Islands',
  'Cayman Is.': 'Cayman Islands',
  'Turks and Caicos Is.': 'Turks and Caicos Islands',
  'Solomon Is.': 'Solomon Islands',
  'St. Vin. and Gren.': 'Saint Vincent and the Grenadines',
  'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'Cook Is.': 'Cook Islands',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon',
  'Wallis and Futuna Is.': 'Wallis and Futuna',
  'Fr. Polynesia': 'French Polynesia',
  'Fr. S. Antarctic Lands': 'French Southern Lands',
  'Faeroe Is.': 'Faroe Islands',
  'Heard I. and McDonald Is.': 'Heard and McDonald Islands',
  'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands',
  'Antigua and Barb.': 'Antigua and Barbuda',
  'eSwatini': 'Eswatini',
  "Côte d'Ivoire": "Côte d'Ivoire (Ivory Coast)",
};

const EXTRA_FLAGS: Record<string, string> = { Kosovo: 'XK' };

function flagEmoji(alpha2?: string): string {
  if (!alpha2 || alpha2.length !== 2) return '🌍';
  return String.fromCodePoint(...[...alpha2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** The biggest piece of a country (so France centres on France, not between it and French Guiana). */
function mainland(f: Feature<Geometry>): Feature<Geometry> {
  if (f.geometry.type !== 'MultiPolygon') return f;
  let best: Feature<Geometry> = f;
  let bestArea = -1;
  for (const coords of f.geometry.coordinates) {
    const part: Feature<Geometry> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } };
    const a = geoArea(part);
    if (a > bestArea && a < 2 * Math.PI) {
      bestArea = a;
      best = part;
    }
  }
  return best;
}

let cache: Country[] | null = null;

export function loadCountries(): Country[] {
  if (cache) return cache;
  const topo = worldData as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const geoms = topo.objects.countries.geometries;
  const fc = feature(topo, topo.objects.countries);
  const adj = neighbors(geoms as never);

  // Greedy colouring so neighbouring countries never share a colour.
  const colorIdx: number[] = new Array(geoms.length).fill(-1);
  const order = geoms.map((_, i) => i).sort((a, b) => adj[b].length - adj[a].length);
  for (const i of order) {
    const used = new Set(adj[i].map((j) => colorIdx[j]));
    let c = (i * 7) % COUNTRY_COLORS.length; // vary start so islands aren't all one colour
    for (let k = 0; k < COUNTRY_COLORS.length && used.has(c); k++) c = (c + 1) % COUNTRY_COLORS.length;
    colorIdx[i] = c;
  }

  cache = fc.features.map((f, i) => {
    const raw = (f.properties as { name: string }).name;
    const id = geoms[i].id as string | undefined;
    const alpha2 = id ? countries.numericToAlpha2(id) : EXTRA_FLAGS[raw];
    const main = mainland(f as Feature<Geometry>);
    const c = geoCentroid(main) as [number, number];
    return {
      index: i + 1,
      name: NAME_FIXES[raw] ?? raw,
      flag: flagEmoji(alpha2),
      color: COUNTRY_COLORS[colorIdx[i]],
      feature: f as Feature<Geometry>,
      centroid: c,
      bounds: geoBounds(f) as [[number, number], [number, number]],
      area: geoArea(main),
    };
  });
  return cache;
}

function inBounds(c: Country, lon: number, lat: number): boolean {
  const [[x0, y0], [x1, y1]] = c.bounds;
  if (lat < y0 - 0.5 || lat > y1 + 0.5) return false;
  if (x0 <= x1) return lon >= x0 - 0.5 && lon <= x1 + 0.5;
  return lon >= x0 - 0.5 || lon <= x1 + 0.5; // crosses the date line
}

/** Which country is at this spot? Uses true spherical point-in-polygon. */
export function countryAt(lon: number, lat: number): Country | null {
  for (const c of loadCountries()) {
    if (inBounds(c, lon, lat) && geoContains(c.feature, [lon, lat])) return c;
  }
  return null;
}
