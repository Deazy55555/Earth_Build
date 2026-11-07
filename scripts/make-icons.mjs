// Generates the home-screen icons from an SVG. Run: node scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); } catch { sharp = require('/opt/npm-tools/node_modules/sharp'); }

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#2b44a0"/><stop offset="1" stop-color="#0b1030"/>
    </radialGradient>
    <radialGradient id="sea" cx="38%" cy="32%" r="80%">
      <stop offset="0" stop-color="#4fd6ee"/><stop offset="1" stop-color="#1d5fd1"/>
    </radialGradient>
    <clipPath id="c"><circle cx="256" cy="262" r="170"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="262" r="196" fill="#7fc8ff" opacity="0.25"/>
  <circle cx="256" cy="262" r="170" fill="url(#sea)"/>
  <g clip-path="url(#c)">
    <path d="M150 150 C190 120 250 130 262 170 C275 210 230 222 236 258 C242 296 200 320 170 300 C135 276 150 236 122 214 C100 196 118 168 150 150Z" fill="#7ed957" stroke="#f6e3b4" stroke-width="7"/>
    <path d="M300 200 C340 180 400 200 410 240 C420 290 380 300 360 330 C340 360 300 370 290 336 C282 306 300 290 288 262 C278 238 276 214 300 200Z" fill="#ffd166" stroke="#f6e3b4" stroke-width="7"/>
    <path d="M200 360 C230 350 262 362 270 390 C278 420 236 440 210 425 C186 412 178 372 200 360Z" fill="#f78fb3" stroke="#f6e3b4" stroke-width="7"/>
  </g>
  <ellipse cx="196" cy="186" rx="44" ry="22" fill="#fff" opacity="0.35" transform="rotate(-30 196 186)"/>
  <g fill="#fff">
    <circle cx="340" cy="132" r="22"/><circle cx="366" cy="122" r="28"/><circle cx="396" cy="134" r="20"/>
  </g>
</svg>`;

mkdirSync('public', { recursive: true });
for (const size of [180, 192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icon-${size}.png`);
}
console.log('icons written');
