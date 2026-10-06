// MVP v2 timeline: grid, day headers, virtualised scrolling, Back pill, moment view and the photo viewer.
// Both views share one scroller and one set of drawn images. Tiles on screen are drawn first, then the
// rest in the background, nearest to where the user is (no full-library wait).
import { photos } from './library.js';
import { drawPhoto } from './draw.js';
import { momentPeople, faceSrc, nameOf } from './people.js';
import {
  LAPTOP_MIN_WIDTH, GRID_GAP, DAY_HEADER_HEIGHT, RENDER_BUFFER_SCREENS, TILE_MAX_DPR, BACK_PILL_MS, SWIPE_MIN_PX,
  PREWARM_BATCH, PREWARM_PAUSE_MS, PREWARM_NEAR, MOMENT_COVER_SCALE, MOMENT_ROW_GAP, SETTLE_MS, VIEWER_MESSAGE_MS, VIEWER_RESERVED_PX, FALLBACK_SLICE_MS,
} from './config.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Timestamps are wall-clock time stored as UTC (see library.js), so format with UTC getters.
export const fmtDay = ts => { const d = new Date(ts); return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const fmtMonth = ts => { const d = new Date(ts); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// "12 Nov 2023", "26 to 30 Dec 2023", "28 Feb to 2 Mar 2024", "30 Dec 2023 to 2 Jan 2024"
export function fmtRange(a, b) {
  const A = new Date(a), B = new Date(b);
  const d = x => x.getUTCDate(), m = x => MONTHS[x.getUTCMonth()], y = x => x.getUTCFullYear();
  if (y(A) !== y(B)) return `${d(A)} ${m(A)} ${y(A)} to ${d(B)} ${m(B)} ${y(B)}`;
  if (m(A) !== m(B)) return `${d(A)} ${m(A)} to ${d(B)} ${m(B)} ${y(B)}`;
  if (d(A) !== d(B)) return `${d(A)} to ${d(B)} ${m(B)} ${y(B)}`;
  return `${d(A)} ${m(A)} ${y(A)}`;
}

// Events for logging and features: jump {reason}, mode {mode}, beforeMode {to}, momentRowTap, backTap,
// predraw {done, total}, predrawDone {ms}, viewerOpen, viewerSwipe, viewerClose, pick.
// scrubber.js adds yearTap, scrubberDrag, scrubberEnd.
export const events = new EventTarget();
export const emit = (type, detail = {}) => events.dispatchEvent(new CustomEvent(type, { detail }));

// Display order: newest first.
export const order = photos.slice().reverse();
const indexOf = new Map(order.map((p, i) => [p.id, i]));
const days = [];
for (let i = 0; i < order.length; i++) {
  const key = Math.floor(order[i].ts / 864e5), last = days[days.length - 1];
  if (last && last.key === key) last.end = i + 1;
  else days.push({ key, ts: order[i].ts, start: i, end: i + 1, row: 0 });
}

const ICON = {
  back: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" fill="currentColor"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z" fill="currentColor"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  stack: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 6h16v3H4zm0 5h16v3H4zm0 5h16v3H4z" fill="currentColor"/></svg>',
};

export function initTimeline(root) {
  const t0 = performance.now();
  root.insertAdjacentHTML('beforeend', `
    <div class="scroller"><div class="content"></div></div>
    <div class="moments-pill" hidden>${ICON.stack}<span>Moments · tap one to open</span></div>
    <button class="back-pill" hidden>${ICON.back}<span>Back</span></button>
    <div class="viewer" hidden role="dialog" aria-label="Photo viewer">
      <div class="viewer-top"><button class="icon-btn viewer-close" aria-label="Back to timeline">${ICON.back}</button></div>
      <div class="viewer-stage">
        <canvas class="viewer-photo"></canvas>
        <button class="icon-btn viewer-prev" aria-label="Newer photo">${ICON.prev}</button>
        <button class="icon-btn viewer-next" aria-label="Older photo">${ICON.next}</button>
      </div>
      <div class="viewer-info">
        <p class="viewer-date"></p>
        <p class="viewer-note" role="status" hidden></p>
        <div class="viewer-extra"></div>
      </div>
      <div class="viewer-actions" hidden><p class="viewer-msg" role="status" hidden></p><button class="primary viewer-pick">This is it</button></div>
    </div>`);
  const $ = s => root.querySelector(s);
  const scroller = $('.scroller'), content = $('.content'), backPill = $('.back-pill'), momentsPill = $('.moments-pill');
  const viewer = $('.viewer'), vCanvas = $('.viewer-photo'), vDate = $('.viewer-date');
  const layoutListeners = [], frameListeners = [], scrollListeners = [];
  root.dataset.mode = 'grid';

  // ---- layouts ----
  // grid: day headers (from = -1) and tile rows. mom: one row per moment. Both newest first.
  // O is the screen offset of the active layout: a row sits at O + row.top. Switching views changes O
  // instead of scrollTop, so a fling keeps going (iOS overwrites scrollTop set during momentum).
  // O goes back to 0 once scrolling is idle (settle).
  let viewH = scroller.clientHeight, width = 0, cols = 4, tile = 0, cover = 0, tilePx = 0, coverPx = 0;
  const grid = { rows: [], total: 0 }, mom = { rows: [], total: 0 };
  const photoRow = new Int32Array(order.length), photoMoment = new Int32Array(order.length).fill(-1);
  let L = grid, mode = 'grid', O = 0, ms = [];
  let filter = null;   // faces.js: { photo(displayIndex), moment(momentIndex) } -> true if it matches; others dim

  function layout() {
    width = scroller.clientWidth;
    cols = width >= LAPTOP_MIN_WIDTH ? 6 : 4;
    tile = (width - GRID_GAP * (cols - 1)) / cols;
    cover = Math.round(tile * MOMENT_COVER_SCALE);
    if (!tilePx) {   // images are drawn once at the first layout's size; after a resize CSS scales them
      const dpr = Math.min(devicePixelRatio || 1, TILE_MAX_DPR);
      tilePx = Math.round(tile * dpr);
      coverPx = Math.round(cover * dpr);
    }
    grid.rows = [];
    let top = 0;
    for (const d of days) {
      d.row = grid.rows.length;
      grid.rows.push({ top, h: DAY_HEADER_HEIGHT, day: d, from: -1, to: -1 });
      top += DAY_HEADER_HEIGHT;
      for (let i = d.start; i < d.end; i += cols) {
        const to = Math.min(i + cols, d.end);
        for (let k = i; k < to; k++) photoRow[k] = grid.rows.length;
        grid.rows.push({ top, h: tile + GRID_GAP, day: d, from: i, to });
        top += tile + GRID_GAP;
      }
    }
    grid.total = top;
    layoutMoments();
    content.style.setProperty('--cols', cols);
    content.style.setProperty('--tile', tile + 'px');
    content.style.setProperty('--cover', cover + 'px');
    clearLive();
    O = 0;
    setHeight(0);
  }
  function layoutMoments() {
    const h = cover + MOMENT_ROW_GAP;
    mom.rows = ms.map((m, i) => ({ top: i * h, h, m: i }));
    mom.total = ms.length * h;
  }
  const maxOf = lay => Math.max(0, lay.total - viewH);
  function rowAt(lay, y) {  // last row whose top <= y
    let lo = 0, hi = lay.rows.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lay.rows[mid].top <= y) lo = mid; else hi = mid - 1; }
    return lo;
  }
  // The row whose content is at position y: inside a row's bottom gap, that is the next row.
  function visibleRow(lay, y, content) {
    const r = rowAt(lay, y);
    return y - lay.rows[r].top >= content(lay.rows[r]) && r + 1 < lay.rows.length ? r + 1 : r;
  }
  const photoAt = gy => { const r = grid.rows[visibleRow(grid, gy, r => r.from < 0 ? r.h : tile)]; return r.from < 0 ? r.day.start : r.from; };
  // Grid position where moment m starts: its day header if its newest photo opens the day.
  function gridTopOfMoment(m) {
    const s = ms[m].first, row = grid.rows[photoRow[s]];
    return row.from === s && row.day.start === s ? grid.rows[row.day.row].top : row.top;
  }
  const momentAt = y => visibleRow(mom, Math.max(0, y - O), () => cover);
  // Where the screen is, in grid coordinates (in moment view: the start of the top moment).
  const gridY = () => mode === 'grid' ? scroller.scrollTop - O : gridTopOfMoment(momentAt(scroller.scrollTop));
  function setHeight(atLeastY) { content.style.height = Math.max(O + L.total, atLeastY + viewH) + 'px'; }

  // ---- images: every tile and moment cover is drawn once (worker), decoded, and kept ----
  // Keys: 't<display index>' for grid tiles, 'c<moment index>' for covers.
  const images = new Map(), pending = new Set(), waitingEl = new Map();
  let lastScrollT = 0, nextT = 0, nextC = 0, prewarmTimer = 0, readyMs = 0;
  const photoOfKey = k => k[0] === 't' ? +k.slice(1) : ms[+k.slice(1)].cover;
  function receive({ items, bg }) {
    for (const { k, blob } of items) {
      // Loaded (not force-decoded: holding ~3,000 decoded bitmaps made WebKit stall for seconds and
      // risks Safari's memory limit). decoding='sync' makes the browser decode at paint time, so a
      // tile is never shown blank once attached.
      const im = new Image();
      im.alt = '';
      im.decoding = 'sync';
      new Promise(r => { im.onload = im.onerror = r; im.src = URL.createObjectURL(blob); }).then(() => {
        images.set(k, im);
        pending.delete(k);
        const h = waitingEl.get(k);
        if (h) { waitingEl.delete(k); if (h.isConnected && h.dataset.k === k) h.replaceChildren(im); }
        progress();
      });
    }
    if (bg) prewarm();
  }
  let drawer = null;
  // Fallback for browsers without OffscreenCanvas (e.g. iOS before 16.4): draws on the main thread in
  // slices of at most FALLBACK_SLICE_MS per frame, so the page stays responsive while pre-drawing.
  function mainThreadDrawer() {
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    let sliceStart = 0;
    const nextFrame = () => new Promise(r => requestAnimationFrame(() => { sliceStart = performance.now(); r(); }));
    return {
      async postMessage({ jobs, px, bg }) {
        const items = [];
        for (const { k, i } of jobs) {
          if (performance.now() - sliceStart > FALLBACK_SLICE_MS) await nextFrame();
          if (c.width !== px) c.width = c.height = px;
          drawPhoto(ctx, order[i], px);
          items.push({ k, blob: await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)) });
        }
        receive({ items, bg });
      },
    };
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      drawer = new Worker(new URL('./tileworker.js', import.meta.url), { type: 'module' });
      drawer.onmessage = e => receive(e.data);
      drawer.onerror = () => {   // worker failed to start: redo outstanding work on the main thread
        drawer = mainThreadDrawer();
        const keys = [...pending];
        pending.clear();
        keys.forEach(request);
        prewarm();
      };
    } catch { drawer = null; }
  }
  if (!drawer) drawer = mainThreadDrawer();
  function request(k) {
    if (pending.has(k) || images.has(k)) return;
    pending.add(k);
    drawer.postMessage({ jobs: [{ k, i: photoOfKey(k) }], px: k[0] === 't' ? tilePx : coverPx });
  }
  // Draw everything else in the background, one batch in flight at a time, paused while the user is
  // scrolling. Nearest to where the user is first (within PREWARM_NEAR items either way), then the rest
  // in order. In moment view, covers come first.
  function nearJobs(prefix, center, count, photoOf, jobs) {
    for (let d = 0; d <= PREWARM_NEAR && jobs.length < PREWARM_BATCH; d++) {
      for (const i of d ? [center + d, center - d] : [center]) {
        if (i < 0 || i >= count || jobs.length >= PREWARM_BATCH) continue;
        const k = prefix + i;
        if (!images.has(k) && !pending.has(k)) { pending.add(k); jobs.push({ k, i: photoOf(i) }); }
      }
    }
  }
  function seqJobs(prefix, from, count, photoOf, jobs) {
    let n = from;
    for (; n < count && jobs.length < PREWARM_BATCH; n++) {
      const k = prefix + n;
      if (!images.has(k) && !pending.has(k)) { pending.add(k); jobs.push({ k, i: photoOf(n) }); }
    }
    return n;
  }
  function prewarm() {
    clearTimeout(prewarmTimer);
    if (performance.now() - lastScrollT < PREWARM_PAUSE_MS) { prewarmTimer = setTimeout(prewarm, PREWARM_PAUSE_MS); return; }
    const tiles = [], covers = [], coverPhoto = i => ms[i].cover;
    if (mode === 'moments') nearJobs('c', momentAt(scroller.scrollTop), ms.length, coverPhoto, covers);
    else nearJobs('t', photoAt(Math.max(0, scroller.scrollTop - O)), order.length, i => i, tiles);
    if (!covers.length && !tiles.length) nextT = seqJobs('t', nextT, order.length, i => i, tiles);
    if (!tiles.length && !covers.length) nextC = seqJobs('c', nextC, ms.length, coverPhoto, covers);
    if (tiles.length) drawer.postMessage({ jobs: tiles, px: tilePx, bg: true });
    else if (covers.length) drawer.postMessage({ jobs: covers, px: coverPx, bg: true });
  }
  // First usable: every tile on the first screen is drawn. Measured from navigation start.
  let firstKeys = null;
  function checkFirstUsable() {
    if (!firstKeys || root.dataset.firstUsable) return;
    if (firstKeys.every(k => images.has(k))) {
      root.dataset.firstUsable = Math.round(performance.now());
      emit('firstUsable', { ms: +root.dataset.firstUsable });
    }
  }
  function progress() {
    checkFirstUsable();
    const total = order.length + ms.length, done = images.size;
    if (done % PREWARM_BATCH === 0 || done === total) emit('predraw', { done, total });
    if (done === total && ms.length && !readyMs) {
      readyMs = Math.round(performance.now() - t0);
      root.dataset.tilesReady = '1';
      emit('predrawDone', { ms: readyMs });
    }
  }
  function fill(holder, k) {
    holder.dataset.k = k;
    const im = images.get(k);
    if (im) { if (holder.firstChild !== im) holder.replaceChildren(im); return; }
    holder.replaceChildren();   // grey placeholder: only possible before pre-drawing has finished
    waitingEl.set(k, holder);
    request(k);
  }

  // ---- virtualised rendering. Row elements are recycled to avoid GC pauses. ----
  const live = new Map();  // row index (in the active layout) -> element
  const pool = { header: [], row: [], moment: [] };
  function clearLive() {
    for (const el of live.values()) { el.remove(); pool[el._kind].push(el); }
    live.clear();
  }
  function make(kind, cls) {
    const el = document.createElement('div');
    el.className = cls;
    el._kind = kind;
    return el;
  }
  function makeRow(i) {
    const r = L.rows[i];
    if (L === mom) {
      let el = pool.moment.pop();
      if (!el) {
        el = make('moment', 'moment-row');
        // The info button sits next to the faces, clear of the scroll bar's year labels on the right.
        el.innerHTML = `<div class="moment-cover"></div><div class="moment-text"><div class="moment-date"></div><div class="moment-count"></div>
          <div class="moment-meta"><div class="moment-faces"></div><button class="icon-btn moment-info" aria-label="What Photos noticed">${ICON.info}</button></div></div>`;
        [el._cover, el._date, el._count, el._faces] = ['.moment-cover', '.moment-date', '.moment-count', '.moment-faces'].map(s => el.querySelector(s));
      }
      const m = ms[i].m, n = m.photoIds.length, people = momentPeople(m);
      el.style.top = O + r.top + 'px';
      el.dataset.m = i;
      el._date.textContent = fmtRange(m.startTs, m.endTs);
      el._count.textContent = `${n} ${n === 1 ? 'photo' : 'photos'}`;
      if (el._faces._key !== people.join()) {   // rows are recycled: rebuild the icons only when they change
        el._faces._key = people.join();
        el._faces.innerHTML = people.map(id => `<img src="${faceSrc(id)}" alt="${nameOf(id)}" title="${nameOf(id)}">`).join('');
      }
      el.classList.toggle('dim', !!filter && !filter.moment(i));
      fill(el._cover, 'c' + i);
      return el;
    }
    if (r.from < 0) {
      const el = pool.header.pop() || make('header', 'day-header');
      el.style.top = O + r.top + 'px';
      el.textContent = fmtDay(r.day.ts);
      return el;
    }
    const el = pool.row.pop() || make('row', 'row');
    el.style.top = O + r.top + 'px';
    while (el.children.length < cols) el.append(Object.assign(document.createElement('div'), { className: 'tile' }));
    for (let k = 0; k < el.children.length; k++) {
      const t = el.children[k], idx = r.from + k;
      t.hidden = idx >= r.to || k >= cols;
      if (t.hidden) { t.classList.remove('dim'); continue; }
      t.dataset.i = idx;
      t.classList.toggle('dim', !!filter && !filter.photo(idx));
      fill(t, 't' + idx);
    }
    return el;
  }
  function render() {
    const y = scroller.scrollTop, buf = viewH * RENDER_BUFFER_SCREENS, yn = y - O;
    for (const f of frameListeners) f(y);
    const a = rowAt(L, Math.max(0, yn - buf)), b = rowAt(L, Math.max(0, yn + viewH + buf));
    for (const [i, el] of live) if (i < a || i > b) { el.remove(); live.delete(i); pool[el._kind].push(el); }
    const frag = document.createDocumentFragment();
    for (let i = a; i <= b; i++) if (!live.has(i)) { const el = makeRow(i); live.set(i, el); frag.append(el); }
    content.append(frag);
  }

  // Programmatic scrolls set `jumping`, so the next scroll event is not counted as finger scrolling.
  let jumping = false, renderQueued = false, touching = false, settleTimer = 0;
  function setScroll(y, jump = true) {
    if (Math.abs(y - scroller.scrollTop) < 1) return;
    if (jump) jumping = true;
    scroller.scrollTop = y;
  }
  scroller.addEventListener('scroll', () => {
    const y = scroller.scrollTop, t = performance.now(), jump = jumping;
    jumping = false;
    lastScrollT = t;
    for (const f of scrollListeners) f(y, t, jump);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, SETTLE_MS);
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); }
  }, { passive: true });
  scroller.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  const untouch = () => { touching = false; clearTimeout(settleTimer); settleTimer = setTimeout(settle, SETTLE_MS); };
  scroller.addEventListener('touchend', untouch, { passive: true });
  scroller.addEventListener('touchcancel', untouch, { passive: true });

  // Move the active layout to offset n, keeping the same content on screen.
  function rebase(n) {
    const target = scroller.scrollTop - O + n;
    O = n;
    for (const [i, el] of live) el.style.top = O + L.rows[i].top + 'px';
    setHeight(Math.max(0, target));
    setScroll(Math.max(0, target));
  }
  // At rest (either view): put the offset back to 0 (safe now: no momentum to interrupt).
  function settle() {
    if (!O || touching) return;
    rebase(0);
    setHeight(0);
    const realMax = scroller.scrollHeight - scroller.clientHeight;   // includes the strip footer, if any
    if (scroller.scrollTop > realMax) setScroll(realMax);
  }

  // Switch between 'grid' and 'moments'. The moment holding the photo at the top stays at the top.
  // direct: set scrollTop instead of the offset (used while dragging the scrubber: no momentum).
  function switchMode(next, direct = false) {
    if (next === mode || !ms.length) return false;
    const y = scroller.scrollTop;
    emit('beforeMode', { to: next });
    const top = next === 'moments' ? mom.rows[photoMoment[photoAt(Math.max(0, y - O))]].top : gridTopOfMoment(momentAt(y));
    clearLive();
    mode = next;
    L = next === 'grid' ? grid : mom;
    root.dataset.mode = next;
    momentsPill.hidden = next !== 'moments';
    if (next === 'moments') hideBack();
    if (direct) { O = 0; setHeight(top); setScroll(top); }
    else { O = y - top; setHeight(y); }
    render();
    emit('mode', { mode: next, direct });
    return true;
  }

  // Jump to grid position gy (natural, offset 0). back: show the Back pill to return here.
  function jumpTo(gy, reason, back = false) {
    const prev = gridY();
    if (mode !== 'grid') switchMode('grid', true);
    O = 0;
    for (const [i, el] of live) el.style.top = L.rows[i].top + 'px';
    const y = Math.min(Math.max(0, Math.round(gy)), maxOf(grid));
    setHeight(y);
    setScroll(y);
    setHeight(0);
    if (back) showBack(prev);
    emit('jump', { reason });
  }
  function goToMoment(m, reason) {
    jumpTo(gridTopOfMoment(m), reason, true);
    emit(reason, { moment: ms[m].m });
  }

  // Keep the same photo at the top when the width changes (rotation, resize).
  new ResizeObserver(() => {
    viewH = scroller.clientHeight;
    if (scroller.clientWidth === width) { render(); layoutListeners.forEach(f => f()); return; }
    if (!grid.rows.length) { layout(); render(); layoutListeners.forEach(f => f()); return; }
    if (mode !== 'grid') switchMode('grid', true);
    const gy = scroller.scrollTop - O, old = grid.rows[rowAt(grid, gy)], frac = (gy - old.top) / old.h;
    const anchor = old.from < 0 ? -1 : old.from, day = old.day;
    layout();
    const r = grid.rows[anchor < 0 ? day.row : photoRow[anchor]];
    setHeight(r.top);
    setScroll(r.top + frac * r.h);
    render();
    layoutListeners.forEach(f => f());
  }).observe(scroller);

  // ---- Back pill ----
  let backTimer = 0, backY = 0;
  function hideBack() { backPill.hidden = true; clearTimeout(backTimer); }
  function showBack(prev) {
    backY = prev;
    backPill.hidden = false;
    clearTimeout(backTimer);
    backTimer = setTimeout(hideBack, BACK_PILL_MS);
  }
  backPill.addEventListener('click', () => {
    hideBack();
    jumpTo(backY, 'back');
    emit('backTap');
  });

  // ---- viewer ----
  // app.js fills .viewer-extra (people in the photo, similar moments) through onViewerShow.
  let vi = -1;
  const viewerListeners = [];
  const note = $('.viewer-note');
  function showPhoto() {
    const p = order[vi];
    viewer.dataset.i = vi;
    note.hidden = true;
    const css = Math.floor(Math.max(220, Math.min(innerWidth, innerHeight - VIEWER_RESERVED_PX, 720)));
    vCanvas.style.width = vCanvas.style.height = css + 'px';
    vCanvas.width = vCanvas.height = Math.round(css * Math.min(devicePixelRatio || 1, 3));
    drawPhoto(vCanvas.getContext('2d'), p, vCanvas.width);
    vDate.textContent = fmtDay(p.ts);
    $('.viewer-prev').disabled = vi === 0;
    $('.viewer-next').disabled = vi === order.length - 1;
    viewer.scrollTop = 0;
    viewerListeners.forEach(f => f(p, vi));
  }
  function openViewer(i) {
    vi = i;
    showPhoto();
    viewer.hidden = false;
    history.pushState({ viewer: true }, '');   // Android back closes the viewer instead of leaving
    emit('viewerOpen', { photo: order[vi] });
  }
  function step(d) {
    const j = vi + d;
    if (vi < 0 || j < 0 || j >= order.length) return;
    vi = j;
    showPhoto();
    emit('viewerSwipe', { photo: order[vi] });
  }
  function closeViewer() {
    if (vi < 0) return;
    vi = -1;
    viewer.hidden = true;
    emit('viewerClose');
  }
  addEventListener('popstate', closeViewer);
  $('.viewer-close').addEventListener('click', () => history.back());
  $('.viewer-prev').addEventListener('click', () => step(-1));
  $('.viewer-next').addEventListener('click', () => step(1));
  $('.viewer-pick').addEventListener('click', () => emit('pick', { photo: order[vi] }));
  addEventListener('keydown', e => {
    if (vi < 0) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Escape') history.back();
  });
  let sx = 0, sy = 0;
  vCanvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  vCanvas.addEventListener('pointerup', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
  content.addEventListener('click', e => {
    const t = e.target.closest('.tile'), m = e.target.closest('.moment-row');
    if (t) openViewer(+t.dataset.i);
    else if (m && e.target.closest('.moment-info')) emit('momentInfo', { k: +m.dataset.m, moment: ms[+m.dataset.m].m });
    else if (m) goToMoment(+m.dataset.m, 'momentRowTap');
  });

  layout();
  render();
  firstKeys = [];
  for (let i = 0; i < grid.rows.length && grid.rows[i].top < viewH; i++) {
    const r = grid.rows[i];
    for (let k = r.from; k >= 0 && k < r.to; k++) firstKeys.push('t' + k);
  }
  checkFirstUsable();
  prewarm();

  const gridMax = () => maxOf(grid);
  return {
    scroller,
    mode: () => mode,
    switchMode,
    jumpTo,
    goToMoment,
    gridMax,
    momentCount: () => ms.length,
    viewerOpen: () => vi >= 0,
    openViewer,
    viewerGoTo(i) { if (vi < 0) openViewer(i); else { vi = i; showPhoto(); } },   // show photo i in the open viewer
    viewerIndex: () => vi,
    onViewerShow: fn => viewerListeners.push(fn),   // fn(photo, displayIndex) on open and every swipe
    refreshViewer() { if (vi >= 0) viewerListeners.forEach(f => f(order[vi], vi)); },
    setPickVisible(on) { $('.viewer-actions').hidden = !on; },
    viewerNote(text) { note.textContent = text; note.hidden = !text; },   // stays until the photo changes
    momentOfPhoto: i => photoMoment[i],
    momentStartIndex: k => ms[k].first,   // display index of a moment's newest photo
    coverIndex: k => ms[k].cover,
    gridY,
    showBackTo: showBack,
    refresh() { clearLive(); render(); },   // re-render rows (people corrections changed face icons)
    closeViewer() { if (vi >= 0) history.back(); },   // through history, so the viewer's entry is removed
    viewerMessage(text) {
      const m = $('.viewer-msg');
      m.textContent = text;
      m.hidden = false;
      clearTimeout(m._t);
      m._t = setTimeout(() => { m.hidden = true; }, VIEWER_MESSAGE_MS);
    },
    hideBack,
    photoTop: i => grid.rows[photoRow[i]].top,   // QA: grid position of a photo's row
    // Moment (display index) whose photos are at fraction f down the screen, in the grid.
    momentAtViewport: f => photoMoment[photoAt(Math.max(0, scroller.scrollTop - O + f * viewH))],
    fillCover: (holder, k) => fill(holder, 'c' + k),   // the pre-drawn cover image (moved into holder)

    moments: () => ms.map(x => x.m),   // newest first, as shown
    momentFrac: k => gridMax() ? Math.min(1, gridTopOfMoment(k) / gridMax()) : 0,   // where moment k sits on the scrubber
    // Dim everything that doesn't match (nothing is hidden). null clears.
    setFilter(f) {
      filter = f;
      for (const [i, el] of live) {
        if (el._kind === 'moment') el.classList.toggle('dim', !!f && !f.moment(i));
        else if (el._kind === 'row') for (const t of el.children) t.classList.toggle('dim', !t.hidden && !!f && !f.photo(+t.dataset.i));
      }
    },
    predrawMs: () => readyMs,
    // moments: from buildMoments (oldest first). Also starts pre-drawing their covers.
    setMoments(list) {
      ms = list.slice().reverse().map(m => ({ m, first: Math.min(...m.photoIds.map(id => indexOf.get(id))), cover: indexOf.get(m.coverId) }));
      photoMoment.fill(-1);
      ms.forEach((x, k) => x.m.photoIds.forEach(id => { photoMoment[indexOf.get(id)] = k; }));
      layoutMoments();
      prewarm();
    },
    // Scrubber: position as a fraction of the grid, in either view.
    fracAt: y => gridMax() ? Math.min(1, Math.max(0, (mode === 'grid' ? y - O : gridTopOfMoment(momentAt(y))) / gridMax())) : 0,
    scrollToFrac(f) {
      const gy = f * gridMax();
      if (mode === 'grid') { setScroll(O + gy, false); return; }
      const m = photoMoment[photoAt(gy)], a = gridTopOfMoment(m), b = m + 1 < ms.length ? gridTopOfMoment(m + 1) : grid.total;
      const t = b > a ? Math.min(1, Math.max(0, (gy - a) / (b - a))) : 0;
      setScroll(O + mom.rows[m].top + t * mom.rows[m].h, false);
    },
    monthAtFrac: f => fmtMonth(order[photoAt(f * gridMax())].ts),
    settleNow: () => { if (O) rebase(0); },
    // Top of each year = its newest day's header (grid coordinates).
    yearTops: () => {
      const seen = new Map();
      for (const d of days) { const yr = new Date(d.ts).getUTCFullYear(); if (!seen.has(yr)) seen.set(yr, grid.rows[d.row].top); }
      return [...seen].map(([year, top]) => ({ year, top }));
    },
    onLayout: fn => layoutListeners.push(fn),
    onFrame: fn => frameListeners.push(fn),     // fn(scrollTop), once per rendered frame
    onScroll: fn => scrollListeners.push(fn),   // fn(scrollTop, time, wasJump), every scroll event
  };
}
