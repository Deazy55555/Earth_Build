import './style.css';
import { GlobeApp } from './globe/GlobeApp';
import type { Country } from './data/countries';
import { countryCard, capitalCard, waterCard, continentCard, factsFor, type Card } from './data/cards';
import { CONTINENTS } from './data/kid';
import { say, speechEnabled, setSpeechEnabled } from './speech';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const card = $('card');
let current: Card | null = null;

function showCard(c: Card) {
  current = c;
  $('card-emoji').textContent = c.emoji;
  $('card-title').textContent = c.title;
  $('card-sub').textContent = c.subtitle;
  const rows = $('card-rows');
  rows.replaceChildren(
    ...c.rows.map((r) => {
      const el = document.createElement('div');
      el.className = r.icon === '⭐' ? 'row fact' : 'row';
      const icon = document.createElement('div');
      icon.className = 'row-icon';
      icon.textContent = r.icon;
      const body = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'row-label';
      label.textContent = r.label;
      const text = document.createElement('div');
      text.className = 'row-text';
      text.textContent = r.text;
      body.append(label, text);
      el.append(icon, body);
      return el;
    }),
  );
  rows.scrollTop = 0;
  card.classList.remove('hidden');
  say(c.intro);
}

function hideCard() {
  current = null;
  card.classList.add('hidden');
  app.select(null);
}

function openCountry(c: Country) {
  app.select(c);
  showCard(countryCard(c));
  app.flyTo(c.centroid[0], c.centroid[1], Math.min(app.orbitDistance, app.distanceFor(c)));
}

const app = new GlobeApp($<HTMLCanvasElement>('globe'), $('labels'), {
  onCountryTap: openCountry,
  onLabelTap(label) {
    const ref = label.ref as { country?: Country; capital?: Country; water?: string; continent?: string };
    if (ref.country) return openCountry(ref.country);
    if (ref.capital) {
      const cap = factsFor(ref.capital)?.capital;
      const cc = capitalCard(ref.capital);
      if (!cap || !cc) return;
      app.select(ref.capital);
      showCard(cc);
      app.flyTo(cap.lon, cap.lat, Math.min(app.orbitDistance, 1.45));
      return;
    }
    if (ref.water) {
      const wc = waterCard(ref.water);
      if (wc) {
        app.select(null);
        showCard(wc);
      }
      return;
    }
    if (ref.continent) {
      const cc = continentCard(ref.continent);
      const info = CONTINENTS[ref.continent];
      if (cc) {
        app.select(null);
        showCard(cc);
        app.flyTo(info.lon, info.lat, Math.max(app.orbitDistance, 2.6));
      }
    }
  },
  onWaterTap(id) {
    const wc = waterCard(id);
    if (!wc) return hideCard();
    app.select(null);
    showCard(wc);
  },
  onEmptyTap: hideCard,
});

$('btn-zoom-in').addEventListener('click', () => app.zoomBy(0.6));
$('btn-zoom-out').addEventListener('click', () => app.zoomBy(1.6));
$('btn-home').addEventListener('click', () => {
  hideCard();
  app.goHome();
});

const soundBtn = $('btn-sound');
const paintSound = () => {
  soundBtn.textContent = speechEnabled() ? '🔊' : '🔇';
  soundBtn.classList.toggle('off', !speechEnabled());
};
paintSound();
soundBtn.addEventListener('click', () => {
  setSpeechEnabled(!speechEnabled());
  paintSound();
});

$('card-speak').addEventListener('click', () => current && say(current.full, true));
$('card-close').addEventListener('click', hideCard);

// Block iOS Safari's pinch-to-zoom-the-page so pinches go to the globe.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Let the loading screen paint before the heavy build.
requestAnimationFrame(() =>
  setTimeout(async () => {
    await document.fonts?.ready;
    app.build();
    app.start();
    requestAnimationFrame(() => $('loading').classList.add('done'));
  }, 30),
);

// Exposed for testing in the browser console.
(window as unknown as { earthToy: GlobeApp }).earthToy = app;
