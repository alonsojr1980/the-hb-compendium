#!/usr/bin/env node
/*
 * restructure-platforms.mjs — migration helper.
 * Moves the flat `items/*.json` layout into a per-platform layout:
 *
 *   library/
 *     platforms/
 *       ps5/
 *         platform.json
 *         items/*.json
 *
 * and rewrites `library.json` as a manifest that lists platform files.
 *
 * Usage: node development/tools/restructure-platforms.mjs
 * Safe to re-run: if library.json has no root `itemFiles`, it does nothing.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const manifestPath = join(root, 'library.json');
const lib = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (!Array.isArray(lib.itemFiles) || !lib.itemFiles.length) {
  console.log('library.json has no root "itemFiles" — already restructured? Nothing to do.');
  process.exit(0);
}

const PLATFORM_ID = 'ps5';
const platformDir = join(root, 'library', 'platforms', PLATFORM_ID);
const itemsDir = join(platformDir, 'items');
mkdirSync(itemsDir, { recursive: true });

const itemFiles = [];
for (const rel of lib.itemFiles) {
  const src = join(root, rel);
  const name = basename(rel);
  if (existsSync(src)) renameSync(src, join(itemsDir, name));
  else console.warn(`missing item file: ${rel}`);
  itemFiles.push(name);
}

// Remove the now-empty legacy items folder.
const legacyDir = join(root, 'items');
if (existsSync(legacyDir)) rmSync(legacyDir, { recursive: true, force: true });

const platform = {
  id: PLATFORM_ID,
  name: 'PlayStation 5',
  shortName: 'PS5',
  description: 'Native PlayStation 5 homebrew — emulators, jailbreaks, tools and apps.',
  icon: 'gamepad',
  order: 1,
  itemFiles,
};
writeFileSync(join(platformDir, 'platform.json'), `${JSON.stringify(platform, null, 2)}\n`, 'utf8');

const manifest = {
  schemaVersion: '2.0.0',
  site: lib.site,
  categories: lib.categories,
  redirects: lib.redirects || {},
  platforms: [`library/platforms/${PLATFORM_ID}/platform.json`],
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Moved ${itemFiles.length} items into ${itemsDir}`);
console.log(`Wrote ${join(platformDir, 'platform.json')}`);
console.log(`Rewrote ${manifestPath} as a platform manifest (schemaVersion 2.0.0).`);
