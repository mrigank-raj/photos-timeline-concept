// Right-edge scroll bar: draggable handle with a "Month Year" bubble, and tappable year labels.
// Positions are fractions of the photo grid, so the bar means the same thing in moment view.
import { SCRUBBER_HANDLE_HEIGHT } from './config.js';
import { emit } from './timeline.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export function initScrubber(root, tl) {
  root.insertAdjacentHTML('beforeend', `
    <div class="scrubber">
      <div class="scrub-ticks"></div>
      <div class="scrub-years"></div>
      <div class="scrub-bubble" hidden></div>
      <div class="scrub-handle" aria-label="Drag to move through your photos"><span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5.8 8.2 9.6 7 8.4l5-5 5 5-1.2 1.2zm0 12.4 3.8-3.8 1.2 1.2-5 5-5-5 1.2-1.2z" fill="currentColor"/></svg></span></div>
    </div>`);
  const el = root.querySelector('.scrubber');
  const handle = el.querySelector('.scrub-handle'), bubble = el.querySelector('.scrub-bubble'), years = el.querySelector('.scrub-years');
  let trackH = 0, trackTop = 0;   // cached: never read layout during scroll or drag
  const range = () => trackH - SCRUBBER_HANDLE_HEIGHT;

  const place = y => { handle.style.transform = `translateY(${tl.fracAt(y) * range()}px)`; };
  function layoutYears() {
    years.textContent = '';
    let last = -Infinity;
    for (const { year, top } of tl.yearTops()) {
      const b = document.createElement('button');
      b.className = 'scrub-year';
      b.innerHTML = `<span>${year}</span>`;
      const y = Math.max((tl.gridMax() ? Math.min(top, tl.gridMax()) / tl.gridMax() : 0) * range() + SCRUBBER_HANDLE_HEIGHT / 2 - 20, last + 40);
      b.style.top = (last = y) + 'px';
      b.addEventListener('click', () => { tl.jumpTo(top, 'yearTap', true); emit('yearTap', { year }); });
      years.append(b);
    }
  }

  tl.onFrame(place);

  let grab = null;
  function move(e) {
    const frac = clamp((e.clientY - trackTop - grab) / range(), 0, 1);
    tl.scrollToFrac(frac);
    bubble.textContent = tl.monthAtFrac(frac);
    bubble.style.transform = `translateY(${frac * range()}px)`;
    bubble.hidden = false;
  }
  handle.addEventListener('pointerdown', e => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    tl.settleNow();
    trackTop = el.getBoundingClientRect().top;
    grab = e.clientY - handle.getBoundingClientRect().top;
    el.classList.add('dragging');
    emit('scrubberDrag');
    move(e);
  });
  handle.addEventListener('pointermove', e => { if (grab !== null) move(e); });
  const end = () => {
    if (grab === null) return;
    grab = null;
    bubble.hidden = true;
    el.classList.remove('dragging');
    emit('scrubberEnd');
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);

  const layoutListeners = [];
  const relayout = () => { trackH = el.clientHeight; layoutYears(); place(tl.scroller.scrollTop); layoutListeners.forEach(f => f()); };
  new ResizeObserver(relayout).observe(el);
  tl.onLayout(relayout);

  return {
    tickLayer: el.querySelector('.scrub-ticks'),
    yAt: frac => frac * range() + SCRUBBER_HANDLE_HEIGHT / 2,   // track y (px) of the handle centre at this grid fraction
    onLayout: fn => layoutListeners.push(fn),
  };
}
