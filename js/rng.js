// mulberry32: integer-only maths, so every browser gives the same sequence for a seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    chance: p => next() < p,
    pick: arr => arr[Math.floor(next() * arr.length)],
    // entries: [[item, weight], ...]
    weighted(entries) {
      let r = next() * entries.reduce((s, e) => s + e[1], 0);
      for (const [item, w] of entries) if ((r -= w) < 0) return item;
      return entries[entries.length - 1][0];
    },
  };
}

// FNV-1a, for per-photo drawing variation.
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
