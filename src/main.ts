import './style.css';
import { GlobeApp } from './globe/GlobeApp';
import type { Country } from './data/countries';
import { say, speechEnabled, setSpeechEnabled } from './speech';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const CHEERS = ['You found it!', 'Great find!', 'Nice tap!', 'Hello there!', 'Wow!'];

const card = $('card');
let current: Country | null = null;

function phrase(c: Country) {
  return c.name === 'Antarctica' ? 'This is Antarctica. Brrr, it is icy!' : `This is ${c.name}!`;
}

function showCard(c: Country) {
  current = c;
  $('card-flag').textContent = c.flag;
  $('card-name').textContent = c.name;
  $('card-sub').textContent = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  card.classList.remove('hidden');
  say(phrase(c));
}

function hideCard() {
  current = null;
  card.classList.add('hidden');
  app.select(null);
}

const app = new GlobeApp($<HTMLCanvasElement>('globe'), {
  onCountryTap(c) {
    app.select(c);
    showCard(c);
    app.flyTo(c.centroid[0], c.centroid[1], Math.min(app.camera.position.length(), app.distanceFor(c)));
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

$('card-speak').addEventListener('click', () => current && say(phrase(current), true));
$('card-close').addEventListener('click', hideCard);

// Block iOS Safari's pinch-to-zoom-the-page so pinches go to the globe.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Let the loading screen paint before the heavy build.
requestAnimationFrame(() =>
  setTimeout(() => {
    app.build();
    app.start();
    requestAnimationFrame(() => $('loading').classList.add('done'));
  }, 30),
);

// Exposed for testing in the browser console.
(window as unknown as { earthToy: GlobeApp }).earthToy = app;
