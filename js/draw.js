// Illustrated photo tiles on canvas. Everything is drawn in a 100x100 unit box.
import { makeRng, hash } from './rng.js';

const LOOKS = {
  you: { skin: '#c68642', top: '#13867c', dark: '#0c5e57', hair: '#2b1d14' },
  kabir: { skin: '#a86b3c', top: '#d42a2a', dark: '#9e1b1b', hair: '#1b130d' },
  dev: { skin: '#d29a6a', top: '#3c9a3c', dark: '#1f5e1f', hair: '#2b1d14' },
  anaya: { skin: '#e0ac69', top: '#ef6fa9', dark: '#c94d86', hair: '#1f140e' },
  ma: { skin: '#b9783f', top: '#7a1e2e', dark: '#9c2a3e', hair: '#3a2a20' },
};
// Small per-year detail so the three Diwalis differ only slightly.
const ACCENT = { 2023: '#f4c430', 2024: '#ff8a3d', 2025: '#ffffff', 2026: '#f4c430' };
const GOLD = '#f4c430';
const TAU = Math.PI * 2;

// ---- primitives ----
const rect = (c, fill, x, y, w, h) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
const circle = (c, fill, x, y, r) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const ellipse = (c, fill, x, y, rx, ry) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
function poly(c, fill, ...pts) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); c.fill();
}
function line(c, stroke, w, ...pts) {
  c.strokeStyle = stroke; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.stroke();
}
function rrect(c, fill, x, y, w, h, r) {
  c.fillStyle = fill; c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
}

function sky(c, t, h) {
  if (t.has('night')) {
    rect(c, '#1d2550', 0, 0, 100, h);
    for (const [x, y] of [[12, 8], [30, 15], [55, 6], [78, 12], [90, 20], [44, 22]]) if (y < h) circle(c, '#fff', x, y, 0.7);
  } else if (t.has('sunset')) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ff8a5c'); g.addColorStop(1, '#ffd27a');
    c.fillStyle = g; c.fillRect(0, 0, 100, h);
    circle(c, '#fff3b0', 70, h - 4, 8);
  } else {
    rect(c, '#9fd3f2', 0, 0, 100, h);
    if (t.has('sky')) { ellipse(c, '#fff', 30, 18, 14, 5); ellipse(c, '#fff', 70, 28, 12, 4); }
  }
}

function diya(c, x, y, s = 1) {
  c.fillStyle = '#a0522d'; c.beginPath(); c.ellipse(x, y, 3.2 * s, 1.8 * s, 0, 0, Math.PI); c.fill();
  poly(c, '#ff9f1a', x - 1.2 * s, y, x, y - 4.5 * s, x + 1.2 * s, y);
  circle(c, '#ffe066', x, y - 1 * s, 0.6 * s);
}

function rangoli(c, x, y, s, year) {
  c.save(); c.translate(x, y); c.scale(s, s * 0.45);
  const cols = ['#e84393', '#f7d038', '#2e86de', '#20bf6b'];
  if (year === 2023) { // flower petals
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; circle(c, cols[i % 4], Math.cos(a) * 7, Math.sin(a) * 7, 4); }
    circle(c, '#fff', 0, 0, 3.5);
  } else if (year === 2024) { // star
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 5 : 12; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
    poly(c, cols[0], ...pts); circle(c, cols[1], 0, 0, 4);
  } else { // rings
    circle(c, cols[2], 0, 0, 12); circle(c, cols[1], 0, 0, 8.5); circle(c, cols[0], 0, 0, 5); circle(c, '#fff', 0, 0, 2);
  }
  c.restore();
}

function sparkle(c, x, y, r) {
  c.strokeStyle = '#ffe14d'; c.lineWidth = 0.8; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * TAU / 10; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.stroke(); circle(c, '#fff', x, y, r * 0.25);
}

function dog(c, x, base, s) {
  c.save(); c.translate(x, base); c.scale(s, s);
  line(c, '#6b4220', 2, 9, -9, 13, -14);              // tail
  for (const lx of [-7, -3, 4, 8]) rect(c, '#6b4220', lx, -6, 2.2, 6);
  ellipse(c, '#8b5a2b', 0, -9, 10, 5);                // body
  circle(c, '#8b5a2b', -10, -15, 5.5);                // head
  ellipse(c, '#c08a55', -14, -13.5, 3, 2.2);          // snout
  circle(c, '#1b130d', -16.5, -14, 0.9);              // nose
  ellipse(c, '#5c3a1a', -7.5, -15, 2, 4.5);           // ear
  circle(c, '#1b130d', -11.5, -16.5, 0.8);            // eye
  line(c, '#c0392b', 1.6, -7, -11.5, -12, -10);       // collar
  c.restore();
}

// One clearly visible decor item per Diwali year; everything else in the room stays the same.
function diwaliDecor(c, year) {
  if (year === 2023) {        // hanging paper lanterns
    for (const x of [38, 52, 95]) {
      line(c, '#ddd', 0.5, x, 0, x, 5);
      rrect(c, '#e53935', x - 4.5, 5, 9, 12, 3);
      rect(c, '#f7d038', x - 4.5, 8, 9, 1.4); rect(c, '#f7d038', x - 4.5, 13, 9, 1.4);
      line(c, '#f7d038', 0.8, x, 17, x, 21);
    }
  } else if (year === 2024) { // string lights on the wall
    for (const [y0, dip] of [[4, 8], [16, 7]]) for (let i = 0; i <= 14; i++) {
      const x = i * 100 / 14, y = y0 + Math.sin(i / 14 * Math.PI) * dip;
      if (i) line(c, '#2b2b2b', 0.4, (i - 1) * 100 / 14, y0 + Math.sin((i - 1) / 14 * Math.PI) * dip, x, y);
      circle(c, 'rgba(255,240,150,0.45)', x, y + 1.2, 2.4);
      circle(c, ['#ffe14d', '#4fc3f7', '#ff6f91', '#9be15d'][i % 4], x, y + 1.2, 1.3);
    }
  } else {                    // marigold garland across the door
    for (let i = 0; i <= 10; i++) circle(c, i % 2 ? '#f39c12' : '#f7d038', 64 + i * 2.6, 23 + Math.sin(i / 10 * Math.PI) * 5, 2.2);
    for (const x of [64.5, 89.5]) for (let y = 25; y < 46; y += 3.6) circle(c, y % 7 < 3.6 ? '#f39c12' : '#f7d038', x, y, 1.9);
    for (const x of [70, 77, 84]) poly(c, '#2e7d32', x - 1.2, 26, x + 1.2, 26, x, 31);
  }
}

// ---- places ----
function drawPlace(c, place, t, year, v) {
  const night = t.has('night');
  switch (place) {
    case 'home': {
      rect(c, night ? '#4b3a5e' : '#f2e2c4', 0, 0, 100, 74);
      rect(c, '#fff', 8, 12, 24, 26);
      rect(c, night ? '#1d2550' : '#a9dcf5', 10, 14, 20, 22);
      if (night) circle(c, '#fffbe0', 24, 20, 2.5);
      rect(c, '#fff', 19.4, 14, 1.2, 22);
      rect(c, '#6d4026', 64, 22, 26, 52); rect(c, '#9a6238', 67, 25, 20, 49); circle(c, '#f4c430', 83, 50, 1.2);   // door
      rect(c, '#b5835a', 0, 74, 100, 26);
      if (t.has('festive')) diwaliDecor(c, year);
      if (t.has('balloons')) for (const [x, y, col] of [[70, 14, '#e74c3c'], [80, 10, '#3498db'], [88, 17, '#f1c40f']]) {
        line(c, '#888', 0.4, x, y + 5, x - 2, y + 22); ellipse(c, col, x, y, 4, 5);
      }
      if (t.has('flowers')) { rect(c, '#6d4c41', 8, 50, 12, 24); rect(c, '#4a90a4', 11, 40, 6, 10); for (const [x, y, col] of [[11, 38, '#e84393'], [16, 36, '#f7d038'], [14, 33, '#e84393']]) circle(c, col, x, y, 2.5); }
      if (t.has('rangoli')) rangoli(c, 50, 89, 1, year);
      if (t.has('diyas')) for (const x of [8, 20, 80, 92]) diya(c, x, 84);
      break;
    }
    case 'chai_stall':
      sky(c, t, 45);
      rect(c, '#8d8d8d', 0, 70, 100, 30);
      rect(c, '#7b4a2a', 8, 30, 84, 32);
      for (let i = 0; i < 9; i++) rect(c, i % 2 ? '#fff' : '#d64545', 6 + i * 9.8, 22, 9.8, 9);
      rect(c, '#5a3620', 4, 58, 92, 13);
      circle(c, '#9aa3ab', 18, 53, 5); line(c, '#9aa3ab', 1.5, 22, 52, 27, 48);
      for (const x of [70, 76, 82]) rect(c, '#e9b77a', x, 51, 4, 7);
      break;
    case 'desk':
      rect(c, '#dfe7ee', 0, 0, 100, 100);
      rect(c, '#f6b26b', 12, 12, 20, 14); rect(c, '#93c47d', 38, 16, 12, 16);
      line(c, '#555', 1.2, 86, 66, 86, 42, 78, 34);
      poly(c, '#f7d038', 72, 34, 84, 34, 80, 26, 76, 26);
      break;
    case 'street':
      sky(c, t, 55);
      [[0, 22, 20, '#e8b4a0'], [21, 32, 20, '#a8c8e0'], [42, 18, 22, '#f0d890'], [65, 28, 18, '#b8d8b0'], [84, 20, 16, '#d8b8e0']]
        .forEach(([x, y, w, col]) => { rect(c, col, x, y, w, 66 - y); for (let wy = y + 5; wy < 60; wy += 9) for (let wx = x + 3; wx < x + w - 4; wx += 7) rect(c, '#fff', wx, wy, 3.5, 4); });
      rect(c, '#bbb', 0, 66, 100, 6);
      rect(c, '#555', 0, 72, 100, 28);
      for (let x = 4; x < 100; x += 16) rect(c, '#fff', x, 85, 8, 1.5);
      if (v.chance(0.5)) { rrect(c, '#f2c200', 72, 74, 20, 12, 3); rrect(c, '#2e7d32', 72, 70, 20, 6, 3); circle(c, '#222', 76, 87, 2.5); circle(c, '#222', 89, 87, 2.5); }
      break;
    case 'park':
      sky(c, t, 60);
      rect(c, '#7cc36a', 0, 60, 100, 40);
      for (const [x, s] of [[12, 1], [86, 1.2], [60, 0.7]]) { rect(c, '#7a4b2a', x - 1.5 * s, 60 - 18 * s, 3 * s, 18 * s); circle(c, '#3f8f3f', x, 60 - 22 * s, 11 * s); }
      if (t.has('flowers')) for (let i = 0; i < 10; i++) circle(c, i % 2 ? '#e84393' : '#f7d038', 6 + i * 9.5, 70 + (i % 3) * 7, 1.8);
      break;
    case 'market':
      sky(c, t, 40);
      rect(c, '#c9b18a', 0, 40, 100, 60);
      [[2, '#f39c12'], [52, '#3498db']].forEach(([x, col]) => {
        rect(c, '#8d6e63', x, 34, 46, 30);
        for (let i = 0; i < 6; i++) rect(c, i % 2 ? '#fff' : col, x + i * 7.7, 26, 7.7, 9);
        for (let i = 0; i < 7; i++) circle(c, ['#e74c3c', '#f39c12', '#27ae60', '#f1c40f'][i % 4], x + 5 + i * 6, 60, 2.8);
      });
      break;
    case 'goa':
      sky(c, t, 48);
      rect(c, '#2f9fd8', 0, 48, 100, 18);
      for (const x of [10, 40, 70]) line(c, '#fff', 0.8, x, 56, x + 10, 56);
      rect(c, '#f1d59b', 0, 66, 100, 34);
      line(c, '#8d5a2b', 2.5, 6, 70, 10, 45, 16, 26);
      for (const [dx, dy] of [[-12, 4], [12, 6], [-8, -6], [8, -8], [0, 8]]) line(c, '#2e8b3e', 2.2, 16, 26, 16 + dx, 26 + dy);
      if (t.has('festive')) for (let i = 0; i < 10; i++) circle(c, ['#f7d038', '#e84393', '#2e86de'][i % 3], 5 + i * 10, 10 + (i % 2) * 3, 1.5);
      break;
    case 'pondicherry':
      if (t.has('colonial')) {
        rect(c, '#f6c945', 0, 0, 100, 80);
        for (const x of [10, 60]) { rect(c, '#fff', x, 18, 28, 36); rect(c, '#5d7fa3', x + 2, 20, 11, 32); rect(c, '#5d7fa3', x + 15, 20, 11, 32); }
        for (let i = 0; i < 9; i++) circle(c, i % 2 ? '#e84393' : '#c2185b', 4 + (i % 5) * 6, 4 + Math.floor(i / 5) * 6, 4);
        rect(c, '#d9cbb0', 0, 80, 100, 20);
      } else {
        sky(c, t, 50);
        rect(c, '#3a8fc8', 0, 50, 100, 22);
        rect(c, '#9a9a9a', 0, 72, 100, 28);
        for (const [x, y, r] of [[10, 76, 7], [30, 80, 6], [52, 75, 8], [75, 79, 7], [92, 76, 6]]) circle(c, '#7a7a7a', x, y, r);
      }
      break;
    case 'college':
      if (t.has('stage')) {
        rect(c, '#2a2340', 0, 0, 100, 100);
        poly(c, 'rgba(255,240,170,0.35)', 20, 0, 28, 0, 45, 64, 25, 64);
        poly(c, 'rgba(255,240,170,0.35)', 72, 0, 80, 0, 75, 64, 55, 64);
        rect(c, '#e74c3c', 15, 8, 70, 10); rect(c, '#f7d038', 15, 18, 70, 2);
        rect(c, '#6b4f3a', 0, 64, 100, 10);
      } else {
        sky(c, t, 40);
        rect(c, '#b5533c', 0, 22, 100, 78);
        for (let y = 28; y < 60; y += 12) for (let x = 6; x < 100; x += 16) rect(c, '#f3e5c0', x, y, 8, 7);
      }
      if (t.has('crowd')) for (let i = 0; i < 12; i++) circle(c, '#151020', 4 + i * 8.5, 96 + (i % 2) * 2, 5);
      break;
    case 'varanasi':
      sky(c, t, 40);
      if (!night && !t.has('sunset')) rect(c, '#f7c58a', 0, 30, 100, 10);
      if (t.has('temple')) { poly(c, '#d8a35c', 62, 40, 70, 8, 78, 40); line(c, '#888', 0.5, 70, 8, 70, 2); poly(c, '#e67e22', 70, 2, 75, 3.5, 70, 5); }
      for (let i = 0; i < 6; i++) rect(c, i % 2 ? '#c4a37a' : '#d2b48c', 0, 40 + i * 5, 100, 5);
      if (t.has('river')) {
        rect(c, '#6c8ea0', 0, 70, 100, 30);
        if (t.has('boat')) { c.fillStyle = '#6d4c41'; c.beginPath(); c.ellipse(72, 82, 14, 4, 0, 0, Math.PI); c.fill(); }
      } else rect(c, '#c4a37a', 0, 70, 100, 30);
      if (night) for (let x = 6; x < 100; x += 12) diya(c, x, 69, 0.7);
      break;
    case 'ladakh':
      rect(c, '#2f7de1', 0, 0, 100, 70);
      poly(c, '#8b6b4a', -10, 70, 30, 18, 70, 70);
      poly(c, '#a0805c', 30, 70, 75, 24, 115, 70);
      poly(c, '#fff', 30, 18, 23.5, 26.5, 36.5, 26.5);
      poly(c, '#fff', 75, 24, 69, 30.5, 81, 30.5);
      rect(c, t.has('snow') ? '#eef3f7' : '#c9a979', 0, 66, 100, 34);
      line(c, '#666', 0.4, 0, 8, 100, 14);
      for (let i = 0; i < 12; i++) rect(c, ['#2e86de', '#fff', '#e74c3c', '#20bf6b', '#f7d038'][i % 5], 3 + i * 8.3, 8.8 + i * 0.5, 4, 5);
      if (t.has('bike')) { circle(c, '#222', 72, 91, 5); circle(c, '#222', 90, 91, 5); poly(c, '#c0392b', 72, 88, 90, 88, 86, 80, 76, 80); line(c, '#555', 1.2, 88, 82, 92, 76); }
      break;
    case 'jaipur': {
      const wall = night ? '#6a3b4a' : '#e8a07a';
      rect(c, wall, 0, 0, 100, 76);
      for (const x of [4, 36, 68]) { rrect(c, night ? '#3e2230' : '#f6d2b5', x, 22, 28, 50, 14); rect(c, night ? '#3e2230' : '#f6d2b5', x, 46, 28, 26); }
      rect(c, '#d9b38c', 0, 76, 100, 24);
      if (t.has('wedding')) for (const x of [3, 34, 66, 97]) for (let y = 4; y < 60; y += 4) circle(c, y % 8 ? '#f39c12' : '#f7d038', x, y, 1.6);
      if (night) for (let x = 2; x < 100; x += 5) circle(c, '#fff3b0', x, 3 + (x % 3), 0.8);
      break;
    }
    case 'cafe':
      rect(c, '#8b5a3c', 0, 0, 100, 100);
      rect(c, '#2d3436', 8, 10, 30, 22);
      for (let y = 15; y < 30; y += 5) line(c, '#ddd', 0.6, 12, y, 12 + (y % 3 + 2) * 6, y);
      for (const x of [55, 80]) { line(c, '#222', 0.5, x, 0, x, 12); c.fillStyle = '#f7d038'; c.beginPath(); c.arc(x, 16, 5, Math.PI, 0); c.fill(); }
      break;
    case 'rishikesh':
      sky(c, t, 45);
      ellipse(c, '#4f9a5a', 20, 62, 45, 30); ellipse(c, '#3d7f48', 80, 64, 45, t.has('mountains') ? 38 : 26);
      if (t.has('river')) {
        rect(c, '#3fc1c9', 0, 62, 100, 18);
        for (const [x, y] of [[15, 70], [45, 74], [80, 68]]) ellipse(c, '#eaeaea', x, y, 3, 1.5);
        rect(c, '#b9a37e', 0, 80, 100, 20);
      } else rect(c, '#8fbf6a', 0, 62, 100, 38);
      if (t.has('bridge')) {
        rect(c, '#e0e0e0', 8, 28, 3, 30); rect(c, '#e0e0e0', 89, 28, 3, 30);
        c.strokeStyle = '#ddd'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(9.5, 29); c.quadraticCurveTo(50, 62, 90.5, 29); c.stroke();
        line(c, '#ccc', 1.4, 0, 52, 100, 52);
      }
      if (t.has('temple')) { rect(c, '#f5f5f5', 66, 30, 20, 34); poly(c, '#e67e22', 64, 30, 76, 10, 88, 30); }
      if (t.has('trees')) for (const x of [10, 30]) { rect(c, '#6d4c41', x - 1, 50, 2, 12); circle(c, '#2e7d32', x, 46, 7); }
      break;
  }
}

// Drawn after people, so it sits in front of them (desks, tables).
function drawForeground(c, place, t, people) {
  if (place === 'desk') {
    rect(c, '#a87545', 0, 70, 100, 30); rect(c, '#8a5c34', 0, 70, 100, 3);
    if (t.has('coffee')) { rect(c, '#fff', 84, 62, 7, 9); line(c, '#fff', 1.2, 91, 64, 93, 67, 91, 69); }
    if (t.has('food')) ellipse(c, '#fff', 12, 70, 9, 3);
  } else if (place === 'cafe') {
    rect(c, '#d9b38c', 0, 78, 100, 22);
    if (t.has('coffee') && people) for (const x of [20, 80]) { rect(c, '#fff', x - 3, 70, 6, 8); }
    if (t.has('cake') && people) cake(c, 50, 80, 0.6);
  } else if (place === 'home' && t.has('cake') && people) cake(c, 50, 99, 0.7);
}

function cake(c, x, base, s) {
  c.save(); c.translate(x, base); c.scale(s, s);
  ellipse(c, '#ddd', 0, 0, 22, 4);
  rect(c, '#f8c8dc', -16, -18, 32, 17); rect(c, '#fff', -16, -20, 32, 4);
  for (const cx of [-8, 0, 8]) { rect(c, '#3498db', cx - 1, -27, 2, 7); poly(c, '#ff9f1a', cx - 1.5, -27, cx, -31, cx + 1.5, -27); }
  c.restore();
}

// ---- people ----
function drawPerson(c, id, x, base, h, o) {
  const L = LOOKS[id];
  const r = 0.13 * h, hy = base - h + r, sy = hy + r * 1.05, hip = base - 0.42 * h;
  const sw = 0.19 * h, hw = 0.16 * h;
  const sitting = o.pose === 'sitting' || o.pose === 'working';
  const legEnd = sitting ? hip + 0.2 * h : base;

  // Behind the head
  // Wedding: knee-length festive top. Kabir and Dev wear sherwanis; You (the tester, any gender) wears a festive kurta.
  const dressy = o.wedding && (id === 'you' || id === 'kabir' || id === 'dev');
  if (id === 'you' && !dressy) circle(c, L.dark, x, hy + r * 0.25, r * 1.3);   // hood
  if (id === 'anaya' && o.wedding) { rrect(c, GOLD, x - r * 1.55, hy - r * 1.3, r * 3.1, r * 4.4, r * 1.5); rrect(c, '#c2185b', x - r * 1.45, hy - r * 1.2, r * 2.9, r * 4.3, r * 1.4); }  // dupatta over head
  if (id === 'anaya') rrect(c, L.hair, x - r * 1.15, hy - r * 0.6, r * 2.3, r * 3.2, r);  // long hair
  if (id === 'ma') circle(c, L.hair, x + r * 0.2, hy - r * 1.0, r * 0.5);     // bun

  if (sitting && o.pose === 'sitting') rect(c, '#6d4c41', x - 0.3 * h, hip + 0.05 * h, 0.6 * h, 0.05 * h);

  // Legs and garment
  if (id === 'ma') {
    poly(c, L.top, x - sw, sy, x + sw, sy, x + hw * 1.3, legEnd, x - hw * 1.3, legEnd);
    line(c, o.accent || '#e3b23c', 0.03 * h, x - hw * 1.3, legEnd - 0.02 * h, x + hw * 1.3, legEnd - 0.02 * h);
    poly(c, L.dark, x - sw, sy, x - sw * 0.3, sy, x + hw * 1.1, hip + 0.05 * h, x + hw * 0.6, hip + 0.15 * h);   // pallu
    line(c, o.accent || '#e3b23c', 0.025 * h, x - sw * 0.3, sy, x + hw * 1.1, hip + 0.05 * h);
    if (o.wedding) {  // festive saree: heavy gold border and gold-dotted pallu
      line(c, GOLD, 0.06 * h, x - hw * 1.3, legEnd - 0.04 * h, x + hw * 1.3, legEnd - 0.04 * h);
      for (let k = 0.2; k < 1; k += 0.2) circle(c, GOLD, x - sw * 0.65 + (x + hw * 0.85 - (x - sw * 0.65)) * k, sy + (hip + 0.1 * h - sy) * k, 0.015 * h);
    }
  } else {
    const legCol = id === 'anaya' || dressy ? '#f3efe6' : '#34495e';
    rect(c, legCol, x - hw * 0.9, hip, hw * 0.8, legEnd - hip);
    rect(c, legCol, x + hw * 0.1, hip, hw * 0.8, legEnd - hip);
    const bottom = id === 'anaya' || dressy ? Math.min(base - 0.18 * h, legEnd - 0.02 * h) : hip + 0.03 * h;
    const flare = id === 'anaya' ? 1.35 : dressy ? 1.15 : 1;
    poly(c, L.top, x - sw, sy, x + sw, sy, x + hw * flare, bottom, x - hw * flare, bottom);
    if (id === 'dev') { // check pattern
      for (let i = -2; i <= 2; i++) line(c, L.dark, 0.012 * h, x + i * sw * 0.4, sy, x + i * hw * 0.4, bottom);
      for (let yy = sy + 0.06 * h; yy < bottom; yy += 0.07 * h) line(c, L.dark, 0.012 * h, x - sw * 0.95, yy, x + sw * 0.95, yy);
      poly(c, '#fff', x - 0.05 * h, sy, x + 0.05 * h, sy, x, sy + 0.06 * h);
    }
    if (dressy && id === 'you') { // festive kurta: embroidered neckline and hem, no buttons
      poly(c, GOLD, x - sw * 0.45, sy, x + sw * 0.45, sy, x, sy + 0.14 * h);
      poly(c, L.top, x - sw * 0.25, sy, x + sw * 0.25, sy, x, sy + 0.09 * h);
      line(c, GOLD, 0.04 * h, x - hw * flare, bottom, x + hw * flare, bottom);
    } else if (dressy) { // sherwani: gold collar, buttons, hem
      for (let yy = sy + 0.07 * h; yy < bottom - 0.03 * h; yy += 0.06 * h) circle(c, GOLD, x, yy, 0.016 * h);
      line(c, GOLD, 0.03 * h, x - hw * flare, bottom, x + hw * flare, bottom);
      rect(c, GOLD, x - sw * 0.45, sy, sw * 0.9, 0.045 * h);
    } else if (id === 'you') { // drawstrings + pocket
      line(c, '#fff', 0.015 * h, x - 0.03 * h, sy + 0.01 * h, x - 0.03 * h, sy + 0.1 * h);
      line(c, '#fff', 0.015 * h, x + 0.03 * h, sy + 0.01 * h, x + 0.03 * h, sy + 0.1 * h);
      rect(c, L.dark, x - hw * 0.6, hip - 0.1 * h, hw * 1.2, 0.07 * h);
    }
    if (id === 'anaya') line(c, o.accent || '#f7d038', (o.wedding ? 0.05 : 0.025) * h, x - hw * flare, bottom, x + hw * flare, bottom);
    if (id === 'anaya' && o.wedding) { poly(c, '#c2185b', x - sw, sy, x - sw * 0.4, sy, x + hw * 1.3, bottom - 0.1 * h, x + hw * 0.9, bottom); line(c, GOLD, 0.02 * h, x - sw * 0.4, sy, x + hw * 1.3, bottom - 0.1 * h); }  // dupatta drape
  }
  if (o.accent) rect(c, o.accent, x - sw * 0.5, sy, sw, 0.035 * h);   // festive neckline

  // Arms: [left hand x, y, right hand x, y]
  const ax = 0.17 * h, ay = sy + 0.04 * h;
  let hands = [x - 0.21 * h, hip + 0.02 * h, x + 0.21 * h, hip + 0.02 * h];
  if (o.pose === 'dancing') hands = [x - 0.3 * h, hy - 0.2 * h, x + 0.3 * h, hy - 0.2 * h];
  else if (o.pose === 'sparklers') hands = [x - 0.21 * h, hip + 0.02 * h, x + 0.28 * h, sy - 0.12 * h];
  else if (o.pose === 'lighting') hands = [x - 0.06 * h, hip - 0.02 * h, x + 0.06 * h, hip - 0.02 * h];
  else if (o.pose === 'eating') hands = [x - 0.1 * h, sy + 0.16 * h, x + 0.1 * h, sy + 0.16 * h];
  else if (sitting) hands = [x - 0.13 * h, hip, x + 0.13 * h, hip];
  if (o.raise) hands = [hands[0], hands[1], x + 0.38 * h, sy - 0.4 * h];
  const shortSleeves = id === 'ma' || (id === 'kabir' && !dressy);
  const sleeve = shortSleeves ? L.skin : L.top;
  for (const [sx, hx, hyy] of [[x - ax, hands[0], hands[1]], [x + ax, hands[2], hands[3]]]) {
    line(c, sleeve, 0.085 * h, sx, ay, hx, hyy);
    if (shortSleeves) line(c, L.top, 0.095 * h, sx, ay, sx + (hx - sx) * 0.3, ay + (hyy - ay) * 0.3);  // short sleeves
    circle(c, L.skin, hx, hyy, 0.045 * h);
  }
  if (o.pose === 'sparklers') { line(c, '#777', 0.012 * h, hands[2], hands[3], hands[2] + 0.06 * h, hands[3] - 0.18 * h); sparkle(c, hands[2] + 0.06 * h, hands[3] - 0.18 * h, 0.1 * h); }
  if (o.pose === 'lighting') diya(c, x, hip - 0.01 * h, 0.03 * h);
  if (o.pose === 'eating') ellipse(c, '#fff', x, sy + 0.17 * h, 0.14 * h, 0.04 * h);

  if (o.wedding && (id === 'anaya' || id === 'ma')) for (let k = -3; k <= 3; k++) circle(c, GOLD, x + k * r * 0.22, sy + 0.02 * h + (9 - k * k) * r * 0.02, r * (id === 'anaya' ? 0.16 : 0.12));  // necklace

  // Head
  circle(c, L.skin, x, hy, r);
  if (id === 'kabir') { c.strokeStyle = L.hair; c.lineWidth = r * 0.34; c.beginPath(); c.arc(x, hy, r * 0.83, 0.1, Math.PI - 0.1); c.stroke(); }   // beard
  circle(c, '#1b130d', x - r * 0.38, hy - r * 0.05, r * 0.11);
  circle(c, '#1b130d', x + r * 0.38, hy - r * 0.05, r * 0.11);
  { c.strokeStyle = '#7a3b2e'; c.lineWidth = r * 0.08; c.beginPath(); c.arc(x, hy + r * 0.25, r * 0.3, 0.3, Math.PI - 0.3); c.stroke(); }

  // Hair and headwear in front
  c.fillStyle = L.hair;
  if (id === 'you' || id === 'anaya' || id === 'ma') { c.beginPath(); c.arc(x, hy - r * 0.05, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
  if (id === 'ma') circle(c, '#c0392b', x, hy - r * 0.42, r * 0.1);   // bindi
  if (id === 'anaya' && o.wedding) {   // maang tikka + earrings
    line(c, GOLD, r * 0.08, x, hy - r * 1.0, x, hy - r * 0.4); circle(c, GOLD, x, hy - r * 0.32, r * 0.15);
    for (const s of [-1, 1]) circle(c, GOLD, x + s * r * 1.02, hy + r * 0.3, r * 0.17);
  }
  if (id === 'dev') {
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.15); circle(c, L.hair, x + Math.cos(a) * r * 0.95, hy + Math.sin(a) * r * 0.95, r * 0.36); }
    c.strokeStyle = '#111'; c.lineWidth = r * 0.12;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r * 0.4, hy - r * 0.05, r * 0.3, 0, TAU); c.stroke(); }
    line(c, '#111', r * 0.1, x - r * 0.1, hy - r * 0.05, x + r * 0.1, hy - r * 0.05);
  }
  if (id === 'kabir') {
    c.fillStyle = '#1f3a6e'; c.beginPath(); c.arc(x, hy - r * 0.15, r * 1.05, Math.PI, 0); c.fill();
    ellipse(c, '#1f3a6e', x + r * 0.9, hy - r * 0.2, r * 0.9, r * 0.22);
  }
}

function drawPeople(c, p, t, year, v) {
  const n = p.people.length, pose = p.pose;
  const selfie = pose === 'selfie';
  let h, base, gap;
  if (selfie) { h = [0, 150, 120, 100, 90, 85][n]; base = 100 + h * 0.45; gap = n > 1 ? Math.min(40, 92 / n) : 0; }
  else if (pose === 'working') { h = 80; base = 100; gap = 0; }
  else { h = [0, 72, 66, 58, 52, 48][n] * (pose === 'sitting' ? 0.85 : 1); base = 97; gap = Math.min(32, 94 / n); }
  const wedding = t.has('wedding') || p.place === 'jaipur';
  const accent = wedding ? GOLD : t.has('festive') ? ACCENT[year] : null;
  const shift = (v.next() - 0.5) * (selfie ? 4 : 10);
  p.people.forEach((id, i) => {
    const x = 50 + shift + (i - (n - 1) / 2) * gap;
    drawPerson(c, id, x, base, h, { pose, accent, wedding, raise: selfie && i === n - 1 });
  });
  if (t.has('dog')) dog(c, selfie ? 78 : 50 + shift + ((n - 1) / 2) * gap + 20, selfie ? 102 : 98, selfie ? 1.6 : 1.1);
  if (pose === 'working') { rrect(c, '#b0b6bd', 32, 50, 36, 22, 2); circle(c, '#dfe3e6', 50, 61, 2.5); }
}

function drawObjects(c, place, t, year) {
  if (t.has('dog')) dog(c, 58, 92, 2);
  else if (t.has('cake')) cake(c, 50, 92, 1.3);
  else if (t.has('chai')) { rect(c, '#e9b77a', 40, 50, 20, 28); rect(c, '#c98b4a', 40, 50, 20, 6); rect(c, 'rgba(255,255,255,0.35)', 42, 56, 3, 20); }
  else if (t.has('laptop')) { rrect(c, '#2d3436', 26, 40, 48, 30, 2); rect(c, '#74b9ff', 29, 43, 42, 24); poly(c, '#636e72', 20, 72, 80, 72, 76, 70, 24, 70); }
  else if (t.has('coffee')) { rect(c, '#fff', 38, 50, 22, 26); line(c, '#fff', 3, 60, 56, 67, 60, 60, 68); ellipse(c, '#6f4e37', 49, 51, 10, 2.5); }
  else if (t.has('food')) { ellipse(c, '#ddd', 50, 70, 30, 12); ellipse(c, '#fff', 50, 68, 28, 11); circle(c, '#f39c12', 40, 67, 5); circle(c, '#27ae60', 52, 64, 4); ellipse(c, '#e8c07a', 60, 70, 8, 4); }
  else if (t.has('flowers') && place !== 'park' && place !== 'pondicherry') { rect(c, '#4a90a4', 42, 60, 16, 26); for (const [x, y, col] of [[44, 54, '#e84393'], [52, 50, '#f7d038'], [58, 56, '#e84393'], [50, 58, '#fff']]) circle(c, col, x, y, 6); }
  else if (t.has('rangoli')) { rangoli(c, 50, 80, 2.4, year); if (t.has('diyas')) for (const x of [14, 86]) diya(c, x, 80, 2); }
  else if (t.has('diyas')) for (const x of [25, 50, 75]) diya(c, x, 82, 2.2);
}

// ---- clutter ----
const textBar = (c, x, y, w, col = '#c7ccd1') => rrect(c, col, x, y, w, 2.6, 1.3);

function drawScreenshot(c, t, v) {
  rect(c, '#fff', 0, 0, 100, 100);
  rect(c, '#202124', 0, 0, 100, 7);
  textBar(c, 4, 2.2, 10, '#fff'); textBar(c, 84, 2.2, 12, '#fff');
  if (t.has('chat')) {
    rect(c, '#3f6fb5', 0, 7, 100, 11); circle(c, '#fff', 9, 12.5, 3.5); textBar(c, 16, 11, 26, '#e8eef8');
    rect(c, '#ece5dd', 0, 18, 100, 82);
    for (let y = 22, i = 0; y < 92; i++) {
      const mine = v.chance(0.5), w = 30 + v.int(0, 30), hh = 7 + v.int(0, 1) * 5, x = mine ? 96 - w : 4;
      rrect(c, mine ? '#d6f5c9' : '#fff', x, y, w, hh, 2.5);
      textBar(c, x + 3, y + 2.5, w - 10); if (hh > 8) textBar(c, x + 3, y + 7, w - 18);
      y += hh + 4;
    }
  } else if (t.has('map')) {
    rect(c, '#e8efe2', 0, 7, 100, 93);
    for (const pts of [[0, 30, 100, 45], [30, 7, 45, 100], [0, 80, 100, 70], [70, 7, 85, 100]]) line(c, '#fff', 5, ...pts);
    line(c, '#4285f4', 3, 38, 90, 40, 40, 78, 36);
    circle(c, '#d93025', 78, 30, 5); circle(c, '#fff', 78, 30, 2);
    rrect(c, '#fff', 6, 10, 88, 9, 4); textBar(c, 12, 13, 40);
  } else if (t.has('ticket')) {
    rect(c, '#e3e6ea', 0, 7, 100, 93);   // not the placeholder grey (#e8eaed), so QA can detect placeholders by pixel
    rrect(c, '#fff', 10, 14, 80, 80, 4); rect(c, '#e67e22', 10, 14, 80, 12);
    textBar(c, 16, 32, 50); textBar(c, 16, 38, 30);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (v.chance(0.5) || i % 7 === 0 && j % 7 === 0) rect(c, '#222', 34 + i * 4, 48 + j * 4, 4, 4);
  } else {
    rect(c, '#f8f9fa', 0, 7, 100, 93);
    circle(c, '#1e8e3e', 50, 38, 16);
    line(c, '#fff', 3.5, 42, 38, 48, 44, 59, 31);
    rrect(c, '#202124', 32, 60, 36, 6, 3); textBar(c, 26, 72, 48); textBar(c, 34, 78, 32);
  }
}

function drawForward(c, t, v) {
  if (t.has('meme')) {
    rect(c, '#fff', 0, 0, 100, 100);
    textBar(c, 10, 6, 80, '#333'); textBar(c, 20, 12, 60, '#333');
    rect(c, ['#74b9ff', '#a29bfe', '#fab1a0'][v.int(0, 2)], 6, 20, 88, 60);
    circle(c, '#f7d038', 50, 50, 20);
    circle(c, '#333', 42, 45, 2.5); circle(c, '#333', 58, 45, 2.5);
    c.strokeStyle = '#333'; c.lineWidth = 2; c.beginPath(); c.arc(50, 52 + (v.chance(0.5) ? 0 : 10), 8, v.chance(0.5) ? 0.2 : Math.PI + 0.2, v.chance(0.5) ? Math.PI - 0.2 : -0.2); c.stroke();
    textBar(c, 14, 86, 72, '#333'); textBar(c, 26, 92, 48, '#333');
  } else if (t.has('quote')) {
    rect(c, ['#2d3436', '#6c5ce7', '#00897b'][v.int(0, 2)], 0, 0, 100, 100);
    for (const x of [12, 22]) { circle(c, '#fff', x, 22, 4); poly(c, '#fff', x - 4, 22, x - 1, 22, x - 5, 32); }
    for (let i = 0; i < 4; i++) textBar(c, 14, 40 + i * 9, 72 - (i === 3 ? 30 : 0), '#fff');
    textBar(c, 50, 84, 34, '#ddd');
  } else {
    const g = c.createLinearGradient(0, 0, 0, 100);
    g.addColorStop(0, '#ffeaa7'); g.addColorStop(1, '#fd79a8');
    c.fillStyle = g; c.fillRect(0, 0, 100, 100);
    circle(c, '#fdcb6e', 50, 30, 14);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; line(c, '#fdcb6e', 1.5, 50 + Math.cos(a) * 17, 30 + Math.sin(a) * 17, 50 + Math.cos(a) * 22, 30 + Math.sin(a) * 22); }
    for (const [x, col] of [[20, '#e84393'], [80, '#d63031'], [35, '#fff'], [65, '#e84393']]) circle(c, col, x, 92, 7);
    rrect(c, '#d63031', 14, 56, 72, 7, 3.5); rrect(c, '#e17055', 24, 68, 52, 5, 2.5);
  }
}

// ---- public ----
export function drawPhoto(ctx, p, size) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.beginPath(); ctx.rect(0, 0, 100, 100); ctx.clip();
  // Burst photos share a seed (near-identical) plus a tiny shift each.
  const v = makeRng(hash(p.burstId || p.id));
  if (p.burstId) ctx.translate((hash(p.id) % 5 - 2) * 0.6, (hash(p.id + 'y') % 3 - 1) * 0.6);
  const t = new Set(p.scene);
  const year = new Date(p.ts).getUTCFullYear();
  if (p.type === 'screenshot') drawScreenshot(ctx, t, v);
  else if (p.type === 'forward') drawForward(ctx, t, v);
  else {
    drawPlace(ctx, p.place, t, year, v);
    if (p.people.length) drawPeople(ctx, p, t, year, v);
    drawForeground(ctx, p.place, t, p.people.length > 0);
    if (!p.people.length) drawObjects(ctx, p.place, t, year);
  }
  ctx.restore();
}

// Round face icon for a person id, or 'bruno'.
export function drawFace(ctx, id, size) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.beginPath(); ctx.arc(50, 50, 50, 0, TAU); ctx.clip();
  rect(ctx, '#e8eef3', 0, 0, 100, 100);
  if (id === 'bruno') dog(ctx, 88, 112, 4);
  else drawPerson(ctx, id, 50, 190, 170, { pose: 'standing' });
  ctx.restore();
}
