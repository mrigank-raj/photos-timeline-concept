// "Try a task": the 4 tested tasks with the same target photos, written as rough memories (no exact years).
// Targets are found from photo metadata (eventId is used here only, never shown).
import { photos } from './library.js';

const eq = (people, s) => [...people].sort().join() === s.split(' ').sort().join();
const ym = p => new Date(p.ts).toISOString().slice(0, 7);

export const TASKS = [
  { id: 'S1T1', note: 'Ma and Anaya lighting diyas, one of the Diwalis a few years back',
    match: p => p.eventId === 'diwali23' && eq(p.people, 'ma anaya') && p.pose === 'lighting' },
  { id: 'S1T2', note: 'Kabir alone at a chai stall, a normal weekday in early 2025',
    match: p => eq(p.people, 'kabir') && p.place === 'chai_stall' && ym(p) >= '2025-03' && ym(p) <= '2025-04' },
  { id: 'S2T1', note: 'You and Anaya with sparklers on Diwali, maybe two years ago',
    match: p => p.eventId === 'diwali24' && eq(p.people, 'you anaya') && p.scene.includes('sparklers') },
  { id: 'S2T2', note: 'Dev working at his desk, an ordinary day towards the end of 2024',
    match: p => eq(p.people, 'dev') && p.place === 'desk' && ym(p) >= '2024-10' && ym(p) <= '2024-12' },
];

for (const t of TASKS) {
  const hits = photos.filter(t.match);
  if (hits.length !== 1 || hits[0].type !== 'camera') throw new Error(`Task ${t.id}: ${hits.length} targets`);
  t.target = hits[0];
}
