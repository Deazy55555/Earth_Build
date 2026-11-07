// Builds src/data/facts.json from open data. Run: node scripts/build-facts.mjs
//
// Sources (copies kept in scripts/sources/):
//  - World Bank population (via github.com/datasets/population, data/population.csv)
//  - Natural Earth 1:50m populated places (github.com/nvkelso/natural-earth-vector)
//  - world-countries npm package (capitals, languages, regions, borders, area)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const countries = require('world-countries');
const topo = require('world-atlas/countries-50m.json');

const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// --- population: latest year per ISO3 code
const pop = new Map();
for (const line of readFileSync('scripts/sources/population.csv', 'utf8').split('\n').slice(1)) {
  const m = line.match(/^(?:"[^"]*"|[^,]*),([A-Z]{3}),(\d{4}),(\d+)/);
  if (!m) continue;
  const [, code, year, value] = m;
  const prev = pop.get(code);
  if (!prev || +year > prev.year) pop.set(code, { year: +year, value: +value });
}

// --- capital coordinates from Natural Earth
const places = JSON.parse(readFileSync('scripts/sources/ne_50m_populated_places_simple.geojson', 'utf8'))
  .features.map((f) => f.properties);
function capitalCoords(c, capName) {
  const want = norm(capName);
  const sameCountry = places.filter((p) => p.iso_a2 === c.cca2 || p.adm0_a3 === c.cca3);
  const byName = (list) =>
    list.find((p) => norm(p.name) === want || norm(p.nameascii ?? '') === want || norm(p.namealt ?? '').includes(want));
  const hit =
    byName(sameCountry) ??
    byName(places.filter((p) => p.adm0cap === 1)) ??
    sameCountry.find((p) => p.adm0cap === 1 && !p.capalt);
  return hit ? { lat: +hit.latitude.toFixed(3), lon: +hit.longitude.toFixed(3), matched: hit.name } : null;
}

// Kid-friendly continents
function continent(c) {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'South America' : 'North America';
  if (c.region === 'Oceania') return c.cca2 === 'AU' ? 'Australia' : 'Oceania';
  if (c.region === 'Antarctic') return 'Antarctica';
  return c.region; // Africa, Asia, Europe
}

const CAPITAL_FIXES = {
  US: 'Washington, D.C.',
  ZA: 'Pretoria', // has three capitals; Pretoria is where the president works
  BO: 'Sucre',
  NL: 'Amsterdam',
  MY: 'Kuala Lumpur',
};

// World Bank uses its own code for Kosovo and has no row for Taiwan.
const WB_CODE = { UNK: 'XKX' };
// Taiwan: Ministry of the Interior, rounded. Vatican City: about 800 residents.
const POP_FIX = { TW: { year: 2024, value: 23_400_000 }, VA: { year: 2023, value: 800 } };
for (const [cca3, wb] of Object.entries(WB_CODE)) if (pop.has(wb)) pop.set(cca3, pop.get(wb));
pop.set('TWN', POP_FIX.TW);

const ranked = countries.filter((c) => c.independent);
const popRank = new Map(
  ranked
    .filter((c) => pop.has(c.cca3))
    .sort((a, b) => pop.get(b.cca3).value - pop.get(a.cca3).value)
    .map((c, i) => [c.cca3, i + 1]),
);
const areaRank = new Map([...ranked].sort((a, b) => b.area - a.area).map((c, i) => [c.cca3, i + 1]));

const out = {};
const missing = [];
for (const g of topo.objects.countries.geometries) {
  const name = g.properties.name;
  const c = g.id ? countries.find((x) => x.ccn3 === g.id) : countries.find((x) => x.name.common === name);
  if (!c) {
    missing.push(`${g.id}:${name}`);
    continue;
  }
  const capName = CAPITAL_FIXES[c.cca2] ?? c.capital?.[0];
  const coords = capName ? capitalCoords(c, capName) : null;
  if (capName && !coords) missing.push(`capital ${capName} (${c.cca2})`);
  const p = pop.get(WB_CODE[c.cca3] ?? c.cca3) ?? POP_FIX[c.cca2];
  out[g.id ?? name] = {
    cca2: c.cca2,
    independent: !!c.independent,
    capital: capName && coords ? { name: capName, lat: coords.lat, lon: coords.lon } : null,
    continent: continent(c),
    subregion: c.subregion,
    languages: Object.values(c.languages ?? {}),
    population: p?.value ?? null,
    popYear: p?.year ?? null,
    area: Math.round(c.area),
    landlocked: !!c.landlocked,
    borders: (c.borders ?? []).length,
    popRank: popRank.get(c.cca3) ?? null,
    areaRank: areaRank.get(c.cca3) ?? null,
  };
}

writeFileSync('src/data/facts.json', JSON.stringify(out));
console.log(`wrote ${Object.keys(out).length} countries`);
console.log('unmatched:', missing.join(' | ') || 'none');
