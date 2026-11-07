// Writes public/voice/index.json listing every recorded sentence, so the app knows what it can play.
import { readdirSync, writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

const dir = 'public/voice';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const ids = readdirSync(dir)
  .filter((f) => f.endsWith('.mp3'))
  .map((f) => f.slice(0, -4))
  .sort();
const cfg = existsSync('voice/config.json') ? JSON.parse(readFileSync('voice/config.json', 'utf8')) : {};
writeFileSync(`${dir}/index.json`, JSON.stringify({ voice: cfg.voice ?? null, ids }));
console.log(`voice index: ${ids.length} recordings`);
