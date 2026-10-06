// Draws and JPEG-encodes tiles off the main thread, so scrolling never waits on it.
// Builds the same seeded library as the page, so a display index means the same photo here.
import { photos } from './library.js';
import { drawPhoto } from './draw.js';

const order = photos.slice().reverse();   // newest first, same as timeline.js
let canvas = null, ctx = null;

// Message: { jobs: [{ k, i }], px, bg } -> reply { bg, items: [{ k, blob }] }. k is the page's cache key, i a display index.
self.onmessage = async ({ data: { jobs, px, bg } }) => {
  const items = [];
  for (const { k, i } of jobs) {
    if (!canvas || canvas.width !== px) { canvas = new OffscreenCanvas(px, px); ctx = canvas.getContext('2d'); }
    drawPhoto(ctx, order[i], px);
    items.push({ k, blob: await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 }) });   // snapshot taken at call
  }
  self.postMessage({ bg, items });
};
