/**
 * Game content: what to find, quiz questions and every phrase the games say.
 * Kept free of anything browser-only so the voice recorder can list all of it.
 */
import { loadCountries, neighborsOf, countryAt, type Country } from '../data/countries';
import { geoDistance } from 'd3-geo';
import { factsFor, nm, callIt } from '../data/cards';
import { PLACES, type Place } from '../data/places';
import { WATERS, CONTINENTS, WATER_LABELS } from '../data/kid';
import { loadStates, stateAt, stateNeighbors, USA_ID, type UsState } from '../data/states';

// ------------------------------------------------------------- phrases

export const SAY = {
  whereStart: "Let's play Where in the World!",
  quizStart: "Let's do a quiz!",
  hint: "Here's a hint! It's right around here.",
  closer: "You're close! Now look for it up close.",
  hintStart: "Here's a hint!",
  tapHint: 'Tap the light bulb for a hint!',
  next: 'Here comes the next one!',
  newSticker: 'You got a new sticker!',
  newTrophy: 'Wow! You won a trophy!',
  notQuite: 'Not quite!',
  rightOne: "Here's the right one!",
  statesStart: "Let's find all 50 states!",
  statesMore: "Let's find more states!",
  statesAll: 'Wow! You found all 50 states! You are a states superstar!',
  yes: ['Great job!', 'You got it!', 'Awesome!', 'Well done!', 'Super!'],
};
export const sayFind = (call: string) => `Can you find ${call}?`;
export const sayFound = (call: string) => `Yes! You found ${call}!`;
export const sayWrong = (call: string) => `Oops, that's ${call}. Try again!`;
export const sayShow = (call: string) => `Here it is! This is ${call}.`;
export const sayAnswer = (text: string) => `The answer is ${text}${/[.!?]$/.test(text) ? '' : '.'}`;
export const saySoFar = (n: number) => (n === 1 ? 'You found 1 state so far.' : `You found ${n} states so far.`);
export const sayEnd = (stars: number, total: number) =>
  stars === total ? `Amazing! You got all ${total} stars!` : `You got ${stars} out of ${total} stars!`;

// ------------------------------------------------------------- Where in the World?

export type Target =
  | { kind: 'country'; id: string; name: string; emoji: string; call: string; country: Country }
  | { kind: 'water'; id: string; name: string; emoji: string; call: string }
  | { kind: 'continent'; id: string; name: string; emoji: string; call: string }
  | { kind: 'place'; id: string; name: string; emoji: string; call: string; place: Place };

/** Big, well-known countries for little explorers. */
const EASY_COUNTRIES = [
  'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO', 'GB', 'FR', 'ES', 'IT', 'DE', 'RU', 'CN', 'IN', 'JP', 'AU', 'NZ', 'EG',
  'ZA', 'KE', 'NG', 'SA', 'TR', 'NO', 'SE', 'MG', 'ID', 'TH', 'MN', 'KZ', 'DZ', 'GL', 'IS', 'PH', 'KR', 'IR', 'ET', 'VE',
];

export const countryCall = (c: Country) => nm(c.name);

export function targets(level: 1 | 2): Target[] {
  const out: Target[] = [];
  for (const c of loadCountries()) {
    const f = factsFor(c);
    if (!f || c.name === 'Antarctica') continue;
    const easy = EASY_COUNTRIES.includes(f.cca2);
    const ok = level === 1 ? easy : f.independent && f.area > 20000;
    if (ok) out.push({ kind: 'country', id: c.id, name: c.name, emoji: c.flag, call: countryCall(c), country: c });
  }
  for (const [id, w] of Object.entries(WATERS)) {
    const big = ['pacific', 'atlantic', 'indian', 'arctic', 'southern'].includes(id);
    if (level === 1 ? big : true) out.push({ kind: 'water', id, name: w.name, emoji: w.emoji, call: `the ${w.name}` });
  }
  if (level === 1) for (const c of Object.values(CONTINENTS)) out.push({ kind: 'continent', id: c.name, name: c.name, emoji: c.emoji, call: c.name });
  for (const p of PLACES) {
    if (level === 1 ? p.rank === 1 && (p.kind === 'animal' || p.kind === 'landmark') : (p.rank ?? 2) <= 2)
      out.push({ kind: 'place', id: p.id, name: p.name, emoji: p.emoji, call: callIt(p), place: p });
  }
  return out;
}

/** Everything a child might tap by mistake (so "Oops, that's …" can be recorded). */
export function allTappables(): string[] {
  return [
    ...loadCountries().map(countryCall),
    ...Object.values(WATERS).map((w) => `the ${w.name}`),
    ...PLACES.map(callIt),
    ...Object.keys(CONTINENTS),
  ];
}

// ------------------------------------------------------------- quiz

export interface Option {
  label: string;
  emoji?: string;
  /** show only the emoji (flag questions) */
  emojiOnly?: boolean;
}
export interface Question {
  id: string;
  level: 1 | 2;
  text: string;
  emoji: string;
  options: Option[];
  answer: number;
  /** what to say when they get it wrong (after "Not quite!") */
  reveal: string;
}

/** Tiny seeded random so the question bank is always the same (and can be recorded). */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function pick<T>(r: () => number, list: T[], n: number, not: (x: T) => boolean): T[] {
  const pool = list.filter((x) => !not(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
function shuffleIn<T>(r: () => number, wrong: T[], right: T): [T[], number] {
  const at = Math.floor(r() * (wrong.length + 1));
  const all = [...wrong];
  all.splice(at, 0, right);
  return [all, at];
}

let bank: Question[] | null = null;

export function questions(): Question[] {
  if (bank) return bank;
  const r = rng(20261107);
  const qs: Question[] = [];
  const countries = loadCountries().filter((c) => factsFor(c)?.independent);
  const easy = countries.filter((c) => EASY_COUNTRIES.includes(factsFor(c)!.cca2));

  // flags
  for (const c of easy) {
    const wrong = pick(r, easy, 2, (x) => x === c);
    const [opts, answer] = shuffleIn(r, wrong, c);
    qs.push({
      id: `flag-${c.id}`, level: 1, emoji: '🏳️', text: `Which flag belongs to ${countryCall(c)}?`,
      options: opts.map((o) => ({ label: o.name, emoji: o.flag, emojiOnly: true })), answer, reveal: SAY.rightOne,
    });
  }
  for (const c of countries.filter((c) => !easy.includes(c) && factsFor(c)!.area > 100000)) {
    const sameCont = countries.filter((x) => factsFor(x)!.continent === factsFor(c)!.continent);
    const wrong = pick(r, sameCont, 3, (x) => x === c);
    const [opts, answer] = shuffleIn(r, wrong, c);
    qs.push({
      id: `flag-${c.id}`, level: 2, emoji: '🏳️', text: `Which flag belongs to ${countryCall(c)}?`,
      options: opts.map((o) => ({ label: o.name, emoji: o.flag, emojiOnly: true })), answer, reveal: SAY.rightOne,
    });
  }

  // capitals (harder)
  for (const c of countries.filter((c) => factsFor(c)!.capital && factsFor(c)!.area > 60000)) {
    const f = factsFor(c)!;
    const others = countries.filter((x) => x !== c && factsFor(x)!.capital && factsFor(x)!.continent === f.continent);
    const wrong = pick(r, others, 3, () => false).map((x) => factsFor(x)!.capital!.name);
    const [opts, answer] = shuffleIn(r, wrong, f.capital!.name);
    qs.push({
      id: `cap-${c.id}`, level: 2, emoji: '🏛️', text: `What is the capital city of ${countryCall(c)}?`,
      options: opts.map((o) => ({ label: o, emoji: '🏙️' })), answer, reveal: sayAnswer(f.capital!.name),
    });
  }

  // where do animals live? (easy: continents)
  const contOf = (p: Place) => {
    const c = loadCountries().find((x) => factsFor(x)?.cca2 === p.cc);
    const cont = c ? factsFor(c)!.continent : p.cc === 'AQ' ? 'Antarctica' : '';
    return cont === 'Oceania' ? 'Australia' : cont;
  };
  const conts = Object.values(CONTINENTS);
  for (const p of PLACES.filter((p) => (p.kind === 'animal' || p.kind === 'dino') && p.cc !== 'NZ')) {
    const cont = contOf(p);
    const right = conts.find((c) => c.name === cont);
    if (!right) continue;
    const wrong = pick(r, conts, 2, (c) => c === right || c.name === 'Antarctica');
    const [opts, answer] = shuffleIn(r, wrong, right);
    const lived = p.kind === 'dino';
    qs.push({
      id: `home-${p.id}`, level: 1, emoji: p.emoji,
      text: lived ? `Where were ${p.name} fossils found?` : `Where does ${callIt(p).replace(/^an? /, 'the ')} live?`,
      options: opts.map((o) => ({ label: o.name, emoji: o.emoji })), answer, reveal: sayAnswer(right.name),
    });
  }

  // landmarks: which country?
  for (const p of PLACES.filter((p) => (p.kind === 'landmark' || p.kind === 'nature' || p.kind === 'space') && p.cc && !p.where.includes(' and '))) {
    const c = countries.find((x) => factsFor(x)!.cca2 === p.cc);
    if (!c) continue;
    const level: 1 | 2 = EASY_COUNTRIES.includes(p.cc) && p.rank === 1 ? 1 : 2;
    const pool = level === 1 ? easy : countries.filter((x) => factsFor(x)!.continent === factsFor(c)!.continent);
    const wrong = pick(r, pool, level === 1 ? 2 : 3, (x) => x === c);
    const [opts, answer] = shuffleIn(r, wrong, c);
    const call = callIt(p);
    qs.push({
      id: `land-${p.id}`, level, emoji: p.emoji, text: `Which country is ${call} in?`,
      options: opts.map((o) => ({ label: o.name, emoji: o.flag })), answer, reveal: sayAnswer(countryCall(c)),
    });
  }

  // world records & fun facts
  const fixed: [string, string, string[], string, 1 | 2][] = [
    // [question, emoji, options (first is right), spoken answer, level]
    ['Which is the tallest animal in the world?', '📏', ['Giraffe', 'Elephant', 'Kangaroo'], 'the giraffe', 1],
    ['Which is the biggest animal that ever lived?', '🐋', ['Blue whale', 'T. rex', 'Elephant'], 'the blue whale', 1],
    ['Which is the tallest mountain on Earth?', '🏔️', ['Mount Everest', 'Mount Fuji', 'Mount Kilimanjaro'], 'Mount Everest', 1],
    ['Which is the biggest ocean?', '🌊', ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean'], 'the Pacific Ocean', 1],
    ['Which is the biggest country in the world?', '🗺️', ['Russia', 'China', 'Brazil'], 'Russia', 1],
    ['Which continent has the most countries?', '🌍', ['Africa', 'Europe', 'South America'], 'Africa', 2],
    ['Which ocean is the coldest?', '🧊', ['Arctic Ocean', 'Indian Ocean', 'Pacific Ocean'], 'the Arctic Ocean', 1],
    ['Which dinosaur had three horns?', '🦕', ['Triceratops', 'T. rex', 'Stegosaurus'], 'Triceratops', 1],
    ['How many arms does an octopus have?', '🐙', ['8', '6', '10'], '8', 1],
    ['Which animal has a pouch for its baby?', '🦘', ['Kangaroo', 'Panda', 'Zebra'], 'the kangaroo', 1],
    ['Which country has the most people?', '👨‍👩‍👧', ['India', 'United States', 'Brazil'], 'India', 2],
    ['Which is the coldest continent?', '🥶', ['Antarctica', 'Europe', 'Asia'], 'Antarctica', 1],
    ['Which bird cannot fly?', '🐦', ['Kiwi', 'Toucan', 'Eagle'], 'the kiwi', 1],
    ['What do pandas love to eat?', '🐼', ['Bamboo', 'Fish', 'Bananas'], 'bamboo', 1],
    ['Which is the biggest hot desert?', '🏜️', ['Sahara', 'Gobi', 'Atacama'], 'the Sahara', 2],
    ['Which city has the Eiffel Tower?', '🗼', ['Paris', 'London', 'Rome'], 'Paris', 1],
    ['What is the longest railway in the world?', '🚂', ['Trans-Siberian Railway', 'Eurostar', 'California Zephyr'], 'the Trans-Siberian Railway', 2],
    ['Which train goes under the sea between England and France?', '🚄', ['Eurostar', 'Bullet Train', 'Indian Pacific'], 'the Eurostar', 2],
  ];
  // state capitals (harder)
  const states = loadStates();
  for (const st of states) {
    const wrong = pick(r, states, 2, (x) => x === st);
    const [opts, answer] = shuffleIn(r, wrong, st);
    qs.push({
      id: `statecap-${st.abbr}`, level: 2, emoji: st.emoji, text: `Which city is the capital of the state of ${st.name}?`,
      options: opts.map((o) => ({ label: o.capital, emoji: '🏛️' })), answer, reveal: sayAnswer(st.capital),
    });
  }

  fixed.forEach(([text, emoji, opts, spoken, level], i) => {
    const [all, answer] = shuffleIn(r, opts.slice(1), opts[0]);
    qs.push({ id: `fact-${i}`, level, emoji, text, options: all.map((o) => ({ label: o })), answer, reveal: sayAnswer(spoken) });
  });

  bank = qs;
  return qs;
}

/** Every sentence the games can say (for the voice recorder). */
export function allGameSentences(): string[] {
  const out = new Set<string>([SAY.whereStart, SAY.quizStart, SAY.hint, SAY.closer, SAY.next, SAY.newSticker, SAY.newTrophy, SAY.notQuite, SAY.rightOne, ...SAY.yes]);
  for (const lvl of [1, 2] as const) for (const t of targets(lvl)) [sayFind(t.call), sayFound(t.call), sayShow(t.call)].forEach((s) => out.add(s));
  for (const c of allTappables()) out.add(sayWrong(c));
  // the sticker book can ask for any of them
  for (const p of PLACES) out.add(sayFind(callIt(p)));
  for (const c of loadCountries()) out.add(sayFind(countryCall(c)));
  for (const q of questions()) [q.text, q.reveal].forEach((s) => out.add(s));
  allHintSentences().forEach((h) => out.add(h));
  // the 50 States game
  [SAY.statesStart, SAY.statesMore, SAY.statesAll].forEach((s) => out.add(s));
  for (let n = 1; n < 50; n++) out.add(saySoFar(n));
  for (const st of loadStates()) [sayFind(st.name), sayFound(st.name), sayShow(st.name), sayWrong(st.name)].forEach((s) => out.add(s));
  for (let total = 5; total <= 6; total++) for (let s = 0; s <= total; s++) out.add(sayEnd(s, total));
  return [...out];
}

// ------------------------------------------------------------------ hints

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
function nearState(lon: number, lat: number): UsState | null {
  for (const r of [0.3, 0.6, 1.0])
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      const hit = stateAt(lon + Math.cos(t) * r * 1.3, lat + Math.sin(t) * r);
      if (hit) return hit;
    }
  return null;
}

const contOf = (c: Country) => {
  const k = factsFor(c)?.continent;
  return k === 'Oceania' ? 'Australia' : k;
};
const inContinent = (c: Country): string | null => {
  const k = contOf(c);
  if (!k || k === 'Antarctica') return null;
  if (k === 'Australia' && c.id !== '036') return "It's near Australia.";
  return `It's in ${k}.`;
};
/** Well-known countries closest to a spot. */
function nearest(lon: number, lat: number, n: number, skip?: Country): Country[] {
  const all = loadCountries().filter((c) => c !== skip && c.id !== '010');
  const known = all.filter((c) => c.area > 0.003);
  const d = (c: Country) => geoDistance([lon, lat], c.centroid);
  return (known.length >= n ? known : all).sort((a, b) => d(a) - d(b)).slice(0, n);
}
const waterCall = (id: string) => (WATERS[id] ? `the ${WATERS[id].name}` : 'the ocean');

/** Rough "which ocean is this?" (works without the map loaded, so the voice lines match). */
function oceanAt(lon: number, lat: number): string {
  if (lat > 66) return 'arctic';
  if (lat < -58) return 'southern';
  if (lat > 30 && lat < 46 && lon > -5 && lon < 36) return 'mediterranean';
  if (lon >= 20 && lon < 120 && lat < 30) return 'indian';
  if ((lon > -70 && lon < 20) || (lat > 8 && lat < 32 && lon > -100 && lon <= -70) || (lat >= 32 && lon > -82 && lon <= -70)) return 'atlantic';
  return 'pacific';
}

/** The country at a spot, or just along the coast from it. */
function countryNear(lon: number, lat: number): Country | null {
  const c = countryAt(lon, lat);
  if (c) return c;
  for (const r of [0.3, 0.6, 1.0])
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      const hit = countryAt(lon + (Math.cos(t) * r) / Math.max(0.3, Math.cos((lat * Math.PI) / 180)), lat + Math.sin(t) * r);
      if (hit) return hit;
    }
  return null;
}

/** "the north part", etc. — for big countries where the name alone isn't much help. */
function partOf(c: Country, lon: number, lat: number): string {
  const dx = ((lon - c.centroid[0] + 540) % 360) - 180;
  const dy = lat - c.centroid[1];
  const ew = dx * Math.cos((lat * Math.PI) / 180);
  if (c.id === '010') return "It's at the very bottom of the world.";
  if (Math.hypot(ew, dy) < 4) return `It's right in the middle of ${countryCall(c)}.`;
  const ns = dy > 0 ? 'north' : 'south';
  const we = ew > 0 ? 'east' : 'west';
  const big = Math.max(Math.abs(ew), Math.abs(dy));
  const small = Math.min(Math.abs(ew), Math.abs(dy));
  const dir = small > big * 0.5 ? `${ns}${we}` : Math.abs(ew) > Math.abs(dy) ? we : ns;
  return `It's in the ${dir} part of ${countryCall(c)}.`;
}

/** Two word hints for a Where in the World? target (the third hint flies there). */
export function hintsFor(t: Target): [string, string] {
  switch (t.kind) {
    case 'country': {
      const c = t.country;
      const nb = neighborsOf(c).sort((a, b) => b.area - a.area);
      const near = nb.length ? `It's next to ${countryCall(nb[0])}.` : `It's an island near ${countryCall(nearest(c.centroid[0], c.centroid[1], 1, c)[0])}.`;
      return [inContinent(c) ?? near, inContinent(c) ? near : `Look for its flag, ${c.flag}.`];
    }
    case 'water': {
      const spot = WATER_LABELS.find((w) => w.id === t.id);
      const [a, b] = spot ? nearest(spot.lon, spot.lat, 2) : [];
      if (!a) return ["It's in the blue water.", 'Look for lots of blue water.'];
      return [`It's near ${countryCall(a)}.`, `It's also near ${countryCall(b)}.`];
    }
    case 'continent': {
      if (t.id === 'Antarctica') return ["It's at the very bottom of the world.", "It's covered in ice and snow."];
      const big = loadCountries()
        .filter((c) => contOf(c) === t.id)
        .sort((a, b) => b.area - a.area);
      return [`${cap(countryCall(big[0]))} is part of it.`, `${cap(countryCall(big[1] ?? big[0]))} is part of it too.`];
    }
    case 'place': {
      const { lon, lat } = t.place;
      const sea = t.place.atSea || ['sea'].includes(t.place.kind);
      const c = sea ? null : countryNear(lon, lat);
      if (c) {
        const st = c.id === USA_ID ? (stateAt(lon, lat) ?? nearState(lon, lat)) : null;
        // French Guiana is part of France, but it's in South America
        const first = c.id === '250' && lon < -25 ? "It's in South America." : (inContinent(c) ?? `It's in ${countryCall(c)}.`);
        const second = st ? `It's in the state of ${st.name}.` : c.area > 0.1 ? partOf(c, lon, lat) : `It's in ${countryCall(c)}.`;
        return [first, second];
      }
      return [`It's in ${waterCall(oceanAt(lon, lat))}.`, `It's near ${countryCall(nearest(lon, lat, 1)[0])}.`];
    }
  }
}

/** Two word hints for the 50 States game. */
export function stateHints(st: UsState): [string, string] {
  if (st.abbr === 'AK') return ["It's way up north, next to Canada.", "It's the biggest state of all!"];
  if (st.abbr === 'HI') return ["It's far out in the Pacific Ocean.", "It's a group of islands."];
  const nb = stateNeighbors(st);
  const second = nb[1] ? `It's also next to ${nb[1].name}.` : "It's way up in the top right corner of the country.";
  return [`It's next to ${nb[0].name}.`, second];
}

export function allHintSentences(): string[] {
  const out = new Set<string>([SAY.hintStart, SAY.tapHint]);
  for (const t of [...targets(1), ...targets(2)]) hintsFor(t).forEach((h) => out.add(h));
  for (const st of loadStates()) stateHints(st).forEach((h) => out.add(h));
  return [...out];
}
