// "Same people, other times": the similarity logic from the test build's strip.js, unchanged, except that
// a moment's people come from people.js (after "Not this person" corrections).
import {
  STRIP_WEIGHT_PEOPLE, STRIP_WEIGHT_SCENE, STRIP_PEOPLE_JACCARD_MIN, STRIP_EXCLUDE_DAYS, STRIP_MAX_OTHERS,
} from './config.js';
import { jaccard } from './moments.js';
import { momentPeople } from './people.js';

const DAY = 864e5;

// moments: any order. Returns up to STRIP_MAX_OTHERS [{ k, score }], best first. Moments with no people get nothing.
export function similarMoments(moments, k) {
  const m = moments[k], mp = momentPeople(m);
  if (!mp.length) return [];
  const out = [];
  moments.forEach((o, j) => {
    if (j === k) return;
    const gap = o.startTs > m.endTs ? o.startTs - m.endTs : m.startTs > o.endTs ? m.startTs - o.endTs : 0;
    if (gap < STRIP_EXCLUDE_DAYS * DAY) return;
    const people = jaccard(mp, momentPeople(o));
    if (people < STRIP_PEOPLE_JACCARD_MIN) return;
    out.push({ k: j, score: STRIP_WEIGHT_PEOPLE * people + STRIP_WEIGHT_SCENE * jaccard(m.sceneTags, o.sceneTags) });
  });
  // Best score first; ties go to the moment nearest in time (deterministic).
  return out.sort((a, b) => b.score - a.score || Math.abs(moments[a.k].startTs - m.startTs) - Math.abs(moments[b.k].startTs - m.startTs)).slice(0, STRIP_MAX_OTHERS);
}
