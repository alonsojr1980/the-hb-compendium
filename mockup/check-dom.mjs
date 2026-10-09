/*
 * Optional smoke helper: summarize a dumped DOM produced by a headless browser.
 * Usage: node mockup/check-dom.mjs <path-to-dumped-dom.html>
 * Not part of the app; used to verify the prototype renders without a real browser UI.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node mockup/check-dom.mjs <dumped-dom.html>');
  process.exit(2);
}
const s = readFileSync(file, 'utf8');
const count = (re) => (s.match(re) || []).length;
const titles = [...s.matchAll(/class="card__title"[^>]*>([^<]*)</g)].map((m) => m[1]);
const gridIdx = s.indexOf('id="grid"');
const gridTitles = gridIdx >= 0
  ? [...s.slice(gridIdx).matchAll(/class="card__title"[^>]*>([^<]*)</g)].map((m) => m[1])
  : [];
const toast = s.match(/id="toast"(?![^>]*\shidden)[^>]*>([\s\S]*?)<\/div>/);

console.log('cards rendered :', count(/card__title/g));
console.log('grid first     :', gridTitles.slice(0, 3).join(' | '));
console.log('topic buttons  :', count(/class="topic"/g));
console.log('featured cards :', count(/card--featured/g));
console.log('incompatible   :', count(/card--incompatible/g));
console.log('img icons      :', count(/class="icon card__glyph item-icon"/g));
console.log('svg glyphs     :', count(/class="icon card__glyph"/g));
const iconSrcs = [...s.matchAll(/class="icon card__glyph item-icon"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
console.log('icon sample    :', iconSrcs.slice(0, 2).join(' , ') || '(none)');
console.log('first titles   :', titles.slice(0, 3).join(' | '));
console.log('grid hidden    :', /id="grid"[^>]*hidden/.test(s));
console.log('empty state?   :', s.includes('This library is empty'));
console.log('no-match state?:', s.includes('No projects match'));
console.log('error state?   :', s.includes('Could not load'));
console.log('modal open     :', /id="modal"(?![^>]*\shidden)/.test(s));
console.log('detail sections:', count(/detail__section/g));
console.log('warnings block :', count(/class="warnlist"/g));
console.log('toast          :', toast ? `"${toast[1].replace(/\s+/g, ' ').trim().slice(0, 70)}"` : '(none)');
console.log('live region    :', (s.match(/id="live"[^>]*>([^<]*)</) || [])[1] || '');
console.log('hero title     :', (s.match(/id="hero-title"[^>]*>([^<]*)/) || [])[1]);
