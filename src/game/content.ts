/**
 * Game content: what to find, quiz questions and every phrase the games say.
 * Kept free of anything browser-only so the voice recorder can list all of it.
 */
import { loadCountries, type Country } from '../data/countries';
import { factsFor, nm, callIt } from '../data/cards';
import { PLACES, type Place } from '../data/places';
import { WATERS, CONTINENTS } from '../data/kid';

// ------------------------------------------------------------- phrases

export const SAY = {
  whereStart: "Let's play Where in the World!",
  quizStart: "Let's do a quiz!",
  hint: "Here's a hint! It's right around here.",
  closer: "You're close! Now look for it up close.",
  next: 'Here comes the next one!',
  newSticker: 'You got a new sticker!',
  newTrophy: 'Wow! You won a trophy!',
  notQuite: 'Not quite!',
  rightOne: "Here's the right one!",
  yes: ['Great job!', 'You got it!', 'Awesome!', 'Well done!', 'Super!'],
};
export const sayFind = (call: string) => `Can you find ${call}?`;
export const sayFound = (call: string) => `Yes! You found ${call}!`;
export const sayWrong = (call: string) => `Oops, that's ${call}. Try again!`;
export const sayShow = (call: string) => `Here it is! This is ${call}.`;
export const sayAnswer = (text: string) => `The answer is ${text}${/[.!?]$/.test(text) ? '' : '.'}`;
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
  for (let total = 5; total <= 6; total++) for (let s = 0; s <= total; s++) out.add(sayEnd(s, total));
  return [...out];
}
