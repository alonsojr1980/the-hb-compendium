/* util.js — shared helpers: DOM, icons, and firmware/compatibility math. */

export const SVGNS = 'http://www.w3.org/2000/svg';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element. props: { class, text, dataset, attrs, on<Event> }. */
export function el(tag, props = {}, ...children) {
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
  appendChildren(node, children);
  return node;
}
export function appendChildren(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

/** Reference an inline <symbol> from the sprite. */
export function icon(name, cls = 'icon') {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

export const CATEGORY_ICON = { emulators: 'gamepad', jailbreaks: 'unlock', tools: 'tool', apps: 'app' };
const ICON_WORDS = new Set(['gamepad', 'unlock', 'tool', 'app', 'search', 'external', 'close', 'chevron', 'alert', 'check', 'cpu', 'sparkle', 'shield']);
const isUrlLike = (v) => /^(https?:)?\/\//i.test(v) || /^\.{0,2}\//.test(v);
const fallbackIcon = (item) => CATEGORY_ICON[item.category] || 'app';

/**
 * Render an item icon. `item.icon` may be a named icon ("gamepad") or an image URL/path.
 * URL icons render as <img>; a failed image falls back to the named/category icon.
 */
export function renderItemIcon(item, cls) {
  const raw = (item.icon || '').trim();
  if (raw && isUrlLike(raw)) {
    const img = el('img', { class: `${cls} item-icon`, src: raw, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.replaceWith(icon(fallbackIcon(item), cls)));
    return img;
  }
  const name = raw && ICON_WORDS.has(raw) ? raw : fallbackIcon(item);
  return icon(name, cls);
}

export const hueFor = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
export const norm = (s) => (s || '').toString().toLowerCase();
export const safeHttps = (url) => (typeof url === 'string' && /^https:\/\//i.test(url) ? url : null);

/** Firmware "X.YY" -> comparable integer; null if invalid. */
export function parseFirmware(value) {
  const m = /^(\d+)\.(\d{2})$/.exec((value || '').trim());
  return m ? Number(m[1]) * 1000 + Number(m[2]) : null;
}

/** Returns { state: 'unset'|'unknown'|'compatible'|'incompatible' }. */
export function compatibility(item, fwValue) {
  const fw = parseFirmware(fwValue);
  if (fw == null) return { state: 'unset' };
  const min = item.firmware?.min ? parseFirmware(item.firmware.min) : null;
  const max = item.firmware?.max ? parseFirmware(item.firmware.max) : null;
  if (min == null && max == null) return { state: 'unknown' };
  if (min != null && fw < min) return { state: 'incompatible' };
  if (max != null && fw > max) return { state: 'incompatible' };
  return { state: 'compatible' };
}

export function firmwareLabel(item) {
  const f = item.firmware;
  if (!f || (!f.min && !f.max)) return 'Firmware unknown';
  if (f.min && f.max) return `FW ${f.min}–${f.max}`;
  if (f.min) return `FW ≥ ${f.min}`;
  return `FW ≤ ${f.max}`;
}
