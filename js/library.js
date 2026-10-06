import {
  SEED, LIBRARY_START, TODAY, BRUNO_FROM, ORDINARY_DAY_CHANCE, ORDINARY_PHOTOS_MIN, ORDINARY_PHOTOS_MAX,
  SCREENSHOT_COUNT, FORWARD_COUNT, BURST_COUNT, BURST_SIZE_MIN, BURST_SIZE_MAX,
} from './config.js';
import { makeRng } from './rng.js';

export const PEOPLE = [
  { id: 'you', name: 'You' },
  { id: 'kabir', name: 'Kabir' },
  { id: 'dev', name: 'Dev' },
  { id: 'anaya', name: 'Anaya' },
  { id: 'ma', name: 'Ma' },
];

export const EVERYDAY_PLACES = ['home', 'chai_stall', 'desk', 'street', 'park', 'market'];

export const SCENE_TAGS = [
  'diyas', 'sparklers', 'rangoli', 'night', 'festive', 'beach', 'sea', 'sunset', 'sky', 'mountains',
  'snow', 'bike', 'river', 'ghats', 'temple', 'boat', 'bridge', 'trees', 'stage', 'crowd', 'palace',
  'wedding', 'cake', 'balloons', 'coffee', 'food', 'chai', 'laptop', 'indoor', 'street', 'shopping',
  'flowers', 'colonial', 'dog', 'chat', 'map', 'ticket', 'payment', 'meme', 'quote', 'greeting',
];

const DAY = 864e5, MIN = 6e4;
// Wall-clock time stored as UTC, so every device shows the same dates whatever its timezone.
const at = (y, m, d, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min);
const dayOf = ts => Math.floor(ts / DAY);
const list = s => (s ? s.split(' ') : []);

// Shot templates: [people, pose, scene, weight].
// The three Diwalis share one list on purpose: they must look alike.
// Exact pairs used by task targets ({ma,anaya}, {you,anaya}) are planted, never generated.
const DIWALI = [
  ['you ma anaya kabir', 'group', 'diyas night festive', 4],
  ['you ma anaya kabir', 'selfie', 'diyas night festive', 2],
  ['you ma', 'standing', 'diyas rangoli festive', 2],
  ['ma', 'lighting', 'diyas night festive', 2],
  ['anaya', 'sparklers', 'sparklers night festive', 2],
  ['you kabir', 'sparklers', 'sparklers night festive', 2],
  ['ma anaya kabir', 'standing', 'rangoli diyas festive', 1],
  ['', 'none', 'rangoli diyas festive', 2],
  ['', 'none', 'food festive', 1],
];
const BDAY = [
  ['you ma anaya dev kabir', 'group', 'cake balloons night', 4],
  ['you', 'standing', 'cake balloons', 2],
  ['you kabir dev', 'selfie', 'balloons night', 2],
  ['you ma', 'standing', 'cake', 1],
  ['ma kabir dev', 'standing', 'balloons', 1],
  ['', 'none', 'cake balloons', 2],
];

export const EVENTS = [
  { id: 'diwali23', from: [2023, 11, 12], days: 1, place: 'home', people: 'you ma anaya kabir', count: 30, hours: [18, 23], shots: DIWALI },
  { id: 'goa23', from: [2023, 12, 26], days: 5, place: 'goa', people: 'you kabir anaya dev', count: 90, hours: [8, 22], shots: [
    ['you kabir anaya dev', 'group', 'beach sea', 4],
    ['you kabir anaya dev', 'selfie', 'beach sunset', 2],
    ['kabir dev', 'standing', 'beach sea', 2],
    ['you kabir', 'sitting', 'beach sea', 2],
    ['anaya', 'standing', 'beach sunset', 2],
    ['you', 'standing', 'beach sea', 1],
    ['you kabir anaya dev', 'dancing', 'beach night festive', 1],
    ['', 'none', 'beach sunset sky', 2],
    ['', 'none', 'food beach', 1],
  ] },
  { id: 'fest24', from: [2024, 2, 16], days: 2, place: 'college', people: 'you kabir dev', count: 50, hours: [11, 23], shots: [
    ['you kabir dev', 'group', 'stage crowd', 3],
    ['you kabir dev', 'selfie', 'crowd festive', 2],
    ['kabir', 'dancing', 'stage crowd night', 1],
    ['you dev', 'dancing', 'stage crowd night', 1],
    ['dev', 'standing', 'stage', 1],
    ['', 'none', 'stage crowd', 2],
    ['', 'none', 'food', 1],
  ] },
  { id: 'varanasi24', from: [2024, 3, 8], days: 3, place: 'varanasi', people: 'you ma', count: 45, hours: [6, 21], shots: [
    ['you ma', 'standing', 'river ghats', 3],
    ['you ma', 'selfie', 'river ghats temple', 2],
    ['ma', 'standing', 'temple ghats', 2],
    ['ma', 'sitting', 'river ghats boat', 1],
    ['', 'none', 'river ghats night', 2],
    ['', 'none', 'temple', 1],
    ['', 'none', 'food', 1],
  ] },
  { id: 'ladakh24', from: [2024, 6, 10], days: 7, place: 'ladakh', people: 'you kabir', count: 110, hours: [7, 20], shots: [
    ['you kabir', 'standing', 'mountains sky', 4],
    ['you kabir', 'selfie', 'mountains snow', 2],
    ['kabir', 'standing', 'mountains bike', 2],
    ['you', 'standing', 'mountains snow', 2],
    ['you kabir', 'sitting', 'mountains bike', 2],
    ['', 'none', 'mountains sky', 4],
    ['', 'none', 'mountains snow', 2],
    ['', 'none', 'food', 1],
  ] },
  { id: 'bday24', from: [2024, 8, 14], days: 1, place: 'home', people: 'you ma anaya dev kabir', count: 25, hours: [18, 23], shots: BDAY },
  { id: 'diwali24', from: [2024, 11, 1], days: 1, place: 'home', people: 'you ma anaya kabir', count: 35, hours: [18, 23], shots: DIWALI },
  { id: 'wedding25', from: [2025, 2, 14], days: 2, place: 'jaipur', people: 'you ma anaya dev kabir', count: 120, hours: [11, 23], shots: [
    ['you ma anaya dev kabir', 'group', 'wedding palace festive', 4],
    ['anaya', 'standing', 'wedding palace', 3],
    ['ma anaya', 'standing', 'wedding palace festive', 2],
    ['you kabir', 'dancing', 'wedding night festive', 2],
    ['kabir dev', 'standing', 'wedding palace', 2],
    ['you ma', 'standing', 'wedding palace', 2],
    ['you kabir dev', 'selfie', 'wedding night', 2],
    ['ma anaya kabir', 'sitting', 'wedding festive', 1],
    ['', 'none', 'palace wedding', 2],
    ['', 'none', 'food wedding', 1],
  ] },
  { id: 'kabirbday25', from: [2025, 5, 18], days: 1, place: 'cafe', people: 'kabir you dev', count: 30, hours: [17, 22], shots: [
    ['kabir you dev', 'group', 'cake coffee', 3],
    ['kabir', 'standing', 'cake coffee', 2],
    ['kabir you dev', 'selfie', 'coffee', 2],
    ['kabir dev', 'sitting', 'coffee food', 1],
    ['', 'none', 'cake', 1],
    ['', 'none', 'food coffee', 1],
  ] },
  { id: 'bday25', from: [2025, 8, 14], days: 1, place: 'home', people: 'you ma anaya', count: 25, hours: [18, 23], shots: BDAY },
  { id: 'rishikesh25', from: [2025, 10, 25], days: 4, place: 'rishikesh', people: 'you dev', count: 70, hours: [7, 21], shots: [
    ['you dev', 'standing', 'river mountains', 4],
    ['you dev', 'selfie', 'river bridge', 2],
    ['dev', 'standing', 'river mountains', 2],
    ['you dev', 'sitting', 'river trees', 2],
    ['', 'none', 'river mountains', 3],
    ['', 'none', 'bridge river', 2],
    ['', 'none', 'temple night river', 1],
    ['', 'none', 'food', 1],
  ] },
  { id: 'diwali25', from: [2025, 10, 20], days: 1, place: 'home', people: 'you ma anaya kabir', count: 30, hours: [18, 23], shots: DIWALI },
  { id: 'pondi26', from: [2026, 1, 9], days: 4, place: 'pondicherry', people: 'you anaya', count: 60, hours: [8, 21], shots: [
    ['you anaya', 'standing', 'beach sea', 3],
    ['you anaya', 'selfie', 'colonial flowers', 2],
    ['anaya', 'standing', 'colonial flowers', 2],
    ['you', 'standing', 'beach sea', 1],
    ['', 'none', 'colonial flowers', 2],
    ['', 'none', 'beach sea', 2],
    ['', 'none', 'coffee food', 1],
  ] },
  { id: 'bday26', from: [2026, 8, 14], days: 1, place: 'home', people: 'you ma kabir', count: 25, hours: [18, 23], shots: BDAY },
];

// Task targets and their look-alikes, planted at fixed times. Each target differs from its
// look-alikes in date, pose or scene, so no exact duplicate exists. Never turned into bursts.
// [y, m, d, h, min, place, people, pose, scene, eventId]
const PLANTS = [
  // P: You + Bruno at home, last month (target first)
  [2026, 8, 23, 10, 40, 'home', 'you', 'sitting', 'dog indoor', null],
  [2026, 8, 29, 18, 5, 'street', 'you', 'standing', 'dog street', null],
  [2026, 7, 12, 8, 20, 'park', 'you', 'standing', 'dog trees', null],
  [2026, 3, 8, 9, 15, 'park', 'you', 'sitting', 'dog trees sky', null],
  [2025, 12, 21, 20, 30, 'home', 'you', 'selfie', 'dog indoor', null],
  // S1T1: Ma + Anaya lighting diyas, diwali23
  [2023, 11, 12, 19, 10, 'home', 'ma anaya', 'lighting', 'diyas night festive', 'diwali23'],
  [2024, 11, 1, 19, 20, 'home', 'ma anaya', 'lighting', 'diyas night festive', 'diwali24'],
  [2025, 10, 20, 19, 5, 'home', 'ma anaya', 'lighting', 'diyas night festive', 'diwali25'],
  [2023, 11, 12, 20, 30, 'home', 'ma anaya', 'standing', 'rangoli diyas festive', 'diwali23'],
  [2025, 10, 20, 21, 0, 'home', 'ma anaya', 'sitting', 'rangoli festive', 'diwali25'],
  // S2T1: You + Anaya with sparklers, diwali24
  [2024, 11, 1, 20, 15, 'home', 'you anaya', 'sparklers', 'sparklers night festive', 'diwali24'],
  [2023, 11, 12, 20, 40, 'home', 'you anaya', 'sparklers', 'sparklers night festive', 'diwali23'],
  [2025, 10, 20, 20, 20, 'home', 'you anaya', 'sparklers', 'sparklers night festive', 'diwali25'],
  [2024, 11, 1, 19, 40, 'home', 'you anaya', 'standing', 'diyas rangoli festive', 'diwali24'],
  [2025, 10, 20, 19, 30, 'home', 'you anaya', 'selfie', 'diyas night festive', 'diwali25'],
  // S1T2: Kabir alone at chai stall, Tue 18 Mar 2025
  [2025, 3, 18, 17, 20, 'chai_stall', 'kabir', 'standing', 'chai street', null],
  [2024, 2, 6, 16, 45, 'chai_stall', 'kabir', 'sitting', 'chai', null],
  [2025, 9, 16, 8, 10, 'chai_stall', 'kabir', 'sitting', 'chai street', null],
  [2026, 1, 27, 18, 0, 'chai_stall', 'kabir', 'eating', 'chai', null],
  [2025, 4, 9, 13, 30, 'street', 'kabir', 'standing', 'street', null],
  [2025, 3, 26, 11, 0, 'park', 'kabir', 'sitting', 'trees', null],
  // S2T2: Dev working at desk, Thu 21 Nov 2024
  [2024, 11, 21, 15, 10, 'desk', 'dev', 'working', 'laptop indoor', null],
  [2024, 4, 17, 11, 30, 'desk', 'dev', 'sitting', 'coffee indoor', null],
  [2025, 7, 9, 16, 0, 'desk', 'dev', 'sitting', 'laptop', null],
  [2026, 2, 18, 10, 20, 'desk', 'dev', 'eating', 'laptop food', null],
  [2024, 12, 14, 9, 40, 'park', 'dev', 'standing', 'trees', null],
  [2024, 10, 8, 18, 15, 'chai_stall', 'dev', 'sitting', 'chai', null],
  // S1T3: You + Dev at the wedding
  [2025, 2, 14, 18, 30, 'jaipur', 'you dev', 'standing', 'wedding palace', 'wedding25'],
  [2025, 2, 14, 21, 40, 'jaipur', 'you dev', 'dancing', 'wedding night festive', 'wedding25'],
  [2025, 2, 15, 13, 10, 'jaipur', 'you dev', 'selfie', 'wedding palace', 'wedding25'],
  [2025, 2, 15, 20, 15, 'jaipur', 'you dev', 'eating', 'wedding food', 'wedding25'],
  [2025, 2, 14, 12, 30, 'jaipur', 'you dev', 'sitting', 'palace', 'wedding25'],
  // S2T3: You alone by the river, rishikesh25
  [2025, 10, 26, 8, 40, 'rishikesh', 'you', 'standing', 'river mountains', 'rishikesh25'],
  [2025, 10, 27, 11, 0, 'rishikesh', 'you', 'sitting', 'temple', 'rishikesh25'],
  [2025, 10, 25, 17, 30, 'rishikesh', 'you', 'selfie', 'mountains trees', 'rishikesh25'],
  [2025, 10, 28, 13, 15, 'rishikesh', 'you', 'eating', 'food', 'rishikesh25'],
  [2024, 3, 9, 7, 30, 'varanasi', 'you', 'standing', 'river ghats', 'varanasi24'],
];

// Ordinary days. Bruno joins casts that are only You and/or Ma, except You alone (planted for P).
// Kabir alone and Dev alone are also only planted (S1T2, S2T2).
const ORDINARY = {
  home: { w: 4, casts: [['ma', 3], ['you ma', 3], ['you', 2], ['anaya', 1], ['ma anaya', 1], ['you anaya', 1]],
    scenes: ['indoor', 'indoor food', 'indoor flowers'], objects: ['food', 'flowers', 'indoor'] },
  chai_stall: { w: 2, casts: [['you kabir', 3], ['you dev', 2], ['kabir dev', 2], ['you kabir dev', 1], ['you', 1]],
    scenes: ['chai', 'chai street'], objects: ['chai', 'chai street'] },
  desk: { w: 3, casts: [['you', 3], ['you dev', 1], ['you kabir', 1]],
    scenes: ['laptop indoor', 'laptop coffee'], objects: ['laptop', 'coffee', 'food'] },
  street: { w: 2, casts: [['you', 2], ['you kabir', 2], ['anaya', 1], ['you anaya', 1], ['you dev', 1]],
    scenes: ['street'], objects: ['street', 'street sky', 'sky sunset'] },
  park: { w: 2, casts: [['you anaya', 2], ['ma', 2], ['you ma', 2], ['kabir dev', 1], ['you', 1]],
    scenes: ['trees', 'trees sky'], objects: ['trees sky', 'flowers', 'sky sunset'] },
  market: { w: 1, casts: [['ma', 3], ['you ma', 2], ['ma anaya', 1]],
    scenes: ['shopping', 'shopping food'], objects: ['food shopping', 'flowers shopping'] },
};
const DOG_PLACES = ['home', 'park', 'street'];

function photo(ts, place, people, pose, scene, eventId, type = 'camera') {
  return { id: '', ts, people: [...people], place, scene: [...scene], type, burstId: null, eventId, pose, isTarget: false };
}

function build() {
  const rng = makeRng(SEED);
  const out = [];

  // Planted photos first. Their days are reserved so no ordinary photos land on them.
  const reservedDays = new Set();
  for (const [y, m, d, h, min, place, people, pose, scene, eventId] of PLANTS) {
    out.push(photo(at(y, m, d, h, min), place, list(people), pose, list(scene), eventId));
    if (!eventId) reservedDays.add(dayOf(at(y, m, d)));
  }
  const planted = new Set(out);

  // Events
  for (const ev of EVENTS) {
    const start = at(...ev.from);
    const evPeople = list(ev.people);
    for (let d = 0; d < ev.days; d++) reservedDays.add(dayOf(start) + d);
    const shots = ev.shots.map(([p, pose, scene, w]) => [[list(p).filter(x => evPeople.includes(x)), pose, list(scene), list(p).length], w])
      .filter(([[people, , , wanted]]) => people.length || !wanted);
    const n = ev.count - out.filter(p => p.eventId === ev.id).length;
    for (let i = 0; i < n; i++) {
      const [people, pose, scene] = rng.weighted(shots);
      const ts = start + rng.int(0, ev.days - 1) * DAY + rng.int(ev.hours[0] * 60, ev.hours[1] * 60 - 1) * MIN;
      out.push(photo(ts, ev.place, people, people.length >= 3 && pose === 'standing' ? 'group' : pose, scene, ev.id));
    }
  }

  // Ordinary days: one place per day, so each day becomes one moment.
  const placeWeights = Object.entries(ORDINARY).map(([k, v]) => [k, v.w]);
  for (let day = dayOf(LIBRARY_START); day <= dayOf(TODAY); day++) {
    if (reservedDays.has(day) || !rng.chance(ORDINARY_DAY_CHANCE)) continue;
    const place = rng.weighted(placeWeights);
    const o = ORDINARY[place];
    const bruno = day * DAY >= BRUNO_FROM && DOG_PLACES.includes(place);
    const objectsOnly = rng.chance(0.25);
    const cast = list(rng.weighted(o.casts));
    let minute = rng.int(8 * 60, 20 * 60);
    const n = rng.int(ORDINARY_PHOTOS_MIN, ORDINARY_PHOTOS_MAX);
    for (let i = 0; i < n; i++) {
      const ts = day * DAY + Math.min(minute, 23 * 60 + 50) * MIN;
      minute += rng.int(3, 80);
      if (objectsOnly || rng.chance(0.3)) {
        const scene = bruno && rng.chance(0.4) ? ['dog', ...list(rng.pick(o.objects)).slice(0, 1)] : list(rng.pick(o.objects));
        out.push(photo(ts, place, [], 'none', scene, null));
        continue;
      }
      const scene = list(rng.pick(o.scenes));
      const youOrMa = cast.every(p => p === 'you' || p === 'ma') && cast.join() !== 'you';
      if (bruno && youOrMa && rng.chance(0.4)) scene.push('dog');
      let pose = rng.pick(['standing', 'standing', 'sitting']);
      if (cast.includes('you') && rng.chance(0.3)) pose = 'selfie';
      else if (scene.includes('laptop') && cast.length === 1) pose = 'working';
      else if ((scene.includes('food') || scene.includes('chai')) && rng.chance(0.3)) pose = 'eating';
      out.push(photo(ts, place, [...cast], pose, scene, null));
    }
  }

  // Bursts from generic camera photos (never planted ones).
  const generic = out.filter(p => !planted.has(p));
  const used = new Set();
  for (let b = 1; b <= BURST_COUNT; b++) {
    let src;
    do src = rng.pick(generic); while (used.has(src));
    used.add(src);
    src.type = 'burst';
    src.burstId = 'b' + String(b).padStart(2, '0');
    const size = rng.int(BURST_SIZE_MIN, BURST_SIZE_MAX);
    for (let k = 1; k < size; k++) out.push({ ...src, people: [...src.people], scene: [...src.scene], ts: src.ts + k * 1500 });
  }

  // Clutter, only on days that already have camera photos (so it always attaches to a moment).
  const photoDays = [...new Map(out.map(p => [dayOf(p.ts), p.place])).entries()].sort((a, b) => a[0] - b[0]);
  const clutter = (count, type, scenes) => {
    for (let i = 0; i < count; i++) {
      const [day, place] = rng.pick(photoDays);
      out.push(photo(day * DAY + rng.int(8 * 60, 23 * 60) * MIN, place, [], 'none', [rng.pick(scenes)], null, type));
    }
  };
  clutter(SCREENSHOT_COUNT, 'screenshot', ['chat', 'map', 'ticket', 'payment']);
  clutter(FORWARD_COUNT, 'forward', ['meme', 'quote', 'greeting']);

  out.sort((a, b) => a.ts - b.ts);
  out.forEach((p, i) => { p.id = 'p' + String(i + 1).padStart(5, '0'); });
  return out;
}

export const photos = build();
