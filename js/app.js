// MVP v2 (docs/mvp-v2.md): timeline with moments, faces and corrections, "Same people, other times" in
// the viewer, first-run intro, people screen and "Try a task". Nothing is logged or sent anywhere.
import { photos, PEOPLE } from './library.js';
import { drawPhoto } from './draw.js';
import { initTimeline, events, order, fmtRange, fmtMonth } from './timeline.js';
import { initScrubber } from './scrubber.js';
import { buildMoments } from './moments.js';
import { initSpeed } from './speed.js';
import { initFaces } from './faces.js';
import { similarMoments } from './similar.js';
import { peopleOf, removePerson, restorePerson, onPeopleChange, momentPeople, faceSrc, nameOf } from './people.js';
import { TASKS } from './tasks.js';
import { PREVIEW_MS, TOAST_MS, NUDGE_AFTER_SWIPES, PICK_DEBOUNCE_MS } from './config.js';

// All user-visible text in one place.
const COPY = {
  hint: 'Flicked fast? Here are your moments. Tap one to jump in.',
  close: 'Close',
  noticed: 'What Photos noticed',
  people: 'People',
  noPeople: 'No people',
  place: 'Place',
  scene: 'Scene',
  photos: 'Photos',
  noticedWhy: 'Moments are built from these signals: who is in the photos, where and when they were taken, and what is in them.',
  openMoment: 'Open this moment',
  inPhoto: 'People in this photo',
  notThis: 'Not this person',
  removed: name => `Removed ${name} from this photo`,
  undo: 'Undo',
  similar: 'Same people, other times',
  here: 'Here',
  intro: ['Flick fast to see moments', 'Tap a face to see where they appear', 'Open a photo to compare similar moments'],
  skip: 'Skip',
  next: 'Next',
  getStarted: 'Get started',
  done: 'Done',
  phoneTitle: 'Pretend this is your phone',
  phoneIntro: 'These are the people in your photos.',
  personLine: { you: 'the owner of this phone', kabir: 'your college friend', dev: 'your college friend', anaya: 'your cousin', ma: 'your mother', bruno: 'your dog, since mid 2025' },
  gotIt: 'Got it',
  tasksTitle: 'Try a task',
  tasksIntro: "Pick a memory. You'll see the photo for 5 seconds, then find it in your timeline.",
  remember: 'Remember this photo',
  wrong: 'Not this one, keep looking',
  found: 'Found it',
  time: 'Time',
  wrongPicks: 'Wrong picks',
  another: 'Try another task',
  backToPhotos: 'Back to photos',
  wasHere: 'This is the photo you were looking for',
};

const ICON = {
  close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" fill="currentColor"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z" fill="currentColor"/></svg>',
};
// Intro illustrations. Colours come from CSS classes (.il-muted, .il-accent, .il-ink), so they follow the theme.
const ILLUSTRATION = [
  '<svg viewBox="0 0 120 60" aria-hidden="true"><g class="il-muted"><rect x="4" y="6" width="14" height="14" rx="3"/><rect x="20" y="6" width="14" height="14" rx="3"/><rect x="36" y="6" width="14" height="14" rx="3"/><rect x="4" y="22" width="14" height="14" rx="3"/><rect x="20" y="22" width="14" height="14" rx="3"/><rect x="36" y="22" width="14" height="14" rx="3"/><rect x="4" y="38" width="14" height="14" rx="3"/><rect x="20" y="38" width="14" height="14" rx="3"/></g><path class="il-line" d="M56 30h12m-5-5 5 5-5 5"/><g class="il-accent"><rect x="76" y="6" width="16" height="14" rx="3"/><rect x="76" y="23" width="16" height="14" rx="3"/><rect x="76" y="40" width="16" height="14" rx="3"/></g><g class="il-muted"><rect x="96" y="11" width="20" height="3" rx="1.5"/><rect x="96" y="28" width="20" height="3" rx="1.5"/><rect x="96" y="45" width="20" height="3" rx="1.5"/></g></svg>',
  '<svg viewBox="0 0 120 60" aria-hidden="true"><circle cx="30" cy="30" r="16" fill="#f2e2c4" class="il-ring"/><circle cx="25" cy="27" r="2" fill="#202124"/><circle cx="35" cy="27" r="2" fill="#202124"/><path d="M24 35q6 5 12 0" stroke="#202124" stroke-width="2" fill="none"/><rect x="96" y="4" width="4" height="52" rx="2" class="il-muted"/><g class="il-accent"><rect x="88" y="10" width="14" height="3" rx="1.5"/><rect x="88" y="24" width="14" height="3" rx="1.5"/><rect x="88" y="31" width="14" height="3" rx="1.5"/><rect x="88" y="47" width="14" height="3" rx="1.5"/></g></svg>',
  '<svg viewBox="0 0 120 60" aria-hidden="true"><rect x="30" y="2" width="60" height="30" rx="4" class="il-muted"/><g class="il-muted"><rect x="8" y="38" width="20" height="18" rx="3"/><rect x="62" y="38" width="20" height="18" rx="3"/><rect x="90" y="38" width="20" height="18" rx="3"/></g><rect x="35" y="38" width="20" height="18" rx="3" class="il-muted il-ring"/></svg>',
];

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const indexOfId = new Map(order.map((p, i) => [p.id, i]));
const label = s => s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const PLACE = { cafe: 'Café', chai_stall: 'Chai stall' };
const placeName = id => PLACE[id] || label(id);
const clock = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---- app shell ----
const root = $('#timeline');
const tl = initTimeline(root);
tl.setMoments(buildMoments(photos));
const scrub = initScrubber(root, tl);
initSpeed(root, tl, debug).setEnabled(true);
const faces = initFaces($('.task-bar'), root, tl, scrub, debug);   // face row sits under the task bar
document.addEventListener('gesturestart', e => e.preventDefault());   // iOS Safari ignores user-scalable=no
$('.avatar-btn img').src = faceSrc('you');
onPeopleChange(() => { tl.refresh(); tl.refreshViewer(); });

// ---- moment view hint (once per page session) ----
root.insertAdjacentHTML('beforeend', `<div class="moment-hint" role="status" hidden><span>${COPY.hint}</span><button class="icon-btn hint-close" aria-label="${COPY.close}">${ICON.close}</button></div>`);
const hint = root.querySelector('.moment-hint');
let hintShown = false;
events.addEventListener('mode', e => {
  if (e.detail.mode === 'moments' && !hintShown) { hintShown = true; hint.hidden = false; }
  else if (e.detail.mode === 'grid') hint.hidden = true;
});
hint.querySelector('.hint-close').addEventListener('click', () => { hint.hidden = true; });

// ---- bottom sheet (dialog on laptop) ----
const sheet = $('.sheet'), scrim = $('.scrim');
function openSheet(title, body) {
  sheet.innerHTML = `<div class="sheet-head"><h2>${title}</h2><button class="icon-btn sheet-close" aria-label="${COPY.close}">${ICON.close}</button></div><div class="sheet-body">${body}</div>`;
  sheet.hidden = scrim.hidden = false;
  sheet.querySelector('.sheet-close').focus({ preventScroll: true });
  return sheet;
}
function closeSheet() { sheet.hidden = scrim.hidden = true; sheet.innerHTML = ''; }
scrim.addEventListener('click', closeSheet);
sheet.addEventListener('click', e => { if (e.target.closest('.sheet-close')) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

// "What Photos noticed": the model signals a moment is built from.
events.addEventListener('momentInfo', e => {
  const { k, moment: m } = e.detail, people = momentPeople(m), n = m.photoIds.length;
  const s = openSheet(COPY.noticed, `
    <p class="sheet-sub">${fmtRange(m.startTs, m.endTs)}</p>
    <h3>${COPY.people}</h3>
    ${people.length ? `<ul class="chips">${people.map(id => `<li class="chip"><img src="${faceSrc(id)}" alt="">${nameOf(id)}</li>`).join('')}</ul>` : `<p class="muted">${COPY.noPeople}</p>`}
    <h3>${COPY.place}</h3><ul class="chips"><li class="chip">${placeName(m.place)}</li></ul>
    <h3>${COPY.scene}</h3><ul class="chips">${m.sceneTags.map(t => `<li class="chip">${label(t)}</li>`).join('')}</ul>
    <h3>${COPY.photos}</h3><p>${n}</p>
    <p class="hint">${COPY.noticedWhy}</p>
    <button class="primary sheet-action">${COPY.openMoment}</button>`);
  s.querySelector('.sheet-action').addEventListener('click', () => { closeSheet(); tl.goToMoment(k, 'momentRowTap'); });
});

// ---- toast with Undo ----
const toast = $('.toast');
let toastTimer = 0, undoFn = null;
function showToast(text, undo) {
  toast.querySelector('.toast-text').textContent = text;
  toast.querySelector('.toast-undo').textContent = COPY.undo;
  undoFn = undo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; undoFn = null; }, TOAST_MS);
}
toast.querySelector('.toast-undo').addEventListener('click', () => { const f = undoFn; toast.hidden = true; undoFn = null; f && f(); });

// ---- viewer: people in the photo, and "Same people, other times" ----
const extra = root.querySelector('.viewer-extra');
let swipeK = -1, swipes = 0, backFrom = null;
const nudged = new Set();
const resetSwipes = () => { swipes = 0; };
function renderExtra(p, i) {
  const ppl = peopleOf(p), k = tl.momentOfPhoto(i), ms = tl.moments();
  const sims = k >= 0 ? similarMoments(ms, k) : [];
  extra.innerHTML = (ppl.length ? `<section class="v-people"><h3>${COPY.inPhoto}</h3><ul>${ppl.map(id => `
      <li class="v-person"><img src="${faceSrc(id)}" alt=""><span>${nameOf(id)}</span><button class="not-btn" data-id="${id}">${COPY.notThis}</button></li>`).join('')}</ul></section>` : '')
    + (sims.length ? `<section class="v-similar"><h3>${COPY.similar}</h3><div class="strip-items"></div></section>` : '');
  if (!sims.length) return;
  const items = extra.querySelector('.strip-items');
  for (const j of [k, ...sims.map(o => o.k)].sort((a, b) => ms[a].startTs - ms[b].startTs)) {
    const b = document.createElement('button');
    b.className = 'strip-item' + (j === k ? ' here' : '');
    b.dataset.k = j;
    b.innerHTML = `<span class="strip-thumb"></span>${j === k ? `<span class="strip-here">${COPY.here}</span>` : ''}<span class="strip-date">${fmtMonth(ms[j].startTs)}</span>`;
    if (j === k) { b.setAttribute('aria-current', 'true'); b.disabled = true; }
    else b.setAttribute('aria-label', `Open the moment from ${fmtMonth(ms[j].startTs)}`);
    tl.fillCover(b.querySelector('.strip-thumb'), j);
    items.append(b);
  }
}
tl.onViewerShow(renderExtra);
extra.addEventListener('click', e => {
  const nb = e.target.closest('.not-btn'), it = e.target.closest('.strip-item');
  if (nb) {
    resetSwipes();
    const p = order[tl.viewerIndex()], id = nb.dataset.id;
    removePerson(p.id, id);
    showToast(COPY.removed(nameOf(id)), () => restorePerson(p.id, id));
  } else if (it && !it.classList.contains('here')) {
    resetSwipes();
    if (backFrom === null) backFrom = tl.gridY();
    const ci = tl.coverIndex(+it.dataset.k);
    tl.jumpTo(tl.photoTop(ci), 'similarTap');   // the timeline behind moves there too
    tl.viewerGoTo(ci);
  }
});
events.addEventListener('viewerOpen', () => { swipeK = tl.momentOfPhoto(tl.viewerIndex()); swipes = 0; });
events.addEventListener('viewerSwipe', () => {
  const k = tl.momentOfPhoto(tl.viewerIndex());
  if (k === swipeK) swipes++; else { swipeK = k; swipes = 1; }
  const sec = extra.querySelector('.v-similar');
  if (swipes >= NUDGE_AFTER_SWIPES && sec && !nudged.has(k)) {
    nudged.add(k);
    sec.classList.add('nudge');
    sec.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
});
events.addEventListener('viewerClose', () => {
  if (backFrom !== null) { tl.showBackTo(backFrom); backFrom = null; }
});

// ---- full-screen screens: intro cards, people, task preview ----
const screenEl = $('#screen');
function screen(html, cls = '') {
  screenEl.className = 'screen ' + cls;
  screenEl.innerHTML = `<div class="screen-inner">${html}</div>`;
  screenEl.hidden = false;
  screenEl.scrollTop = 0;
  return screenEl;
}
function hideScreen() { screenEl.hidden = true; screenEl.innerHTML = ''; }
const clicked = (el, sel) => new Promise(r => el.querySelector(sel).addEventListener('click', r, { once: true }));

function introCards(firstRun) {
  const s = screen(`
    <div class="intro-track">${COPY.intro.map((t, i) => `<section class="intro-card" aria-label="${i + 1} of ${COPY.intro.length}">${ILLUSTRATION[i]}<h2>${t}</h2></section>`).join('')}</div>
    <div class="intro-dots" aria-hidden="true">${COPY.intro.map(() => '<span></span>').join('')}</div>
    <div class="intro-actions"><button class="text-btn" id="skip">${COPY.skip}</button><button class="primary" id="next">${COPY.next}</button></div>`, 'intro');
  const track = s.querySelector('.intro-track'), dots = s.querySelectorAll('.intro-dots span'), next = s.querySelector('#next');
  const last = COPY.intro.length - 1, at = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const sync = () => {
    const i = at();
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    next.textContent = i === last ? (firstRun ? COPY.getStarted : COPY.done) : COPY.next;
  };
  track.addEventListener('scroll', sync, { passive: true });
  sync();
  return new Promise(res => {
    s.querySelector('#skip').addEventListener('click', res, { once: true });
    next.addEventListener('click', () => {
      const i = at();
      if (i >= last) res();
      else track.scrollTo({ left: (i + 1) * track.clientWidth, behavior: 'smooth' });
    });
  });
}
async function peopleScreen() {
  const s = screen(`
    <h1>${COPY.phoneTitle}</h1>
    <p class="lead">${COPY.phoneIntro}</p>
    <ul class="people">${[...PEOPLE.map(p => p.id), 'bruno'].map(id => `<li><img src="${faceSrc(id)}" alt=""><span><b>${id === 'bruno' ? 'Bruno' : nameOf(id)}</b>, ${COPY.personLine[id]}</span></li>`).join('')}</ul>
    <button class="primary" id="ok">${COPY.gotIt}</button>`, 'people-screen');
  await clicked(s, '#ok');
  hideScreen();
}
$('.help-btn').addEventListener('click', async () => { await introCards(false); hideScreen(); });
$('.avatar-btn').addEventListener('click', peopleScreen);

// ---- Try a task ----
const taskBar = $('.task-bar'), taskBtn = $('.task-btn'), timerEl = $('.task-timer');
const peek = $('#peek'), peekCanvas = peek.querySelector('canvas'), thumbCanvas = taskBar.querySelector('.task-thumb canvas');
let task = null, lastPick = -1e9;
function openTaskList() {
  const s = openSheet(COPY.tasksTitle, `<p class="sheet-sub">${COPY.tasksIntro}</p>
    <ul class="task-list">${TASKS.map((t, i) => `<li><button class="task-item" data-i="${i}"><span>${esc(t.note)}</span>${ICON.chevron}</button></li>`).join('')}</ul>`);
  s.querySelector('.task-list').addEventListener('click', e => { const b = e.target.closest('.task-item'); if (b) startTask(TASKS[+b.dataset.i]); });
}
function preview(t) {
  const css = Math.floor(Math.min(innerWidth - 48, innerHeight - 300, 440));
  const s = screen(`<h2>${COPY.remember}</h2><p class="lead">${esc(t.note)}</p>
    <canvas class="preview" width="${css * 2}" height="${css * 2}" style="width:${css}px;height:${css}px"></canvas>
    <p class="countdown" aria-live="polite">${PREVIEW_MS / 1000}</p>`, 'preview-screen');
  drawPhoto(s.querySelector('canvas').getContext('2d'), t.target, css * 2);
  const cd = s.querySelector('.countdown'), t0 = performance.now();
  return new Promise(res => {
    const tick = setInterval(() => {
      const left = Math.ceil((PREVIEW_MS - (performance.now() - t0)) / 1000);
      if (left > 0) cd.textContent = left;
      else { clearInterval(tick); res(); }
    }, 100);
  });
}
async function startTask(t) {
  closeSheet();
  endTask();
  await preview(t);
  hideScreen();
  tl.switchMode('grid', true);
  faces.reset();
  tl.jumpTo(0, 'taskStart');
  tl.hideBack();
  drawPhoto(thumbCanvas.getContext('2d'), t.target, thumbCanvas.width);
  const big = Math.floor(Math.min(innerWidth - 40, innerHeight - 120, 480));
  peekCanvas.style.width = peekCanvas.style.height = big + 'px';
  peekCanvas.width = peekCanvas.height = big * 2;
  drawPhoto(peekCanvas.getContext('2d'), t.target, peekCanvas.width);
  taskBar.querySelector('.task-note').textContent = t.note;
  timerEl.textContent = clock(0);
  taskBar.hidden = false;
  taskBtn.hidden = true;
  tl.setPickVisible(true);
  const start = performance.now();
  task = { t, start, wrong: 0, timer: setInterval(() => { timerEl.textContent = clock(performance.now() - start); }, 250) };
}
function endTask() {
  if (!task) return;
  clearInterval(task.timer);
  task = null;
  taskBar.hidden = true;
  peek.hidden = true;
  taskBtn.hidden = false;
  tl.setPickVisible(false);
}
taskBtn.addEventListener('click', openTaskList);
taskBar.querySelector('.task-thumb').addEventListener('click', () => { peek.hidden = false; });
peek.addEventListener('click', () => { peek.hidden = true; });
taskBar.querySelector('.giveup-btn').addEventListener('click', () => {
  if (!task) return;
  const i = indexOfId.get(task.t.target.id);
  endTask();
  tl.jumpTo(tl.photoTop(i), 'giveUp');   // closing the viewer leaves the timeline at the photo
  tl.viewerGoTo(i);
  tl.viewerNote(COPY.wasHere);
});
events.addEventListener('pick', e => {
  const now = performance.now();
  if (!task || now - lastPick < PICK_DEBOUNCE_MS) return;
  lastPick = now;
  resetSwipes();
  if (e.detail.photo !== task.t.target) { task.wrong++; tl.viewerMessage(COPY.wrong); return; }
  const time = clock(now - task.start), wrong = task.wrong;
  endTask();
  tl.closeViewer();
  const s = openSheet(COPY.found, `
    <dl class="result"><div><dt>${COPY.time}</dt><dd>${time}</dd></div><div><dt>${COPY.wrongPicks}</dt><dd>${wrong}</dd></div></dl>
    <button class="primary sheet-action" id="another">${COPY.another}</button>
    <button class="text-btn sheet-action" id="home">${COPY.backToPhotos}</button>`);
  s.querySelector('#another').addEventListener('click', openTaskList);
  s.querySelector('#home').addEventListener('click', closeSheet);
});

// ---- first run ----
// ?intro=0 skips and ?intro=1 forces the intro (QA). localStorage only remembers that it was seen.
let seen = false;
try { seen = localStorage.getItem('photos-concept-intro') === '1'; } catch { /* private mode: show it */ }
if (params.get('intro') === '1' || (!seen && params.get('intro') !== '0')) {
  (async () => {
    await introCards(true);
    await peopleScreen();
    try { localStorage.setItem('photos-concept-intro', '1'); } catch { /* ignore */ }
  })();
}

if (debug) Object.assign(window, { __tl: tl, __faces: faces, __tasks: TASKS, __startTask: startTask, __order: order });
