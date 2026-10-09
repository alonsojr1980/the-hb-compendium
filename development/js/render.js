/* render.js — DOM rendering for all views. Reads state, calls actions. */

import {
  $, el, icon, renderItemIcon, hueFor, compatibility, firmwareLabel, safeHttps, CATEGORY_ICON,
} from './util.js?v=14';
import { visibleItems, isFiltering } from './filters.js?v=14';
import { announce } from './a11y.js?v=14';

const STATUSES = ['stable', 'beta', 'alpha', 'experimental', 'discontinued'];
const badge = (cls, text) => el('span', { class: `badge ${cls}`, text });

/* Render signatures: skip rebuilding chrome that hasn't changed. This keeps the
   entrance animations from re-firing on every keystroke (the grid is rebuilt on
   purpose; nav/topics/toolbar/featured/stats are not). */
const sigCache = { nav: '', topics: '', toolbar: '', featured: '', stats: '' };
const setOnce = (key, sig) => { if (sigCache[key] === sig) return false; sigCache[key] = sig; return true; };

/** Count a stat up to its value; sets the final value immediately under reduced motion. */
function animateCount(node, value) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = () => { node.textContent = String(value); };
  if (reduce || !Number.isFinite(value)) { finish(); return; }
  const start = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const tick = (now) => {
    const t = Math.min(1, (now - start) / 820);
    node.textContent = String(Math.round(value * easeOut(t)));
    if (t < 1) requestAnimationFrame(tick); else finish();
  };
  requestAnimationFrame(tick);
  // rAF is paused in background tabs / headless virtual time; guarantee the
  // final value so the stat can never be stranded at 0.
  setTimeout(finish, 1100);
}

/** Ordered platform definitions from the library (data-driven; never hardcoded). */
const platformDefs = (state) => (state.library?.platforms || [])
  .slice()
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

/** Display label for a platform: shortName → name → id. */
const platformLabel = (def) => def.shortName || def.name || def.id;

/** Platform badge derived from the item's platformId and the platform definitions. */
function platformBadge(state, item) {
  if (!item.platformId) return null;
  const def = (state.library?.platforms || []).find((p) => p.id === item.platformId);
  return el('span', { class: 'badge badge--platform', text: def ? platformLabel(def) : item.platformId });
}

/** A platform selector tile; the background comes from `platform.thumbnail`, or
   — when that is absent/empty — the first existing `thumb.<ext>` in the platform folder. */
function platformTile(tile, active, actions) {
  const bg = el('span', { class: 'platform-tile__bg' });
  bg.setAttribute('aria-hidden', 'true');
  const explicit = typeof tile.thumb === 'string' ? tile.thumb.trim() : '';
  if (explicit) {
    bg.style.backgroundImage = `url("${explicit}")`;
  } else if (tile.dir) {
    resolveThumbnail(tile.dir).then((url) => {
      if (url && bg.isConnected) bg.style.backgroundImage = `url("${url}")`;
    });
  }
  return el('button', {
    class: `platform-tile${tile.id === 'all' ? ' platform-tile--all' : ''}`,
    type: 'button',
    'aria-pressed': String(active),
    onClick: () => actions.setPlatform(tile.id),
  }, bg, el('span', { class: 'platform-tile__label', text: tile.name }));
}

/** Conventional thumbnail filenames, in preference order. */
export const THUMB_EXTS = ['png', 'jpg', 'jpeg', 'svg'];
export const thumbCandidates = (dir) => THUMB_EXTS.map((ext) => `${dir}thumb.${ext}`);

const thumbCache = new Map();
/** Resolve a platform's conventional thumbnail: first `thumb.<ext>` that exists, else null.
   Uses fetch (not <img>) so probing missing files does not log console errors. */
export async function resolveThumbnail(dir) {
  if (thumbCache.has(dir)) return thumbCache.get(dir);
  for (const url of thumbCandidates(dir)) {
    try {
      const res = await fetch(url);
      if (res.ok) { thumbCache.set(dir, url); return url; }
    } catch { /* try the next extension */ }
  }
  thumbCache.set(dir, null);
  return null;
}

/** Paint #browse with the selected platform's `browseBG` (raw CSS background value);
   clear it for "all". Data is maintainer-authored (trusted), same model as item icons. */
function applyBrowseBackground(state) {
  const node = $('#browse');
  if (!node) return;
  const def = state.platform !== 'all'
    ? (state.library.platforms || []).find((p) => p.id === state.platform)
    : null;
  const bg = def && typeof def.browseBG === 'string' ? def.browseBG.trim() : '';
  if (bg) node.style.setProperty('background', bg);
  else node.style.removeProperty('background');
}

/** Page title, tagline, stats, footer meta and repo links. */
export function renderChrome(state) {
  const site = state.library.site || {};
  document.title = `${site.title || 'The Homebrew Compendium'}`;
  $('#hero-title').textContent = site.title || 'The Homebrew Compendium';
  $('#hero-tagline').textContent = site.tagline || 'A curated, community directory of homebrew.';
  $('#footer-disclaimer').textContent = site.disclaimer || '';
  $('#footer-updated').textContent = site.lastUpdated ? `Updated ${site.lastUpdated}` : '';

  // "A project by <name>" — built from DOM nodes (no innerHTML of data).
  const author = site.author || {};
  const authorNode = $('#footer-author');
  if (authorNode) {
    const url = safeHttps(author.url);
    const name = author.name || 'ALONSOJR1980';
    const link = url
      ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: name })
      : document.createTextNode(name);
    authorNode.replaceChildren(document.createTextNode('A project by '), link);
  }

  const repo = safeHttps(site.repo);
  const repoLink = $('#footer-repo');
  if (repo) repoLink.href = repo; else repoLink.remove();
  const src = $('#source-link');
  if (src) { if (repo) { src.href = repo; src.hidden = false; } else { src.hidden = true; } }

  const stats = [
    ['Projects', state.library.items.length],
    ['Topics', state.library.categories.length],
  ];
  const sig = stats.map(([, v]) => v).join('|');
  if (setOnce('stats', sig)) {
    const nodes = stats.map(([label, value]) => {
      const dd = el('dd', { text: '0' });
      return { value, dd, box: el('div', {}, el('dt', { text: label }), dd) };
    });
    $('#hero-stats').replaceChildren(...nodes.map((n) => n.box));
    nodes.forEach((n, i) => setTimeout(() => animateCount(n.dd, n.value), 150 + i * 90));
  }
}

export function renderNav(state, actions) {
  if (!setOnce('nav', JSON.stringify([state.category, state.library.categories.map((c) => [c.id, c.name])]))) return;
  const links = [{ href: '#/', text: 'Discover', id: 'all' }];
  for (const c of state.library.categories) links.push({ href: `#/category/${c.id}`, text: c.name, id: c.id });
  const mk = (l, onNav) => el('a', {
    href: l.href, text: l.text,
    'aria-current': state.category === l.id ? 'page' : null,
    onClick: onNav || null,
  });
  $('#topnav').replaceChildren(...links.map((l) => mk(l)));
  $('#mobilemenu').replaceChildren(...links.map((l) => mk(l, actions.closeMenu)));
}

export function renderTopics(state, actions) {
  if (!setOnce('topics', JSON.stringify([state.category, state.library.categories.map((c) => [c.id, c.name, c.order, c.icon]), state.library.items.map((i) => i.category)]))) return;
  const counts = {};
  for (const it of state.library.items) counts[it.category] = (counts[it.category] || 0) + 1;
  const topics = [
    { id: 'all', name: 'All', icon: 'sparkle', count: state.library.items.length },
    ...state.library.categories
      .slice()
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((c) => ({ ...c, count: counts[c.id] || 0 })),
  ];
  $('#topics').replaceChildren(...topics.map((t) => el('button', {
    class: 'topic', type: 'button',
    'aria-pressed': String(state.category === t.id),
    onClick: () => actions.setCategory(t.id),
  },
  icon(t.icon || CATEGORY_ICON[t.id] || 'app'),
  el('span', { text: t.name }),
  el('span', { class: 'topic__count', text: t.count }),
  )));
}

export function renderFeatured(state, actions) {
  const featured = state.library.items.filter((i) => i.featured);
  if (!setOnce('featured', featured.map((i) => i.id).join(','))) return;
  if (!featured.length) { $('.hero__featured')?.setAttribute('hidden', ''); return; }
  $('#featured-rail').replaceChildren(...featured.map((i, idx) => {
    const card = itemCard(i, state, actions, true);
    card.style.setProperty('--i', Math.min(idx, 8));
    return card;
  }));
}

export function renderToolbar(state, actions) {
  const sig = JSON.stringify([
    state.category, state.query, state.status, state.platform, state.firmware,
    (state.library.platforms || []).map((p) => [p.id, p.name, p.shortName, p.order, p.thumbnail, p.browseBG, p.dir]),
    state.library.items.map((i) => i.status),
  ]);
  if (!setOnce('toolbar', sig)) return;
  const present = STATUSES.filter((s) => state.library.items.some((i) => i.status === s));
  const statuses = [{ id: 'all', name: 'All statuses' }, ...present.map((s) => ({ id: s, name: s[0].toUpperCase() + s.slice(1) }))];
  $('#status-chips').replaceChildren(...statuses.map((s) => el('button', {
    class: 'chip', type: 'button',
    'aria-pressed': String(state.status === s.id),
    onClick: () => actions.setStatus(s.id),
  },
  s.id !== 'all' ? el('span', { class: `chip__dot badge--${s.id}` }) : null,
  el('span', { text: s.name }),
  )));

  // Platform tiles (rendered above the search bar; background = platform.thumbnail).
  const defs = platformDefs(state);
  const group = $('#platform-toggle');
  group.hidden = defs.length === 0;
  const tiles = [{ id: 'all', name: 'All platforms', thumb: null, dir: null }].concat(
    defs.map((p) => ({ id: p.id, name: platformLabel(p), thumb: p.thumbnail, dir: p.dir })));
  group.replaceChildren(...tiles.map((t) => platformTile(t, state.platform === t.id, actions)));
  applyBrowseBackground(state);

  // "Clear filters" clears category/query/status (and the button reflects those);
  // the platform selection is preserved, so it is deliberately excluded here.
  const active = state.category !== 'all' || !!state.query || state.status !== 'all' || state.firmware;
  $('#clear-filters').hidden = !active;
}

export function renderGrid(state, actions) {
  const items = visibleItems(state);
  const grid = $('#grid');
  const panel = $('#statepanel');
  grid.replaceChildren(...items.map((i, idx) => {
    const card = itemCard(i, state, actions);
    card.style.setProperty('--i', Math.min(idx, 12));
    return card;
  }));

  const total = state.library.items.length;
  const filtering = isFiltering(state);

  // Live count badge sits directly beside the search field.
  const count = $('#search-count');
  if (count) {
    count.textContent = filtering ? `${items.length} / ${total}` : `${total} projects`;
    count.classList.toggle('is-filtered', filtering);
  }

  // Descriptive line only while filtering (the hero already shows the totals).
  const line = $('#resultline');
  if (line) {
    line.hidden = !filtering;
    line.replaceChildren(filtering
      ? el('span', {}, 'Showing ', el('strong', { text: items.length }), ` of ${total} projects`)
      : '');
  }

  if (items.length === 0) {
    panel.hidden = false;
    grid.hidden = true;
    panel.replaceChildren(...emptyState(state, total, actions));
  } else {
    panel.hidden = true;
    grid.hidden = false;
  }
  announce(`${items.length} ${items.length === 1 ? 'project' : 'projects'} shown`);
}

function itemCard(item, state, actions, featured = false) {
  const art = el('div', { class: 'card__art' });
  art.style.setProperty('--hue', hueFor(item.id));
  art.append(renderItemIcon(item, 'icon card__glyph'));
  art.append(el('div', { class: 'card__art-badges' },
    badge(`badge--${item.status}`, item.status),
    !item.verified ? badge('badge--unverified', 'Unverified') : null,
  ));

  const compat = compatibility(item, state.firmware);
  const card = el('button', {
    class: `card${featured ? ' card--featured' : ''}${compat.state === 'incompatible' ? ' card--incompatible' : ''}`,
    type: 'button',
    onClick: () => actions.openItem(item.id),
  });
  // NOTE: the accessible name is derived from the card's own content. A previous
  // custom aria-label triggered axe's label-content-name-mismatch because it did
  // not contain the visible card text (title/summary/badges/author).

  card.append(
    art,
    el('div', { class: 'card__body' },
      el('h3', { class: 'card__title', text: item.name }),
      el('p', { class: 'card__summary', text: item.summary }),
      el('div', { class: 'detail__badges' },
        el('span', { class: 'badge badge--firmware', text: firmwareLabel(item) }),
        platformBadge(state, item),
      ),
      el('div', { class: 'card__foot' },
        el('span', { class: 'card__author', text: item.author }),
        el('div', { class: 'card__tags' }, ...(item.tags || []).slice(0, 2).map((t) => el('span', { class: 'tagpill', text: t }))),
      ),
    ),
  );
  if (compat.state === 'incompatible') {
    art.append(el('span', { class: 'card__warnflag' }, icon('alert')));
    // Keep the compatibility warning available to assistive tech without
    // overriding the card's content-derived accessible name.
    card.append(el('span', { class: 'sr-only', text: `Not compatible with firmware ${state.firmware}` }));
  }
  return card;
}

function emptyState(state, total, actions) {
  if (total === 0) {
    return [icon('app', 'icon'), el('h3', { text: 'This library is empty' }),
      el('p', { text: 'library.json loaded successfully but contains no projects.' })];
  }
  const q = state.query.trim();
  return [icon('search', 'icon'), el('h3', { text: 'No projects match' }),
    el('p', { text: q
      ? `Nothing matches “${q}”. Try a different search, or clear your filters.`
      : 'Try a different search, clear your filters, or change the selected topic.' }),
    el('div', { class: 'statepanel__actions' },
      el('button', { class: 'btn btn--primary', type: 'button', text: 'Clear filters', onClick: actions.clearFilters }))];
}

export function renderDetail(state, item, actions) {
  const body = $('#modal-body');
  const banner = el('div', { class: 'detail__banner' });
  banner.style.setProperty('--hue', hueFor(item.id));
  banner.append(
    renderItemIcon(item, 'icon detail__glyph'),
    el('div', { class: 'detail__heading' },
      el('div', { class: 'detail__badges' },
        badge(`badge--${item.status}`, item.status),
        el('span', { class: 'badge badge--firmware', text: firmwareLabel(item) }),
        platformBadge(state, item),
        !item.verified ? badge('badge--unverified', 'Unverified') : null,
      ),
      el('h2', { id: 'modal-title', text: item.name }),
      el('p', { class: 'detail__author', text: `by ${item.author}` }),
    ),
  );

  const meta = (label, value) => el('div', { class: 'meta' },
    el('div', { class: 'meta__label', text: label }), el('div', { class: 'meta__value', text: value }));

  const sections = [el('p', { class: 'detail__desc', text: item.description || item.summary })];

  const compat = compatibility(item, state.firmware);
  if (compat.state === 'incompatible') {
    sections.push(el('div', { class: 'detail__section' },
      el('ul', { class: 'warnlist' },
        el('li', {}, icon('alert'), el('span', { text: `Lists support for ${firmwareLabel(item)}, which does not include your firmware (${state.firmware}).` })))));
  }

  if (item.warnings?.length) {
    sections.push(el('div', { class: 'detail__section' },
      el('h3', {}, icon('alert'), 'Warnings'),
      el('ul', { class: 'warnlist' }, ...item.warnings.map((w) => el('li', {}, icon('alert'), el('span', { text: w }))))));
  }

  if (item.requires?.length) {
    sections.push(el('div', { class: 'detail__section' },
      el('h3', {}, icon('cpu'), 'Requires'),
      el('div', { class: 'requireslist' }, ...item.requires.map((rid) => {
        const exists = state.library.items.some((i) => i.id === rid);
        return exists
          ? el('button', { class: 'linkbtn-solid', type: 'button', onClick: () => actions.openItem(rid) }, el('span', { text: rid }))
          : el('span', { class: 'badge badge--firmware', text: rid });
      }))));
  }

  const linkDefs = [['source', 'Source'], ['releases', 'Releases'], ['docs', 'Docs'], ['video', 'Video']];
  const links = linkDefs.map(([key, label]) => {
    const url = safeHttps(item.links?.[key]);
    if (!url) return null;
    return el('a', {
      class: `linkbtn-solid${key === 'source' ? ' linkbtn-solid--primary' : ''}`,
      href: url, target: '_blank', rel: 'noopener noreferrer',
    }, icon('external'), el('span', { text: label }));
  }).filter(Boolean);
  if (links.length) {
    sections.push(el('div', { class: 'detail__section' }, el('h3', {}, icon('external'), 'Links'), el('div', { class: 'linkrow' }, ...links)));
  }

  sections.push(el('div', { class: 'detail__grid' },
    meta('Category', (state.library.categories.find((c) => c.id === item.category) || {}).name || item.category),
    meta('Version', item.version || '—'),
    meta('Status', item.status),
    meta('License', item.license || '—'),
    meta('Updated', item.updated || '—'),
    meta('Firmware', item.firmware ? firmwareLabel(item) : 'Unknown'),
  ));

  const content = el('div', { class: 'detail__content' }, ...sections);
  const thumbs = (Array.isArray(item.thumbnails) ? item.thumbnails : [])
    .filter((src) => typeof src === 'string' && src.trim());

  if (thumbs.length) {
    const column = el('div', { class: 'detail__thumbs', attrs: { role: 'group', 'aria-label': 'Screenshots' } },
      ...thumbs.map((src, i) => {
        const img = el('img', { class: 'detail__thumb', src: src.trim(), alt: '', loading: 'lazy', decoding: 'async' });
        img.style.setProperty('--i', i); // staggered slide-in, top to bottom
        img.addEventListener('error', () => img.remove()); // drop a broken thumbnail
        return el('button', {
          class: 'detail__thumb-btn', type: 'button',
          'aria-label': `Open screenshot ${i + 1} of ${thumbs.length}`,
          onClick: () => actions.openGallery(item.id, i),
        }, img);
      }));
    body.replaceChildren(banner, el('div', { class: 'detail__layout' }, content, column));
  } else {
    body.replaceChildren(banner, content);
  }
}

export function renderSkeletons() {
  $('#grid').replaceChildren(...Array.from({ length: 8 }, () => el('div', { class: 'skeleton' },
    el('div', { class: 'skeleton__art' }),
    el('div', { class: 'skeleton__body' },
      el('div', { class: 'skeleton__line skeleton__line--w60' }),
      el('div', { class: 'skeleton__line skeleton__line--w85' }),
      el('div', { class: 'skeleton__line' })))));
}

export function renderError(err, actions) {
  $('#grid').replaceChildren();
  const panel = $('#statepanel');
  panel.hidden = false;
  panel.replaceChildren(
    icon('alert', 'icon'),
    el('h3', { text: 'Could not load library.json' }),
    el('p', { text: String((err && err.message) || err) }),
    el('p', { text: 'Check that the site is served over HTTP and that library.json is valid.' }),
    el('div', { class: 'statepanel__actions' },
      el('button', { class: 'btn btn--primary', type: 'button', text: 'Retry', onClick: actions.retry })),
  );
}

export function syncFirmwareChip(state) {
  const chip = $('#fw-chip');
  if (!chip) return;
  const text = $('#fw-chip-text');
  const valid = state.firmware !== '' && /^\d+\.\d{2}$/.test(state.firmware);
  chip.hidden = !valid;
  if (valid) text.textContent = `FW ${state.firmware}`;
}
