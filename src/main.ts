import './style.css';
import { GlobeApp } from './globe/GlobeApp';
import { loadTopology } from './globe/mapTextures';
import type { Country } from './data/countries';
import { countryCard, capitalCard, waterCard, continentCard, thingCard, vehicleCard, factsFor, type Card } from './data/cards';
import type { Vehicle } from './globe/vehicles';
import { CONTINENTS } from './data/kid';
import { say, stopSpeaking, speechEnabled, setSpeechEnabled } from './speech';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const card = $('card');
let current: Card | null = null;
let currentVehicle: Vehicle | null = null;

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
  $('card-ride').classList.toggle('hidden', !c.ride);
  card.classList.remove('hidden');
  say(c.intro);
}

function hideCard() {
  current = null;
  currentVehicle = null;
  stopSpeaking();
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
  onVehicleTap(v) {
    app.select(null);
    showCard(vehicleCard(v.route));
    currentVehicle = v;
  },
  onRideEnd() {
    document.body.classList.remove('riding');
    $('ride-hud').classList.add('hidden');
  },
  onThingTap(place) {
    app.select(null);
    showCard(thingCard(place));
    if (place.anim === 'launch') app.things.launch(place.id);
    app.flyTo(place.lon, place.lat, Math.min(app.orbitDistance, 1.6));
  },
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

// ---------------- ride along
const SPEEDS = [1, 2, 4];
let speedIdx = 0;
$('card-ride').addEventListener('click', () => {
  const v = currentVehicle;
  if (!v) return;
  card.classList.add('hidden');
  current = null;
  $('ride-title').textContent = `${v.route.emoji} ${v.route.name}`;
  $('ride-hud').classList.remove('hidden');
  document.body.classList.add('riding');
  app.ride(v);
});
$('ride-speed').addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  app.vehicles.timeScale = SPEEDS[speedIdx];
  $('ride-speed').textContent = `×${SPEEDS[speedIdx]}`;
});
$('ride-off').addEventListener('click', () => {
  speedIdx = 0;
  app.vehicles.timeScale = 1;
  $('ride-speed').textContent = '×1';
  app.stopRide();
});
$('card-close').addEventListener('click', hideCard);

// Block iOS Safari's pinch-to-zoom-the-page so pinches go to the globe.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Let the loading screen paint before the heavy build. (A plain timer, not
// requestAnimationFrame, so the build still happens if the app is opened in the background.)
setTimeout(async () => {
  const [topo] = await Promise.all([loadTopology(`${import.meta.env.BASE_URL}topology.png`), document.fonts?.ready]);
  app.build(topo);
  app.start();
  setTimeout(() => $('loading').classList.add('done'), 50);
}, 60);

// Exposed for testing in the browser console.
(window as unknown as { earthToy: GlobeApp }).earthToy = app;
