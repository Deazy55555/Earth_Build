/**
 * The games (Where in the World? and the quiz), the sticker book and the
 * "new sticker" pop-ups.
 */
import type { GlobeApp } from '../globe/GlobeApp';
import { countryAt, loadCountries, type Country } from '../data/countries';
import { factsFor, callIt } from '../data/cards';
import { PLACES, type Place } from '../data/places';
import { ROUTES } from '../data/routes';
import { CONTINENTS, WATERS, WATER_LABELS } from '../data/kid';
import { waterAt } from '../data/oceans';
import { say, stopSpeaking } from '../speech';
import { loadStates, stateAt, stateNear, USA_ID, type UsState } from '../data/states';
import { hintsFor, stateHints } from './content';
import { SAY, sayFind, sayFound, sayWrong, sayShow, sayEnd, saySoFar, targets, questions, countryCall, type Target, type Question } from './content';
import {
  progress,
  TROPHIES,
  onCollect,
  collectSticker,
  collectFlag,
  collectState,
  clearStates,
  addStars,
  totalCollected,
  resetProgress,
  type CollectKind,
} from './progress';
import { sfxYes, sfxNo, sfxSticker, sfxFanfare, confetti } from './fx';
import type { Vehicle } from '../globe/vehicles';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const el = (tag: string, cls: string, text = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
};
const shuffle = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The continent a country counts as for the "find Africa" questions. */
export function continentOf(c: Country): string | null {
  const cont = factsFor(c)?.continent;
  if (!cont) return null;
  return cont === 'Oceania' ? 'Australia' : cont;
}

export interface GameHooks {
  /** close any open info card */
  hideCard(): void;
  /** open the info card for a thing (from the sticker book) */
  openThing(p: Place): void;
  openCountry(c: Country): void;
  openState(s: UsState): void;
  openVehicle(v: Vehicle): void;
}

type Level = 1 | 2;
const HUNT_LEN = 5;
const QUIZ_LEN = 6;

export class Games {
  level: Level = 1;
  private hunt: {
    list: Target[];
    i: number;
    tries: number;
    hints: number;
    closer: boolean;
    stars: boolean[];
    busy: boolean;
  } | null = null;
  private quiz: {
    list: Question[];
    i: number;
    right: boolean[];
    busy: boolean;
  } | null = null;
  private states: { target: UsState; tries: number; hints: number; found: Set<string>; busy: boolean } | null = null;
  private lastGame: 'hunt' | 'quiz' | 'states' = 'hunt';
  private bookTab = 'animals';

  constructor(
    private app: GlobeApp,
    private hooks: GameHooks,
  ) {
    this.wire();
    this.paintBadge();
    onCollect((kind, id) => {
      this.paintBadge();
      this.toast(kind, id);
    });
  }

  /** True while a find-it game is running (taps on the globe are answers). */
  get playing() {
    return !!this.hunt || !!this.states;
  }

  /**
   * A tap on the globe. Returns true if a game used it (so no info card opens).
   * Taps on models count as taps on the ground under them.
   */
  globeTap(tap: { country?: Country; state?: UsState; water?: string; place?: Place; other?: boolean }): boolean {
    if (this.states) {
      if (tap.place) {
        const { lon, lat } = tap.place;
        this.app.lastTap = { lon, lat };
        tap = { state: stateAt(lon, lat) ?? undefined, country: countryAt(lon, lat) ?? undefined, water: waterAt(lon, lat) ?? undefined };
      }
      this.statesTap(tap);
      return true;
    }
    if (this.hunt) {
      if (tap.state) tap = { country: loadCountries().find((c) => c.id === USA_ID) };
      if (!tap.other) this.huntTap(tap);
      return true;
    }
    return false;
  }

  // ================================================================ menu

  private wire() {
    $('btn-play').addEventListener('click', () => this.openMenu());
    $('btn-book').addEventListener('click', () => this.openBook());
    document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) =>
      b.addEventListener('click', () => {
        $(b.dataset.close!).classList.add('hidden');
        stopSpeaking();
      }),
    );
    document.querySelectorAll<HTMLElement>('.pill.level').forEach((b) =>
      b.addEventListener('click', () => {
        this.level = Number(b.dataset.level) as Level;
        document.querySelectorAll('.pill.level').forEach((x) => x.classList.toggle('on', x === b));
      }),
    );
    $('start-hunt').addEventListener('click', () => this.startHunt());
    $('start-quiz').addEventListener('click', () => this.startQuiz());
    $('start-states').addEventListener('click', () => this.startStates());
    $('hunt-quit').addEventListener('click', () => (this.states ? this.endStates(false) : this.endHunt(false)));
    $('hunt-hint').addEventListener('click', () => this.giveHint());
    $('hunt-say').addEventListener('click', () => {
      if (this.hunt) say(sayFind(this.hunt.list[this.hunt.i].call), true);
      if (this.states) say(sayFind(this.states.target.name), true);
    });
    $('quiz-quit').addEventListener('click', () => this.endQuiz(false));
    $('quiz-say').addEventListener('click', () => this.quiz && say(this.quiz.list[this.quiz.i].text, true));
    $('result-again').addEventListener('click', () => {
      $('result').classList.add('hidden');
      if (this.lastGame === 'hunt') this.startHunt();
      else if (this.lastGame === 'states') this.startStates();
      else this.startQuiz();
    });
    $('result-done').addEventListener('click', () => {
      $('result').classList.add('hidden');
      stopSpeaking();
    });
    this.wireReset();
  }

  private openMenu() {
    this.hooks.hideCard();
    if (this.app.vehicles.riding) this.app.stopRide();
    const n = progress.states.length;
    $('states-progress').textContent = n ? `${n} of 50 found` : 'Tap the right state!';
    $('play-menu').classList.remove('hidden');
  }

  private prepare() {
    $('play-menu').classList.add('hidden');
    $('result').classList.add('hidden');
    this.hooks.hideCard();
    if (this.app.vehicles.riding) this.app.stopRide();
  }

  // ================================================================ Where in the World?

  private pickTargets(): Target[] {
    const all = shuffle(targets(this.level));
    const take = (kinds: Target['kind'][], n: number) => all.filter((t) => kinds.includes(t.kind)).slice(0, n);
    const list =
      this.level === 1
        ? [...take(['country'], 2), ...take(['water', 'continent'], 1), ...take(['place'], 2)]
        : [...take(['country'], 3), ...take(['water'], 1), ...take(['place'], 1)];
    // no "find Australia" twice (the country and the continent)
    const seen = new Set<string>();
    return shuffle(list.filter((t) => !seen.has(t.name) && seen.add(t.name))).slice(0, HUNT_LEN);
  }

  startHunt() {
    this.prepare();
    this.lastGame = 'hunt';
    this.hunt = {
      list: this.pickTargets(),
      i: 0,
      tries: 0,
      hints: 0,
      closer: false,
      stars: [],
      busy: false,
    };
    this.app.labels.hidden = true;
    document.body.classList.add('hunting');
    $('hunt-bar').classList.remove('hidden');
    this.app.goHome();
    this.showTarget(true);
  }

  private showTarget(first = false) {
    const h = this.hunt!;
    const t = h.list[h.i];
    h.tries = 0;
    h.hints = 0;
    h.closer = false;
    this.resetHints();
    h.busy = false;
    this.app.select(null);
    $('hunt-emoji').textContent = t.emoji;
    $('hunt-name').textContent = t.name;
    this.paintHuntStars();
    say(first ? `${SAY.whereStart} ${sayFind(t.call)}` : sayFind(t.call));
  }

  private paintHuntStars() {
    const h = this.hunt!;
    $('hunt-stars').textContent = h.list.map((_, i) => (i < h.stars.length ? (h.stars[i] ? '⭐' : '⚫') : '⚪')).join('');
  }

  /** Fly to (and light up) the answer. */
  private point(t: Target, close: boolean) {
    switch (t.kind) {
      case 'country': {
        this.app.select(t.country);
        const [lon, lat] = t.country.centroid;
        this.app.flyTo(lon, lat, this.app.distanceFor(t.country) * (close ? 0.85 : 1));
        break;
      }
      case 'water': {
        const spot = WATER_LABELS.find((w) => w.id === t.id);
        if (spot) this.app.flyTo(spot.lon, spot.lat, close ? 2.2 : 2.6);
        break;
      }
      case 'continent': {
        const c = CONTINENTS[t.id];
        this.app.flyTo(c.lon, c.lat, close ? 2.6 : 3);
        break;
      }
      case 'place': {
        const c = countryAt(t.place.lon, t.place.lat);
        if (c) this.app.select(c);
        this.app.flyTo(t.place.lon, t.place.lat, close ? 1.35 : 1.55);
        break;
      }
    }
  }

  /** A tap on the globe while hunting. */
  huntTap(tap: { country?: Country; water?: string; place?: Place }) {
    const h = this.hunt;
    if (!h || h.busy) return;
    const t = h.list[h.i];
    let right = false;
    let tapped: string | null = null;

    if (tap.place) {
      right = t.kind === 'place' && t.place.id === tap.place.id;
      tapped = callIt(tap.place);
    } else if (tap.country) {
      const c = tap.country;
      if (t.kind === 'country') right = c.id === t.id;
      else if (t.kind === 'continent') right = continentOf(c) === t.id;
      else if (t.kind === 'place' && countryAt(t.place.lon, t.place.lat) === c) return this.nearly(t);
      tapped = t.kind === 'continent' ? (continentOf(c) ?? countryCall(c)) : countryCall(c);
    } else if (tap.water) {
      right = t.kind === 'water' && t.id === tap.water;
      if (!right && t.kind === 'place' && t.place.atSea && waterAt(t.place.lon, t.place.lat) === tap.water) return this.nearly(t);
      tapped = WATERS[tap.water] ? `the ${WATERS[tap.water].name}` : null;
    }
    if (!tapped && !right) return; // a tap on nothing in particular

    if (right) this.found(t);
    else this.missed(t, tapped!);
  }

  /** Tapped the right country for a landmark or animal: zoom in so they can spot it. */
  private nearly(t: Target) {
    const h = this.hunt!;
    if (h.closer) return this.missed(t, null);
    h.closer = true;
    say(SAY.closer);
    this.point(t, false);
  }

  private async found(t: Target) {
    const h = this.hunt!;
    h.busy = true;
    sfxYes();
    confetti(90);
    say(sayFound(t.call));
    h.stars.push(h.tries + h.hints < 3); // a star for finding it without much help
    this.paintHuntStars();
    if (t.kind === 'country') {
      this.app.select(t.country);
      collectFlag(t.country.id);
    }
    if (t.kind === 'place') collectSticker(t.place.id);
    await wait(2900);
    this.nextTarget();
  }

  private async missed(t: Target, tapped: string | null) {
    const h = this.hunt!;
    h.tries++;
    sfxNo();
    if (h.tries >= 4) {
      h.busy = true;
      h.stars.push(false);
      this.paintHuntStars();
      say(sayShow(t.call));
      this.point(t, true);
      await wait(3600);
      return this.nextTarget();
    }
    const oops = tapped ? sayWrong(tapped) : '';
    if (h.tries === 2 && h.hints === 0) {
      say(`${oops} ${SAY.tapHint}`.trim());
      this.nudgeHint();
    } else if (oops) say(oops);
  }

  private nextTarget() {
    const h = this.hunt;
    if (!h) return;
    h.i++;
    if (h.i >= h.list.length) return this.endHunt(true);
    this.showTarget();
  }

  private endHunt(finished: boolean) {
    const h = this.hunt;
    if (!h) return;
    this.hunt = null;
    this.app.labels.hidden = false;
    this.app.select(null);
    document.body.classList.remove('hunting');
    $('hunt-bar').classList.add('hidden');
    if (!finished) return stopSpeaking();
    const stars = h.stars.filter(Boolean).length;
    addStars(stars, 'hunt');
    this.showResult(stars, h.list.length);
  }

  // ================================================================ Find all 50 States

  startStates() {
    this.prepare();
    this.lastGame = 'states';
    if (progress.states.length >= 50) clearStates();
    const found = new Set(progress.states);
    this.states = { target: loadStates()[0], tries: 0, hints: 0, found, busy: false };
    this.app.labels.hidden = true;
    this.app.markStates(found);
    document.body.classList.add('hunting');
    $('hunt-bar').classList.remove('hidden');
    this.app.flyTo(-97, 39, 2.15);
    const intro = found.size ? `${SAY.statesMore} ${saySoFar(found.size)}` : SAY.statesStart;
    this.nextState(intro);
  }

  private nextState(intro = '') {
    const g = this.states!;
    const left = loadStates().filter((s) => !g.found.has(s.abbr) && s !== g.target);
    const pool = left.length ? left : loadStates().filter((s) => !g.found.has(s.abbr));
    g.target = pool[Math.floor(Math.random() * pool.length)];
    g.tries = 0;
    g.hints = 0;
    g.busy = false;
    this.resetHints();
    this.app.selectState(null);
    $('hunt-emoji').textContent = g.target.emoji;
    $('hunt-name').textContent = g.target.name;
    $('hunt-stars').textContent = `🇺🇸 ${g.found.size}/50`;
    say(`${intro} ${sayFind(g.target.name)}`.trim());
  }

  /** Fly to a state and make it glow. */
  private showState(st: UsState) {
    const r = Math.sqrt(st.area / Math.PI);
    this.app.selectState(st);
    this.app.flyTo(st.centroid[0], st.centroid[1], Math.min(this.app.orbitDistance, Math.max(1.35, Math.min(2.2, 1 + r * 9))));
  }

  private statesTap(tap: { country?: Country; state?: UsState; water?: string; other?: boolean }) {
    const g = this.states;
    if (!g || g.busy || tap.other) return;
    const t = g.target;
    let right = tap.state === t;
    // little states are hard to hit with a finger, so a near miss counts
    if (!right && Math.sqrt(t.area / Math.PI) < 0.035) {
      const { lon, lat } = this.app.lastTap;
      const tol = Math.min(1.2, Math.max(0.15, (this.app.orbitDistance - 1) * 0.9));
      right = stateNear(t, lon, lat, tol);
    }
    if (right) return this.stateFound(t);
    const tapped = tap.state
      ? tap.state.name
      : tap.country
        ? countryCall(tap.country)
        : tap.water && WATERS[tap.water]
          ? `the ${WATERS[tap.water].name}`
          : null;
    if (!tapped) return;
    this.stateMissed(t, tapped);
  }

  private async stateFound(t: UsState) {
    const g = this.states!;
    g.busy = true;
    sfxYes();
    confetti(90);
    say(sayFound(t.name));
    g.found.add(t.abbr);
    collectState(t.abbr);
    this.app.markStates(g.found);
    this.app.selectState(t);
    $('hunt-stars').textContent = `🇺🇸 ${g.found.size}/50`;
    await wait(2600);
    if (this.states !== g) return;
    if (g.found.size >= 50) return this.endStates(true);
    this.app.flyTo(-97, 39, 2.15);
    this.nextState();
  }

  private async stateMissed(t: UsState, tapped: string) {
    const g = this.states!;
    g.tries++;
    sfxNo();
    if (g.tries >= 4) {
      g.busy = true;
      say(sayShow(t.name));
      this.showState(t);
      await wait(3600);
      if (this.states !== g) return;
      this.app.flyTo(-97, 39, 2.15);
      return this.nextState(); // it comes back later
    }
    if (g.tries === 2 && g.hints === 0) {
      say(`${sayWrong(tapped)} ${SAY.tapHint}`);
      this.nudgeHint();
    } else say(sayWrong(tapped));
  }

  private endStates(allDone: boolean) {
    if (!this.states) return;
    this.states = null;
    this.app.labels.hidden = false;
    this.app.markStates(null);
    this.app.selectState(null);
    document.body.classList.remove('hunting');
    $('hunt-bar').classList.add('hidden');
    if (!allDone) return stopSpeaking();
    $('result-stars').textContent = '🇺🇸🏆🇺🇸';
    $('result-text').textContent = 'You found all 50 states!';
    $('result').classList.remove('hidden');
    sfxFanfare();
    confetti(260);
    say(SAY.statesAll);
  }

  // ================================================================ hints

  private resetHints() {
    $('hunt-tip').classList.add('hidden');
    $('hint-left').textContent = '3';
    $('hunt-hint').classList.remove('used-up', 'wiggle');
  }

  /** Make the light bulb wiggle so they know help is there. */
  private nudgeHint() {
    const b = $('hunt-hint');
    b.classList.remove('wiggle');
    void b.offsetWidth;
    b.classList.add('wiggle');
  }

  /** The light bulb: two word clues, then the globe flies there. */
  private giveHint() {
    const h = this.hunt;
    const g = this.states;
    if ((h && h.busy) || (g && g.busy) || (!h && !g)) return;
    const used = Math.min(3, (h ? h.hints : g!.hints) + 1);
    if (h) h.hints = used;
    if (g) g.hints = used;
    const words = h ? hintsFor(h.list[h.i]) : stateHints(g!.target);
    const btn = $('hunt-hint');
    btn.classList.remove('wiggle');
    $('hint-left').textContent = String(3 - used);
    btn.classList.toggle('used-up', used >= 3);
    const tip = $('hunt-tip');
    if (used <= 2) {
      const text = words[used - 1];
      tip.textContent = `💡 ${text}`;
      say(`${SAY.hintStart} ${text}`);
    } else {
      tip.textContent = "💡 It's right around here!";
      say(SAY.hint);
      if (h) this.point(h.list[h.i], false);
      else this.showState(g!.target);
    }
    tip.classList.remove('hidden');
    tip.style.animation = 'none';
    void tip.offsetWidth;
    tip.style.animation = '';
  }

  // ================================================================ quiz

  startQuiz() {
    this.prepare();
    this.lastGame = 'quiz';
    const bank = questions();
    const easy = shuffle(bank.filter((q) => q.level === 1));
    const hard = shuffle(bank.filter((q) => q.level === 2));
    const list = this.level === 1 ? easy.slice(0, QUIZ_LEN) : shuffle([...hard.slice(0, 4), ...easy.slice(0, 2)]);
    this.quiz = { list, i: 0, right: [], busy: false };
    $('quiz').classList.remove('hidden');
    this.showQuestion(true);
  }

  private showQuestion(first = false) {
    const z = this.quiz!;
    const q = z.list[z.i];
    z.busy = false;
    $('quiz-emoji').textContent = q.emoji;
    $('quiz-q').textContent = q.text;
    $('quiz-dots').textContent = z.list.map((_, i) => (i < z.right.length ? (z.right[i] ? '🟢' : '🔴') : i === z.i ? '🟡' : '⚪')).join('');
    const box = $('quiz-options');
    const flags = q.options.every((o) => o.emojiOnly);
    box.classList.toggle('flags', flags);
    box.replaceChildren(
      ...q.options.map((o, i) => {
        const b = el('button', 'opt');
        if (o.emoji) b.append(el('span', 'e', o.emoji));
        if (!o.emojiOnly) b.append(el('span', 't', o.label));
        else b.setAttribute('aria-label', o.label);
        b.addEventListener('click', () => this.answer(i, b));
        return b;
      }),
    );
    say(first ? `${SAY.quizStart} ${q.text}` : q.text);
  }

  private async answer(i: number, btn: HTMLElement) {
    const z = this.quiz;
    if (!z || z.busy) return;
    z.busy = true;
    const q = z.list[z.i];
    const buttons = [...$('quiz-options').children] as HTMLElement[];
    const ok = i === q.answer;
    z.right.push(ok);
    if (ok) {
      btn.classList.add('right');
      sfxYes();
      confetti(50);
      say(SAY.yes[Math.floor(Math.random() * SAY.yes.length)]);
      await wait(1700);
    } else {
      btn.classList.add('wrong');
      buttons[q.answer].classList.add('right');
      sfxNo();
      say(`${SAY.notQuite} ${q.reveal}`);
      await wait(3300);
    }
    if (this.quiz !== z) return; // quit while waiting
    z.i++;
    if (z.i >= z.list.length) this.endQuiz(true);
    else this.showQuestion();
  }

  private endQuiz(finished: boolean) {
    const z = this.quiz;
    if (!z) return;
    this.quiz = null;
    $('quiz').classList.add('hidden');
    if (!finished) return stopSpeaking();
    const stars = z.right.filter(Boolean).length;
    addStars(stars, 'quiz');
    this.showResult(stars, z.list.length);
  }

  // ================================================================ results

  private showResult(stars: number, total: number) {
    $('result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(total - stars);
    const text = sayEnd(stars, total);
    $('result-text').textContent = text;
    $('result').classList.remove('hidden');
    sfxFanfare();
    confetti(stars === total ? 220 : 120);
    say(text);
  }

  // ================================================================ sticker book

  private openBook() {
    this.hooks.hideCard();
    $('book').classList.remove('hidden');
    this.paintBook();
  }

  private paintBook() {
    const tabs: [string, string][] = [
      ['animals', '🐾 Animals'],
      ['places', '🗺️ Places'],
      ['rides', '🎟️ Rides'],
      ['flags', '🏳️ Flags'],
      ['states', '🇺🇸 States'],
      ['trophies', '🏆 Trophies'],
    ];
    $('book-tabs').replaceChildren(
      ...tabs.map(([id, label]) => {
        const b = el('button', `pill${id === this.bookTab ? ' on' : ''}`, label);
        b.addEventListener('click', () => {
          this.bookTab = id;
          this.paintBook();
          $('book-grid').scrollTop = 0;
        });
        return b;
      }),
    );

    type Item = {
      emoji: string;
      name: string;
      got: boolean;
      tap?: () => void;
      note?: string;
    };
    let items: Item[] = [];
    const tab = this.bookTab;
    if (tab === 'animals' || tab === 'places') {
      const kinds = tab === 'animals' ? ['animal', 'sea', 'dino'] : ['landmark', 'nature', 'space', 'boat'];
      const order = (p: Place) => kinds.indexOf(p.kind);
      items = PLACES.filter((p) => kinds.includes(p.kind))
        .sort((a, b) => order(a) - order(b))
        .map((p) => {
          const got = progress.stickers.includes(p.id);
          return {
            emoji: p.emoji,
            name: got ? p.name : '???',
            got,
            tap: () => this.seek(p, got),
          };
        });
    } else if (tab === 'rides') {
      items = ROUTES.map((r) => {
        const got = progress.rides.includes(r.id);
        return {
          emoji: r.emoji,
          name: r.name,
          got,
          tap: () => {
            const v = this.app.vehicles.list.find((x) => x.route.id === r.id);
            if (!v) return;
            this.closeBook();
            this.hooks.openVehicle(v);
          },
        };
      });
    } else if (tab === 'states') {
      items = loadStates().map((st) => {
        const got = progress.states.includes(st.abbr);
        return {
          emoji: st.emoji,
          name: st.name,
          got,
          tap: () => {
            this.closeBook();
            if (got) return this.hooks.openState(st);
            this.showState(st);
            say(sayFind(st.name));
          },
        };
      });
    } else if (tab === 'flags') {
      items = loadCountries()
        .filter((c) => factsFor(c)?.independent)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => {
          const got = progress.flags.includes(c.id);
          return {
            emoji: c.flag,
            name: c.name,
            got,
            tap: () => {
              this.closeBook();
              if (got) this.hooks.openCountry(c);
              else {
                this.app.flyTo(c.centroid[0], c.centroid[1], this.app.distanceFor(c));
                say(sayFind(countryCall(c)));
              }
            },
          };
        });
    } else {
      items = TROPHIES.map((t) => ({
        emoji: t.emoji,
        name: t.name,
        got: progress.trophies.includes(t.id),
        note: t.how,
      }));
    }

    const got = items.filter((i) => i.got).length;
    $('book-count-line').textContent = `You found ${got} of ${items.length}`;
    $('book-grid').replaceChildren(
      ...items.map((it) => {
        const b = el('button', `sticker${it.got ? '' : ' locked'}${it.note ? ' trophy' : ''}`);
        b.append(el('span', 'e', it.emoji), el('span', 'n', it.name));
        if (it.note) b.append(el('span', 'n how', it.note));
        if (it.tap) b.addEventListener('click', it.tap);
        return b;
      }),
    );
  }

  private closeBook() {
    $('book').classList.add('hidden');
  }

  /** From the book: open a found sticker, or go and look for a missing one. */
  private seek(p: Place, got: boolean) {
    this.closeBook();
    if (got) return this.hooks.openThing(p);
    this.app.select(null);
    this.app.flyTo(p.lon, p.lat, 1.55);
    say(sayFind(callIt(p)));
  }

  private wireReset() {
    const btn = $('book-reset');
    let timer = 0;
    const start = (e: Event) => {
      e.preventDefault();
      btn.classList.add('holding');
      btn.textContent = 'Keep holding…';
      timer = window.setTimeout(() => {
        resetProgress();
        this.paintBadge();
        this.paintBook();
        btn.textContent = 'All cleared!';
        btn.classList.remove('holding');
      }, 2500);
    };
    const stop = () => {
      clearTimeout(timer);
      btn.classList.remove('holding');
      setTimeout(() => (btn.textContent = 'Hold to start over (for grown-ups)'), 900);
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
  }

  // ================================================================ pop-ups

  private paintBadge() {
    $('book-count').textContent = String(totalCollected());
  }

  private queue: [string, string, string][] = [];
  private toasting = false;

  private toast(kind: CollectKind, id: string) {
    if (kind === 'state') return; // the game shows its own counter
    let emoji = '';
    let name = '';
    let label = '';
    if (kind === 'sticker') {
      const p = PLACES.find((x) => x.id === id);
      if (!p) return;
      [emoji, name, label] = [p.emoji, p.name, 'New sticker!'];
    } else if (kind === 'ride') {
      const r = ROUTES.find((x) => x.id === id);
      if (!r) return;
      [emoji, name, label] = [r.emoji, r.name, 'New ride ticket!'];
    } else if (kind === 'flag') {
      const c = loadCountries().find((x) => x.id === id);
      if (!c) return;
      [emoji, name, label] = [c.flag, c.name, 'New flag!'];
    } else {
      const t = TROPHIES.find((x) => x.id === id);
      if (!t) return;
      [emoji, name, label] = [t.emoji, t.name, '🏆 New trophy!'];
    }
    this.queue.push([emoji, name, label]);
    if (!this.toasting) this.nextToast();
  }

  private nextToast() {
    const next = this.queue.shift();
    const box = $('toast');
    if (!next) {
      this.toasting = false;
      box.classList.add('hidden');
      return;
    }
    this.toasting = true;
    const [emoji, name, label] = next;
    $('toast-emoji').textContent = emoji;
    $('toast-name').textContent = name;
    $('toast-kind').textContent = label;
    if (label !== 'New flag!') sfxSticker();
    // restart the animation
    box.classList.add('hidden');
    void box.offsetWidth;
    box.classList.remove('hidden');
    setTimeout(() => this.nextToast(), 2700);
  }
}
