import factsJson from './facts.json';
import type { Country } from './countries';
import {
  GREETINGS,
  HELLO_LANGUAGE,
  LANGUAGE_DISPLAY,
  EXTRAS,
  CAPITAL_FACTS,
  CONTINENT_TEXT,
  WATERS,
  CONTINENTS,
  type Hello,
} from './kid';

export interface Facts {
  cca2: string;
  independent: boolean;
  capital: { name: string; lat: number; lon: number } | null;
  continent: string;
  subregion: string;
  languages: string[];
  population: number | null;
  popYear: number | null;
  area: number;
  landlocked: boolean;
  borders: number;
  popRank: number | null;
  areaRank: number | null;
}

const FACTS = factsJson as Record<string, Facts>;

export function factsFor(c: Country): Facts | null {
  return FACTS[c.id] ?? null;
}

export interface CardRow {
  icon: string;
  label: string;
  text: string;
}

export interface Card {
  emoji: string;
  title: string;
  subtitle: string;
  rows: CardRow[];
  /** short line spoken straight away */
  intro: string;
  /** everything, read when the speaker button is tapped */
  full: string;
}

// ------------------------------------------------------------- helpers

export function friendlyNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')} billion`;
  if (n >= 1e7) return `${Math.round(n / 1e6)} million`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} million`;
  if (n >= 1e4) return `${Math.round(n / 1e3)} thousand`;
  if (n >= 1e3) return `${(Math.round(n / 100) * 100).toLocaleString('en-US')}`;
  return `${n}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function continentPhrase(cont: string): string {
  if (cont === 'Oceania') return 'in the Pacific Ocean';
  if (cont === 'Antarctica') return 'near the South Pole';
  return `in ${cont}`;
}

function helloFor(f: Facts): Hello | null {
  const lang = HELLO_LANGUAGE[f.cca2] ?? f.languages.find((l) => GREETINGS[l]);
  return lang ? GREETINGS[lang] ?? null : null;
}

function languagesText(f: Facts): string {
  if (LANGUAGE_DISPLAY[f.cca2]) return LANGUAGE_DISPLAY[f.cca2];
  const langs = f.languages.filter((l) => !/sign language/i.test(l));
  if (langs.length > 3) return `${langs.slice(0, 3).join(', ')} and more`;
  return listWords(langs);
}

/** A fact worked out from the data, for countries without a hand-written one. */
function autoFact(c: Country, f: Facts): string | null {
  if (f.areaRank === 1) return `${c.name} is the biggest country in the whole world!`;
  if (f.popRank === 1) return `${c.name} has more people than any other country!`;
  if (f.areaRank && f.areaRank <= 10) return `${c.name} is the ${ordinal(f.areaRank)} biggest country in the world!`;
  if (f.popRank && f.popRank <= 10) return `Only ${f.popRank - 1} ${f.popRank === 2 ? 'country has' : 'countries have'} more people than ${c.name}!`;
  if (f.landlocked) return `No ocean touches ${c.name}. It is landlocked!`;
  if (f.borders >= 7) return `${c.name} touches ${f.borders} other countries!`;
  if (f.borders === 0 && f.continent !== 'Antarctica') return `${c.name} doesn't touch any other country by land.`;
  if (f.area < 1000) return `${c.name} is tiny — smaller than many cities!`;
  return null;
}

// ------------------------------------------------------------- cards

export function countryCard(c: Country): Card {
  if (c.name === 'Antarctica') return placeCard(CONTINENTS.Antarctica, c.flag);
  const f = factsFor(c);
  if (!f) {
    return {
      emoji: c.flag,
      title: c.name,
      subtitle: 'A place on Earth',
      rows: [],
      intro: `This is ${c.name}!`,
      full: `This is ${c.name}!`,
    };
  }

  const rows: CardRow[] = [];
  const say: string[] = [];
  const kind = f.independent ? 'A country' : 'A place';
  const where = CONTINENT_TEXT[f.cca2] ? `in ${CONTINENT_TEXT[f.cca2]}` : continentPhrase(f.continent);
  say.push(`${c.name} is ${where}.`);

  if (f.capital) {
    rows.push({ icon: '🏛️', label: 'Capital city', text: f.capital.name });
    say.push(`The capital city is ${f.capital.name}.`);
  }
  if (f.population) {
    const n = friendlyNumber(f.population);
    rows.push({ icon: '👨‍👩‍👧', label: 'People', text: `About ${n}` });
    say.push(`About ${n} people live there.`);
  }
  if (f.languages.length) {
    const t = languagesText(f);
    rows.push({ icon: '🗣️', label: 'Language', text: t });
    say.push(`People there speak ${t}.`);
  }
  const hello = helloFor(f);
  if (hello) {
    rows.push({ icon: '👋', label: 'Say hello', text: `${hello.word}!` });
    say.push(hello.word === 'Hello' ? 'To say hello, they say hello!' : `To say hello, say ${hello.say}!`);
  }
  const extra = EXTRAS[f.cca2] ?? {};
  if (extra.food) {
    rows.push({ icon: '🍽️', label: 'Yummy food', text: extra.food });
    say.push(`A yummy food there is ${extra.food.split(' — ')[0].toLowerCase()}.`);
  }
  const fact = extra.fact ?? autoFact(c, f);
  if (fact) {
    rows.push({ icon: '⭐', label: 'Did you know?', text: fact });
    say.push(`Did you know? ${fact}`);
  }

  return {
    emoji: c.flag,
    title: c.name,
    subtitle: `${kind} ${where}`,
    rows,
    intro: `This is ${c.name}!`,
    full: `This is ${c.name}! ${say.join(' ')}`,
  };
}

export function capitalCard(c: Country): Card | null {
  const f = factsFor(c);
  if (!f?.capital) return null;
  const city = f.capital.name;
  const rows: CardRow[] = [
    { icon: c.flag, label: 'Capital of', text: c.name },
    { icon: '🏛️', label: 'What is a capital?', text: "It's the city where the country's leaders work." },
  ];
  const fact = CAPITAL_FACTS[f.cca2];
  if (fact) rows.push({ icon: '⭐', label: 'Did you know?', text: fact });
  return {
    emoji: '🏙️',
    title: city,
    subtitle: `The capital city of ${c.name}`,
    rows,
    intro: `This is ${city}, the capital of ${c.name}!`,
    full: `This is ${city}, the capital city of ${c.name}. A capital is the city where the country's leaders work.${fact ? ` Did you know? ${fact}` : ''}`,
  };
}

export function placeCard(p: { name: string; emoji: string; kind: string; fact: string }, emoji = p.emoji, article = ''): Card {
  return {
    emoji,
    title: p.name,
    subtitle: p.kind,
    rows: [{ icon: '⭐', label: 'Did you know?', text: p.fact }],
    intro: `This is ${article}${p.name}!`,
    full: `This is ${article}${p.name}. ${p.fact}`,
  };
}

export const waterCard = (id: string) => (WATERS[id] ? placeCard(WATERS[id], WATERS[id].emoji, 'the ') : null);
export const continentCard = (name: string) => (CONTINENTS[name] ? placeCard(CONTINENTS[name]) : null);
