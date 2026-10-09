/* main.js — application entry: boot, routing, actions and event wiring. */

import { $, parseFirmware } from './util.js?v=14';
import { state, setState } from './state.js?v=14';
import { loadLibrary } from './data.js?v=14';
import { navigate, parseRoute, onRoute } from './router.js?v=14';
import { trapFocus } from './a11y.js?v=14';
import {
  renderChrome, renderNav, renderTopics, renderFeatured, renderToolbar,
  renderGrid, renderDetail, renderSkeletons, renderError, syncFirmwareChip,
} from './render.js?v=14';

let menuOpen = false;
let lastFocus = null;
let toastTimer;
let galleryThumbs = [];
let galleryIndex = 0;
let galleryReturn = null;

const actions = {
  setCategory, setStatus, setPlatform, setSort, setFirmware,
  clearFilters, openItem: openDetail, closeDetail, closeMenu, retry: boot,
  openGallery,
};

/* ---------- render orchestration ---------- */
function render() {
  renderChrome(state);
  renderNav(state, actions);
  renderTopics(state, actions);
  renderFeatured(state, actions);
  renderToolbar(state, actions);
  renderGrid(state, actions);
  syncFirmwareField();
  syncSearchField();
  syncUrl();
}

function syncUrl() {
  const p = new URLSearchParams();
  if (state.query) p.set('q', state.query);
  if (state.status !== 'all') p.set('status', state.status);
  if (state.platform !== 'all') p.set('platform', state.platform);
  if (state.sort !== 'curated') p.set('sort', state.sort);
  if (state.firmware) p.set('fw', state.firmware);
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
}

function syncFirmwareField() {
  const fw = $('#firmware-input');
  if (!fw) return;
  fw.value = state.firmware;
  const invalid = state.firmware !== '' && parseFirmware(state.firmware) == null;
  fw.closest('.field--fw').classList.toggle('is-invalid', invalid);
  fw.closest('.field--fw').classList.toggle('is-set', !invalid && state.firmware !== '');
  syncFirmwareChip(state);
}

function syncSearchField() {
  const input = $('#search-input');
  if (!input) return;
  if (input.value !== state.query) input.value = state.query;
  const clear = $('#search-clear');
  if (clear) clear.hidden = state.query === '';
}

function focusSearch() {
  closeMenu();
  const input = $('#search-input');
  input.closest('.searchbox')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  input.focus();
  input.select();
}

/* ---------- routing ---------- */
function applyRoute() {
  const { kind, value } = parseRoute();
  if (kind === 'category' && value) {
    setState({ category: value });
    render();
    $('#browse')?.scrollIntoView({ block: 'start' });
  } else if (kind === 'item' && value) {
    render();
    openDetail(value, false);
  } else {
    setState({ category: 'all' });
    render();
  }
}

/* ---------- detail ---------- */
function openDetail(rawId, updateHash = true) {
  const id = (state.library.redirects || {})[rawId] || rawId;
  const item = state.library.items.find((i) => i.id === id);
  if (!item) { toast(`Project "${rawId}" not found.`); return; }
  if (updateHash) navigate(`#/item/${id}`);
  renderDetail(state, item, actions);
  lastFocus = document.activeElement;
  const modal = $('#modal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => $('.modal__dialog').focus());
}

function closeDetail() {
  closeGallery();
  const modal = $('#modal');
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  if (location.hash.startsWith('#/item/')) history.replaceState(null, '', '#/');
  lastFocus?.focus?.();
}

/* ---------- image gallery ---------- */
function openGallery(itemId, index) {
  const item = state.library.items.find((i) => i.id === itemId);
  const thumbs = (item && Array.isArray(item.thumbnails) ? item.thumbnails : [])
    .filter((src) => typeof src === 'string' && src.trim());
  if (!thumbs.length) return;
  galleryThumbs = thumbs;
  galleryIndex = Math.max(0, Math.min(index, thumbs.length - 1));
  galleryReturn = document.activeElement;
  renderGalleryView();
  const node = $('#gallery');
  node.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => $('.gallery__figure')?.focus());
}

function renderGalleryView() {
  const img = $('#gallery-img');
  img.src = galleryThumbs[galleryIndex];
  img.alt = `Screenshot ${galleryIndex + 1} of ${galleryThumbs.length}`;
  $('#gallery-caption').textContent = `${galleryIndex + 1} / ${galleryThumbs.length}`;
  const many = galleryThumbs.length > 1;
  $('#gallery-prev').disabled = !many;
  $('#gallery-next').disabled = !many;
  img.classList.remove('is-anim');
  void img.offsetWidth; // restart the entrance animation on image change
  img.classList.add('is-anim');
}

function galleryStep(delta) {
  if (galleryThumbs.length < 2) return;
  galleryIndex = (galleryIndex + delta + galleryThumbs.length) % galleryThumbs.length;
  renderGalleryView();
}

function closeGallery() {
  const node = $('#gallery');
  if (!node || node.hidden) return;
  node.hidden = true;
  document.body.style.overflow = '';
  galleryReturn?.focus?.();
}

/* ---------- actions ---------- */
function setCategory(id) {
  navigate(id === 'all' ? '#/' : `#/category/${id}`);
}
function setStatus(id) { setState({ status: id }); render(); }
function setPlatform(id) { setState({ platform: id }); render(); }
function setSort(id) { setState({ sort: id }); render(); }
function setFirmware(value) {
  setState({ firmware: (value || '').trim() });
  try { localStorage.setItem('ps5c.firmware', state.firmware); } catch { /* ignore */ }
  render();
}
function clearFilters() {
  // Note: the platform selection is intentionally preserved.
  setState({ category: 'all', query: '', status: 'all' });
  $('#search-input').value = '';
  navigate('#/');
  render();
}

/* ---------- menu ---------- */
function setMenu(open) {
  menuOpen = open;
  $('#mobilemenu').hidden = !open;
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
}
function closeMenu() { if (menuOpen) setMenu(false); }

/* ---------- feedback ---------- */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- events ---------- */
function wireEvents() {
  let searchTimer;
  $('#search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const v = e.target.value;
    searchTimer = setTimeout(() => { setState({ query: v }); render(); }, 120);
  });
  $('#search-form').addEventListener('submit', (e) => e.preventDefault());
  $('#search-focus').addEventListener('click', focusSearch);
  $('#hero-cta').addEventListener('click', () => {
    closeMenu();
    $('#browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#search-clear').addEventListener('click', () => {
    setState({ query: '' });
    render();
    $('#search-input').focus();
  });

  const fw = $('#firmware-input');
  fw.addEventListener('input', () => setFirmware(fw.value));
  $('#fw-chip').addEventListener('click', () => {
    fw.focus();
    fw.closest('.field--fw')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

  $('#sort-select').addEventListener('change', (e) => setSort(e.target.value));
  $('#clear-filters').addEventListener('click', clearFilters);
  $('#show-disclaimer').addEventListener('click', () => toast('The full legal notice is in the footer.'));
  document.querySelectorAll('[data-close]').forEach((n) => n.addEventListener('click', closeDetail));
  document.querySelectorAll('[data-gallery-close]').forEach((n) => n.addEventListener('click', closeGallery));
  $('#gallery-prev').addEventListener('click', () => galleryStep(-1));
  $('#gallery-next').addEventListener('click', () => galleryStep(1));

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      focusSearch();
    }
    if (!$('#gallery').hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeGallery(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); galleryStep(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); galleryStep(1); return; }
      trapFocus($('#gallery'), e);
      return;
    }
    if (e.key === 'Escape') { closeDetail(); closeMenu(); }
    trapFocus($('#modal'), e);
  });

  onRoute(applyRoute);
}

/* ---------- boot ---------- */
function boot() {
  const params = new URLSearchParams(location.search);
  const fwParam = params.get('fw');
  if (fwParam) {
    setState({ firmware: fwParam });
    try { localStorage.setItem('ps5c.firmware', fwParam); } catch { /* ignore */ }
  } else {
    const stored = localStorage.getItem('ps5c.firmware');
    if (stored) setState({ firmware: stored });
  }
  if (params.get('q')) setState({ query: params.get('q') });
  if (params.get('status')) setState({ status: params.get('status') });
  if (params.get('platform')) setState({ platform: params.get('platform') });
  if (params.get('sort')) setState({ sort: params.get('sort') });

  renderSkeletons();
  return loadLibrary().then((result) => {
    if (result.failed) { renderError(result.error, actions); return; }
    setState({ library: result.data });
    // Defensive: a URL platform that no longer exists must not leave a stuck empty filter.
    const definedIds = (result.data.platforms || []).map((p) => p.id);
    if (state.platform !== 'all' && !definedIds.includes(state.platform)) setState({ platform: 'all' });
    if (result.cached) toast('Live data failed to load — showing cached data.');
    if (state.query) $('#search-input').value = state.query;
    applyRoute();
  });
}

/* ---------- start ---------- */
wireEvents();
boot();
