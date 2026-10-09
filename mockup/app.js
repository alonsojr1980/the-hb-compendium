/* =========================================================
   PS5 Homebrew Compendium — MOCKUP app
   Vanilla ES module, no dependencies. Data: ./library.json
   NOTE: prototype only — simulated data, not production logic.
   ========================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------- tiny DOM helpers ---------- */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'attrs') for (const [ak, av] of Object.entries(v)) node.setAttribute(ak, av);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  addChildren(node, children);
  return node;
}
function addChildren(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}
function icon(name, cls = 'icon') {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

/* ---------- item icons: a named word OR an image URL ---------- */
const ICON_WORDS = new Set(['gamepad', 'unlock', 'tool', 'app', 'search', 'external', 'close', 'chevron', 'alert', 'check', 'cpu', 'sparkle', 'shield']);
const isUrlLike = (v) => /^(https?:)?\/\//i.test(v) || /^\.{0,2}\//.test(v);
const fallbackIconName = (item) => CATEGORY_ICON[item.category] || 'app';

/*
 * item.icon may be either a named icon ("gamepad") or an image URL/path.
 * URL icons render as <img>; if the image fails to load we fall back to the
 * named (or category) icon so a broken URL never leaves an empty card.
 */
function renderItemIcon(item, cls) {
  const raw = (item.icon || '').trim();
  if (raw && isUrlLike(raw)) {
    const img = el('img', { class: `${cls} item-icon`, src: raw, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.replaceWith(icon(fallbackIconName(item), cls)));
    return img;
  }
  const name = raw && ICON_WORDS.has(raw) ? raw : fallbackIconName(item);
  return icon(name, cls);
}

/* ---------- utilities ---------- */
const CATEGORY_ICON = { emulators: 'gamepad', jailbreaks: 'unlock', tools: 'tool', apps: 'app' };
const hueFor = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const norm = (s) => (s || '').toString().toLowerCase();
const safeHttps = (url) => typeof url === 'string' && /^https:\/\//i.test(url) ? url : null;

function parseFirmware(value) {
  const m = /^(\d+)\.(\d{2})$/.exec((value || '').trim());
  if (!m) return null;
  return Number(m[1]) * 1000 + Number(m[2]);
}
function compatibility(item, fwValue) {
  const fw = parseFirmware(fwValue);
  if (fw == null) return { state: 'unset' };
  const min = item.firmware?.min ? parseFirmware(item.firmware.min) : null;
  const max = item.firmware?.max ? parseFirmware(item.firmware.max) : null;
  if (min == null && max == null) return { state: 'unknown' };
  if (min != null && fw < min) return { state: 'incompatible' };
  if (max != null && fw > max) return { state: 'incompatible' };
  return { state: 'compatible' };
}
function firmwareLabel(item) {
  const f = item.firmware;
  if (!f || (!f.min && !f.max)) return 'Firmware unknown';
  if (f.min && f.max) return `FW ${f.min}–${f.max}`;
  if (f.min) return `FW ≥ ${f.min}`;
  return `FW ≤ ${f.max}`;
}

/* ---------- app state ---------- */
const state = {
  library: null,
  category: 'all',
  query: '',
  status: 'all',
  platform: 'all',
  sort: 'curated',
  firmware: localStorage.getItem('ps5c.firmware') || '',
  dataKey: 'default',
};

/* Alternate data sources for DEMO purposes only (whitelisted; no arbitrary paths). */
const DATA_SOURCES = {
  default: 'library.json',
  empty: 'fixtures/library.empty.json',
  malformed: 'fixtures/library.malformed.json',
};

const STATUSES = ['stable', 'beta', 'alpha', 'experimental', 'discontinued'];

/* ---------- data loading ---------- */
async function loadLibrary() {
  renderSkeletons();
  const file = DATA_SOURCES[state.dataKey] || DATA_SOURCES.default;
  const isDemo = state.dataKey !== 'default';
  try {
    const res = await fetch(`${file}?v=${Date.now()}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`"${file}" is not valid JSON`);
    }
    // Platform-based library: each platform lists its own item files.
    if (Array.isArray(data.platforms) && data.platforms.length) {
      const items = [];
      for (const pPath of data.platforms) {
        const r = await fetch(`${pPath}?v=${Date.now()}`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${pPath}`);
        const platform = await r.json();
        const dir = String(pPath).slice(0, String(pPath).lastIndexOf('/') + 1);
        for (const f of platform.itemFiles || []) {
          const ir = await fetch(`${dir}items/${f}?v=${Date.now()}`, { cache: 'no-cache' });
          if (!ir.ok) throw new Error(`HTTP ${ir.status} for ${dir}items/${f}`);
          const item = await ir.json();
          if (item && typeof item === 'object' && item.platformId == null) item.platformId = platform.id;
          items.push(item);
        }
      }
      data.items = items;
    } else if (Array.isArray(data.itemFiles) && data.itemFiles.length) {
      // Modular library: `itemFiles` lists one JSON file per item.
      const loaded = await Promise.all(data.itemFiles.map(async (p) => {
        const r = await fetch(`${p}?v=${Date.now()}`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${p}`);
        try { return await r.json(); } catch { throw new Error(`"${p}" is not valid JSON`); }
      }));
      data.items = loaded;
    }
    validate(data);
    state.library = data;
    if (!isDemo) { try { sessionStorage.setItem('ps5c.cache', JSON.stringify(data)); } catch {} }
    return { cached: false };
  } catch (err) {
    if (!isDemo) {
      let cached = null;
      try { cached = JSON.parse(sessionStorage.getItem('ps5c.cache') || 'null'); } catch {}
      if (cached) {
        validate(cached);
        state.library = cached;
        return { cached: true, error: err };
      }
    }
    renderError(err);
    return { failed: true };
  }
}

function validate(data) {
  if (!data || typeof data !== 'object') throw new Error('library.json is not an object');
  if (!Array.isArray(data.items)) throw new Error('library.json has no items (missing "items" or "itemFiles")');
  if (!Array.isArray(data.categories)) throw new Error('library.json is missing a categories array');
  data.items = data.items.filter((it) => {
    const ok = it && typeof it.id === 'string' && typeof it.name === 'string' && typeof it.category === 'string';
    if (!ok) console.warn('[mockup] skipped invalid item', it);
    return ok;
  });
}

/* ---------- boot ---------- */
async function boot() {
  const params = new URLSearchParams(location.search);
  const fwParam = params.get('fw');
  if (fwParam) { state.firmware = fwParam; try { localStorage.setItem('ps5c.firmware', fwParam); } catch {} }
  const dataParam = params.get('data');
  if (dataParam && DATA_SOURCES[dataParam]) state.dataKey = dataParam;
  if (params.get('q')) state.query = params.get('q');
  if (params.get('status')) state.status = params.get('status');
  if (params.get('platform')) state.platform = params.get('platform');
  if (params.get('sort')) state.sort = params.get('sort');

  const result = await loadLibrary();
  if (result.failed) return;
  if (result.cached) toast('Network/data failed — showing cached copy.');
  if (state.query) $('#search-input').value = state.query;
  if (state.dataKey !== 'default') toast(`Demo data source: "${state.dataKey}"`);
  applyRoute();
  if (params.get('debug')) setTimeout(debugOverflow, 500);
}

/* Prototype-only diagnostic: report any element wider than the viewport. */
function debugOverflow() {
  const de = document.documentElement;
  const out = [`scrollW=${de.scrollWidth} clientW=${de.clientWidth}`];
  if (de.scrollWidth > de.clientWidth + 1) {
    const offenders = [...document.querySelectorAll('body *')]
      .filter((n) => n.getBoundingClientRect().right > de.clientWidth + 1)
      .slice(0, 6)
      .map((n) => `${n.tagName}.${(n.className || '').toString().split(' ')[0]}@${Math.round(n.getBoundingClientRect().right)}`);
    out.push('OVERFLOW: ' + offenders.join(' ; '));
  } else {
    out.push('no horizontal overflow');
  }
  const b = document.querySelector('.mock-banner');
  if (b) out.push(`banner scrollW=${b.scrollWidth}/${b.clientWidth} rect=${Math.round(b.getBoundingClientRect().width)}`);
  const d = el('p', { class: 'sr-only', id: 'debug-overflow', text: out.join(' | ') });
  document.body.append(d);
  document.title = out.join(' | ');
}

/* ---------- static chrome ---------- */
function renderChrome() {
  const site = state.library.site || {};
  document.title = `${site.title || 'PS5 Homebrew Compendium'} — Mockup`;
  $('#hero-title').textContent = site.title || 'PS5 Homebrew Compendium';
  $('#hero-tagline').textContent = site.tagline || 'A curated community directory of PlayStation 5 homebrew.';
  $('#footer-disclaimer').textContent = site.disclaimer || '';
  $('#footer-updated').textContent = site.lastUpdated ? `Updated ${site.lastUpdated}` : '';
  const repo = safeHttps(site.repo);
  const repoLink = $('#footer-repo');
  if (repo) repoLink.href = repo; else repoLink.remove();
  const src = $('#source-link');
  if (src) { if (repo) { src.href = repo; src.hidden = false; } else { src.hidden = true; } }

  const authors = new Set(state.library.items.map((i) => i.author).filter(Boolean));
  const stats = [
    ['Projects', state.library.items.length],
    ['Topics', state.library.categories.length],
    ['Contributors', authors.size],
  ];
  const dl = $('#hero-stats');
  dl.replaceChildren(...stats.map(([label, value]) => el('div', {}, el('dt', { text: label }), el('dd', { text: value }))));

  syncFirmwareField();
}

function syncFirmwareField() {
  const fw = $('#firmware-input');
  if (!fw) return;
  fw.value = state.firmware;
  const invalid = state.firmware !== '' && parseFirmware(state.firmware) == null;
  fw.closest('.field--fw').classList.toggle('is-invalid', invalid);
  fw.closest('.field--fw').classList.toggle('is-set', !invalid && state.firmware !== '');

  const chip = $('#fw-chip');
  if (chip) {
    const valid = state.firmware !== '' && !invalid;
    chip.hidden = !valid;
    if (valid) $('#fw-chip-text').textContent = `FW ${state.firmware}`;
  }
}

function renderFootNav() {
  const links = [{ href: '#/', text: 'Discover', id: 'all' }];
  for (const c of state.library.categories) links.push({ href: `#/category/${c.id}`, text: c.name, id: c.id });
  const mk = (l, onNav) => el('a', {
    href: l.href,
    text: l.text,
    'aria-current': state.category === l.id ? 'page' : null,
    onClick: onNav || null,
  });
  $('#topnav').replaceChildren(...links.map((l) => mk(l)));
  const mm = $('#mobilemenu');
  if (mm) mm.replaceChildren(...links.map((l) => mk(l, closeMenu)));
}

/* ---------- topics ---------- */
function renderTopics() {
  const counts = {};
  for (const it of state.library.items) counts[it.category] = (counts[it.category] || 0) + 1;
  const topics = [
    { id: 'all', name: 'All', icon: 'sparkle', count: state.library.items.length },
    ...state.library.categories
      .slice()
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((c) => ({ ...c, count: counts[c.id] || 0 })),
  ];
  $('#topics').replaceChildren(...topics.map((t) => el('button',
    {
      class: 'topic',
      type: 'button',
      'aria-pressed': String(state.category === t.id),
      onClick: () => setCategory(t.id),
    },
    icon(t.icon || CATEGORY_ICON[t.id] || 'app'),
    el('span', { text: t.name }),
    el('span', { class: 'topic__count', text: t.count }),
  )));
}

/* ---------- featured rail ---------- */
function renderFeatured() {
  const featured = state.library.items.filter((i) => i.featured);
  const rail = $('#featured-rail');
  if (!featured.length) { $('.hero__featured')?.setAttribute('hidden', ''); return; }
  rail.replaceChildren(...featured.map((i) => itemCard(i, true)));
}

/* ---------- toolbar ---------- */
function renderToolbar() {
  const present = STATUSES.filter((s) => state.library.items.some((i) => i.status === s));
  const statuses = [{ id: 'all', name: 'All statuses' }, ...present.map((s) => ({ id: s, name: s[0].toUpperCase() + s.slice(1) }))];
  $('#status-chips').replaceChildren(...statuses.map((s) => el('button',
    {
      class: 'chip', type: 'button',
      'aria-pressed': String(state.status === s.id),
      onClick: () => { state.status = s.id; render(); },
    },
    s.id !== 'all' ? el('span', { class: `chip__dot badge--${s.id}` }) : null,
    el('span', { text: s.name }),
  )));

  const platforms = [{ id: 'all', name: 'All platforms' }, { id: 'PS5', name: 'PS5' }, { id: 'PS5 Pro', name: 'PS5 Pro' }];
  $('#platform-toggle').replaceChildren(...platforms.map((p) => el('button',
    {
      class: 'chip', type: 'button',
      'aria-pressed': String(state.platform === p.id),
      onClick: () => { state.platform = p.id; render(); },
    }, el('span', { text: p.name }),
  )));

  const clear = $('#clear-filters');
  const active = state.category !== 'all' || state.query || state.status !== 'all' || state.platform !== 'all' || state.firmware;
  clear.hidden = !active;
}

/* ---------- filtering ---------- */
function matchesQuery(item, q) {
  if (!q) return true;
  const hay = [item.name, item.summary, item.author, item.description, ...(item.tags || [])].map(norm).join(' ');
  return q.split(/\s+/).every((term) => hay.includes(term));
}
function visibleItems() {
  const q = norm(state.query).trim();
  let items = state.library.items.filter((it) => {
    if (state.category !== 'all' && it.category !== state.category) return false;
    if (state.status !== 'all' && it.status !== state.status) return false;
    if (state.platform !== 'all' && !(it.platform || ['PS5']).includes(state.platform)) return false;
    if (!matchesQuery(it, q)) return false;
    return true;
  });
  const sorter = {
    name: (a, b) => a.name.localeCompare(b.name),
    updated: (a, b) => (b.updated || '').localeCompare(a.updated || ''),
    curated: (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name),
  }[state.sort];
  return items.sort(sorter);
}

/* ---------- card ---------- */
function itemCard(item, featured = false) {
  const art = el('div', { class: 'card__art' });
  art.style.setProperty('--hue', hueFor(item.id));
  art.append(renderItemIcon(item, 'icon card__glyph'));
  art.append(el('div', { class: 'card__art-badges' },
    el('span', { class: `badge badge--${item.status}`, text: item.status }),
    !item.verified ? el('span', { class: 'badge badge--unverified', text: 'Unverified' }) : null,
  ));

  const compat = compatibility(item, state.firmware);
  const card = el('button', {
    class: `card${featured ? ' card--featured' : ''}${compat.state === 'incompatible' ? ' card--incompatible' : ''}`,
    type: 'button',
    onClick: () => openDetail(item.id),
  });
  card.setAttribute('aria-label', compat.state === 'incompatible'
    ? `${item.name} — not compatible with firmware ${state.firmware}`
    : item.name);

  const foot = el('div', { class: 'card__foot' },
    el('span', { class: 'card__author', text: item.author }),
    el('div', { class: 'card__tags' }, ...(item.tags || []).slice(0, 2).map((t) => el('span', { class: 'tagpill', text: t }))),
  );

  card.append(
    art,
    el('div', { class: 'card__body' },
      el('h3', { class: 'card__title', text: item.name }),
      el('p', { class: 'card__summary', text: item.summary }),
      el('div', { class: 'detail__badges' },
        el('span', { class: 'badge badge--firmware', text: firmwareLabel(item) }),
        ...(item.platform || []).map((p) => el('span', { class: 'badge badge--firmware', text: p })),
      ),
      foot,
    ),
  );
  if (compat.state === 'incompatible') art.append(el('span', { class: 'card__warnflag' }, icon('alert')));
  return card;
}

/* ---------- grid + states ---------- */
function renderGrid() {
  const items = visibleItems();
  const grid = $('#grid');
  const panel = $('#statepanel');
  grid.replaceChildren(...items.map((i) => itemCard(i)));

  const total = state.library.items.length;
  const filtering = state.category !== 'all' || state.query || state.status !== 'all' || state.platform !== 'all';
  $('#resultline').replaceChildren(
    filtering
      ? el('span', {}, 'Showing ', el('strong', { text: items.length }), ` of ${total} projects`)
      : el('span', {}, el('strong', { text: total }), ' projects across ', el('strong', { text: state.library.categories.length }), ' topics'),
  );

  if (items.length === 0) {
    panel.hidden = false;
    grid.hidden = true;
    if (total === 0) {
      panel.replaceChildren(
        icon('app', 'icon'),
        el('h3', { text: 'This library is empty' }),
        el('p', { text: 'library.json loaded successfully but contains no projects.' }),
        el('div', { class: 'statepanel__actions' },
          el('a', { class: 'btn btn--primary', href: '#/', text: 'Back to default library' }),
        ),
      );
    } else {
      panel.replaceChildren(
        icon('search', 'icon'),
        el('h3', { text: 'No projects match' }),
        el('p', { text: 'Try a different search, clear your filters, or change the selected topic.' }),
        el('div', { class: 'statepanel__actions' },
          el('button', { class: 'btn btn--primary', type: 'button', text: 'Clear filters', onClick: clearFilters }),
        ),
      );
    }
  } else {
    panel.hidden = true;
    grid.hidden = false;
  }
  announce(`${items.length} projects shown`);
}

function clearFilters() {
  state.category = 'all'; state.query = ''; state.status = 'all'; state.platform = 'all';
  $('#search-input').value = '';
  render();
}

function renderSkeletons() {
  $('#grid').replaceChildren(...Array.from({ length: 8 }, () => el('div', { class: 'skeleton' },
    el('div', { class: 'skeleton__art' }),
    el('div', { class: 'skeleton__body' },
      el('div', { class: 'skeleton__line skeleton__line--w60' }),
      el('div', { class: 'skeleton__line skeleton__line--w85' }),
      el('div', { class: 'skeleton__line' }),
    ),
  )));
}

function renderError(err) {
  const grid = $('#grid');
  grid.replaceChildren();
  const panel = $('#statepanel');
  panel.hidden = false;
  const file = DATA_SOURCES[state.dataKey] || 'library.json';
  const isDemo = state.dataKey !== 'default';
  panel.replaceChildren(
    icon('alert', 'icon'),
    el('h3', { text: `Could not load ${file}` }),
    el('p', { text: String(err && err.message || err) }),
    el('p', { text: isDemo
      ? 'This is a deliberate demo data source for showing the error state.'
      : 'Open the prototype through a local web server (see mockup/README.md) — file:// blocks fetch.' }),
    el('div', { class: 'statepanel__actions' },
      el('button', { class: 'btn btn--primary', type: 'button', text: 'Retry', onClick: () => boot() }),
      isDemo ? el('a', { class: 'btn', href: location.pathname, text: 'Load default library' }) : null,
    ),
  );
}

/* ---------- category / route ---------- */
function setCategory(id) {
  state.category = id;
  location.hash = id === 'all' ? '#/' : `#/category/${id}`;
  render();
  $('#browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [kind, value] = hash.split('/');
  if (kind === 'category' && value) {
    state.category = value;
    render();
    $('#browse')?.scrollIntoView({ block: 'start' });
  } else if (kind === 'item' && value) {
    render();
    openDetail(value, false);
  } else {
    state.category = 'all';
    render();
  }
}

/* ---------- detail ---------- */
let lastFocus = null;
function resolveId(id) {
  const redirects = state.library.redirects || {};
  return redirects[id] || id;
}
function openDetail(rawId, updateHash = true) {
  const id = resolveId(rawId);
  const item = state.library.items.find((i) => i.id === id);
  if (!item) { toast(`Project "${rawId}" not found.`); return; }
  if (updateHash) location.hash = `#/item/${id}`;

  const body = $('#modal-body');
  const hue = hueFor(item.id);

  const banner = el('div', { class: 'detail__banner' });
  banner.style.setProperty('--hue', hue);
  banner.append(
    renderItemIcon(item, 'icon detail__glyph'),
    el('div', { class: 'detail__heading' },
      el('div', { class: 'detail__badges' },
        el('span', { class: `badge badge--${item.status}`, text: item.status }),
        el('span', { class: 'badge badge--firmware', text: firmwareLabel(item) }),
        ...(item.platform || []).map((p) => el('span', { class: 'badge badge--firmware', text: p })),
        !item.verified ? el('span', { class: 'badge badge--unverified', text: 'Unverified' }) : null,
      ),
      el('h2', { id: 'modal-title', text: item.name }),
      el('p', { class: 'detail__author', text: `by ${item.author}` }),
    ),
  );

  const compat = compatibility(item, state.firmware);
  const meta = (label, value) => el('div', { class: 'meta' }, el('div', { class: 'meta__label', text: label }), el('div', { class: 'meta__value', text: value }));
  const metaGrid = el('div', { class: 'detail__grid' },
    meta('Category', (state.library.categories.find((c) => c.id === item.category) || {}).name || item.category),
    meta('Version', item.version || '—'),
    meta('Status', item.status),
    meta('License', item.license || '—'),
    meta('Updated', item.updated || '—'),
    meta('Firmware', item.firmware ? firmwareLabel(item) : 'Unknown'),
  );

  const sections = [];
  sections.push(el('p', { class: 'detail__desc', text: item.description || item.summary }));

  if (compat.state === 'incompatible') {
    sections.push(el('div', { class: 'detail__section' },
      el('ul', { class: 'warnlist' },
        el('li', {}, icon('alert'), el('span', { text: `This project lists support for ${firmwareLabel(item)}, which does not include your firmware (${state.firmware}).` })),
      ),
    ));
  }

  if (item.warnings?.length) {
    sections.push(el('div', { class: 'detail__section' },
      el('h3', {}, icon('alert'), 'Warnings'),
      el('ul', { class: 'warnlist' }, ...item.warnings.map((w) => el('li', {}, icon('alert'), el('span', { text: w })))),
    ));
  }

  if (item.requires?.length) {
    sections.push(el('div', { class: 'detail__section' },
      el('h3', {}, icon('cpu'), 'Requires'),
      el('div', { class: 'requireslist' }, ...item.requires.map((rid) => {
        const exists = state.library.items.some((i) => i.id === rid);
        return exists
          ? el('button', { class: 'linkbtn-solid', type: 'button', onClick: () => openDetail(rid) }, el('span', { text: rid }))
          : el('span', { class: 'badge badge--firmware', text: rid });
      })),
    ));
  }

  const linkDefs = [
    ['source', 'Source', icon('external')],
    ['releases', 'Releases', icon('external')],
    ['docs', 'Docs', icon('external')],
    ['video', 'Video', icon('external')],
  ];
  const links = linkDefs
    .map(([key, label, ic]) => {
      const url = safeHttps(item.links?.[key]);
      if (!url) return null;
      return el('a', {
        class: `linkbtn-solid${key === 'source' ? ' linkbtn-solid--primary' : ''}`,
        href: url, target: '_blank', rel: 'noopener noreferrer',
      }, ic, el('span', { text: label }));
    })
    .filter(Boolean);
  if (links.length) {
    sections.push(el('div', { class: 'detail__section' }, el('h3', {}, icon('external'), 'Links'), el('div', { class: 'linkrow' }, ...links)));
  }

  sections.push(metaGrid);

  body.replaceChildren(banner, el('div', { class: 'detail__content' }, ...sections));

  lastFocus = document.activeElement;
  const modal = $('#modal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => $('.modal__dialog').focus());
}

function closeDetail() {
  const modal = $('#modal');
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  if (location.hash.startsWith('#/item/')) history.replaceState(null, '', '#/');
  lastFocus?.focus?.();
}

function trapFocus(e) {
  if ($('#modal').hidden || e.key !== 'Tab') return;
  const focusables = $$('.modal__dialog a[href], .modal__dialog button:not([disabled])', $('#modal'));
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------- small UI feedback ---------- */
function announce(msg) {
  const live = $('#live');
  if (live) live.textContent = msg;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- render orchestration ---------- */
function render() {
  renderChrome();
  renderFootNav();
  renderTopics();
  renderFeatured();
  renderToolbar();
  renderGrid();
  syncUrl();
}

/* Reflect shareable UI state in the address bar (mockup convenience + deep links). */
function syncUrl() {
  const p = new URLSearchParams();
  if (state.query) p.set('q', state.query);
  if (state.status !== 'all') p.set('status', state.status);
  if (state.platform !== 'all') p.set('platform', state.platform);
  if (state.sort !== 'curated') p.set('sort', state.sort);
  if (state.firmware) p.set('fw', state.firmware);
  if (state.dataKey !== 'default') p.set('data', state.dataKey);
  const qs = p.toString();
  const url = location.pathname + (qs ? `?${qs}` : '') + location.hash;
  history.replaceState(null, '', url);
}

/* ---------- mobile menu ---------- */
let menuOpen = false;
function setMenu(open) {
  menuOpen = open;
  const menu = $('#mobilemenu');
  const btn = $('#menu-toggle');
  if (menu) menu.hidden = !open;
  if (btn) btn.setAttribute('aria-expanded', String(open));
}
function closeMenu() { if (menuOpen) setMenu(false); }

/* ---------- events ---------- */
function wireEvents() {
  let t;
  $('#search-input').addEventListener('input', (e) => {
    clearTimeout(t);
    const v = e.target.value;
    t = setTimeout(() => { state.query = v; render(); }, 120);
  });
  $('#search-form').addEventListener('submit', (e) => e.preventDefault());
  $('#search-focus').addEventListener('click', () => { location.hash = '#/'; closeMenu(); $('#search-input').focus(); $('#search-input').select(); });

  const fw = $('#firmware-input');
  fw.addEventListener('input', () => {
    const raw = fw.value.trim();
    state.firmware = raw;
    try { localStorage.setItem('ps5c.firmware', raw); } catch {}
    syncFirmwareField();
    render();
  });

  $('#fw-chip').addEventListener('click', () => {
    $('#firmware-input').focus();
    $('#firmware-input').closest('.field--fw')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  const menuBtn = $('#menu-toggle');
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('click', (e) => {
    if (menuOpen && !$('#mobilemenu').contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });

  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  $('#sort-select').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
  $('#clear-filters').addEventListener('click', clearFilters);
  $('#show-disclaimer').addEventListener('click', () => toast('Full legal notice is in the footer.'));
  document.querySelectorAll('[data-close]').forEach((n) => n.addEventListener('click', closeDetail));

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault(); $('#search-input').focus();
    }
    if (e.key === 'Escape') { closeDetail(); closeMenu(); }
    trapFocus(e);
  });

  window.addEventListener('hashchange', () => { closeMenu(); applyRoute(); });
}

/* ---------- start ---------- */
wireEvents();
boot();
