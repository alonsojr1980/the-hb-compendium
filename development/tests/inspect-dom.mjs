#!/usr/bin/env node
/*
 * inspect-dom.mjs — summarize a headless-dumped DOM and assert structural expectations.
 * Usage: node development/tests/inspect-dom.mjs <dumped-dom.html>
 * Used for local verification (Chrome --dump-dom) without a browser automation dependency.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node development/tests/inspect-dom.mjs <dumped-dom.html>');
  process.exit(2);
}
const s = readFileSync(file, 'utf8');
const count = (re) => (s.match(re) || []).length;
const idx = (needle) => s.indexOf(needle);
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

console.log('cards          :', count(/card__title/g));
console.log('topic buttons  :', count(/class="topic"/g));
console.log('featured cards :', count(/card--featured/g));
console.log('incompatible   :', count(/card--incompatible/g));
console.log('img icons      :', count(/class="icon card__glyph item-icon"/g));
console.log('svg glyphs     :', count(/class="icon card__glyph"/g));
console.log('modal open     :', /id="modal"(?![^>]*\shidden)/.test(s));
console.log('error state?   :', s.includes('Could not load'));
console.log('empty state?   :', s.includes('This library is empty') || s.includes('No projects match'));

const result = s.match(/id="resultline"[^>]*>([\s\S]*?)<\/p>/);
console.log('resultline     :', result ? strip(result[1]) : '');
console.log('resultline hid :', /id="resultline"[^>]*\shidden/.test(s));
console.log('search count   :', (s.match(/id="search-count"[^>]*>([^<]*)</) || [])[1] || '');
console.log('live region    :', (s.match(/id="live"[^>]*>([^<]*)</) || [])[1] || '');

const iBrowse = idx('id="browse"');
const iSearch = idx('id="search-form"');
const iTopics = idx('id="topics"');
console.log('search inside browse :', iBrowse > -1 && iSearch > iBrowse);
console.log('search above topics  :', iSearch > -1 && iTopics > iSearch);
console.log('clear button present :', idx('id="search-clear"') > -1);
