/* filters.js — pure functions for search, filtering and sorting. */

import { norm } from './util.js?v=13';

export function matchesQuery(item, q) {
  const query = norm(q).trim();
  if (!query) return true;
  const hay = [item.name, item.summary, item.author, item.description, ...(item.tags || [])].map(norm).join(' ');
  return query.split(/\s+/).every((term) => hay.includes(term));
}

/** Items matching the current filter state, sorted. */
export function visibleItems(state) {
  const q = norm(state.query).trim();
  const items = state.library.items.filter((it) => {
    if (state.category !== 'all' && it.category !== state.category) return false;
    if (state.status !== 'all' && it.status !== state.status) return false;
    if (state.platform !== 'all' && it.platformId !== state.platform) return false;
    return matchesQuery(it, q);
  });
  const sorter = {
    name: (a, b) => a.name.localeCompare(b.name),
    updated: (a, b) => (b.updated || '').localeCompare(a.updated || ''),
    curated: (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name),
  }[state.sort] || ((a, b) => a.name.localeCompare(b.name));
  return items.sort(sorter);
}

export function isFiltering(state) {
  return state.category !== 'all' || !!state.query || state.status !== 'all' || state.platform !== 'all';
}
