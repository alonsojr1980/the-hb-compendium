#!/usr/bin/env node
/*
 * filters.test.mjs — unit tests for the pure search/filter/sort logic in js/filters.js.
 * No dependencies: uses the Node built-in test runner (`node --test`).
 *   node --test development/tests/filters.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchesQuery, visibleItems, isFiltering } from '../js/filters.js';

const items = [
  { id: 'gamma', name: 'Gamma Tool', category: 'tools', status: 'stable', platformId: 'ps5', author: 'Ann', summary: 'A tool', description: '', tags: ['ftp'], order: 3, updated: '2026-01-01' },
  { id: 'beta', name: 'Beta Emu', category: 'emulators', status: 'alpha', platformId: 'ps5', author: 'Bob', summary: 'An emulator', description: '', tags: ['retro', 'vulkan'], order: 2, updated: '2026-05-01' },
  { id: 'alpha', name: 'Alpha App', category: 'apps', status: 'stable', platformId: 'ps4', author: 'Cara', summary: 'An app', description: '', tags: ['media'], order: 1, updated: '2025-12-01' },
];

const baseState = (patch = {}) => ({
  library: { items: items.map((i) => ({ ...i })) },
  category: 'all', query: '', status: 'all', platform: 'all', sort: 'curated', firmware: '',
  ...patch,
});

test('matchesQuery: empty query matches everything', () => {
  assert.equal(matchesQuery(items[0], ''), true);
  assert.equal(matchesQuery(items[0], '   '), true);
});

test('matchesQuery: matches name, summary, author and tags (case-insensitive)', () => {
  assert.equal(matchesQuery(items[0], 'gamma'), true);
  assert.equal(matchesQuery(items[0], 'GAMMA'), true);
  assert.equal(matchesQuery(items[1], 'emu'), true);      // name "Beta Emu"
  assert.equal(matchesQuery(items[1], 'vulkan'), true);   // tag
  assert.equal(matchesQuery(items[2], 'cara'), true);     // author
  assert.equal(matchesQuery(items[0], 'nope'), false);
});

test('matchesQuery: every whitespace-separated term must match', () => {
  assert.equal(matchesQuery(items[1], 'beta retro'), true);
  assert.equal(matchesQuery(items[1], 'beta vlc'), false);
});

test('visibleItems: category filter keeps only that category', () => {
  const out = visibleItems(baseState({ category: 'emulators' }));
  assert.deepEqual(out.map((i) => i.id), ['beta']);
});

test('visibleItems: status filter', () => {
  const out = visibleItems(baseState({ status: 'stable' }));
  assert.deepEqual(out.map((i) => i.id).sort(), ['alpha', 'gamma']);
});

test('visibleItems: platform filter matches platformId', () => {
  const out = visibleItems(baseState({ platform: 'ps4' }));
  assert.deepEqual(out.map((i) => i.id), ['alpha']);
});

test('visibleItems: filters combine (AND)', () => {
  const out = visibleItems(baseState({ status: 'stable', platform: 'ps5' }));
  assert.deepEqual(out.map((i) => i.id), ['gamma']);
});

test('visibleItems: sort=name, updated (desc) and curated (order, then name)', () => {
  assert.deepEqual(visibleItems(baseState({ sort: 'name' })).map((i) => i.id), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(visibleItems(baseState({ sort: 'updated' })).map((i) => i.id), ['beta', 'gamma', 'alpha']);
  assert.deepEqual(visibleItems(baseState({ sort: 'curated' })).map((i) => i.id), ['alpha', 'beta', 'gamma']);
});

test('visibleItems: does not mutate the source item list', () => {
  const state = baseState();
  visibleItems(state);
  assert.deepEqual(state.library.items.map((i) => i.id), ['gamma', 'beta', 'alpha']);
});

test('isFiltering: false at defaults, true when any facet is set', () => {
  assert.equal(isFiltering(baseState()), false);
  assert.equal(isFiltering(baseState({ query: 'x' })), true);
  assert.equal(isFiltering(baseState({ category: 'apps' })), true);
  assert.equal(isFiltering(baseState({ status: 'stable' })), true);
  assert.equal(isFiltering(baseState({ platform: 'ps5' })), true);
});
