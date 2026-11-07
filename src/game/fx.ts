/** Little sound effects (made with Web Audio, no files) and confetti. */

let ctx: AudioContext | null = null;
const ac = () => {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

/** happy rising "ding-ding-ding" */
export function sfxYes() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle'));
}
/** gentle "boop-boop" */
export function sfxNo() {
  tone(330, 0, 0.18, 'sine', 0.15);
  tone(262, 0.16, 0.28, 'sine', 0.15);
}
/** sparkly sticker sound */
export function sfxSticker() {
  [880, 1174.66, 1567.98, 2093].forEach((f, i) => tone(f, i * 0.06, 0.4, 'sine', 0.12));
}
/** fanfare for the end of a game */
export function sfxFanfare() {
  [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, i === 6 ? 0.7 : 0.2, 'triangle', 0.16));
}

// ------------------------------------------------------------- confetti

const COLORS = ['#ff6b6b', '#ffd23f', '#3d8bff', '#2fbf71', '#ff9ec7', '#9b7bff', '#ff8a3d'];

export function confetti(amount = 120) {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const g = c.getContext('2d')!;
  g.scale(devicePixelRatio, devicePixelRatio);
  const bits = Array.from({ length: amount }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    s: 6 + Math.random() * 8,
    c: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const t0 = performance.now();
  const step = () => {
    const t = performance.now() - t0;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.45;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.r);
      g.fillStyle = b.c;
      g.globalAlpha = Math.max(0, 1 - t / 2600);
      g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      g.restore();
    }
    if (t < 2600) requestAnimationFrame(step);
    else c.remove();
  };
  requestAnimationFrame(step);
}
