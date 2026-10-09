#!/usr/bin/env node
/*
 * PS5 Homebrew Compendium — MOCKUP data smoke check.
 * Dependency-free structural validation of library.json.
 * This is NOT a full JSON Schema validator; it guards the mockup's assumptions.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, 'library.json');

const errors = [];
const warns = [];
const fail = (m) => errors.push(m);
const warn = (m) => warns.push(m);

let data;
try {
  data = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`FATAL: library.json is not valid JSON — ${e.message}`);
  process.exit(1);
}

/* Modular library: load per-item files when a manifest lists them. */
if (Array.isArray(data.itemFiles) && data.itemFiles.length) {
  const loaded = [];
  for (const rel of data.itemFiles) {
    try { loaded.push(JSON.parse(readFileSync(join(here, rel), 'utf8'))); }
    catch (e) { fail(`could not read/parse ${rel} — ${e.message}`); }
  }
  data.items = loaded;
}

/* top-level */
for (const k of ['schemaVersion', 'site', 'categories']) {
  if (!(k in data)) fail(`missing top-level "${k}"`);
}
if (!Array.isArray(data.items) && !Array.isArray(data.itemFiles)) fail('missing "items" or "itemFiles"');
if (data.site) {
  for (const k of ['title', 'lastUpdated', 'disclaimer']) {
    if (!data.site[k]) fail(`site.${k} is required`);
  }
}

/* categories */
const catIds = new Set();
for (const c of data.categories ?? []) {
  if (!c.id) fail('category without id');
  if (catIds.has(c.id)) fail(`duplicate category id "${c.id}"`);
  catIds.add(c.id);
}

/* items */
const itemIds = new Set();
const requiredItem = ['id', 'name', 'category', 'summary', 'author', 'status', 'links'];
for (const it of data.items ?? []) {
  const where = it.id ? `"${it.id}"` : '<no id>';
  for (const k of requiredItem) {
    if (!it[k]) fail(`item ${where}: missing "${k}"`);
  }
  if (it.id) {
    if (itemIds.has(it.id)) fail(`duplicate item id "${it.id}"`);
    itemIds.add(it.id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(it.id)) warn(`item ${where}: id is not a clean slug`);
  }
  if (it.category && !catIds.has(it.category)) fail(`item ${where}: unknown category "${it.category}"`);
  if (it.links && !/^https?:\/\//.test(it.links.source ?? '')) fail(`item ${where}: links.source must be a URL`);
  if (it.status && !['stable', 'beta', 'alpha', 'experimental', 'discontinued'].includes(it.status)) {
    fail(`item ${where}: invalid status "${it.status}"`);
  }
}

/* requires references (checked after all items are known) */
for (const it of data.items ?? []) {
  for (const r of it.requires ?? []) {
    if (!itemIds.has(r)) warn(`item "${it.id}": requires "${r}" which is not defined`);
  }
}

/* redirects */
for (const [from, to] of Object.entries(data.redirects ?? {})) {
  if (!itemIds.has(to)) warn(`redirect "${from}" -> "${to}" target not found`);
}

/* summary */
console.log(`library.json: schemaVersion ${data.schemaVersion}`);
console.log(`  categories: ${catIds.size}  (${[...catIds].join(', ')})`);
console.log(`  items:      ${itemIds.size}`);
console.log(`  featured:   ${(data.items ?? []).filter((i) => i.featured).length}`);

for (const w of warns) console.warn(`  WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`FAILED with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`OK${warns.length ? ` (${warns.length} warning(s))` : ''}.`);
