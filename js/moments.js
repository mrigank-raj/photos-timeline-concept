// Version B logic: groups photos into moments. Reads only people, place, scene, type and ts,
// never eventId (that field stands in for knowledge the app must not have).
import { PEOPLE, EVERYDAY_PLACES } from './library.js';
import { MOMENT_MAX_GAP_HOURS, MOMENT_PEOPLE_JACCARD_MIN, MOMENT_JACCARD_MIN_GAP_HOURS } from './config.js';

const DAY = 864e5, HOUR = 36e5;
const dayOf = ts => Math.floor(ts / DAY);
const isClutter = p => p.type === 'screenshot' || p.type === 'forward';
const PERSON_ORDER = Object.fromEntries(PEOPLE.map((p, i) => [p.id, i]));

export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  for (const x of B) if (A.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

// photos: sorted by time, oldest first. Returns moments oldest first.
export function buildMoments(photos) {
  // 1. Walk camera and burst photos; start a new moment on place change, a time gap, or different people.
  const groups = [];
  let cur = null;
  for (const p of photos) {
    if (isClutter(p)) continue;
    if (cur) {
      const last = cur.photos[cur.photos.length - 1], gapH = (p.ts - last.ts) / HOUR;
      const newDayOrGap = EVERYDAY_PLACES.includes(p.place) ? dayOf(p.ts) !== dayOf(last.ts) : gapH > MOMENT_MAX_GAP_HOURS;
      // People check only after a long gap, and skipped when either side has no people (landscapes, food).
      const otherPeople = gapH > MOMENT_JACCARD_MIN_GAP_HOURS && p.people.length > 0 && cur.people.size > 0
        && jaccard(p.people, cur.people) < MOMENT_PEOPLE_JACCARD_MIN;
      if (p.place !== cur.place || newDayOrGap || otherPeople) cur = null;
    }
    if (!cur) groups.push(cur = { place: p.place, photos: [], people: new Set() });
    cur.photos.push(p);
    for (const x of p.people) cur.people.add(x);
  }

  // 2. Attach each screenshot/forward to the moment it falls inside, else the nearest moment on its day.
  for (const p of photos) {
    if (!isClutter(p)) continue;
    let best = null, bestDist = Infinity;
    for (const g of groups) {
      const a = g.photos[0].ts, b = g.photos[g.photos.length - 1].ts;
      if (dayOf(p.ts) < dayOf(a) || dayOf(p.ts) > dayOf(b)) continue;
      const dist = p.ts < a ? a - p.ts : p.ts > b ? p.ts - b : 0;
      if (dist < bestDist) { best = g; bestDist = dist; }
    }
    if (!best) for (const g of groups) {   // fallback (not expected with this library): nearest moment overall
      const dist = Math.min(Math.abs(g.photos[0].ts - p.ts), Math.abs(g.photos[g.photos.length - 1].ts - p.ts));
      if (dist < bestDist) { best = g; bestDist = dist; }
    }
    best.photos.push(p);
  }

  // 3. Moment objects.
  return groups.map((g, k) => {
    const all = g.photos.sort((a, b) => a.ts - b.ts);
    const real = all.filter(p => !isClutter(p));
    const count = new Map(), tags = new Map();
    for (const p of real) {
      for (const x of p.people) count.set(x, (count.get(x) || 0) + 1);
      for (const t of p.scene) tags.set(t, (tags.get(t) || 0) + 1);
    }
    const startTs = all[0].ts, endTs = all[all.length - 1].ts, mid = (startTs + endTs) / 2;
    // Cover: most people; tie -> closest to the middle of the moment. One photo per burst; never clutter.
    const seenBurst = new Set();
    const candidates = real.filter(p => !p.burstId || (!seenBurst.has(p.burstId) && seenBurst.add(p.burstId)));
    const cover = candidates.reduce((best, p) =>
      p.people.length > best.people.length || (p.people.length === best.people.length && Math.abs(p.ts - mid) < Math.abs(best.ts - mid)) ? p : best);
    return {
      id: 'm' + String(k + 1).padStart(4, '0'),
      startTs,
      endTs,
      photoIds: all.map(p => p.id),
      people: [...count].sort((a, b) => b[1] - a[1] || PERSON_ORDER[a[0]] - PERSON_ORDER[b[0]]).map(e => e[0]),
      place: g.place,
      sceneTags: [...tags].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4).map(e => e[0]),
      coverId: cover.id,
    };
  });
}
