/* state.js — single mutable application state plus a tiny event emitter. */

const listeners = new Set();

export const state = {
  library: null,
  category: 'all',
  query: '',
  status: 'all',
  platform: 'all',
  sort: 'curated',
  firmware: '',
};

export function setState(patch) {
  Object.assign(state, patch);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(event, detail) {
  for (const fn of [...listeners]) fn(event, detail);
}
