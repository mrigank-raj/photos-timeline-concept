// Who is in each photo, after the user's "Not this person" corrections (this page session only).
// p.people is the simulated face model's output; corrections sit on top of it and are never stored.
import { photos, PEOPLE } from './library.js';
import { drawFace } from './draw.js';

export const byId = new Map(photos.map(p => [p.id, p]));
export const nameOf = id => PEOPLE.find(p => p.id === id)?.name ?? id;
const removed = new Map();   // photo id -> Set of person ids removed by the user
const listeners = [];
let version = 0;
const cache = new Map();     // moment id -> { version, people }

export function peopleOf(p) {
  const r = removed.get(p.id);
  return r ? p.people.filter(x => !r.has(x)) : p.people;
}
function changed() { version++; listeners.forEach(f => f()); }
export function removePerson(photoId, person) {
  if (!removed.has(photoId)) removed.set(photoId, new Set());
  removed.get(photoId).add(person);
  changed();
}
export function restorePerson(photoId, person) {
  removed.get(photoId)?.delete(person);
  changed();
}
export const onPeopleChange = fn => listeners.push(fn);

// A moment's people (most frequent first, as built), minus anyone no longer in any of its photos.
export function momentPeople(m) {
  const c = cache.get(m.id);
  if (c && c.version === version) return c.people;
  const people = version ? m.people.filter(x => m.photoIds.some(id => peopleOf(byId.get(id)).includes(x))) : m.people;
  cache.set(m.id, { version, people });
  return people;
}

// Small face images, drawn once and reused everywhere (moment rows, viewer, sheets).
const urls = new Map();
export function faceSrc(id) {
  if (!urls.has(id)) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    drawFace(c.getContext('2d'), id, 96);
    urls.set(id, c.toDataURL('image/png'));
  }
  return urls.get(id);
}
