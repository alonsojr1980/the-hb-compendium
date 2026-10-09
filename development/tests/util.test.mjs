#!/usr/bin/env node
/*
 * util.test.mjs — unit tests for the pure helpers in js/util.js.
 * No dependencies: uses the Node built-in test runner (`node --test`).
 *   node --test development/tests/util.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseFirmware, compatibility, firmwareLabel, norm, hueFor, safeHttps } from '../js/util.js';

test('parseFirmware accepts MAJOR.MM and trims', () => {
  assert.equal(parseFirmware('13.60'), 13060);
  assert.equal(parseFirmware('7.00'), 7000);
  assert.equal(parseFirmware(' 14.00 '), 14000);
});

test('parseFirmware rejects malformed values', () => {
  assert.equal(parseFirmware('9.0'), null);      // needs two decimal digits
  assert.equal(parseFirmware('13.6'), null);
  assert.equal(parseFirmware(''), null);
  assert.equal(parseFirmware(undefined), null);
  assert.equal(parseFirmware('abc'), null);
});

test('compatibility: unset when the user firmware is missing/invalid', () => {
  assert.equal(compatibility({ firmware: { min: '7.00' } }, '').state, 'unset');
  assert.equal(compatibility({ firmware: { min: '7.00' } }, 'nope').state, 'unset');
});

test('compatibility: unknown when the item has no bounds', () => {
  assert.equal(compatibility({}, '13.60').state, 'unknown');
  assert.equal(compatibility({ firmware: {} }, '13.60').state, 'unknown');
});

test('compatibility: inclusive min/max bounds', () => {
  const item = { firmware: { min: '7.00', max: '13.60' } };
  assert.equal(compatibility(item, '7.00').state, 'compatible');
  assert.equal(compatibility(item, '13.60').state, 'compatible');
  assert.equal(compatibility(item, '10.00').state, 'compatible');
  assert.equal(compatibility(item, '6.00').state, 'incompatible');
  assert.equal(compatibility(item, '14.00').state, 'incompatible');
});

test('compatibility: one-sided bounds', () => {
  assert.equal(compatibility({ firmware: { min: '7.00' } }, '6.00').state, 'incompatible');
  assert.equal(compatibility({ firmware: { min: '7.00' } }, '7.00').state, 'compatible');
  assert.equal(compatibility({ firmware: { max: '13.60' } }, '14.00').state, 'incompatible');
  assert.equal(compatibility({ firmware: { max: '13.60' } }, '13.60').state, 'compatible');
});

test('firmwareLabel formats each shape', () => {
  assert.equal(firmwareLabel({ firmware: { min: '7.00', max: '13.60' } }), 'FW 7.00\u201313.60');
  assert.equal(firmwareLabel({ firmware: { min: '7.00' } }), 'FW \u2265 7.00');
  assert.equal(firmwareLabel({ firmware: { max: '13.60' } }), 'FW \u2264 13.60');
  assert.equal(firmwareLabel({}), 'Firmware unknown');
  assert.equal(firmwareLabel({ firmware: {} }), 'Firmware unknown');
});

test('norm lowercases and coerces', () => {
  assert.equal(norm('AbC'), 'abc');
  assert.equal(norm(null), '');
  assert.equal(norm(undefined), '');
});

test('hueFor is deterministic and in range', () => {
  const h = hueFor('ps5-retroarch');
  assert.equal(h, hueFor('ps5-retroarch'));
  assert.ok(h >= 0 && h < 360, `hue ${h} out of range`);
});

test('safeHttps allows only https', () => {
  assert.equal(safeHttps('https://example.com/x'), 'https://example.com/x');
  assert.equal(safeHttps('http://example.com'), null);
  assert.equal(safeHttps('javascript:alert(1)'), null);
  assert.equal(safeHttps('//example.com'), null);
  assert.equal(safeHttps(undefined), null);
});
