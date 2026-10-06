// Version B: switch to moment view when scrolling fast. Moment view stays when momentum ends, so rows
// can be read and tapped. It exits on a moment row tap (timeline.js) or a new slow, deliberate scroll:
// a gesture (finger down, wheel turning, scrubber dragged) that moves and stays below the expand
// threshold for EXPAND_HOLD_MS. A new fast flick keeps moment view.
// Velocity = distance over real elapsed time across at least VELOCITY_WINDOW_MS, so a slow or
// dropped frame cannot distort the reading.
import {
  VELOCITY_WINDOW_MS, COLLAPSE_VELOCITY, EXPAND_VELOCITY, COLLAPSE_VELOCITY_WHEEL, EXPAND_VELOCITY_WHEEL, EXPAND_HOLD_MS,
} from './config.js';
import { events } from './timeline.js';

// debug: show the overlay. tune: debug-only threshold overrides from the URL
// (?collapse=&expand= for touch/scrubber, ?wcollapse=&wexpand= for wheel), for tuning on a phone.
export function initSpeed(root, tl, debug = false, tune = {}) {
  const T = {
    collapse: tune.collapse ?? COLLAPSE_VELOCITY, expand: tune.expand ?? EXPAND_VELOCITY,
    wcollapse: tune.wcollapse ?? COLLAPSE_VELOCITY_WHEEL, wexpand: tune.wexpand ?? EXPAND_VELOCITY_WHEEL,
  };
  let enabled = false, hold = false, source = 'touch', dragging = false, slowSince = null, timer = 0, v = 0;
  // { t, y }, last ~1 s. Seeded with the resting position (at load and when a scrubber drag starts),
  // so even a single coalesced scroll event (WebKit can merge a whole drag into one) has a baseline.
  const samples = [{ t: performance.now(), y: tl.scroller.scrollTop }];
  const MOTION_START_MS = 50;
  // Gesture tracking: only movement made while a gesture is active can exit moment view, never momentum.
  // gesture counts gestures; enteredOn is the gesture that opened moment view (it can never close it).
  let touchDown = false, lastWheel = -1e9, moved = false, gesture = 0, enteredOn = -1;
  const newGesture = () => { gesture++; moved = false; slowSince = null; };
  const gestureActive = now => touchDown || dragging || now - lastWheel < 150;
  tl.scroller.addEventListener('touchstart', () => { source = 'touch'; touchDown = true; newGesture(); }, { passive: true });
  const lift = () => { touchDown = false; slowSince = null; };
  tl.scroller.addEventListener('touchend', lift, { passive: true });
  tl.scroller.addEventListener('touchcancel', lift, { passive: true });
  tl.scroller.addEventListener('wheel', () => {
    const now = performance.now();
    if (now - lastWheel > 300) newGesture();
    source = 'wheel';
    lastWheel = now;
  }, { passive: true });
  events.addEventListener('scrubberDrag', () => { dragging = true; newGesture(); samples.push({ t: performance.now(), y: tl.scroller.scrollTop }); });
  events.addEventListener('scrubberEnd', () => { dragging = false; slowSince = null; });
  const src = () => dragging ? 'scrubber' : source;

  // Distance over real elapsed time, from the newest sample at least one window old. If the scroller
  // was resting before the next sample, time starts when that movement began (at most
  // MOTION_START_MS before it), not during the rest. A slow frame only lengthens the time.
  function velocity(now) {
    if (!samples.length) return 0;
    const last = samples[samples.length - 1];
    let b = 0;
    for (let i = 0; i < samples.length; i++) { if (now - samples[i].t >= VELOCITY_WINDOW_MS) b = i; else break; }
    const base = samples[b], next = samples[b + 1];
    const start = next ? Math.max(base.t, next.t - MOTION_START_MS) : base.t;
    const dt = now - start;
    return dt > 0 ? Math.abs(last.y - base.y) / dt * 1000 : 0;
  }
  function check(now) {
    v = velocity(now);
    showDebug();
    if (!enabled || hold) return;
    const wheel = src() === 'wheel';
    const up = wheel ? T.wcollapse : T.collapse, down = wheel ? T.wexpand : T.expand;
    if (tl.mode() === 'grid') {
      slowSince = null;
      if (v > up && tl.switchMode('moments', dragging)) enteredOn = gestureActive(now) ? gesture : -1;
      return;
    }
    // Moment view: leave only on a NEW gesture that moves slowly (not the one that opened it, not momentum).
    if (!gestureActive(now) || gesture === enteredOn || !moved || v >= down) { slowSince = null; return; }
    if (slowSince === null) slowSince = now;
    else if (now - slowSince >= EXPAND_HOLD_MS) { slowSince = null; tl.switchMode('grid', dragging); }
  }
  tl.onScroll((y, t, jump) => {
    if (dbg) { dbg._log.push({ t: Math.round(t), y: Math.round(y), jump, mode: tl.mode(), src: src() }); if (dbg._log.length > 60) dbg._log.shift(); }
    if (jump) samples.length = 0;   // jumps (year tap, Back, re-basing) are not speed
    samples.push({ t, y });
    while (samples.length > 2 && t - samples[1].t > 1000) samples.shift();
    if (!jump) { if (gestureActive(t)) moved = true; check(t); }
  });
  events.addEventListener('mode', e => {
    clearInterval(timer);
    slowSince = null;
    // In moment view, keep checking while no scroll events arrive (a finger held after a slow drag still counts).
    if (e.detail.mode === 'moments') timer = setInterval(() => check(performance.now()), 50);
  });

  // ?debug=1 overlay: velocity, input, view and moment count. Hold/Moments/Grid buttons are for QA screenshots.
  let dbg = null, dbgQueued = false;
  if (debug) {
    root.insertAdjacentHTML('beforeend', `<div class="debug-overlay"><span></span>
      <button data-a="hold">Hold</button><button data-a="moments">Moments</button><button data-a="grid">Grid</button></div>`);
    dbg = root.querySelector('.debug-overlay');
    dbg._log = [];   // last scroll events, read by QA
    dbg.addEventListener('click', e => {
      const a = e.target.dataset.a;
      if (a === 'hold') { hold = !hold; e.target.textContent = hold ? 'Release' : 'Hold'; }
      else if (a && enabled) tl.switchMode(a, true);
      showDebug();
    });
  }
  function showDebug() {
    if (!dbg || dbgQueued) return;
    dbgQueued = true;
    requestAnimationFrame(() => {
      dbgQueued = false;
      dbg.firstChild.textContent = `${Math.round(v)} px/s · ${src()} · ${tl.mode()}${hold ? ' (held)' : ''} · ${tl.momentCount()} moments`
        + ` · touch ${T.collapse}/${T.expand} · wheel ${T.wcollapse}/${T.wexpand}`;
    });
  }
  showDebug();

  return {
    setEnabled(on) {
      enabled = on;
      if (!on && tl.mode() !== 'grid') tl.switchMode('grid', true);
    },
    velocity: () => v,
  };
}
