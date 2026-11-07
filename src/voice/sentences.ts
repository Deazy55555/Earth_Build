/** Shared between the app and the recording script, so both cut text the same way. */

/** Split read-aloud text into sentences (not after "St." / "Mt." or initials like "T. rex" / "D.C."). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<!\b(?:St|Mt|Dr|Mr|Mrs|Ms|[A-Z])\.)(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** cyrb53: a small, fast 53-bit string hash (same in the Python recorder). */
export function hashSentence(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
