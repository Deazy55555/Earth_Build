import { PLACES } from '../data/places';
import { ROUTES } from '../data/routes';

/** Everything the kids have found, saved on this iPad. */
export interface Progress {
  stickers: string[]; // place ids (animals, landmarks, …)
  rides: string[]; // route ids ridden
  flags: string[]; // country ids tapped
  states: string[]; // US states found in the 50 States game (postal codes)
  trophies: string[];
  stars: number;
  quizzes: number;
  hunts: number;
}

const KEY = 'earthtoy.progress';

function empty(): Progress {
  return { stickers: [], rides: [], flags: [], states: [], trophies: [], stars: 0, quizzes: 0, hunts: 0 };
}

function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return p ? { ...empty(), ...p } : empty();
  } catch {
    return empty();
  }
}

export const progress: Progress = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage full or blocked: progress just won't persist */
  }
}

// ------------------------------------------------------------- trophies

export interface Trophy {
  id: string;
  name: string;
  emoji: string;
  how: string;
  check: (p: Progress) => boolean;
}

const animalIds = PLACES.filter((p) => p.kind === 'animal').map((p) => p.id);
const seaIds = PLACES.filter((p) => p.kind === 'sea').map((p) => p.id);
const dinoIds = PLACES.filter((p) => p.kind === 'dino').map((p) => p.id);
const placeIds = PLACES.filter((p) => ['landmark', 'nature', 'space'].includes(p.kind)).map((p) => p.id);
const has = (p: Progress, ids: string[], n = ids.length) => ids.filter((i) => p.stickers.includes(i)).length >= n;

export const TROPHIES: Trophy[] = [
  { id: 'first', name: 'First Find', emoji: '🌟', how: 'Find your first sticker', check: (p) => p.stickers.length >= 1 },
  { id: 'animals10', name: 'Animal Friend', emoji: '🐾', how: 'Find 10 animals', check: (p) => has(p, animalIds, 10) },
  { id: 'animalsAll', name: 'Animal Expert', emoji: '🦁', how: 'Find every animal', check: (p) => has(p, animalIds) },
  { id: 'sea', name: 'Ocean Explorer', emoji: '🐳', how: 'Find every sea creature', check: (p) => has(p, seaIds) },
  { id: 'dinos', name: 'Dino Hunter', emoji: '🦖', how: 'Find every dinosaur', check: (p) => has(p, dinoIds) },
  { id: 'places10', name: 'Sightseer', emoji: '🗺️', how: 'Find 10 famous places', check: (p) => has(p, placeIds, 10) },
  { id: 'flags10', name: 'Flag Collector', emoji: '🏳️', how: 'Tap 10 countries', check: (p) => p.flags.length >= 10 },
  { id: 'flags50', name: 'Globe Trotter', emoji: '🌍', how: 'Tap 50 countries', check: (p) => p.flags.length >= 50 },
  { id: 'rides3', name: 'Passenger', emoji: '🎟️', how: 'Ride 3 vehicles', check: (p) => p.rides.length >= 3 },
  { id: 'ridesAll', name: 'Ride Master', emoji: '🚀', how: 'Ride every vehicle', check: (p) => ROUTES.every((r) => p.rides.includes(r.id)) },
  { id: 'states10', name: 'State Finder', emoji: '🗺️', how: 'Find 10 states', check: (p) => p.states.length >= 10 },
  { id: 'states50', name: 'All 50 States', emoji: '🇺🇸', how: 'Find all 50 states', check: (p) => p.states.length >= 50 },
  { id: 'hunt', name: 'World Finder', emoji: '🔍', how: 'Finish a Where in the World game', check: (p) => p.hunts >= 1 },
  { id: 'quiz', name: 'Quiz Whiz', emoji: '🧠', how: 'Finish a quiz', check: (p) => p.quizzes >= 1 },
  { id: 'stars50', name: 'Superstar', emoji: '⭐', how: 'Earn 50 stars in games', check: (p) => p.stars >= 50 },
];

// ------------------------------------------------------------- collecting

export type CollectKind = 'sticker' | 'ride' | 'flag' | 'state' | 'trophy';
type Listener = (kind: CollectKind, id: string) => void;
const listeners: Listener[] = [];
export const onCollect = (fn: Listener) => listeners.push(fn);
const emit: Listener = (k, id) => listeners.forEach((fn) => fn(k, id));

function checkTrophies() {
  for (const t of TROPHIES) {
    if (!progress.trophies.includes(t.id) && t.check(progress)) {
      progress.trophies.push(t.id);
      emit('trophy', t.id);
    }
  }
}

function add(list: string[], id: string, kind: Exclude<CollectKind, 'trophy'>) {
  if (list.includes(id)) return false;
  list.push(id);
  save();
  emit(kind, id);
  checkTrophies();
  save();
  return true;
}

export const collectSticker = (id: string) => add(progress.stickers, id, 'sticker');
export const collectRide = (id: string) => add(progress.rides, id, 'ride');
export const collectFlag = (id: string) => add(progress.flags, id, 'flag');
export const collectState = (abbr: string) => add(progress.states, abbr, 'state');

/** Start the 50 States game over (trophies are kept). */
export function clearStates() {
  progress.states = [];
  save();
}

export function addStars(n: number, finished?: 'quiz' | 'hunt') {
  progress.stars += n;
  if (finished === 'quiz') progress.quizzes++;
  if (finished === 'hunt') progress.hunts++;
  save();
  checkTrophies();
  save();
}

export function totalCollected() {
  return progress.stickers.length + progress.rides.length + progress.flags.length + progress.states.length + progress.trophies.length;
}

export function resetProgress() {
  Object.assign(progress, empty());
  save();
}
