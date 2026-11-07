// Writes public/voice/index.json listing every recorded sentence, so the app knows what it can play.
// With --prune, also deletes recordings no longer used by any sentence (needs voice/sentences.json).
import { readdirSync, writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';

const dir = 'public/voice';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
if (process.argv.includes('--prune') && existsSync('voice/sentences.json')) {
  const used = new Set(JSON.parse(readFileSync('voice/sentences.json', 'utf8')).map((s) => s.id));
  let n = 0;
  for (const f of readdirSync(dir)) if (f.endsWith('.mp3') && !used.has(f.slice(0, -4))) (unlinkSync(`${dir}/${f}`), n++);
  console.log(`pruned ${n} unused recordings`);
}
const ids = readdirSync(dir)
  .filter((f) => f.endsWith('.mp3'))
  .map((f) => f.slice(0, -4))
  .sort();
const cfg = existsSync('voice/config.json') ? JSON.parse(readFileSync('voice/config.json', 'utf8')) : {};
writeFileSync(`${dir}/index.json`, JSON.stringify({ voice: cfg.voice ?? null, ids }));
console.log(`voice index: ${ids.length} recordings`);
