/* data.js — fetch, validate and cache the library.
 *
 * Layout (modular, platform-based):
 *   library.json                                  manifest: site, categories, redirects, platforms[]
 *   library/platforms/<id>/platform.json          platform metadata + itemFiles[]
 *   library/platforms/<id>/items/<name>.json      one file per item
 *
 * A manifest is required because static hosts (GitHub Pages) cannot list directories.
 * Inline `items` and flat `itemFiles` are still accepted for backward compatibility.
 */

const CACHE_KEY = 'ps5c.cache.v2';
const bust = () => `?v=${Date.now()}`;

async function getJson(path) {
  const res = await fetch(`${path}${bust()}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  try {
    return await res.json();
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
}

/** Directory portion of a URL-ish path (keeps the trailing slash). */
const dirOf = (path) => {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i + 1);
};

/** Resolve a manifest into a single data object with a flat `items` array and `platforms`. */
async function resolveLibrary(manifest) {
  const data = { ...manifest, platforms: [], items: [] };

  if (Array.isArray(manifest.platforms) && manifest.platforms.length) {
    const platformResults = await Promise.allSettled(manifest.platforms.map((p) => getJson(String(p))));
    let failed = 0;

    for (let i = 0; i < platformResults.length; i++) {
      const result = platformResults[i];
      if (result.status !== 'fulfilled') {
        failed++;
        console.warn('[data] platform failed to load:', manifest.platforms[i], result.reason);
        continue;
      }
      const platform = result.value;
      platform.itemFiles = Array.isArray(platform.itemFiles) ? platform.itemFiles : [];
      platform.dir = dirOf(String(manifest.platforms[i])); // e.g. "library/platforms/ps5/"
      data.platforms.push(platform);

      const itemsDir = `${platform.dir}items/`;
      const itemResults = await Promise.allSettled(platform.itemFiles.map((f) => getJson(`${itemsDir}${f}`)));
      itemResults.forEach((ir, j) => {
        if (ir.status === 'fulfilled' && ir.value && typeof ir.value === 'object') {
          if (ir.value.platformId == null) ir.value.platformId = platform.id;
          data.items.push(ir.value);
        } else if (ir.status === 'rejected') {
          console.warn('[data] item failed to load:', `${itemsDir}${platform.itemFiles[j]}`, ir.reason);
        }
      });
    }

    if (failed === manifest.platforms.length) throw new Error('all platforms failed to load');
  } else if (Array.isArray(manifest.itemFiles) && manifest.itemFiles.length) {
    // Legacy: flat list of item files.
    const results = await Promise.allSettled(manifest.itemFiles.map((p) => getJson(String(p))));
    const failures = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') data.items.push(r.value);
      else failures.push(manifest.itemFiles[i]);
    });
    if (failures.length === manifest.itemFiles.length) throw new Error(`all ${failures.length} item files failed to load`);
  } else if (Array.isArray(manifest.items)) {
    data.items = manifest.items; // legacy inline items
  }

  return data;
}

/**
 * Load and validate the library.
 * @returns {Promise<{data?:object, cached?:boolean, error?:Error, failed?:boolean}>}
 */
export async function loadLibrary() {
  try {
    const manifest = await getJson('library.json');
    const data = await resolveLibrary(manifest);
    validate(data);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage may be unavailable */ }
    return { data };
  } catch (err) {
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); } catch { /* ignore */ }
    if (cached) {
      try {
        validate(cached);
        return { data: cached, cached: true, error: err };
      } catch { /* fall through to failure */ }
    }
    return { failed: true, error: err };
  }
}

/** Structural validation. Invalid items are dropped with a console warning. */
export function validate(data) {
  if (!data || typeof data !== 'object') throw new Error('library.json is not an object');
  if (!Array.isArray(data.categories)) throw new Error('library.json is missing a categories array');
  if (!Array.isArray(data.items)) throw new Error('library has no items (missing platforms, itemFiles or items)');

  const catIds = new Set(data.categories.map((c) => c && c.id).filter(Boolean));
  data.items = data.items.filter((it) => {
    const ok = it && typeof it.id === 'string' && typeof it.name === 'string'
      && typeof it.category === 'string' && typeof it.summary === 'string';
    if (!ok) { console.warn('[data] skipped invalid item', it); return false; }
    if (!catIds.has(it.category)) console.warn(`[data] item "${it.id}" references unknown category "${it.category}"`);
    return true;
  });
}
