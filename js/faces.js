// Face row under the header and tick marks on the scroll bar. v2: reads people after the user's
// "Not this person" corrections (people.js) and updates the moment they change.
// Tap a face: ticks show every moment with that person; photos and moments without them dim.
// Two faces: only where both are in the same photo. A third tap replaces the oldest selection.
import { PEOPLE } from './library.js';
import { peopleOf, byId, onPeopleChange } from './people.js';
import { drawFace } from './draw.js';
import { MAX_FACES, TICK_MERGE_PX, TICK_TAP_HEIGHT, DIM_OPACITY } from './config.js';
import { emit, order } from './timeline.js';

const CHECK = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor"/></svg>';
const INFO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="currentColor"/></svg>';

// Moments (newest first) where one photo has all the selected people. Exported for tests.
export function matchingMoments(moments, selected) {
  const hasAll = p => { const ppl = peopleOf(p); return selected.every(s => ppl.includes(s)); };
  return moments.map(m => m.photoIds.some(id => hasAll(byId.get(id))));
}
// Keep a tick only if it sits at least TICK_MERGE_PX below the last kept one; merged ticks jump to the newest moment.
export function mergeTicks(ticks, minGap = TICK_MERGE_PX) {
  const out = [];
  for (const t of ticks) {
    if (out.length && t.y - out[out.length - 1].y < minGap) out[out.length - 1].n++;
    else out.push({ ...t, n: 1 });
  }
  return out;
}

export function initFaces(header, root, tl, scrub, debug = false) {
  document.documentElement.style.setProperty('--dim', DIM_OPACITY);
  header.insertAdjacentHTML('afterend', `
    <div class="face-row" role="group" aria-label="People">
      ${PEOPLE.map(p => `<button class="face" data-id="${p.id}" aria-pressed="false">
        <span class="face-pic"><canvas width="132" height="132"></canvas><span class="face-check">${CHECK}</span></span>
        <span class="face-name">${p.name}</span></button>`).join('')}
      <button class="face-clear" hidden>Clear</button>
    </div>`);
  const row = header.nextElementSibling, clearBtn = row.querySelector('.face-clear');
  root.insertAdjacentHTML('beforeend', `<div class="never-together" hidden>${INFO}<span>Never together in your photos</span></div>`);
  const never = root.querySelector('.never-together');
  for (const c of row.querySelectorAll('canvas')) drawFace(c.getContext('2d'), c.closest('.face').dataset.id, c.width);

  let selected = [], momentsOverride = null;
  let photoMatch = null, momentMatch = null, tickYs = [];

  function renderTicks() {
    const layer = scrub.tickLayer;
    layer.textContent = '';
    if (!selected.length || !momentMatch) { layer.dataset.raw = layer.dataset.merged = 0; return; }
    const raw = [];
    momentMatch.forEach((on, k) => { if (on) raw.push({ y: scrub.yAt(tl.momentFrac(k)), k }); });
    const ticks = mergeTicks(raw);
    tickYs = ticks;
    for (const t of ticks) {
      const b = document.createElement('button');
      b.className = 'scrub-tick';
      b.style.top = (t.y - TICK_TAP_HEIGHT / 2) + 'px';
      b.style.height = TICK_TAP_HEIGHT + 'px';
      b.dataset.k = t.k;
      b.setAttribute('aria-label', 'Jump to these photos');
      b.innerHTML = '<span></span>';
      layer.append(b);
    }
    layer.dataset.raw = raw.length;
    layer.dataset.merged = ticks.length;
  }
  // Tap areas (40 px) overlap when ticks are close: a tap goes to the tick whose mark is nearest the finger.
  scrub.tickLayer.addEventListener('click', e => {
    if (!e.target.closest('.scrub-tick') || !tickYs.length) return;
    const y = e.clientY - scrub.tickLayer.getBoundingClientRect().top;
    const t = tickYs.reduce((a, b) => Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a);
    tl.goToMoment(t.k, 'tickJump');
  });

  function update() {
    for (const b of row.querySelectorAll('.face')) b.setAttribute('aria-pressed', selected.includes(b.dataset.id));
    clearBtn.hidden = !selected.length;
    if (selected.length) {
      photoMatch = order.map(p => { const ppl = peopleOf(p); return selected.every(s => ppl.includes(s)); });
      momentMatch = matchingMoments(momentsOverride || tl.moments(), selected);
      tl.setFilter({ photo: i => photoMatch[i], moment: k => momentMatch[k] });
    } else {
      photoMatch = momentMatch = null;
      tl.setFilter(null);
    }
    never.hidden = !(selected.length === 2 && !momentMatch.some(Boolean));
    renderTicks();
  }
  row.addEventListener('click', e => {
    const b = e.target.closest('.face');
    if (b) {
      const id = b.dataset.id;
      if (selected.includes(id)) selected = selected.filter(x => x !== id);
      else { selected.push(id); if (selected.length > MAX_FACES) selected.shift(); }
      emit('faceTap', { id, selected: [...selected] });
      update();
    } else if (e.target.closest('.face-clear')) {
      selected = [];
      emit('faceClear');
      update();
    }
  });
  scrub.onLayout(renderTicks);
  onPeopleChange(update);

  const api = {
    reset() { selected = []; update(); },   // called at the start of each task
    selected: () => [...selected],
  };
  // QA only: pretend the library has no moment where the selected pair meet, to show "Never together".
  if (debug) window.__faces = { ...api, overrideMoments(list) { momentsOverride = list; update(); } };
  return api;
}
