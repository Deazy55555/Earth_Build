// Lists every sentence the app can read aloud. Run: npx tsx scripts/collect-sentences.ts > voice/sentences.json
import { loadCountries } from '../src/data/countries';
import { countryCard, capitalCard, waterCard, continentCard, thingCard, vehicleCard } from '../src/data/cards';
import { ROUTES } from '../src/data/routes';
import { WATERS, CONTINENTS } from '../src/data/kid';
import { PLACES } from '../src/data/places';
import { splitSentences, hashSentence } from '../src/voice/sentences';

const cards = [
  ...loadCountries().map(countryCard),
  ...loadCountries().map(capitalCard),
  ...Object.keys(WATERS).map(waterCard),
  ...Object.keys(CONTINENTS).map(continentCard),
  ...PLACES.map(thingCard),
  ...ROUTES.map(vehicleCard),
].filter(Boolean);

const seen = new Map<string, string>();
for (const c of cards) for (const s of [...splitSentences(c!.intro), ...splitSentences(c!.full)]) seen.set(hashSentence(s), s);
const list = [...seen].map(([id, text]) => ({ id, text }));
process.stdout.write(JSON.stringify(list, null, 0));
console.error(`${list.length} sentences, ${list.reduce((a, b) => a + b.text.length, 0)} characters`);
