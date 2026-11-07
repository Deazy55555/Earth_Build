/** Friendly read-aloud using the iPad's built-in voices. */
function load(): boolean {
  try {
    return localStorage.getItem('earthtoy.speech') !== 'off';
  } catch {
    return true;
  }
}
let enabled = load();
let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  // Prefer the nicer "enhanced"/"premium" iOS voices when installed.
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

export function say(text: string, force = false) {
  if (!('speechSynthesis' in window) || (!enabled && !force)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = 0.92;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
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
  if (!on && 'speechSynthesis' in window) speechSynthesis.cancel();
}
