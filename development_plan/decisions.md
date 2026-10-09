# Decision Records — PS5 Homebrew Compendium

Format: each decision has an ID, date, context/evidence, chosen option, alternatives, tradeoffs, and supersedes/superseded-by links. Append or explicitly supersede; never silently erase rationale.

---

## DEC-001 — Content delivery: runtime-fetched JSON, zero build
- **ID:** DEC-001
- **Date:** 2026-10-08
- **Context:** Requirement 4: "easily updateable through a json file (`library.json`)". Hosting is GitHub Pages (static only).
- **Decision:** The site fetches `./library.json` at runtime and renders client-side. No build step, no framework.
- **Alternatives:** (a) Build-time generation (Astro/Eleventy) from JSON; (b) bundled JS import of JSON (requires rebuild per edit); (c) backend API.
- **Tradeoffs:** 
  - Pros: editing JSON alone updates the live site; minimal tooling; small payload; trivial GitHub Pages fit.
  - Cons: content is not in the initial HTML (weaker SEO / no-JS), and all rendering logic ships to the client.
- **Mitigations:** Add meta/OpenGraph for the landing shell; output schema-friendly, indexable fallback later if SEO becomes a goal.
- **Supersedes/superseded by:** none.

## DEC-002 — Content scope: PS5-native homebrew only
- **ID:** DEC-002
- **Date:** 2026-10-08
- **Context:** User selected "PS5 homebrew only". PS4 titles run via backward compatibility but are a distinct scope.
- **Decision:** Include only native PS5 homebrew. No PS4/PS3/Vita items in v1.
- **Alternatives:** include PS4 compatibility items with a platform badge; broader legacy scope.
- **Tradeoffs:** narrower catalog, but simpler data model and clearer positioning. The `platform` field leaves room to extend later.
- **Supersedes/superseded by:** none.

## DEC-003 — Hosting/publish layout: repository root on default branch
- **ID:** DEC-003
- **Date:** 2026-10-08
- **Context:** GitHub Pages supports branch-root, `/docs`, and Actions-based publishing.
- **Decision:** Publish from the repository root of the default branch, with a `.nojekyll` file. (Provisional — see plan §12, U-1.)
- **Alternatives:** `/docs` folder; `gh-pages` branch; Actions artifact deploy.
- **Tradeoffs:** root is simplest for a repo that *is* the site; `/docs` is cleaner if source/tooling is later added. Switching is low-cost.
- **Supersedes/superseded by:** none.

## DEC-004 — Data contract: versioned JSON Schema 2020-12
- **ID:** DEC-004
- **Date:** 2026-10-08
- **Context:** The library is hand-edited; syntax/semantic errors are a real risk (RISK-03).
- **Decision:** Define a versioned JSON Schema 2020-12 contract with a root `schemaVersion`. Validate in CI; validate defensively at runtime without crashing.
- **Alternatives:** no schema; custom JS validator; TypeScript types only.
- **Tradeoffs:** schema adds documentation and CI value; strictness must not block additive evolution (minor = additive, major = breaking).
- **See:** `development_plan/data-model.md`, `library.schema.json`, `platform.schema.json`, `item.schema.json`.
- **Update (2026-10-08, rev 1.1):** As of `schemaVersion` **2.0.0** the contract was split across three mutually consistent schemas (manifest + platform + item) to match the modular platform layout. The single-file v1 `library.schema.json` (inline `items[]`) is superseded but the loader still tolerates that shape — see DEC-008.
- **Supersedes/superseded by:** superseded-in-part by DEC-008 (structure); the versioned-schema principle remains.

## DEC-005 — Legal/safety: lawful homebrew only, links not hosting
- **ID:** DEC-005
- **Date:** 2026-10-08
- **Context:** User selected "Lawful-homebrew-only + disclaimers".
- **Decision:** The compendium links only to official/open-source project pages and never hosts or directly links to ROMs, BIOS files, prod.keys/title.keys, game dumps, or copyrighted PKGs. A visible disclaimer plus per-item `warnings[]` communicate risk (piracy, account bans, bricking).
- **Alternatives:** neutral link aggregator; minimal framing.
- **Tradeoffs:** Some convenience is lost (users fetch their own BIOS/keys), but legal exposure and misuse risk drop sharply.
- **Supersedes/superseded by:** none.

## DEC-006 — Cache strategy for content updates
- **ID:** DEC-006
- **Date:** 2026-10-08
- **Context:** GitHub Pages / CDN may cache `library.json`, delaying edits (RISK-06).
- **Decision:** Fetch with `cache: 'no-cache'` and optionally append `?v=<site.lastUpdated>`; on load failure, fall back to a `sessionStorage` last-good copy with a retry action.
- **Alternatives:** rely on default caching; service worker (deferred).
- **Tradeoffs:** slightly more network chatter; predictable freshness and resilience on flaky connections.
- **Supersedes/superseded by:** none.

## DEC-007 — No proprietary PlayStation assets/fonts
- **ID:** DEC-007
- **Date:** 2026-10-08
- **Context:** The design targets the PS5 ("Prospero") aesthetic. Sony's SST/SST Condensed fonts and PlayStation trademarks/assets are proprietary.
- **Decision:** Do not bundle SST or Sony logos/artwork. Achieve the *feel* with licensed/system fonts (e.g., Inter or system-ui stack), custom-drawn shapes, and non-infringing visuals. Name the project as an unofficial community compendium and include a trademark/disclaimer notice.
- **Alternatives:** bundle SST (rejected: licensing); use any generic sans (acceptable fallback).
- **Tradeoffs:** exact typographic match is approximate; legal safety and license cleanliness are preserved.
- **Supersedes/superseded by:** none.

## DEC-008 — Data structure: modular, platform-based content (`schemaVersion` 2.0.0)
- **ID:** DEC-008
- **Date:** 2026-10-08
- **Context:** User asked to "modularize the file library.json: /items subfolder, one file per item", then to restructure into `/library/platforms` with a per-platform `platform.json` and a platform-scoped `items/` folder. Hand-editing one large file had become error-prone, and a platform dimension was needed to grow beyond PS5.
- **Decision:** The library is a **manifest** (`library.json`) plus one folder per platform:
  - `library.json` = `{ schemaVersion: "2.0.0", site, categories, redirects, platforms[] }` where `platforms[]` lists relative paths to platform files.
  - `library/platforms/<id>/platform.json` = `{ id, name, shortName, description, icon, order, itemFiles[] }`.
  - `library/platforms/<id>/items/<name>.json` = one bare item object; filename = item id with `-`→`_`.
  - The loader attaches `platformId` to each item; it still accepts legacy flat `itemFiles` and inline `items` for backward compatibility.
- **Alternatives:** (a) keep the monolithic inline `items[]` (rejected: merge conflicts, no platform dimension); (b) one file per item without platforms (implemented first, then superseded by this decision); (c) a build-time generator (rejected: contradicts zero-build/DEC-001).
- **Tradeoffs:** many small files and a manifest to maintain, plus a directory-list limitation on static hosts, in exchange for clean per-item diffs, a platform dimension, and no rebuild. Adds two new schemas (DEC-004 update).
- **Evidence:** `development/js/data.js`, `development/tests/validate-library.mjs`, `development/tools/restructure-platforms.mjs`; validator OK (schemaVersion 2.0.0, 19 items, 1 platform); HTTP 200 for manifest/platform/items.
- **Supersedes/superseded by:** supersedes the monolithic data shape in rev 1.0; supersedes-in-part DEC-004's single-schema detail. See DEV-7.

## DEC-009 — ES-module cache-busting with `?v=N`
- **ID:** DEC-009
- **Date:** 2026-10-08
- **Context:** After the data-format change, the running site served a **stale `js/data.js`** and showed a spurious "Could not load library.json / missing an items array" error even though the on-disk module was correct. Browsers and CDNs cache ES-module responses aggressively.
- **Decision:** Reference the entry module as `js/main.js?v=<N>` and give **every** relative import inside `js/` the same `?v=<N>`. Bump `N` in `index.html` and every `js/*.js` import whenever any file under `js/` changes. Data fetches independently use `?v=<timestamp>` + `cache:'no-cache'` (DEC-006).
- **Alternatives:** configure cache headers (unavailable on GitHub Pages), rely on user hard-refresh (unreliable), add a service worker (heavy for scope).
- **Tradeoffs:** a manual version bump to remember on each JS change, versus reliably fresh modules on every deploy.
- **Evidence:** `development/index.html` (`js/main.js?v=4`); versioned imports across `main.js`, `data.js`, `render.js`, `filters.js`; documented in `development/README.md`.
- **Update (2026-10-08, rev 1.2):** the token value was bumped to `?v=4` by the platform-filter increment (`render.js`/`filters.js`/`main.js`); the `?v=N` mechanism is unchanged. Grep for `?v=3` returns none.
- **Supersedes/superseded by:** none. Complements DEC-006 (data cache-busting).

## DEC-010 — Search placement and live result count
- **ID:** DEC-010
- **Date:** 2026-10-08
- **Context:** User request: "the search bar must be placed at the top of the DIV browse and must also filter the quantity of items found", followed by "refine the frontend".
- **Decision:** The search field is the **first control inside `#browse`** (removed from the hero). It filters the grid live and updates:
  - a `#search-count` badge beside the field (`"19 projects"` when idle, `"<n> / <total>"` while filtering);
  - a descriptive `#resultline` shown only while filtering;
  - a polite `#live` region (`"<n> project(s) shown"`);
  - a `#search-clear` button (shown when non-empty).
  The hero keeps a "Browse projects" CTA and a `/` shortcut that scroll/scrolls-to and focuses the field.
- **Alternatives:** keep search in the hero (rejected: user directive); show only a count with no badge; count in the tab labels only.
- **Tradeoffs:** more controls in the browse area; the hero loses its inline search but gains a clearer CTA. Default totals remain visible in the hero stats.
- **Evidence:** `development/index.html` (`#search-form` inside `.browse`, `#search-count`, `#search-clear`, `#hero-cta`); `development/js/main.js` (`syncSearchField`, `hero-cta`, `/`); `development/js/render.js` (`renderGrid` count/resultline). Headless: `?q=switch` → count `1 / 19`, live `1 project shown`; base → count `19 projects`, resultline hidden.
- **Supersedes/superseded by:** none. Extends FR-04.

## DEC-011 — GUI platform dimension is sourced solely from `library/platforms/`
- **ID:** DEC-011
- **Date:** 2026-10-08
- **Context:** User request: "the GUI must only use the platforms defined in the '/library/platforms/', including the GUI filters". Before this change the toolbar and badges used a hardcoded device-variant array `["PS5","PS5 Pro"]` read from each item's `platform` field, which duplicated and diverged from the platform definitions introduced by DEC-008.
- **Decision:** The GUI platform dimension is derived **only** from the loaded platform definitions (`library.json.platforms[]` → `library/platforms/<id>/platform.json`):
  - **Filter chips** (`#platform-toggle`) = `All platforms` + one chip per definition, ordered by `order`, labelled `shortName || name || id`, chip id = the platform `id`; the group is hidden when zero platforms are defined. Filtering keeps items where `state.platform !== 'all' && item.platformId !== state.platform` (no device-variant logic).
  - **Card/detail badge** `.badge--platform` = the item's `platformId` resolved to the definition label (`shortName || name || id`).
  - An unknown `?platform=<id>` is normalized to `all` on boot.
  - The per-item device-variant `platform` array is **retained in the data files and `item.schema.json`** but is no longer surfaced by the GUI.
- **Alternatives:** (a) keep the hardcoded `PS5`/`PS5 Pro` array (rejected: two sources of truth; breaks when platforms are renamed/added); (b) derive the filter from distinct `item.platform` values (rejected: those are device variants, not platforms); (c) delete `item.platform` from the data/schema (rejected: current item files use it and it may be re-surfaced later).
- **Tradeoffs:**
  - Pros: single source of truth; adding a platform is a data-only change (the filter/badge auto-extend, ordered by `order`); no hardcoded list to drift.
  - Cons: the retained `item.platform` device variants are now unrendered data (open question: re-surface or clean up — plan §12 U-6); chip quality depends on definitions carrying a sensible `shortName || name || id`.
- **Evidence:** `development/js/render.js` (`platformDefs`/`platformLabel`/`platformBadge`, `renderToolbar`); `development/js/filters.js`; `development/js/main.js` (`boot` normalization); `development/library/platforms/ps5/platform.json`; `DEVELOPMENT_CURRENT_STATE.MD` DEV-8 (resolved)/DEV-9. Headless: base chips `All platforms` + `PS5`, count `19 projects`, 23 cards; `?platform=ps5` → `19 / 19`; `?platform=ps4` → normalized to `all`; `.badge--platform` 23 base / 24 with detail.
- **Supersedes/superseded by:** supersedes the hardcoded device-variant platform filter/badge behavior that earlier `item.platform` docs described; complements DEC-008 (modular platform data). Resolves the GUI half of plan §12 U-6 (DEV-9).
