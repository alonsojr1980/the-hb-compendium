#!/usr/bin/env node
/*
 * thumbnail.test.mjs — unit tests for the platform thumbnail fallback convention:
 * when `platform.thumbnail` is absent/empty, resolve library/platforms/<id>/thumb.[png|jpg|jpeg|svg].
 *   node --test development/tests/thumbnail.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { THUMB_EXTS, thumbCandidates, resolveThumbnail } from '../js/render.js';

test('THUMB_EXTS order is png, jpg, jpeg, svg', () => {
  assert.deepEqual(THUMB_EXTS, ['png', 'jpg', 'jpeg', 'svg']);
});

test('thumbCandidates builds <dir>thumb.<ext> for each extension', () => {
  assert.deepEqual(thumbCandidates('library/platforms/ps5/'), [
    'library/platforms/ps5/thumb.png',
    'library/platforms/ps5/thumb.jpg',
    'library/platforms/ps5/thumb.jpeg',
    'library/platforms/ps5/thumb.svg',
  ]);
});

test('resolveThumbnail picks the first extension that exists (svg here)', async () => {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(url); return { ok: url.endsWith('.svg') }; };
  const url = await resolveThumbnail('library/platforms/test-svg/');
  assert.equal(url, 'library/platforms/test-svg/thumb.svg');
  assert.deepEqual(calls, [
    'library/platforms/test-svg/thumb.png',
    'library/platforms/test-svg/thumb.jpg',
    'library/platforms/test-svg/thumb.jpeg',
    'library/platforms/test-svg/thumb.svg',
  ]);
});

test('resolveThumbnail prefers png when present', async () => {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(url); return { ok: url.endsWith('.png') }; };
  assert.equal(await resolveThumbnail('library/platforms/test-png/'), 'library/platforms/test-png/thumb.png');
  assert.deepEqual(calls, ['library/platforms/test-png/thumb.png']);
});

test('resolveThumbnail returns null when no extension exists', async () => {
  globalThis.fetch = async () => ({ ok: false });
  assert.equal(await resolveThumbnail('library/platforms/test-none/'), null);
});
