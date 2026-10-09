# DEVELOPMENT_MOCKUP_PROGRESS

**Prototype:** PS5 Homebrew Compendium — static, JSON-driven compendium on GitHub Pages.
**Stage:** SDLC Mockup (throwaway prototype for validation).
**Date:** 2026-10-08
**Source:** `DEVELOPMENT_PLAN.MD` rev 1.0 (2026-10-08) + `development_plan/*` (data model, schema, design system, acceptance) + user brief ("extremely beautiful, Prospero/PS5-like, topics, update via `library.json`").
**Prototype path:** `mockup/` — **simulated data, not production.**

---

## 1. Hypothesis & purpose

**Hypothesis:** A zero-build, `library.json`-driven single-page site can convincingly deliver the PS5 ("Prospero") system-UI aesthetic while supporting category browsing, search/filter, firmware-aware compatibility, deep-linkable detail views, and graceful degraded states — and a maintainer can change content by editing JSON alone.

**What the prototype is meant to validate**
- The visual language reads as "PS5 dashboard" (dark cinematic, PlayStation Blue, cards, motion).
- The interaction model (topics → filter → card → detail modal) is coherent and responsive.
- The `library.json` contract from `development_plan/data-model.md` is practical and sufficient.
- The firmware-compatibility UX (FR-10 / UC-03) behaves sensibly (including incompatible items).
- Deep links and cold loads work on a static host (FR-07 / UC-05).

**Target users:** newcomers browsing for emulators/tools, and a maintainer curating entries.

**Not validated here:** real production logic, authentication, persistence, security hardening, real content accuracy.

---

## 2. Simulated vs observed vs undecided

| Category | Detail |
|---|---|
| **Simulated** | All content in `mockup/library.json` (19 projects) is illustrative: versions, dates, authors, firmware ranges and some repository URLs are unverified. Card art is generated CSS gradients (no real artwork, deliberately, per DEC-007). A visible striped **MOCKUP** banner marks the data. |
| **Real / observed** | The rendering, routing, filtering, compatibility computation, and degraded-state handling are executed by the prototype and were verified (see §4/§5). |
| **Undecided** | Publish root (`plan §12 U-1`), icon/screenshot sourcing (`U-3`), whether to keep per-item "Unverified" badges, whether `?fw=` becomes a real shareable feature, and final content accuracy workflow. |

---

## 3. Scenario table

`prototype path` = how to reach it in `mockup/`. Confidence: High = directly observed in a headless render; Med = logic present, not automated; Low = not yet exercised.

| ID | Entry / steps / expected result | Prototype path | Observed outcome | Confidence / next test |
|---|---|---|---|---|
| M-01 | Serve `mockup/`; shell loads with all assets 200. | `python -m http.server` → `/mockup/` | index/library/styles/app all HTTP 200 | High |
| M-02 | Load page → JSON parses, 4 categories, items render. | `smoke-check.mjs` | 19 items, 4 categories, 4 featured; OK | High |
| M-03 | Home renders topic tabs, featured rail, card grid, stats. | `/mockup/` | 23 cards (19 grid + 4 featured), 5 topic buttons, stats "19 projects · 4 topics · 16 contributors" | High |
| M-04 | Topic tabs reflect categories + counts. | `/mockup/` | All 19, Emulators 8, Jailbreaks 2, Tools 6, Apps 3 | High |
| M-05 | Category routing filters grid. | `#/category/emulators` | Logic present; nav generated. | Med — automate click |
| M-06 | Search matches name/summary/tags/author. | type in search (`/` focuses) | Logic present (debounced). | Med — needs input simulation |
| M-07 | Status/platform filters + sort + clear. | toolbar | Controls render; state logic present. | Med |
| M-08 | Firmware `13.60` → all compatible. | `?fw=13.60` | 0 incompatible cards | High |
| M-09 | Firmware `14.00` → all incompatible + dimmed/warned. | `?fw=14.00` | 23 incompatible cards | High |
| M-10 | Firmware `6.00` → only WebKit Autoloader (min 1.00) compatible. | `?fw=6.00` | 22 incompatible (23−1) | High |
| M-11 | Cold deep-link opens detail overlay. | `#/item/ps5-retroarch` | modal open, 3 detail sections, warnings block present, grid also rendered | High |
| M-12 | Detail shows badges, description, warnings, requires links, links, metadata. | `#/item/ps5-retroarch` | All render (see screenshot evidence) | High |
| M-13 | Unknown deep link → graceful "not found". | `#/item/nope` | Toast branch implemented. | Low — verify |
| M-14 | Malformed JSON → friendly error + Retry. | serve broken JSON | Error state function exists. | Low — needs fixture |
| M-15 | Fetch failure → cached copy + notice. | offline after first load | sessionStorage fallback implemented. | Low — needs test |
| M-16 | Responsive 360/768/1440, keyboard focus trap, reduced motion. | resize/keyboard | CSS breakpoints + focus trap + reduced-motion CSS present. | Low — not automated |
| M-17 | Maintainer edits `library.json` → change is live without rebuild. | edit + reload | Confirmed by design (runtime fetch); not re-run end-to-end | Med |

**Incomplete scenarios:** M-13–M-16 need scripted interactions/fixtures; M-05/M-06/M-07 need Playwright input simulation. *(Superseded by the Round 2 update in §7 — M-06/M-07/M-08/M-09/M-10/M-12/M-13/M-14 are now verified via URL-driven headless runs; M-16 remains partially unverified.)*

---

## 4. Architecture & hand-authored files

**Entry point:** `mockup/index.html` → `styles.css` + `app.js` (ES module) → fetches `mockup/library.json`.

Runtime flow: `boot()` reads optional `?fw=` → `loadLibrary()` (fetch `library.json?v=<ts>`, defensive `validate()`, `sessionStorage` last-good fallback) → `render()` (chrome, nav, topics, featured, toolbar, grid) → hash router (`#/`, `#/category/:id`, `#/item/:id`) → `openDetail()` builds the modal with a focus trap. All data-derived text uses `textContent`/DOM construction; external links require `https:` and carry `rel="noopener noreferrer"`.

| File | Role |
|---|---|
| `mockup/index.html` | App shell, inline SVG icon sprite, mockup banner |
| `mockup/styles.css` | Design tokens + all components (PS5-inspired) |
| `mockup/app.js` | Fetch/validate, state, routing, filtering, compatibility, render, detail, focus trap |
| `mockup/library.json` | Simulated content (schema-shaped, 19 items) |
| `mockup/smoke-check.mjs` | Dependency-free structural data validation |
| `mockup/check-dom.mjs` | Summarizes a headless-dumped DOM (verification helper) |
| `mockup/README.md` | Run + try-this instructions |

No frameworks, no CDN, no build step. No files outside `mockup/` were changed by this stage.

---

## 5. Run / verify commands and actual results

```bash
# preview (from repo root)
python -m http.server 8080        # → http://127.0.0.1:8080/mockup/

# data smoke check
node mockup/smoke-check.mjs
# → categories: 4 (emulators, jailbreaks, tools, apps); items: 19; featured: 4; OK.

# headless render + DOM summary (Windows example)
# chrome --headless=new --virtual-time-budget=7000 --dump-dom <url> > dom.html
node mockup/check-dom.mjs dom.html
```

**Verification actually performed (2026-10-08):**
- `smoke-check.mjs`: **OK** (19 items, 4 categories, 4 featured, no duplicate ids, all categories/requires resolve).
- HTTP asset check: `/mockup/`, `library.json`, `styles.css`, `app.js`, `smoke-check.mjs` → **200**.
- Headless Chrome render (home): **23 cards**, **5 topics**, **4 featured**, error state hidden, result line "19 projects across 4 topics".
- Compatibility sweep: `fw=13.60` → **0** incompatible; `fw=14.00` → **23** incompatible; `fw=6.00` → **22** incompatible (WebKit Autoloader correctly still compatible).
- Cold deep-link `#/item/ps5-retroarch`: **modal open**, 3 detail sections, warnings block, grid rendered.
- Screenshots reviewed: home (full page, 1440×2600) and detail overlay (1280×1200).

**Bug found and fixed during verification:** a cold `#/item/:id` load skipped the main render because loading skeletons were counted as grid children; deep-linking now calls `render()` before opening the detail.

---

## 6. Feedback, discoveries, gaps, recommendations

**User feedback:** none yet — awaiting review. Nothing in this prototype has been changed by user feedback at this time.

**Discoveries (validated):**
- The `library.json` contract is sufficient to render the full grid, filters, compatibility, and detail without code changes.
- The firmware comparison (`major*1000+minor`) cleanly handles inclusive ranges and "unknown".
- Generated gradient card art is an effective stand-in that avoids asset licensing (DEC-007).

**Known gaps / defects:**
- `announce()` sets a `data-live` attribute rather than updating a live region; the visible result line already has `aria-live`, so count changes are announced, but the helper is inert. Clean up or repurpose.
- No automated accessibility audit (axe/Lighthouse) yet; focus trap, contrast, and reduced-motion are implemented but unverified by tooling.
- Error/degraded states (M-13–M-15) implemented but not exercised with fixtures.
- `?fw=` is currently a mockup convenience; not in the frozen plan.

**Constraints:**
- Must run over HTTP (file:// blocks `fetch`).
- Simulated data only; no real content accuracy or licensing claims.
- The prototype authenticates nothing and persists only `localStorage`/`sessionStorage`.

**Recommended product decisions (proposed, not approved):**
1. Adopt the validated PS5 visual direction (tokens in `development_plan/design-system.md`).
2. Resolve `plan §12 U-1` (publish root) before implementation.
3. Approve a content-verification workflow (RISK-01) and decide on the per-item "Unverified" badge.
4. Promote `?fw=` to a documented shareable compatibility state (nice UX; already works).
5. Agree icon/screenshot sourcing (`U-3`) before shipping real art.

**Separations:** every validated finding above is *discovery*; items in "Recommended product decisions" are **proposed and await user/planner approval**. No approved target was silently rewritten.

**Next test (if continued):** add Playwright specs for search/filter/sort, unknown-id and malformed-JSON states, and run an axe + Lighthouse pass against `mockup/`.

---

## 7. Round 2 update — 2026-10-08 (later same day)

**Trigger:** user re-issued "proceed with the mockup"; work continued to close the verification gaps and defects listed in §6.

**Changes made to the prototype**
1. **Shareable/testable state via query params** — `q`, `status`, `platform`, `sort`, `fw`, `data`. `syncUrl()` reflects state in the address bar (`history.replaceState`) and `boot()` reads it. This both improves the mockup and is proposed as a real feature (deep links / reproducible views).
2. **Demo data sources** — whitelisted `DATA_SOURCES` map (`default`→`library.json`, `empty`, `malformed`). New fixtures: `fixtures/library.empty.json`, `fixtures/library.malformed.json`. Demo failures intentionally bypass the session cache so the state is visible; a toast labels the demo source.
3. **Fixed the inert live region** — replaced the no-op `announce()` (which only set a `data-live` attribute) with a real visually-hidden `#live` `role="status"` region; removed the duplicate `aria-live` from the visible result line to avoid double announcements.
4. **Empty vs no-match states separated** — a genuinely empty library shows "This library is empty"; a filtered-out result shows "No projects match" + Clear filters.
5. **`?debug=1` overflow diagnostic** — appends a `#debug-overflow` element and the document title with `scrollWidth/clientWidth` and any offending elements. Prototype-only.

**Round 2 verification (all headless Chrome / `check-dom.mjs`):**
| Scenario | URL | Observed |
|---|---|---|
| Base | `` | 23 cards (19 grid + 4 featured), 5 topics, live "19 projects shown" |
| Search | `?q=switch` | 5 cards total, live "1 projects shown" |
| Filter | `?status=alpha` | 6 cards total, live "2 projects shown" |
| Sort | `?sort=name` | grid first = `BF Player \| etaHEN \| JT Play` (alphabetical) |
| Curated order | default | grid first = `etaHEN \| JT Play \| PS5 RetroArch` (by `order`) |
| Empty | `?data=empty` | 0 cards, grid hidden, "This library is empty" |
| Error | `?data=malformed` | 0 cards, "Could not load fixtures/library.malformed.json" |
| Unknown deep link | `#/item/does-not-exist` | toast "Project \"does-not-exist\" not found.", modal closed, grid intact |
| Compatibility | `?fw=13.60` / `14.00` / `6.00` | 0 / 23 / 22 incompatible (unchanged, still correct) |
| Overflow | `?debug=1` at 485/737/1249 px | `scrollW == clientW` at all three → no horizontal overflow |

**Updated scenario confidence:** M-05, M-06, M-07, M-13, M-14 now **High** (URL-driven headless). M-15 (cache fallback) still **Low**. M-16 (responsive/keyboard) still **Low/partial** — see limitation below. M-11/M-12 remain **High**.

**Newly observed limitation:** Chrome headless clamps the minimum window width (~485 CSS px at `--window-size=390`), so the plan's **360 px** target (NFR-D1) could not be measured directly; the 480 px breakpoint and 1-column layout were confirmed visually via a 390 px screenshot. A real device/Playwright device-emulation pass is still owed.

**Remaining gaps (unchanged):** no axe/Lighthouse audit; no automated keyboard/focus-trap test; cache-fallback path not exercised; content remains unverified simulated data.

**New recommendation (proposed):** promote the query-param state (`q`, `status`, `platform`, `sort`, `fw`) to documented, supported deep-link behavior in the plan (currently `#/search?q=` is only a MAY in `DEVELOPMENT_PLAN.MD`).

**Launcher added (`mockup/run_mockup.bat`):** one-click Windows launcher that detects Python, serves the `mockup/` folder, binds to `127.0.0.1`, and opens the browser. Supports `run_mockup.bat [port] [nobrowser]` and works from either `mockup\` or the repo root (it locates `index.html`). **Verified headlessly:** `run_mockup.bat 8091 nobrowser` served `/`, `/library.json`, `/styles.css`, `/app.js`, `/fixtures/library.empty.json` → all **200**, and the port was released after terminating the process tree. Placed under `mockup/` because the mockup stage may only write within `mockup/`.

---

## 8. Round 2b update — 2026-10-08 (item icons)

**Trigger:** user request — "use the original icons for each homebrew. Use the `icon` field, which can contain a single word (as it is now) or a url."

**Change:** items now support a top-level **`icon`** field that is either a built-in icon word (`gamepad`, `unlock`, `tool`, `app`, …) or an image URL/path. `renderItemIcon()` renders URL icons as `<img class="item-icon">` and word icons as the inline SVG sprite; on image `error` it falls back to the item's category icon, and unknown/omitted words also fall back to the category icon. Wired into both the card art and the detail banner.

**Data:** populated `icon` for all 19 items — **14 URLs + 5 words**.
- URL icons are `https://github.com/<owner>.png?size=200`, chosen because they were **HTTP-verified to return `200 image/*`** for every owner used. (GitHub OpenGraph image URLs were rejected: they rate-limited with `429`.)
- `JohnTorl` has no GitHub avatar (`404`), so `jt-play`/`bf-player` use the word `app`; community-authored items (`zftpd`, `pkgsvc`, `web-file-manager`) use `tool`/`app`.

**Bug fixed:** the SVG glyphs previously lacked the `.icon` class, so they rendered as filled **black** shapes (visible in earlier screenshots). They now use `icon card__glyph` / `icon detail__glyph` and render as white outlined icons.

**Verified (headless Chrome / `check-dom.mjs`, `?sort=name`):** 23 cards; **18 `<img>` item icons** and **5 SVG glyphs** (14 URL items + 4 featured URL items = 18; 5 word items = 5), sample src `https://github.com/mihawk-99.png?size=200`; no render error. Screenshot reviewed — avatars display as rounded tiles, named glyphs render white. `smoke-check.mjs` OK; `node --check app.js` OK.

**⚠ Proposed plan/schema change (NOT applied here):** `development_plan/library.schema.json` currently defines items with `additionalProperties: false` and **no top-level `icon`** field (only `media.icon`). Adding `icon` to items is therefore a schema/data-model change that belongs to the plan owner. The mockup's `smoke-check.mjs` does not enforce `additionalProperties`, so it passes; but a strict ajv validation against the current plan schema **would fail**. Recommend the planner add `icon` (type string; word or URL) to the item schema and `data-model.md`.

**Licensing caveat (unchanged boundary, DEC-007):** the URL icons point at **developer avatars as stand-ins**, not the homebrew projects' own icons. For a real release, use each project's own icon only with permission and hotlink/link appropriately.

---

## 9. Round 2c update — 2026-10-08 (site header)

**Trigger:** user request — "create a beautiful header for the site."

**Interpretation:** redesign the **top navigation bar** (the site header), since the hero already acts as the masthead.

**Change (`index.html` + `styles.css` + `app.js`):**
- **Brand:** larger gradient/glowing angular mark (radial glow on hover), wordmark + a `COMPENDIUM` micro-label in PlayStation blue.
- **Nav:** links with an animated glowing underline; the active topic is now marked with `aria-current="page"` (previously not set), driven by the current route.
- **Search pill** (`#search-focus`): labelled `Search` + `/` keyboard hint; focuses the hero search.
- **Firmware chip** (`#fw-chip`): appears only when a valid firmware is set, shows `FW <version>` with a status dot; clicking focuses the firmware field.
- **Source link** (`#source-link`): GitHub mark, shown only when `site.repo` is a valid https URL.
- **Animated accent line** along the bottom edge (sheen gradient), plus a **scroll state** (`.is-scrolled`) that deepens the shadow/blur.
- **Mobile menu:** nav collapses to a hamburger at ≤1080px that toggles a dropdown (`#mobilemenu`), with click-outside and Esc to close; the chip/ghost icons simplify at ≤760px.

**Bug found and fixed:** the `hidden` attribute was being overridden by explicit `display` rules on `.fwware` / `.ghosticon`, so the firmware chip rendered even with no firmware set (visible in the first mobile screenshot). Added a global `[hidden] { display: none !important; }` rule.

**Verified (headless Chrome):**
- `scrollW == clientW` at 1409 / 1169 / 869 / 485 px → **no horizontal overflow**; `.mock-banner` content also fits (its apparent clipping in screenshots was an image-display artifact, not a layout bug).
- Firmware chip: hidden with no firmware (`m-default`), visible with `?fw=13.60` (`d-fw`, `m-fw`); chip text = `FW 13.60`.
- Mobile menu contains the full topic list; header screenshots (desktop 1440, desktop+fw, mobile 390) reviewed — the phantom chip is gone and the hamburger shows.
- `node --check app.js` OK.

**Not verified:** actual pointing/clicking of the mobile menu toggle and hover states (no input-simulation tooling); visual-only.

---

## 10. Round 2d update — 2026-10-08 (site banner image)

**Trigger:** user request — "create a beautiful banner image for the site."

**Deliverable:** `mockup/assets/banner.svg` — a hand-authored, dependency-free 1600×600 SVG banner (dark cinematic gradient, cyan/blue radial glows, sweeping light streaks, a custom angular emblem matching the header mark, orbital rings, particles, dot grid, horizon accent, vignette). Also `mockup/assets/banner.png` (1600×600) rasterized from the SVG via headless Chrome.

**Wired in:** the hero now renders `<img class="hero__banner" src="assets/banner.svg">` as a full-bleed background (`object-fit: cover`, right-aligned), with a CSS scrim (`.hero::after` → dark on the left, transparent on the right) so hero copy stays readable; `.hero__inner` is raised above the scrim.

**Design notes:** the emblem is a **custom angular mark**, not a Sony/PlayStation trademark, consistent with DEC-007; the left third is intentionally dark so the title/search overlay reads cleanly.

**Verified:** site screenshot (1440×900) shows the banner behind the header/hero with legible text; standalone banner render (1600×600) reviewed — no margins, correct composition. Both assets present (`banner.svg` 6.4 KB, `banner.png` ~478 KB). No JS changes, so no syntax/render regression.

**Alternative considered:** a fully abstract banner with no emblem (avoids any resemblance to PlayStation marks) — kept the emblem because it ties to the header brand; trivial to remove if preferred.

---

## 11. Update — 2026-10-08 (modular library support)

**Trigger:** the product moved to a modular `library.json` (manifest with `itemFiles` + one file per item). The prototype loader still required an inline `items` array and surfaced the error `library.json is missing an items array`.

**Change to `mockup/app.js`:** `loadLibrary()` now resolves, in order of precedence, a **platform-based** manifest (`platforms[]` → each `platform.json` → its `items/*.json`), then flat `itemFiles`, then inline `items`; validation runs after assembly. The validator message now reads `library.json has no items (missing "items" or "itemFiles")`. `mockup/smoke-check.mjs` gained the same `itemFiles` support.

**Scope:** the mockup's own content (`mockup/library.json`) is unchanged (still inline); the loader is now format-agnostic so the prototype no longer errors on a modular or platform-based manifest.

**Verified:** headless `mockup/` → 23 cards, no error state; `smoke-check.mjs` OK (19 items).




