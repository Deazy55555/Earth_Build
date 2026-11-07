import { splitSentences, hashSentence } from './voice/sentences';

/**
 * Read-aloud. Plays pre-recorded natural-voice clips (one per sentence) with Web Audio,
 * and falls back to the iPad's built-in voice if a recording is missing.
 */

const BASE = `${import.meta.env.BASE_URL}voice/`;
let enabled = load();
let recorded: Set<string> | null = null;
let ctx: AudioContext | null = null;
let playing: AudioBufferSourceNode[] = [];
let token = 0;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function load(): boolean {
  try {
    return localStorage.getItem('earthtoy.speech') !== 'off';
  } catch {
    return true;
  }
}

// which sentences have recordings
fetch(`${BASE}index.json`)
  .then((r) => (r.ok ? r.json() : { ids: [] }))
  .then((j: { ids: string[] }) => (recorded = new Set(j.ids)))
  .catch(() => (recorded = new Set()));

function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function clip(id: string): Promise<AudioBuffer | null> {
  let p = buffers.get(id);
  if (!p) {
    p = fetch(`${BASE}${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => audio().decodeAudioData(b))
      .catch(() => null);
    buffers.set(id, p);
  }
  return p;
}

// ------------------------------------------------------------- iPad voice fallback

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  voice =
    voices.find((v) => /premium|enhanced/i.test(v.name)) ??
    voices.find((v) => /Samantha|Karen|Daniel|Moira|Tessa/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices[0] ??
    null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
function sayWithSystemVoice(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = 0.92;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}

// ------------------------------------------------------------- public

export function stopSpeaking() {
  token++;
  for (const s of playing) {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  playing = [];
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export async function say(text: string, force = false) {
  if (!enabled && !force) return;
  stopSpeaking();
  const my = token;
  const ac = audio(); // unlock audio inside the tap
  const ids = splitSentences(text).map((s) => hashSentence(s));
  if (!recorded || !ids.every((id) => recorded!.has(id))) {
    sayWithSystemVoice(text);
    return;
  }
  // play the clips back to back with a short breath between sentences
  let at = ac.currentTime + 0.05;
  const pending = ids.map(clip);
  for (const p of pending) {
    const buf = await p;
    if (my !== token) return;
    if (!buf) continue;
    at = Math.max(at, ac.currentTime + 0.02);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(at);
    playing.push(src);
    at += buf.duration + 0.18;
  }
}

export function speechEnabled() {
  return enabled;
}

export function setSpeechEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem('earthtoy.speech', on ? 'on' : 'off');
  } catch {
    /* storage unavailable: setting just won't persist */
  }
  if (!on) stopSpeaking();
}
