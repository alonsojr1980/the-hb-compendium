# DEVELOPMENT_CURRENT_STATE

**Product:** The Homebrew Compendium — static, JSON-driven directory of PS5 homebrew.
**Product location:** `development/` (this is the deployable site).
**Entry point:** `development/index.html` (ES modules in `development/js/`).
**Date:** 2026-10-09
**Stage:** locally verified; **not deployed** (deployment deliberately deferred — see DEV-11). Quality pass complete (Lighthouse/a11y/CLS).
**Sources of truth:** `DEVELOPMENT_PLAN.MD` rev 1.0 + `development_plan/*` (planner); `mockup/` + `DEVELOPMENT_MOCKUP_PROGRESS.MD` (prototype evidence). Both are read-only to this stage.

---

## 1. Status summary

The product is **implemented and functionally verified locally** but **not deployed**. It reproduces the validated prototype behavior with a production module layout, no build step, and no runtime dependencies.

| Area | State |
|---|---|
| Code | Implemented (`development/`) |
| Data | `development/library.json` — 19 items, 4 categories (**all `verified:false`**) |
| Local run | Verified (HTTP 200 + headless render) |
| Automated tests | Data validation **OK**; unit tests **20/20** (`tests/*.test.mjs`) |
| Deployment | **Not done** — deliberately deferred; local-only for now (DEV-11) |
| Accessibility tooling | **Run** — Lighthouse Accessibility **100** (axe-core rules); 1 issue found + fixed |
| Performance tooling | **Run** — Lighthouse Perf **100** desktop / **99** mobile; **CLS 0.016 / 0.012** |
| Content accuracy | **Unverified** by a human maintainer (content/icons intentionally untouched) |

---

## 2. Traceability (plan requirement → implementation → status)

Status: **verified** = exercised with actual evidence; **implemented** = code present, not exercised in production; **partial**.

| ID | Behavior | Code / asset | Status | Evidence |
|---|---|---|---|---|
| FR-01 | Content driven by `library.json` at runtime | `js/data.js`, `development/library.json` | verified | headless render: 23 cards from data |
| FR-02 | Topics rendered from `categories[]` | `js/render.js` `renderTopics` | verified | 5 topic buttons |
| FR-03 | Category grid shows only its items | `js/filters.js` `visibleItems` | implemented | filter logic present; not click-tested |
| FR-04 | Search matches name/summary/tags/author; placed at top of `browse`; updates result count | `js/filters.js` `matchesQuery`, `js/main.js` `syncSearchField`, `development/index.html` | verified | production `?q=switch` → resultline "Showing 1 of 19 projects", live "1 projects shown"; DOM order browse → search → topics confirmed |
| FR-05 | Filter by status/platform/firmware | `js/filters.js` `visibleItems`, `js/render.js` `renderToolbar` | verified (platform) | Platform chips are **data-driven** from `state.library.platforms` (`All platforms` + `PS5`); `?platform=ps5` → count **"19 / 19"**, resultline **"Showing 19 of 19 projects"**; `?platform=ps4` (undefined) → boot resets to `all` (19). Status/firmware paths unchanged. |
| FR-06 | Sort name/updated/curated | `js/filters.js` sorters | verified (prototype) | prototype `?sort=name` → `BF Player` first |
| FR-07 | Deep-linkable detail | `js/router.js`, `js/main.js` `openDetail` | verified | `#/item/ps5-retroarch` → modal open |
| FR-08 | Detail shows all fields + requires links | `js/render.js` `renderDetail` | verified | 3 sections, warnings block rendered |
| FR-09 | Safe external links | `renderDetail` (`https:` + `rel=noopener noreferrer`) | implemented | code review |
| FR-10 | Firmware compatibility | `js/util.js` `compatibility`, cards/detail | verified | `?fw=14.00` → 23 incompatible |
| FR-11 | Disclaimer + per-item warnings | `library.json` `site.disclaimer`, detail warnings | verified | footer text + warnings block |
| FR-12 | Loading/empty/error states | `renderSkeletons`, `emptyState`, `renderError` | verified (prototype) | prototype fixtures; same code paths |
| FR-13 | Schema validation | `tests/validate-library.mjs` | verified | OK (19 items, 4 categories) |
| FR-14 | Data freshness | `renderChrome` → footer `lastUpdated` | implemented | code present |
| NFR-P1 | Performance budget | no framework; SVG/CSS assets | partial | not measured (Lighthouse) |
| NFR-A1 | Accessibility | skip link, focus trap, live region, reduced-motion | partial | not tool-audited |
| NFR-S1 | No raw innerHTML of data; https-only links | all modules use `textContent`/DOM construction | implemented | code review |
| NFR-R1 | Graceful degradation + cache | `js/data.js` sessionStorage fallback | implemented | code present; not exercised |
| UC-03 | Firmware-aware browsing | cards + detail + `?fw=` | verified | `?fw=14.00` |
| UC-04 | Maintainer edits JSON | `README.md`, `tests/validate-library.mjs` | implemented | documented runbook |
| UC-05 | Deep-link & share | `js/router.js`, `syncUrl` | verified | cold `#/item/...` resolved |

---

## 3. Architecture & invariants

Zero-build static site. Browser fetches `library.json` and renders client-side.

```
development/
├── index.html            shell + inline SVG icon sprite
├── styles.css            design tokens + components
├── js/
│   ├── main.js           boot, routing, actions, event wiring (entry)
│   ├── data.js           fetch manifest + item files, validate, cache
│   ├── state.js          app state + tiny emitter
│   ├── filters.js        pure search/filter/sort
│   ├── render.js         all DOM rendering
│   ├── router.js         hash routing
│   ├── a11y.js           live region + focus trap
│   └── util.js           DOM/icon/firmware helpers
├── library.json          manifest: site, categories, redirects, platforms[]
├── library/platforms/    ps5/platform.json + ps5/items/*.json (19 items)
├── assets/               banner.svg, banner.png (1600×600), favicon.svg
├── tools/                split-library.mjs, restructure-platforms.mjs
├── tests/validate-library.mjs
├── .nojekyll
└── README.md
```

**Data invariants** (platform-based library, `schemaVersion` 2.0.0):
- `library.json` is a **manifest**: `schemaVersion`, `site`, `categories`, `redirects`, `platforms` (ordered list of `platform.json` paths).
- `library/platforms/<id>/platform.json` holds `id`, `name`, and `itemFiles` (filenames within `items/`).
- `library/platforms/<id>/items/<name>.json` holds a single item object. Filename convention: id with `-` → `_`.
- A manifest (and each platform's `itemFiles`) is required because static hosts cannot list directories. Legacy flat `itemFiles` and inline `items` remain supported.
- The platform id is attached to each loaded item as `platformId` when not already set.
- Stable slugs: item `id`, `categories[].id`. Routes: `#/`, `#/category/<id>`, `#/item/<id>`.
- `category` must match a `categories[].id`; `requires[]` should resolve to item ids (warned otherwise).
- `firmware` bounds are `MAJOR.MM`, compared inclusively; missing bounds = "unknown" (not compatible).
- `icon`: named word **or** image URL/path; broken images fall back to the category icon.
- Loader tolerance: a failed platform or item file is skipped with a console warning; only an all-platforms failure aborts the load.
- GUI uses `platformId` + the platform definitions for the filter and the `.badge--platform` badge (`shortName || name || id`). The per-item device-variant `platform` array is retained in data but **not rendered** (intentional; see DEV-8).

**Security:** all data-derived text via `textContent`/DOM construction; external anchors require `https:` and use `rel="noopener noreferrer"`; no secrets, cookies, analytics, or third-party embeds.

**Entry points / commands:**
```bash
# serve (from development/)
python -m http.server 8080 --bind 127.0.0.1     # -> http://127.0.0.1:8080/
# validate data
node development/tests/validate-library.mjs
```

---

## 4. Verification performed (2026-10-08)

Environment: Windows, Node v24.14.0, Python 3.11.9, Chrome (x86) headless.

| Check | Command / method | Result |
|---|---|---|
| JS module syntax | `node --check` on copies as `.mjs` | all 8 modules OK |
| Data validation | `node development/tests/validate-library.mjs` | **OK** — 19 items, 4 categories, 19 unverified |
| Assets over HTTP | served `development/` | index/library/styles/app/all assets 200 |
| Home render | headless `--dump-dom` `/development/` | 23 cards (19 grid + 4 featured), 5 topics, 18 `<img>` icons + 5 SVG glyphs, no error state |
| Firmware | `/development/?fw=14.00` | 23 incompatible cards |
| Deep link | `/development/#/item/ps5-retroarch` | modal open, 3 detail sections, warnings block |
| Visual | 1440×900 screenshot | header, banner, featured rail, cards render correctly |

**Not yet verified:** category/search/filter click interactions; error/empty/cache states in production; responsive at true 360 px; keyboard focus trap; Lighthouse/axe budgets; image-fallback on a broken URL.

### 4b. Platform-filter increment (2026-10-08, later)

| Check | Command / method | Result |
|---|---|---|
| JS module syntax | `node --check` on copies as `.mjs` (8 modules) + `tests/*.mjs` | all 10 OK |
| Data validation | `node development/tests/validate-library.mjs` | **OK** — schemaVersion 2.0.0, 19 items (1 platform) |
| No hardcoded `PS5 Pro` | grep `development/js` + `index.html` | **none**; remaining `PS5` strings are brand/title/hero fallbacks only (no filter option) |
| Module cache-bust | grep `?v=3` | none — all bumped to `?v=4` |
| Base render | headless `--dump-dom` `/development/` + `tests/inspect-dom.mjs` | 23 cards (19 grid + 4 featured), count **"19 projects"**, no error/empty; platform group HTML = `All platforms` + `PS5` (data-driven) |
| Platform filter (defined) | `/development/?platform=ps5` | 23 cards, count **"19 / 19"**, resultline **"Showing 19 of 19 projects"** |
| Platform filter (undefined) | `/development/?platform=ps4` | boot resets to `all` → 19 projects (requirement 6). **Note:** the task's VERIFY bullet expected "0 items"; that conflicts with requirement 6's mandated reset — see DEV-9/ledger. |
| Deep link + badge | `/development/#/item/ps5-retroarch` | modal open; detail badges `FW 7.00–13.60` + `.badge--platform` **PS5** (from definition) |
| Platform badge | DOM count `badge--platform` | base **23** (one per card), deep **24** (23 cards + detail) |
| Visual | 1440×2600 screenshot | toolbar chips read `All platforms` / `PS5`; cards show PlayStation-blue platform badge |

**Not yet verified in this increment:** click-driven chip switching (only URL-driven state was exercised); zero-platform hide path (only one platform exists).

### 4c. Evaluation & quality increment (2026-10-09)

A full external evaluation scored 15 aspects (unweighted mean **7.3/10**). The two highest-impact defects (layout instability + an axe accessibility failure) were fixed and re-verified:

| Check | Before | After |
|---|---|---|
| Lighthouse Performance (desktop / mobile) | 76 / 74 | **100 / 99** |
| Cumulative Layout Shift (desktop / mobile) | 0.932 / 0.857 | **0.016 / 0.012** |
| Accessibility (both) | 100 | 100 |
| axe `label-content-name-mismatch` | fail | **pass** |
| Best-practices / Agentic browsing | 100 / 52 | 100 / 100 |
| SEO | 92 | 92 (`canonical` invalid — blocked, DEV-10) |

**Changes**
- `styles.css` — **CLS fix:** reserved space for the hero tagline (`min-height`), hero stats (`min-height: 59px`) and featured rail (`min-height: 352px`); changed the decorative `.hero__glow` from a percentage `top` (which moved when `.hero` grew after the async load) to a fixed `top: -190px`. Root cause confirmed by Lighthouse (`layout-shift` culprit = `div.hero__glow`).
- `js/render.js` — **a11y fix:** removed the card `aria-label` (it did not contain the visible card text → axe `label-content-name-mismatch`); the incompatible-firmware warning now renders as an `sr-only` child.
- `js/filters.js` — `matchesQuery` now normalizes its own query (it was case-sensitive for direct callers; `visibleItems` already normalized, so no behavior change for the app).
- `index.html` — added a `<noscript>` fallback; bumped module cache-bust `?v=4` → `?v=5`.
- `tests/util.test.mjs`, `tests/filters.test.mjs` — **new** dependency-free unit tests (`node --test`).
- `README.md` — documented the test commands and the `?v=5` bump.

**Verification (2026-10-09):** validator **OK** (schemaVersion 2.0.0, 19 items); unit tests **20/20 pass**; module syntax 8/8; headless render base 23 cards / `19 projects`, `?q=switch` → `1 / 19`, `?fw=14.00` → 23 incompatible, `#/item/ps5-retroarch` → modal open. Lighthouse desktop/mobile as above.

**Deferred by user decision:** deployment + canonical/robots/sitemap (local-only, DEV-11); Playwright E2E (manual QA instead, DEV-5); icon/content replacement (untouched, DEV-3).

### 4d. Rebrand & motion increment (2026-10-09)

**Rename.** Site name changed from "PS5 Homebrew Compendium" to **"The Homebrew Compendium"** across `library.json` (`site.title`), the static shell (`index.html` title/OG/brand/hero/footer/noscript), `favicon.svg`, `run_site.bat`, the `styles.css` header comment, `README.md`, and the `render.js` title fallbacks. `grep "PS5 Homebrew Compendium" development/` → **none**. The PS5 content description in the tagline is retained; `DEVELOPMENT_PLAN.MD` and `mockup/` are read-only to this stage and still carry the old name.

**Motion system (console-like).** Added to `styles.css`: `rise-in` / `brand-on` / `art-sheen` / `pulse-ring` keyframes; staggered hero intro; brand power-on; per-card entrance stagger (via `--i`, capped); card-art light-sheen + edge glow on hover/focus; modal section stagger; pressed-scale feedback; active-topic ring. `render.js` wires the stagger indices, a stat **count-up** (reduced-motion aware, with a guaranteed final value so it can't strand at 0), and **render-signature guards** (`renderNav` / `renderTopics` / `renderToolbar` / `renderFeatured` / stats) so chrome is not rebuilt — and entrance animations do not re-fire — on every keystroke. Module cache-bust bumped `?v=5` → `?v=6`.

**Verification (2026-10-09):** module syntax 8/8; unit tests **20/20**; validator **OK**; headless render 23 cards, hero title `The Homebrew Compendium`, stats `19 / 4 / 16`, 0 console errors. Lighthouse **desktop Perf 100 / A11y 100 / BP 100 / CLS 0.001**, **mobile Perf 99 / A11y 100 / CLS 0.0**, LCP 0.8s/2.1s, TBT 0 ms. Horizontal-overflow probe (CDP `Emulation.setDeviceMetricsOverride`) at **360/390/480/768/1440 px → `scrollWidth == clientWidth`** (no horizontal scroll; NFR-D1; the featured rail scrolls internally by design). Reduced-motion path verified via forced `prefers-reduced-motion` screenshots (final layout, counts settled).

### 4e. Platform tiles, thumbnail & browse background (2026-10-09)

**Data contract.** `platform.json` gained two optional fields: `thumbnail` (image path/URL) and `browseBG` (raw CSS `background` value). `ps5` now declares `thumbnail: "assets/platforms/ps5.svg"` (new asset) and a PS5-blue `browseBG` gradient.

**UI.** The platform filter moved from the toolbar to **above the search bar** and is now a row of **tiles** (`#platform-toggle.platforms`): one per platform plus an `All platforms` tile; each tile's background is the platform `thumbnail` (the `All platforms` tile uses a default gradient). Selecting a platform sets `#browse`'s `background` to that platform's `browseBG` (cleared for `All platforms`, via `applyBrowseBackground`). Status chips / firmware / sort / clear stay in the toolbar. Module cache-bust `?v=6` → `?v=7`.

**Verification (2026-10-09):** syntax 8/8; unit tests **20/20**; validator **OK**; CDP probe — `#platform-toggle` class `platforms`, **tiles above the search form**, 2 tiles (`All platforms` = gradient, `PS5` = `url(...ps5.svg)`), `aria-pressed` tracks the active platform, `#browse` inline background present only when a platform is selected (`?platform=ps5`), no document overflow at 390/1440; 23 cards / filtering intact. Lighthouse **Perf 100/99, A11y 100, BP 100, CLS 0**, 0 console errors. Screenshot reviewed.

**Security note:** `browseBG` is applied verbatim as a CSS `background` value (a `url(...)` value could load a resource). This follows the existing trusted-data model used for item `icon` URLs (maintainer-authored library). Schema gap logged as **DEV-12**.

### 4f. Platform thumbnail fallback convention (2026-10-09)

**Behavior.** `platform.thumbnail` still wins when set. When it is missing or empty, `render.js#resolveThumbnail` probes the platform's own folder for the first existing `thumb.<ext>` in the order **png, jpg, jpeg, svg** and uses it as the tile background. `data.js` now attaches `platform.dir` (the platform's folder) at load time so the fallback is built as `<dir>thumb.<ext>`.

**Data.** `ps5`'s explicit `thumbnail` was set to `""` so the convention is exercised; the platform folder contains `thumb.jpg` (179 KB, supplied by the maintainer). (`library/platforms/ps5/thumb.svg` added earlier and `assets/platforms/ps5.svg` are now unused/shadowed.)

**Verification (2026-10-09):** `node --test …/thumbnail.test.mjs` **5/5** (candidate order png→jpg→jpeg→svg; first existing wins; null when none). Live CDP probe: PS5 tile background = `url(.../library/platforms/ps5/thumb.jpg)`. HTTP: `thumb.jpg` **200**, `thumb.png`/`thumb.jpeg` **404**, `thumb.svg` **200**. Lighthouse Perf 100 / A11y 100 / CLS 0, **Best-Practices 96 with 1 console error** (the benign `thumb.png` 404 — see DEV-13).

**Known trade-off (DEV-13):** a multi-extension probe necessarily requests the absent extensions; the browser logs each `404` to the console, so this reintroduces a console entry and drops Best-Practices to 96. Setting `thumbnail` explicitly avoids the probe entirely.

### 4g. Runtime item discovery + 2nd platform (Switch) (2026-10-09)

**Change.** `itemFiles` was removed from `platform.json` (both `ps5` and `switch`). `data.js` now discovers item files at runtime by fetching the `items/` **directory listing** and extracting `.json` links (`listItemFiles`); a legacy `itemFiles` array (and inline `items`) is still honoured as a fallback. `validate-library.mjs` scans the `items/` folder on disk instead. `library.json.platforms` now lists `library/platforms/switch/platform.json`, so the **Switch** platform appears (its `items/` is currently empty).

**Verification (2026-10-09):** validator OK — **19 items, 2 platforms** (ps5 19, switch 0); unit tests pass; syntax 8/8. Live (Python `http.server`): `items/` listing HTTP 200; tiles **All platforms / PS5 / Switch**; All → `19 projects`, PS5 → `19 / 19`, Switch → `0 / 19` + "No projects match". Lighthouse Perf **98**, A11y 100, CLS 0, **BP 96**, 2 console errors (the benign `thumb.png` probes, DEV-13).

**Deployment risk (DEV-14).** Directory listings are not served by GitHub Pages, so runtime discovery yields **0 items** there. On such hosts, keep an explicit `itemFiles` array per platform (the loader fallback supports it).

**Note.** The featured rail is platform-independent (it shows `featured` items from any platform), so it still shows PS5 featured cards while the Switch platform is selected.

### 4h. Revert — itemFiles restored (2026-10-09)

Per user request, §4g's runtime directory-listing discovery was **reverted**: `itemFiles` is back in `platform.json` (ps5 + switch), `data.js` reads `platform.itemFiles` again, `validate-library.mjs` reads it again, and `library.json` no longer lists the `switch` platform (the folder and its `thumb.jpg`/`platform.json` remain on disk, unregistered). Module cache-bust back to `?v=9`. `platform.dir` (used by the thumbnail fallback) is retained. The thumbnail fallback convention (§4f) and its DEV-13 trade-off are unchanged.

**Verification:** greps — `listItemFiles`/`readdirSync` absent; `itemFiles` present in both platform files; no `switch` in `library.json`. Validator OK (**19 items, 1 platform**); syntax 8/8; unit tests pass. Live: tiles **All platforms / PS5**, `19 projects`. Lighthouse Perf 99, A11y 100, CLS 0, **BP 96** (DEV-13 thumb probe), 1 console error.

---

## 5. Open items, risks, decisions needed

| ID | Item | Impact | Owner / next step |
|---|---|---|---|
| DEV-1 | ~~Publish layout conflict (GitHub Pages "Deploy from a branch" allows only `/` or `/docs`).~~ **Resolved 2026-10-09:** added `.github/workflows/deploy-pages.yml`, which uploads `development/` as the Pages artifact via GitHub Actions. | — | On the repo: Settings → Pages → Source = **GitHub Actions**. |
| DEV-2 | **`items[].icon` is not in `development_plan/library.schema.json`** (`additionalProperties:false`). Added per user request + prototype. | Schema mismatch; strict ajv would fail | Planner to add `icon` to schema + data-model, or remove the field. |
| DEV-3 | All 19 items are `verified:false`; some repo URLs/owners are unconfirmed. | Accuracy/legal | Maintainer to verify against official sources (RISK-01). |
| DEV-4 | ~~`site.repo` is a placeholder (`your-user/…`).~~ **Resolved 2026-10-09:** set to `https://github.com/alonsojr1980/the-hb-compendium`; header/footer links verified live. | — | — |
| DEV-5 | No automated interaction/E2E tests; verification is headless DOM dumps + unit tests. **User chose manual interaction testing — no new dependency.** | Regression risk | Keep the manual QA checklist; add Playwright later only if approved. |
| DEV-6 | ~~Accessibility/performance budgets unmeasured.~~ **Resolved 2026-10-09:** Lighthouse A11y 100, Perf 100/99, CLS 0.016/0.012. | Quality | Residue tracked as DEV-10 (SEO). |
| DEV-10 | **Canonical is invalid** (`href="./"`, relative) and there is **no `robots.txt` / `sitemap.xml`**. All require the real public origin. | SEO / discoverability | Set an absolute canonical + generate robots/sitemap once a deploy URL exists. |
| DEV-11 | **Deploy prepared, not live.** Repo docs + Pages workflow (`.github/workflows/deploy-pages.yml`) + `upload.bat` added; the folder is still not a git repo (no remote/credentials here). Canonical/robots/sitemap still absent. | Blocks go-live | Create the GitHub repo, `git init` + remote (or run `upload.bat`), enable Pages → Source = GitHub Actions; then set an absolute `rel=canonical` + add `robots.txt`/`sitemap.xml`. |
| DEV-12 | **`development_plan/platform.schema.json` has `additionalProperties: false` and does not define `thumbnail` or `browseBG`**, both now used by `development/library/platforms/ps5/platform.json`. Strict ajv validation of the platform file would fail (same family as DEV-2 for `item.icon`). | Schema/data-contract mismatch | Planner to add `thumbnail`/`browseBG` to `platform.schema.json` and document the tile + browse-background behavior. |
| DEV-13 | **Thumbnail fallback probes `thumb.{png,jpg,jpeg,svg}` and logs a benign `404` console entry for each absent extension** (browser network log; `fetch` and `XHR` behave the same). Observed cost: Lighthouse Best-Practices 100 → **96** with 1 "error". | Quality (cosmetic) | Options: set `platform.thumbnail` explicitly (no probe); name the file with the first-listed extension (`.png`); or accept. See `resolveThumbnail` in `js/render.js`. |
| DEV-14 | ~~Runtime item discovery needs directory listings (GitHub Pages serves none).~~ **Withdrawn 2026-10-09 (§4h):** reverted — `itemFiles` restored, runtime discovery removed. | — | Not applicable. |
| DEV-15 | ~~`platform.schema.json` requires `itemFiles` (removed from data).~~ **Withdrawn 2026-10-09 (§4h):** `itemFiles` is present again; only `thumbnail`/`browseBG` remain schema extras (see DEV-12). | Schema | Fold into DEV-12. |
| DEV-16 | **`development_plan/item.schema.json` does not define `thumbnails`**; item files now use it. | Schema/data-contract mismatch | Planner to add `thumbnails` (array of image paths/URLs) to `item.schema.json`. |
| DEV-17 | **Hero LCP.** Since the banner became a CSS background (§ previous turn), `.hero__banner` is the LCP element. Under Lighthouse's **simulated** throttling LCP scores **~3.8s (Perf 80)** vs **~0.6s when it was an `<img>`**; real (unthrottled) LCP ≈ 192 ms. A `<link rel="preload" as="image">` was added (raises priority) but does not change Lighthouse's simulated value. | Performance metric | Keep the CSS background (accept the Lighthouse artifact) or revert the banner to an `<img>` for the higher score. |
| DEV-18 | **`development_plan/library.example.json` still uses the old wording** ("Unofficial community project" byline + the Sony/PlayStation disclaimer); planner-owned. | Doc consistency | Planner to update the example to the new byline + the platform-agnostic disclaimer. |
| DEV-7 | **Modular, platform-based data model deviates from the plan** (`development_plan/data-model.md` / `library.schema.json` describe a single `library.json` with inline `items[]`). Current shape: `library.json` manifest (`platforms[]`) → `library/platforms/<id>/platform.json` (`itemFiles[]`) → `items/<name>.json`; `schemaVersion` is now `2.0.0`. | Schema/doc mismatch | Planner to update the data model/schema to the platform layout (or document legacy shapes as supported). |
| DEV-8 | **Platform dimension is now surfaced in the UI (data-driven).** `renderToolbar` builds the filter chips from `state.library.platforms` (`All platforms` + one chip per platform, labeled `shortName || name || id`, ordered by `order`); filtering matches `item.platformId`; cards/detail show a `.badge--platform` from the platform definition. The old per-item device-variant `platform` array (`["PS5","PS5 Pro"]`) is **no longer rendered** (kept in the data files; may be re-surfaced later under a different label). | Resolved for the GUI; needs a 2nd platform to exercise multi-platform ordering | No action needed; re-verify when a 2nd platform is added. |
| DEV-9 | **GUI platform filter now deviates from the plan.** `DEVELOPMENT_PLAN.MD` (rev 1.1, planner-owned) + `development_plan/data-model.md` §5/§6 still describe the platform filter as the device variants (`PS5`/`PS5 Pro`) and list "platform UI" as unresolved (§12 U-6); they also keep `item.platform` as a UI-facing field. | Plan/schema/doc mismatch (same family as DEV-7) | **Planner** to update FR-05/FR-15 + §12 U-6 to the data-driven `library/platforms` model and decide whether `item.platform` remains a documented field (now GUI-unused). Do not edit plans from this stage. |

**Assumptions made (labeled):** (a) product lives under `development/` per this stage's boundary; (b) `?q/status/platform/sort/fw` shareable state retained from the prototype; (c) `items[].icon` included despite the schema gap (DEV-2).

---

## 6. Change / evidence ledger (append-only)

| Date | Request/decision | Changed paths | Evidence | Contract/migration notes |
|---|---|---|---|---|
| 2026-10-08 | "proceed with the development" | `development/` created: `index.html`, `styles.css`, `js/{main,data,state,filters,render,router,a11y,util}.js`, `library.json`, `assets/{banner.svg,banner.png,favicon.svg}`, `tests/validate-library.mjs`, `.nojekyll`, `README.md`; root `DEVELOPMENT_CURRENT_STATE.MD` | module syntax OK; data validation OK; headless home/fw/detail renders verified; screenshot reviewed | Product started under `development/` (not repo root). Assets (`banner.*`) and content (`library.json`) were **copied from the prototype** `mockup/`; the mockup was left untouched. `items[].icon` carried over — see DEV-2. |
| 2026-10-08 | "create a bat for running the built site: run_site.bat" | `development/run_site.bat`; `development/README.md` (run section + file table) | ran `run_site.bat 8191 nobrowser` headlessly: `/`, `/library.json`, `/styles.css`, `/js/main.js`, `/assets/banner.svg`, `/assets/favicon.svg` all **200**; port released after terminating the process tree | One-click Windows launcher (Python-based). Supports `run_site.bat [port] [nobrowser]`; served folder auto-detected so it works from `development\` or repo root. No app/contract change. |
| 2026-10-08 | "search bar must be placed at the top of the DIV browse and must also filter the quantity of items found" | `development/index.html` (moved `#search-form` from hero into `.browse`; added `#search-clear`), `development/styles.css` (`.searchbox--browse`, `.searchbox__clear`), `development/js/main.js` (`syncSearchField`, `focusSearch`; clear button; header pill + `/` scroll to search), `development/tests/inspect-dom.mjs` (new DOM test helper) | module syntax OK; base DOM: `search inside browse = true`, `search above topics = true`; `?q=switch` → resultline **"Showing 1 of 19 projects"**, live "1 projects shown"; screenshot reviewed | Search is now the first element of `#browse`; it filters the grid and updates the visible result count. Header search pill and `/` shortcut now scroll to and focus the moved field. No data-contract change. |
| 2026-10-08 | "refine the frontend" | `development/index.html` (hero CTA `#hero-cta` + hint `kbd`; `#search-count` badge in the search row), `development/styles.css` (`::selection`, `scroll-padding-top`, `#browse` scroll-margin, `.hero__actions/.hero__hint/kbd`, `.searchbox__count`, softer `.badge--unverified`, `.tagpill` hover), `development/js/render.js` (live count badge, resultline only while filtering, singular/plural announce, query-aware empty state), `development/js/main.js` (hero CTA scrolls to browse), `development/tests/inspect-dom.mjs` (reports resultline hidden + count) | headless: base → resultline **hidden**, count **"19 projects"**; `?q=switch` → resultline **"Showing 1 of 19 projects"**, count **"1 / 19"**, live **"1 project shown"**; `?q=zzzznope` → empty state visible, count **"0 / 19"**; module syntax OK; screenshots reviewed | Frontend-only changes; no API/data-contract change. Visual language preserved (same tokens/components). Count is now adjacent to search; the redundant default result line is removed. |
| 2026-10-08 | "modularize the file library.json: /items subfolder, one file per item" | `development/library.json` (now a manifest with `itemFiles`), `development/items/*.json` (19 new files), `development/tools/split-library.mjs` (migration), `development/js/data.js` (manifest + per-item fetch via `Promise.allSettled`), `development/tests/validate-library.mjs` (reads item files), `development/README.md` (content structure) | `split-library.mjs` → 19 files; validator: **OK, 19 items (19 itemFiles)**; HTTP: `/library.json`, `/items/ps5_retroarch.json`, `/items/etahen.json` all **200**; headless base → 23 cards, 18 img icons + 5 glyphs; deep-link `#/item/ps5-retroarch` → modal open | **Data-contract change** (DEV-7): `library.json` retains site/categories/redirects + `itemFiles`; items moved to `items/<id_with_underscores>.json` (bare item objects, matching the requested shape). Loader keeps inline `items` as a fallback. Filename convention documented. |
| 2026-10-08 | "update all the site to use the modularized items and fix this error [Could not load library.json / missing an items array]" | `development/index.html` (entry `js/main.js?v=2`), `development/js/{main,render,filters}.js` (versioned relative imports), `development/README.md` (module cache-busting note); `mockup/app.js` (modular `itemFiles` support + inline fallback), `mockup/smoke-check.mjs` (reads `itemFiles`) | **Root cause:** the running copy served a **stale `js/data.js`** (its old message was "missing an items array"); on-disk `development/js/data.js` already handled `itemFiles`. After adding versioned module URLs: headless `development/` → 23 cards, no error; `mockup/` → 23 cards, no error; `validate-library.mjs` OK (19 itemFiles); `smoke-check.mjs` OK (19) | Error string removed. Module graph now cache-busted (`?v=2`) so a stale module can't reproduce the failure. Mockup loader made format-agnostic (backward compatible; mockup content unchanged). **Bump `?v=N` on JS changes** — see README. |
| 2026-10-08 | "modularization updates: /library, /library/platforms, per-platform platform.json + items/" | `development/library/platforms/ps5/platform.json` (new), `development/library/platforms/ps5/items/*.json` (19 files moved), `development/library.json` (manifest `platforms[]`, schemaVersion **2.0.0**), `development/js/data.js` (resolves platforms→items, tags `platformId`), `development/tests/validate-library.mjs` (platform-aware), `development/tools/restructure-platforms.mjs` (migration), `development/index.html` + `js/*` (`?v=3`), `development/README.md` (content structure) | `restructure-platforms.mjs` → 19 items + platform.json; validator: **OK, schemaVersion 2.0.0, 19 items (1 platform)**; HTTP: `/library.json`, `/library/platforms/ps5/platform.json`, `.../items/etahen.json`, `.../items/ps5_retroarch.json` all **200**; headless base → 23 cards; `?q=switch` → count "1 / 19"; detail `#/item/ps5-retroarch` → modal open | **Data-contract change** (DEV-7): platform dimension added. `library.json` = `{schemaVersion, site, categories, redirects, platforms[]}`; `platform.json` = `{id, name, shortName, description, icon, order, itemFiles[]}`; items live under the platform's `items/`. Loader keeps flat `itemFiles` and inline `items` as fallbacks and sets `item.platformId`. Old `items/` folder removed. |
| 2026-10-08 | "the GUI must only use the platforms defined in the '/library/platforms/', including the GUI filters" | `development/js/render.js` (data-driven `platformDefs`/`platformLabel`/`platformBadge`; `renderToolbar` builds chips from `state.library.platforms`; card + detail use `.badge--platform`; removed hardcoded `PS5`/`PS5 Pro` array and `item.platform` rendering), `development/js/filters.js` (filter matches `item.platformId`; removed device-variant logic), `development/js/main.js` (boot resets invalid `?platform=` to `all`), `development/styles.css` (`.badge--platform` PlayStation-blue), `development/index.html` + all relative imports (`?v=3`→`?v=4`) | `node --check` 10/10 OK; validator OK (19, 1 platform); grep `PS5 Pro` → **none**, `?v=3` → **none**; base DOM chips `All platforms`+`PS5`, count "19 projects", 23 cards; `?platform=ps5` → "19 / 19"; `?platform=ps4` → reset to all (19); deep link → modal + `.badge--platform` PS5; `badge--platform` 23/24; screenshot reviewed | **Behavioral contract change:** the GUI platform dimension is now derived from `library/platforms/*` (filter + badge), keyed by `item.platformId`; the device-variant `item.platform` array is no longer rendered (data retained). Chip id = platform `id`; label = `shortName || name || id`, ordered by `order`; group hidden only if zero platforms. `?platform=<undefined>` is normalized to `all` on boot (requirement 6). **Plan deviation recorded in DEV-9** (plan FR-05/FR-15 + §12 U-6 still describe the device-variant filter). Task VERIFY bullet expected `?platform=ps4` → 0 items; that is incompatible with requirement 6's reset, so reset wins and is documented. |
| 2026-10-09 | "evaluate the site (15 aspects scored) + proceed with top 5 fixes" | `development/styles.css` (CLS reservations + glow px offset), `development/js/render.js` (card `aria-label` removed; `sr-only` compat note), `development/js/filters.js` (`matchesQuery` self-normalizes), `development/index.html` (`noscript`; `?v=4`→`?v=5`), `development/js/{main,render,filters}.js` (imports `?v=5`), `development/tests/util.test.mjs` + `filters.test.mjs` (**new**), `development/README.md`, this file | Lighthouse Perf **76/74 → 100/99**, CLS **0.932/0.857 → 0.016/0.012**, A11y 100 (axe `label-content-name-mismatch` fixed), Best-practices 100, Agentic browsing 52→100; validator OK; unit tests **20/20**; module syntax 8/8; headless base 23 cards, `?q=switch`→1/19, `?fw=14.00`→23 incompat, detail modal open | Fixes 1 (CLS), 5 (unit tests + aria) and the noscript half of 3 delivered. **Deferred by user decision:** deployment + canonical/robots/sitemap (DEV-10/DEV-11), Playwright E2E (DEV-5), icons/content (DEV-3). Module cache version now **5**. |
| 2026-10-09 | "change name to 'The Homebrew Compendium'; add console-like animations & transitions" | `development/library.json`, `development/index.html`, `development/assets/favicon.svg`, `development/run_site.bat`, `development/styles.css`, `development/js/render.js` (`?v=6`), `development/js/{main,filters}.js` (`?v=6`), `development/README.md`, this file | rename grep `PS5 Homebrew Compendium` in `development/` → **none**; syntax 8/8; unit tests **20/20**; validator **OK**; headless hero `The Homebrew Compendium`, stats **19/4/16**, 23 cards, 0 console errors; Lighthouse **Perf 100/99, A11y 100, BP 100, CLS 0.001/0.0**, LCP 0.8/2.1s; overflow probe 360–1440 px → `scrollWidth == clientWidth` | **Rebrand** to "The Homebrew Compendium". **Motion system:** hero/brand/card/modal entrances, card sheen + edge glow, pressed feedback, active-topic ring, stat count-up, with **render-signature guards** to stop re-animation on each keystroke; reduced-motion preserved; no CLS/perf/a11y regression (CLS improved to ~0). Module cache version now **6**. |
| 2026-10-09 | "make class 'rail' overflow = visible" | `development/styles.css` (`.rail`: `overflow-x: auto` → `overflow: visible`) | CDP probe: computed `.rail` overflow = **visible**; at 1440 all 4 featured cards fit (`railScrollWidth == railClientWidth`); at ≤1024 `railScrollWidth > railClientWidth` (needs scroll) → extra cards are clipped by `.hero { overflow: hidden }` and **cannot be reached** (no scrollbar); document overflow stays false at 360–1440 | **Behavior change:** featured rail no longer scrolls on narrow screens; card hover shadows/glow can now escape the rail. If horizontal scrolling must be kept below ~1280px, scope `overflow: visible` behind a `@media (min-width: 1281px)` and restore `overflow-x: auto` below. |
| 2026-10-09 | "platform filters above the search bar as tiles (background = thumbnail); add `thumbnail` + `browseBG` to platform.json; apply `browseBG` to #browse on selection" | `development/library/platforms/ps5/platform.json` (`thumbnail`, `browseBG`), `development/assets/platforms/ps5.svg` (**new**), `development/index.html` (`#platform-toggle` moved above `#search-form`, removed from toolbar), `development/js/render.js` (tile rendering + `applyBrowseBackground`; `?v=7`), `development/js/{main,filters}.js` (`?v=7`), `development/styles.css` (`.platforms`/`.platform-tile`), `development/README.md`, this file | CDP probe: tiles above the search, 2 tiles (`All`=gradient, `PS5`=`url(...ps5.svg)`), `aria-pressed` correct, `#browse` `browseBG` applied only for `?platform=ps5`; 23 cards; no doc overflow 390/1440; Lighthouse Perf 100/99, A11y 100, BP 100, CLS 0, 0 console errors; validator OK; tests 20/20; syntax 8/8 | Platform filter restructured to tiles above the search with thumbnail backgrounds + a per-platform `#browse` background. **Schema gap logged as DEV-12** (`platform.schema.json` `additionalProperties:false` lacks these fields). Module cache version now **7**. |
| 2026-10-09 | "move DIV `platform-toggle` outside DIV `browse`, on top of it" | `development/index.html` (`#platform-toggle` moved out of `#browse` to sit directly above it, still inside `<main>`), `development/styles.css` (`.platforms`: `max-width: var(--container)`, `margin: 0 auto`, side padding, `min-height: 104px`; tile `flex-basis` 140) | CDP probe: `insideBrowse:false`, parent `MAIN`, tiles above `#browse` (gap 24px), 2 tiles, 23 cards, no doc overflow 390/1440; Lighthouse desktop Perf 100, A11y 100, BP 100, CLS 0, 0 console errors; screenshot reviewed | Platform filter now outside/above `#browse`, aligned to the content container; `browseBG` colors only the browse section below the tiles. HTML/CSS only — no JS change (cache-bust stays **7**). |
| 2026-10-09 | "`#platform-toggle` overflow:visible; `.platform-tile` max-width:200px; `.platforms` justify-content:center" | `development/styles.css` (`.platforms` + `.platform-tile`) | CDP computed styles: `#platform-toggle` `overflow=visible`, `justify-content=center`; `.platform-tile` `max-width=200px` (rendered widths 200/200 at 1440, 165/165 at 390); no doc overflow; 23 cards; Lighthouse desktop Perf 100, A11y 100, BP 100, CLS 0, 0 console errors; screenshot reviewed | Platform tiles centered and capped at 200px; container overflow visible. CSS only (cache-bust stays **7**). |
| 2026-10-09 | '"Clear filters" must not remove the platform filter' | `development/js/main.js` (`clearFilters` no longer resets `platform`), `development/js/render.js` (`#clear-filters` visibility drops the `platform` condition), `development/js/{main,render,filters}.js` + `development/index.html` (`?v=7`→`?v=8`) | CDP: `?platform=ps5&status=stable` (13 cards, button visible) → click Clear → URL **`?platform=ps5`**, 23 cards, PS5 tile still `aria-pressed`, button hidden; `?platform=ps5` alone → button hidden; no filters → hidden. Syntax 8/8; tests 20/20; validator OK; Lighthouse desktop Perf 100 / A11y 100 / BP 100 / CLS 0 / 0 console errors | "Clear filters" now preserves the platform selection; the button is hidden when only a platform is set (avoids a no-op). Module cache version now **8**. |
| 2026-10-09 | "if `thumbnail` not defined/empty, use `/library/platforms/[platform]/thumb.[png\|jpg\|jpeg\|svg]`" | `development/js/data.js` (attach `platform.dir`), `development/js/render.js` (`resolveThumbnail`/`thumbCandidates`, tile fallback; `?v=9`), `development/js/{main,filters}.js` (`?v=9`), `development/library/platforms/ps5/platform.json` (`thumbnail: ""`), `development/tests/thumbnail.test.mjs` (**new**), `development/README.md`, this file | unit tests **25/25** (incl. 5 thumbnail); syntax 8/8; validator OK; live CDP: PS5 tile bg = `library/platforms/ps5/thumb.jpg`; HTTP thumb.jpg 200 / thumb.png 404; Lighthouse Perf 100, A11y 100, CLS 0, **BP 96 + 1 console error** (benign 404 probe) | Thumbnail fallback convention implemented; `ps5.thumbnail` emptied to exercise it. **DEV-13** records the benign-404 / Best-Practices trade-off. Module cache version now **9**. |
| 2026-10-09 | "manually added `/library/platforms/switch`; remove `itemFiles` from `platform.json` — populate at runtime from `items/`" | `development/library.json` (register switch), `development/library/platforms/{ps5,switch}/platform.json` (drop `itemFiles`), `development/js/data.js` (`listItemFiles` runtime discovery + legacy fallback; `?v=10`), `development/js/{main,render,filters}.js` (`?v=10`), `development/tests/validate-library.mjs` (scan `items/` on disk), `development/README.md`, this file | validator OK (**19 items, 2 platforms**); unit tests pass; syntax 8/8; live: `items/` listing 200, tiles **All/PS5/Switch**, All `19 projects`, PS5 `19 / 19`, Switch `0 / 19` + empty panel; Lighthouse Perf 98, A11y 100, CLS 0, BP 96, 2 console errors (benign thumb probes) | Runtime directory-listing discovery replaces `itemFiles`; Switch registered. **DEV-14** (GitHub Pages has no directory listings → 0 items there) and **DEV-13** (benign thumb 404s) apply. Module cache version now **10**. |
| 2026-10-09 | "revert changes and keep `itemFiles` in `platform.json` for now" | `development/js/data.js` (back to `platform.itemFiles`), `development/tests/validate-library.mjs` (back to `itemFiles`), `development/library/platforms/{ps5,switch}/platform.json` (restore `itemFiles`), `development/library.json` (unregister switch), `development/js/{main,render,filters}.js` + `development/index.html` (`?v=10`→`?v=9`), `development/README.md`, this file | validator OK (19 items, 1 platform); syntax 8/8; tests pass; greps clean (`listItemFiles`/`readdirSync` gone, `itemFiles` present, no `switch` in `library.json`); live tiles **All/PS5**, 19 projects; Lighthouse Perf 99, A11y 100, CLS 0, BP 96, 1 console error | Reverted §4g runtime item discovery; `itemFiles`-based loading restored; the `switch` folder remains on disk but is **unregistered**. DEV-14/DEV-15 **withdrawn**; DEV-12/DEV-13 remain. Module cache version back to **9**. |
| 2026-10-09 | "remove contributors from the hero; add a `thumbnails` array to item.json and show them vertically beside the detail body with a top-to-bottom fade-in" | `development/js/render.js` (hero stats 3→2; `renderDetail` thumbnail column; `?v=10`), `development/styles.css` (`.detail__layout`/`.detail__thumbs`/`.detail__thumb` + `fade-in` keyframe; ≤720px responsive), `development/index.html` (banner `<link rel="preload">`), `development/library/platforms/ps5/items/ps5_retroarch.json` (`thumbnails`), `development/assets/items/ps5-retroarch/0{1,2,3}.svg` (**new placeholders**), `development/README.md`, this file | syntax 8/8; tests pass; validator OK; live hero stats `["Projects","Topics"]`; detail modal shows **3 thumbnails** (`--i` 0/1/2, images loaded, left column, `thumbsFirst`); `thumb01.svg` HTTP 200; screenshot reviewed; Lighthouse A11y 100, CLS 0, BP 96, **Perf 80 / LCP 3.8s** (DEV-17) | Both features delivered; `thumbnails` shown vertically beside the detail with staggered fade-in. `item.schema.json` lacks `thumbnails` (**DEV-16**). Module cache version now **10**. |
| 2026-10-09 | "move the thumbnails to the right of the detail body, outside of it; animate the thumbnails display" | `development/js/render.js` (layout children reordered: content then thumbs; `?v=11`), `development/styles.css` (`.detail__layout` columns `minmax(0,1fr) 148px`; `.detail__thumb` now `slide-in-right`; `fade-in` keyframe replaced by `slide-in-right`), `development/README.md`, this file | CDP: `.detail__layout` children `[detail__content, detail__thumbs]`; `thumbsRightOfBody:true`; 3 thumbs, `animation-name: slide-in-right`, `--i` 0/1/2, images loaded; screenshot reviewed; syntax 8/8; tests pass; validator OK; `?v=11` | Thumbnails now sit **to the right of the detail body, outside `.detail__content`**, with a staggered slide-in display animation. Module cache version now **11**. |
| 2026-10-09 | "clicking a thumbnail shows an image gallery with those thumbnails, positioned at the selected thumbnail" | `development/index.html` (gallery overlay markup), `development/styles.css` (`.gallery*` styles; `fade-in`/`gallery-in` keyframes; `.detail__thumb-btn`), `development/js/render.js` (thumbnails are buttons calling `openGallery`; `?v=12`), `development/js/main.js` (`openGallery`/`renderGalleryView`/`galleryStep`/`closeGallery`; arrow-key + Esc handling; `?v=12`), `development/js/filters.js` (`?v=12`), `development/README.md`, this file | CDP: 3 thumbnails; click 2nd → gallery opens at `02.svg`, caption "2 / 3", figure focused; Next → `03.svg` "3 / 3"; Escape → gallery closed, detail still open; screenshot reviewed; syntax 8/8; tests pass; validator OK; `?v=12` | Full-screen image gallery opened from a detail thumbnail at the selected index; prev/next (buttons + ArrowLeft/Right), `Esc` to close, focus trapped + restored. Module cache version now **12**. |
| 2026-10-09 | "prepare for GitHub: root README.MD contributor guide, repo name/address, serve `/development` as a Pages site, and an `upload.bat`" | **root** `README.MD` (**new**), `.github/workflows/deploy-pages.yml` (**new**), `upload.bat` (**new**), `development/library.json` (`site.repo` → real URL) | root files present (README.MD 5989 B, upload.bat 1653 B, workflow); `library.json` parses; validator OK; live `#source-link` and `#footer-repo` = `https://github.com/alonsojr1980/the-hb-compendium` | GitHub Pages now publishes **`/development`** via GitHub Actions (DEV-1 resolved); `site.repo` is real (DEV-4 resolved). Remaining user steps: create the repo + enable Pages (Source = GitHub Actions) (DEV-11). |
| 2026-10-09 | "change 'Unofficial community project' → 'A project by ALONSOJR1980' (linked to the profile)" | `development/library.json` (`site.disclaimer` trimmed; new `site.author`), `development/index.html` (footer `#footer-author`), `development/js/render.js` (byline built from DOM nodes; `?v=13`), `development/js/{main,filters}.js` (`?v=13`), `development/styles.css` (`.footer__author`), `development/README.md`, root `README.MD`, `mockup/library.json` | live: `#footer-author` = "A project by ALONSOJR1980" → `https://github.com/alonsojr1980` (`target=_blank`, `rel=noopener noreferrer`); disclaimer now starts "For lawful homebrew…"; `library.json` valid; validator OK; syntax 8/8; `?v=13` | Byline added as a separate DOM-built footer line (disclaimer stays `textContent` — no `innerHTML` of data). `development_plan/library.example.json` keeps the old phrase (planner-owned, **DEV-18**). Module cache version now **13**. |
| 2026-10-09 | "generalize the disclaimer — it's a general platform compendium, not just PlayStation (remove Sony/PlayStation/PS5)" | `development/library.json` (disclaimer + tagline + description + emulators category), `development/index.html` (meta description, og:description, firmware `aria-label`; `?v=14`), `development/js/render.js` (tagline fallback; `?v=14`), `development/js/{main,filters}.js` (`?v=14`), `development/README.md`, `mockup/library.json` (disclaimer) | `library.json` valid; validator OK; syntax 8/8; live: tagline + meta description generalized, footer disclaimer contains no "Sony" and ends "…property of their respective owners and are used for identification purposes only.", firmware `aria-label="Your console firmware version"`; `?v=14` | Disclaimer and site-wide copy are now platform-agnostic ("any console manufacturer or game publisher"). `development_plan/library.example.json` (planner) and the PS5-only `mockup/` data are unchanged (DEV-18). Module cache version now **14**. |
| 2026-10-09 | "move the hero background from inline to the CSS file, into `.hero__banner`" | `development/index.html` (`<img class="hero__banner" src=…>` → decorative `<div class="hero__banner" aria-hidden="true">`), `development/styles.css` (`.hero__banner` uses `background-image: url('assets/banner.svg')` + `background-size/position` instead of `<img>` `object-fit/object-position`) | CDP: `.hero__banner` is a `DIV` with computed `background-image: url(.../assets/banner.svg)`, `cover`, `100% 50%`; `banner.svg` HTTP 200; screenshot reviewed; Lighthouse Perf 99, A11y 100, CLS 0, BP 96, 1 console error (DEV-13) | Hero background moved from the inline `<img src>` to CSS. HTML/CSS only — no JS change (cache-bust stays **9**). |

---

## 7. For the next model

- **Authoritative paths:** product = `development/`; data = `development/library.json` → `library/platforms/ps5/platform.json` → `items/*.json`. The plan and `mockup/` are read-only to this stage.
- **Commands:** `node development/tests/validate-library.mjs`; `node --test development/tests/util.test.mjs development/tests/filters.test.mjs`; serve with `development/run_site.bat` or `python -m http.server 8080 --bind 127.0.0.1` from `development/`.
- **Non-regression invariants:** no `innerHTML` of data; https-only external links with `rel="noopener noreferrer"`; module imports carry `?v=14` (bump on any JS change); zero runtime dependencies; all motion uses transform/opacity and collapses under `prefers-reduced-motion`; `platform.itemFiles` is the item source (no runtime directory listing).
- **Measured quality (2026-10-09):** Rebrand + console-like motion + platform tiles + detail thumbnails. Lighthouse A11y 100, SEO 92, CLS 0, Best-Practices 96 (DEV-13 thumb probe), **Perf 80 / LCP 3.8s** (DEV-17: CSS-background hero banner is the LCP under Lighthouse's simulation; real LCP ≈192 ms). No horizontal overflow at 360–1440 px. Baseline: 19 items all `verified:false`.
- **Highest-leverage next task:** create the GitHub repo (`the-hb-compendium`) and enable **Pages → Source = GitHub Actions** so `.github/workflows/deploy-pages.yml` publishes `/development`; then set an absolute `rel=canonical` and add `robots.txt`/`sitemap.xml` for `https://alonsojr1980.github.io/the-hb-compendium/` (DEV-10/DEV-11). Secondary: replace the 14 GitHub-avatar stand-in icons (DEV-3).
