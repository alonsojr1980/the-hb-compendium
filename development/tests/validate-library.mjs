#!/usr/bin/env node
/*
 * validate-library.mjs — structural validation of the modular library (no dependencies).
 * Reads library.json (manifest) and, when `itemFiles` is present, each items/*.json.
 *
 * Usage: node development/tests/validate-library.mjs [path-to-library.json]
 * Exits non-zero on error so it can gate CI.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = process.argv[2] ? resolve(process.argv[2]) : join(here, '..', 'library.json');
const root = dirname(manifestPath);

const errors = [];
const warns = [];
const fail = (m) => errors.push(m);
const warn = (m) => warns.push(m);

let data;
try {
  data = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.error(`FATAL: ${manifestPath} is not valid JSON — ${e.message}`);
  process.exit(1);
}

for (const k of ['schemaVersion', 'site', 'categories']) {
  if (!(k in data)) fail(`missing top-level "${k}"`);
}
if (data.site) {
  for (const k of ['title', 'lastUpdated', 'disclaimer']) {
    if (!data.site[k]) fail(`site.${k} is required`);
  }
}

const catIds = new Set();
for (const c of data.categories ?? []) {
  if (!c.id) fail('category without id');
  if (catIds.has(c.id)) fail(`duplicate category id "${c.id}"`);
  catIds.add(c.id);
}

// Resolve items: platforms -> platform.json -> items/*.json; legacy itemFiles/inline also accepted.
let items = [];
let source = 'inline items';
const platformIds = [];
if (Array.isArray(data.platforms) && data.platforms.length) {
  source = `${data.platforms.length} platform(s)`;
  for (const rel of data.platforms) {
    const pPath = resolve(root, rel);
    let platform;
    try {
      platform = JSON.parse(readFileSync(pPath, 'utf8'));
    } catch (e) {
      fail(`could not read/parse platform ${rel} — ${e.message}`);
      continue;
    }
    if (!platform.id) fail(`platform ${rel}: missing "id"`);
    if (!platform.name) warn(`platform ${rel}: missing "name"`);
    if (platformIds.includes(platform.id)) fail(`duplicate platform id "${platform.id}"`);
    platformIds.push(platform.id);

    const platformDir = dirname(pPath);
    const files = Array.isArray(platform.itemFiles) ? platform.itemFiles : [];
    for (const f of files) {
      try {
        const item = JSON.parse(readFileSync(join(platformDir, 'items', f), 'utf8'));
        if (item && typeof item === 'object' && item.platformId == null) item.platformId = platform.id;
        items.push(item);
      } catch (e) {
        fail(`could not read/parse ${rel} -> items/${f} — ${e.message}`);
      }
    }
  }
} else if (Array.isArray(data.itemFiles) && data.itemFiles.length) {
  source = `${data.itemFiles.length} itemFiles`;
  for (const rel of data.itemFiles) {
    try { items.push(JSON.parse(readFileSync(resolve(root, rel), 'utf8'))); }
    catch (e) { fail(`could not read/parse ${rel} — ${e.message}`); }
  }
} else if (Array.isArray(data.items)) {
  items = data.items;
} else {
  fail('library has no platforms, itemFiles or items array');
}

const itemIds = new Set();
const requiredItem = ['id', 'name', 'category', 'summary', 'author', 'status', 'links'];
const STATUSES = ['stable', 'beta', 'alpha', 'experimental', 'discontinued'];
for (const it of items) {
  const where = it.id ? `"${it.id}"` : '<no id>';
  for (const k of requiredItem) if (!it[k]) fail(`item ${where}: missing "${k}"`);
  if (it.id) {
    if (itemIds.has(it.id)) fail(`duplicate item id "${it.id}"`);
    itemIds.add(it.id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(it.id)) warn(`item ${where}: id is not a clean slug`);
  }
  if (it.category && !catIds.has(it.category)) fail(`item ${where}: unknown category "${it.category}"`);
  if (it.links && !/^https:\/\//.test(it.links.source ?? '')) fail(`item ${where}: links.source must be an https URL`);
  if (it.status && !STATUSES.includes(it.status)) fail(`item ${where}: invalid status "${it.status}"`);
}

for (const it of items) {
  for (const r of it.requires ?? []) {
    if (!itemIds.has(r)) warn(`item "${it.id}": requires "${r}" which is not defined`);
  }
}
for (const [from, to] of Object.entries(data.redirects ?? {})) {
  if (!itemIds.has(to)) warn(`redirect "${from}" -> "${to}" target not found`);
}

console.log(`library — ${manifestPath}`);
console.log(`  schemaVersion: ${data.schemaVersion}`);
console.log(`  categories:    ${catIds.size}`);
console.log(`  items:         ${itemIds.size}  (${source})`);
console.log(`  unverified:    ${items.filter((i) => !i.verified).length}`);

for (const w of warns) console.warn(`  WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`FAILED with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`OK${warns.length ? ` (${warns.length} warning(s))` : ''}.`);
