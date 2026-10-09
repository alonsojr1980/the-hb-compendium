#!/usr/bin/env node
/*
 * split-library.mjs — migration helper.
 * Splits a monolithic `library.json` (with an inline `items` array) into
 * one file per item under `items/`, and rewrites `library.json` as a manifest
 * that lists those files via `itemFiles`.
 *
 * Filename convention: item id with hyphens replaced by underscores, e.g.
 *   "ps5-retroarch" -> "items/ps5_retroarch.json"
 *
 * Usage: node development/tools/split-library.mjs
 * Safe to re-run: if library.json has no inline `items`, it does nothing.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const libPath = join(root, 'library.json');
const itemsDir = join(root, 'items');

const lib = JSON.parse(readFileSync(libPath, 'utf8'));
if (!Array.isArray(lib.items)) {
  console.log('library.json has no inline "items" — nothing to split.');
  process.exit(0);
}

const fileNameFor = (id) => `${id.replace(/-/g, '_')}.json`;
mkdirSync(itemsDir, { recursive: true });

const itemFiles = [];
for (const item of lib.items) {
  if (!item || typeof item.id !== 'string') {
    console.warn('skipped item without a string id:', item);
    continue;
  }
  const name = fileNameFor(item.id);
  writeFileSync(join(itemsDir, name), `${JSON.stringify(item, null, 2)}\n`, 'utf8');
  itemFiles.push(`items/${name}`);
}

const manifest = {
  schemaVersion: lib.schemaVersion,
  site: lib.site,
  categories: lib.categories,
  redirects: lib.redirects || {},
  itemFiles,
};

writeFileSync(libPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Split ${itemFiles.length} items into ${itemsDir}`);
console.log(`Rewrote ${libPath} as a manifest with ${itemFiles.length} itemFiles.`);
