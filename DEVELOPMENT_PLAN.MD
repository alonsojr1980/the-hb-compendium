# PS5 Homebrew Compendium — Development Plan

**Status:** as-built under `development/`; **not deployed** (publish layout is the only blocker — §12 U-1). Local data/render/search/filter/detail paths are verified (see `DEVELOPMENT_CURRENT_STATE.MD`, DEV-1…DEV-9; DEV-8/DEV-9 are reconciled by this revision).
**Plan revision:** 1.2 — 2026-10-08
**Planner-owned documents:** this file and everything under `development_plan/`.
**Baseline:** greenfield at rev 1.0 (empty repo). The product is now implemented as a zero-build static site at `development/` (product) with prototype evidence at `mockup/`. Rev 1.1 reconciled the plan with the as-built modular, platform-based content model and the refined frontend. **Rev 1.2 reconciles the GUI platform dimension:** the platform filter chips and the `.badge--platform` badge are now sourced **solely from the `library/platforms/` definitions** (DEC-011), and the per-item device-variant `platform` array is retained in data but no longer rendered.

> This document is the readable **current target specification**. It is written so a future model or developer can act without re-deriving decisions. Any entry marked **(assumption)**, **(proposal)**, or listed in §12 is not yet confirmed and must not be treated as fact. Anything labeled **as-built** is verified from `development/` and `DEVELOPMENT_CURRENT_STATE.MD`. Content facts about PS5 homebrew projects are **observed from sources on 2026-10-08** and must be re-verified by the maintainer before publishing (RISK-01; all 19 items are currently `verified:false`).

---

## 1. Project identity and goals

### 1.1 Identity
A single-page, static **PS5 Homebrew Compendium** — a curated, visually striking directory of PlayStation 5 homebrew, organized by topic and platform, and driven entirely by a **modular, hand-editable JSON library** (a manifest + one platform file + one file per item, no build step).

### 1.2 Current vs target behavior
| | Current (as-built, `development/`) | Target |
|---|---|---|
| State | Implemented static SPA; locally verified; **not deployed** | Static site published on GitHub Pages |
| Content source | `library.json` **manifest** → `library/platforms/<id>/platform.json` → `items/*.json` (19 items, schemaVersion 2.0.0) | Same, curated and error-free |
| Organization | Topics: Emulators, Jailbreaks & Exploits, Payloads & Core Tools, Homebrew Apps & Games; **data-driven platform filter + `.badge--platform` badge** sourced from `library/platforms/` (DEC-011) | Topics + platform-aware browsing |
| Look | "Prospero" = PS5 system-UI aesthetic (dark, cinematic, PlayStation Blue, cards, sticky header, banner) | Refined, production-polished |
| Updating | Edit one item file (+ `itemFiles` for new items) → commit → live | Same; documented runbooks |

### 1.3 User goals
| Goal | ID | User outcome |
|---|---|---|
| Fast discovery | G-1 | A newcomer finds the right emulator/tool for their firmware in under a minute. |
| Easy maintenance | G-2 | A maintainer adds or edits a project by editing one item JSON file (plus an `itemFiles` entry for a new item), with no rebuild. |
| Premium presentation | G-3 | The site feels like the PS5 dashboard — immersive, modern, responsive. |
| Lawful & safe | G-4 | Every item links to its official source and carries firmware/legal warnings. |

### 1.4 Goals (in scope)
- A beautiful, responsive, accessible static site on GitHub Pages.
- Four topic categories, browsable and searchable/filterable.
- Detailed per-item pages with source/release links, version, status, item icon, and firmware compatibility.
- Zero-build content updates via the modular JSON library (manifest + platform + per-item files).

### 1.5 Non-goals (explicit)
- **No hosting** of ROMs, BIOS files, prod.keys/title.keys, game dumps, or PKG files. Links only.
- No user accounts, backend, database, comments, ratings, or analytics.
- No i18n/localization in v1 **(proposal)**.
- No offline/PWA support in v1 **(proposal)**.
- No automated scraping of upstream project data in v1 (maintainer curates manually).
- Not a general PS4/PS3/Vita directory (PS5-native only — DEC-002).

---

## 2. Requirements (prioritized, with acceptance examples)

Priorities: **MUST** (v1 acceptance), **SHOULD** (v1 if time), **MAY** (later).
Acceptance examples are falsifiable and include negative/edge cases. IDs are stable.

### 2.1 Functional requirements

| ID | Prio | Requirement | Acceptance example (falsifiable) |
|---|---|---|---|
| FR-01 | MUST | Content is driven by a **modular, platform-based** library fetched at runtime: manifest (`library.json`) → `platforms[]` → `platform.json` → `items/*.json`. | Editing `name` in `library/platforms/ps5/items/ps5_retroarch.json` and reloading shows the new name with no rebuild; each loaded item carries its platform `platformId`. |
| FR-02 | MUST | Items are organized by category, rendered from the manifest `categories` array. | Adding a 5th category object to the manifest makes a 5th topic tab appear and renders its items. |
| FR-03 | MUST | Home presents a card grid of items for the selected category. | Selecting "Emulators" shows only items whose `category` is `emulators`; count in the tab equals the number of rendered cards. |
| FR-04 | MUST | Free-text search matches name, summary, description, tags, author; the field is the first control inside `#browse` and updates a live result count. | Typing `switch` returns the Nintendo Switch emulator and the `#search-count` badge reads `1 / 19` (polite "1 project shown"); clearing restores all and the badge reads `19 projects`. |
| FR-05 | MUST | Filter by status, platform, tags, and firmware compatibility. The **platform filter is data-driven**: chips are `All platforms` + one per `library/platforms/*/platform.json` definition, ordered by `order`, labelled `shortName \|\| name \|\| id`, with chip id = the platform `id`; filtering keeps items whose `platformId` matches `state.platform`; an unknown `?platform=<id>` is normalized to `all`. | With the current single definition (`ps5`) the toolbar shows `All platforms` + `PS5`; `?platform=ps5` keeps all 19 items (`19 / 19`); `?platform=ps4` (not a defined id) resets to `all` (19 projects) rather than an empty grid. No hardcoded device list is present. Filtering `status = stable` hides `alpha` items. |
| FR-06 | SHOULD | Sort by name, recently updated, or curated order. | Sort by "Recently updated" orders cards by `updated` descending. |
| FR-07 | MUST | Each item has a detail view reachable by deep link. | Opening `…/#/item/ps5-retroarch` directly (fresh tab) shows that item's detail. |
| FR-08 | MUST | Detail shows summary/description, author, version, `updated`, status, license, firmware range, requirements, and links. | Detail for an item with `requires:["etahen"]` renders a link to the etahen item if it exists in the library. |
| FR-09 | MUST | External links open safely and target official sources only. | Every external anchor has `target="_blank"` and `rel="noopener noreferrer"`. |
| FR-10 | MUST | Firmware compatibility is surfaced; the user can pick "their" firmware. | With firmware set to `14.00`, items whose range excludes 14.00 render a visible "incompatible" treatment; setting `13.60` clears it. |
| FR-11 | MUST | Legal disclaimer + per-item warnings are visible. | The footer/site notice contains the lawful-homebrew disclaimer; an item with a `warnings[]` entry shows all warnings on its card/detail. |
| FR-12 | MUST | Loading, empty, no-match, and error states are handled. | Fetching a deliberately malformed library shows a human-readable error and does **not** throw to console-only. An empty library shows "This library is empty"; a filter/search that matches nothing shows a query-aware "No projects match" panel, not a blank page. |
| FR-13 | SHOULD | Data is validated against published schemas (manifest/platform/item) plus the platform-aware structural validator. | A check fails on a manifest, platform, or item missing a required field; the page still degrades gracefully at runtime. |
| FR-14 | MAY | Indicate data freshness. | `site.lastUpdated` is rendered in the footer. |
| FR-15 | MUST | Content is organized by **platform**: `library.json.platforms[]` lists `platform.json` files; each platform declares its `itemFiles[]`; loaded items carry `platformId`. The platform dimension **is surfaced** in the GUI: a data-driven platform **filter** and a `.badge--platform` badge (both derived from the platform definitions — DEC-011; §12 U-6 resolved for the GUI). | Adding a second valid platform path + folder makes its items load, adds a second filter chip (ordered by `order`), and badges each item from its definition, while the existing platform keeps working; a missing/malformed item file is skipped without failing the load. (The per-item device-variant `platform` array is retained in the data but no longer rendered.) |
| FR-16 | MUST | Each item may specify `icon` as a named sprite word **or** an image URL/path; card and detail render it, falling back to the category icon on an unknown word or a failed image. | `icon:"tool"` renders a sprite glyph (no `<img>`); `icon:"https://…png"` renders an `<img>`; an image that 404s is replaced by the category icon with no broken placeholder. |

> **Note — GUI platform dimension (as-built, DEC-011).** The platform filter and the `.badge--platform` badge are sourced **only** from the `library/platforms/*/platform.json` definitions, keyed by `item.platformId`. The per-item device-variant `platform` array (`["PS5","PS5 Pro"]`) is **retained in the data files and in `item.schema.json` but is no longer surfaced by the GUI**; it may be re-surfaced later under a different label (see §12 U-6). Adding a platform is a data-only change — no code edit.

### 2.2 Non-functional requirements

| ID | Prio | Requirement | Target / acceptance |
|---|---|---|---|
| NFR-P1 | MUST | Performance budget. | LCP < 2.5s on emulated 4G; initial HTML+CSS+JS < 150 KB gzipped (excluding images/metadata); no render-blocking third-party requests. |
| NFR-A1 | MUST | Accessibility. | WCAG 2.2 AA: full keyboard operation, visible focus, `prefers-reduced-motion` respected, semantic landmarks, contrast ≥ 4.5:1 for body text. Automated audit (axe/Lighthouse) reports 0 critical violations. |
| NFR-S1 | MUST | Security/privacy. | All JSON-derived strings escaped before insertion (no `innerHTML` of raw data); no secrets in repo; external links `noopener`; no trackers. |
| NFR-S2 | SHOULD | Content Security Policy. | A restrictive CSP meta/header where GitHub Pages permits; at minimum no inline event handlers. |
| NFR-M1 | MUST | Maintainability. | Adding a valid entry takes < 5 minutes; schema + docs describe every field. |
| NFR-R1 | MUST | Reliability / graceful degradation. | If the library fails to load, a retry affordance and cached last-good copy (sessionStorage) are offered. |
| NFR-R2 | MUST | Module cache-busting (DEC-009). | `index.html` loads `js/main.js?v=<N>` and every relative `import` in `js/*.js` carries the same `?v=<N>`; bumping `N` with a JS change makes a reload fetch the new module instead of a stale one. |
| NFR-C1 | SHOULD | Browser support. | Latest two versions of Chrome, Edge, Firefox, Safari; iOS Safari. |
| NFR-D1 | SHOULD | Responsive. | Usable at 360 px, 768 px, 1440 px; no horizontal scroll at 360 px. |

---

## 3. Use cases (complex flows only; stable IDs)

Full narrative for UC-03 and UC-04 are in `development_plan/use-cases.md`. Others are covered by acceptance scenarios in `development_plan/acceptance.md`.

- **UC-01 Discover by topic** — newcomer browses a category and opens an item.
- **UC-02 Search & filter** — user narrows by text + status + platform/tag.
- **UC-03 Firmware-aware browsing** — user enters their exact firmware, gets compatible-first guidance and warnings. *(complex)*
- **UC-04 Maintainer updates the library** — maintainer adds/edits a platform item file (adding an `itemFiles` entry for a new item, or a whole platform), validates, commits, and sees the live change. *(complex)*
- **UC-05 Deep-link & share** — user opens/shares a detail URL, and it resolves on a cold load.
- **UC-06 Degraded data** — JSON malformed / offline / stale cache.

---

## 4. Architecture and technology

### 4.1 Chosen stack (target)
- **Static, zero-build**: plain HTML5, modern CSS (custom properties), vanilla ES modules JavaScript. No framework, no bundler, no build step.
- **Hosting:** GitHub Pages. Target publish source is the default branch (DEC-003, **provisional**); the current as-built product lives under `development/` and the exact publish root is unresolved — see U-1/§5.5.
- **Data (as-built, DEC-004/DEC-008):** a modular JSON library — `library.json` manifest → `library/platforms/<id>/platform.json` → `items/*.json` — fetched at runtime with `fetch()`. Schemas: `development_plan/library.schema.json` (manifest), `platform.schema.json`, `item.schema.json`.
- **Diagrams/architecture**: `development_plan/architecture.md`.

### 4.2 Rationale
- Requirement FR-01 demands "easily updateable through a JSON file" — runtime fetch means editing JSON alone changes the live site, with no CI/build to fail.
- Zero dependencies minimizes supply-chain and maintenance risk, maximizes GitHub Pages compatibility, and meets the tight performance budget (NFR-P1).
- Vanilla JS is sufficient for the feature set (browse/search/filter/route). A framework would add build complexity for little gain.

### 4.3 Alternatives considered
| Option | Why not chosen |
|---|---|
| Astro / Eleventy / Next (static export) | Adds a build step; editing JSON would require a rebuild/commit-pipeline; heavier for this scope. Revisit only if content grows to hundreds of entries with generated pages/SEO needs. |
| React/Vue SPA | Larger payload, build tooling; overkill. |
| Server-side API + DB | Contradicts "static on GitHub Pages" and "update via JSON". |
| GitHub API as data source | Adds rate-limit/auth complexity; the repo file IS the source. |

### 4.4 Boundaries and contracts
- **Data contract (primary, as-built):** `library.json` (manifest) conforms to `development_plan/library.schema.json`; each `platform.json` to `platform.schema.json`; each item file to `item.schema.json` (all JSON Schema 2020-12, `schemaVersion` **2.0.0**). Full field reference in `development_plan/data-model.md`.
- **Routes (hash-based, GH Pages-safe)**:
  - `#/` → home (all / first category)
  - `#/category/<categoryId>` → filtered grid
  - `#/item/<itemId>` → detail modal (deep-linkable)
- **Shareable query-param state (as-built, proposal to confirm):** `?q=`, `?status=`, `?platform=`, `?sort=`, `?fw=` reflect the current view via `history.replaceState`. `?platform=<id>` accepts only a platform `id` present in the loaded definitions; any other value is normalized to `all` on boot so a removed/renamed platform cannot strand the view on an empty filter.
- **No network APIs** are called; the only fetches are same-origin library files (`library.json` + platform + item files), each with a `?v=<timestamp>` cache-buster.
- **Events (internal):** `js/state.js` holds state + a tiny emitter; `js/main.js` orchestrates rendering.

### 4.5 Data, migration, rollback
- `schemaVersion` (semver) at the root of the **manifest**. Rules: additive fields = minor; breaking field/layout changes = major. The app reads `schemaVersion`, supports the current major, and warns (not crashes) on unknown majors.
- **1.0.0 → 2.0.0 (executed, DEC-008):** the monolithic `library.json` with inline `items[]` was migrated by `development/tools/split-library.mjs` (inline → flat `items/`), then `restructure-platforms.mjs` (flat → `platforms/<id>/`). The loader still accepts legacy flat `itemFiles` and inline `items`.
- **Rollback:** content and code are plain files in git; rollback = revert commit. No database migration.
- When items are removed/renamed, add an entry to the `redirects` map in the manifest so old `#/item/<id>` deep links keep working (specified in `data-model.md`).

Full schema and examples: `development_plan/data-model.md`, `library.schema.json`, `platform.schema.json`, `item.schema.json`, and the `*.example.json` files.

---

## 5. Security, privacy, accessibility, reliability, performance, operations

### 5.1 Security & privacy
- Treat JSON as untrusted for rendering safety: escape text; never `innerHTML` raw values; build DOM with `textContent`.
- External links: `rel="noopener noreferrer"`; validate URLs are `https:` before rendering as links (reject `javascript:`).
- No secrets, tokens, analytics, cookies, or third-party embeds. **Legal/ToS**: no hosting of copyrighted content (DEC-005).
- GitHub Pages serves over HTTPS and is static, so the attack surface is limited to client-side XSS via malicious JSON — mitigated above.

### 5.2 Accessibility (WCAG 2.2 AA)
- Semantic landmarks (`header/nav/main/footer`), skip link, visible focus ring, keyboard-operable cards/tabs/modal (focus trap + Esc), ARIA for tabs/filters, `prefers-reduced-motion` disables card motion.
- Live-region announcement for result counts after filtering/search.

### 5.3 Reliability
- State machine: `idle → loading → ready | empty | no-match | error`. On error: friendly message + Retry + last-good cache from `sessionStorage`. Empty ("This library is empty") and no-match (query-aware "No projects match") are distinct; a failed platform/item file is skipped with a warning.
- **Data cache-busting (DEC-006):** fetch each library file with `cache: 'no-cache'` and a `?v=<timestamp>` query.
- **Module cache-busting (DEC-009, NFR-R2):** `index.html` loads `js/main.js?v=4` and every relative `import` inside `js/*.js` carries the same `?v=4`; bump `N` on any JS change. This prevents the stale-module class of bug that previously produced a spurious "Could not load library.json" error.

### 5.4 Performance budget (measurable)
- Initial JS+CSS < 150 KB gzipped; Lighthouse Performance ≥ 90 (mobile), Accessibility ≥ 95, Best-Practices ≥ 95, SEO ≥ 90.
- Images: the hero banner is a local SVG; item icons are inline SVG glyphs or `loading="lazy"` / `decoding="async"` `<img>` elements (possibly third-party avatar URLs, with an error fallback). System font stack only (no bundled webfont; see design-system, DEC-007).

### 5.5 Operations
- **Deploy (BLOCKED — §12 U-1):** the product is a deployable site under `development/`, but GitHub Pages "Deploy from a branch" accepts only `/` or `/docs`. Options: copy/move `development/` → `docs/`, or add a repo-root GitHub Actions workflow that uploads `development/` as the Pages artifact. `.nojekyll` is present inside `development/`.
- **Content is static:** no build artifact; pushes publish library files directly when the publish layout is resolved.
- CI (GitHub Actions, SHOULD): run `node development/tests/validate-library.mjs` + schema validation + link reachability + Lighthouse. Not required for content updates, and verification so far has been local/headless (no CI yet).
- **Local run (as-built):** `development/run_site.bat` (Windows one-click) or `python -m http.server 8080` from `development/`.

---

## 6. Design direction ("Prospero" = PS5 system UI)

Full specification and tokens: `development_plan/design-system.md`. Summary:
- Dark, cinematic backgrounds (near-black), PlayStation Blue accents, large rounded cards, generous spacing, smooth 300–500 ms transitions, controller-style visible focus.
- **Typography caution (DEC-007):** Sony's SST font is proprietary and must **not** be bundled. Use a licensed/system fallback stack (e.g. Inter or system UI sans) styled to match.
- Components (as-built): sticky top header (glowing brand mark, animated accent line, scroll/solid state, mobile hamburger, active-nav underline via `aria-current`, firmware chip, source link), hero with banner image + "Browse projects" CTA + `/` hint, **search-in-`#browse` with a live count badge and clear button**, topic tabs, filter chips, item card (`icon`, name, summary, badges: status/platform/firmware/Unverified), detail modal, toasts, footer disclaimer.
- **Frontend refinements since rev 1.0 (as-built):** search moved from the hero to the top of `#browse` with a `#search-count` badge (`19 projects` / `1 / 19`); `#search-clear`; hero CTA + `/` shortcut; sticky animated header; query-param URL state (`?q=`, `?status=`, `?platform=`, `?sort=`, `?fw=`); distinct loading/empty/no-match/error states; a11y (skip link, focus trap, polite `#live`, `prefers-reduced-motion`); `assets/banner.svg` + `.png` and a favicon. See `design-system.md` §5.7 (DEC-010).

---

## 7. Implementation slices (ordered, independently testable)

Each slice has a demo-able result and its own verification. Dependencies noted. Status reflects the as-built product (`development/`) as of 2026-10-08: ✅ built/verified locally · ◐ partial · ☐ not started.

| Slice | Status | Delivers | Depends on | Verification |
|---|---|---|---|---|
| **S1 — Deploy skeleton** | ✅ (local) | `development/index.html`, `styles.css`, `js/`, `.nojekyll`, stub library. GitHub Pages serving. | — | Served locally; assets 200; **publish still blocked (U-1)**. |
| **S2 — Design foundation** | ✅ | Tokens, layout shell, header/hero/footer, responsive grid, a11y baseline. | S1 | Design tokens applied; keyboard focus visible; reduced-motion honored. |
| **S3 — Data layer** | ✅ | Fetch + defensive validation + state machine + cache/retry. | S2 | Malformed JSON → friendly error + retry; valid data → counts render. |
| **S4 — Browse & categories** | ✅ | Category topics, card grid, per-category counts, featured rail. | S3 | FR-02/FR-03 acceptance; adding a category adds a tab. |
| **S5 — Search, filter, sort** | ✅ | Search box, status/platform/tag filters, sort control, result count. | S4 | FR-04/FR-05/FR-06 acceptance. |
| **S6 — Detail view & routing** | ✅ | Hash router, detail modal, deep links, back/close, focus management. | S4 | FR-07/FR-08; cold deep link resolves (`#/item/ps5-retroarch`); Esc/back works. |
| **S7 — Compatibility & legal** | ✅ | Firmware selector, incompatible styling/warnings, disclaimer, per-item warnings, URL safety. | S6 | FR-09/FR-10/FR-11 acceptance (`?fw=14.00` → incompatible). |
| **S8 — Hardening & content** | ◐ | Perf/a11y/SEO pass, meta/OpenGraph, link check, populated library, docs. | S7 | Content populated (19 items, all `verified:false`); **axe/Lighthouse/E2E not yet run** (DEV-5/DEV-6). |
| **S9 — Platform modularization** | ✅ | Manifest → `platforms[]` → `platform.json` → `items/*.json`; `platformId` tagging; legacy fallbacks; migration tools. | S3, S4 | Validator OK (schemaVersion 2.0.0, 19 items, 1 platform); HTTP 200 for manifest/platform/items; headless render 23 cards (DEV-7). |
| **S10 — Frontend refinement** | ✅ | Search-in-`#browse` + live count; hero CTA + `/` hint; sticky animated header (brand glow, accent, scroll state, hamburger, `aria-current`, firmware chip, source link); query-param state; distinct states; banner/favicon; module cache-busting. | S7 | Headless: base count `19 projects`; `?q=switch` → `1 / 19` + live announcement; deep link opens detail (DEC-009/DEC-010). |
| **S11 — Publish/deploy** | ☐ | Resolve publish layout (copy to `/docs` or Actions), enable Pages, CI (validator + link check + Lighthouse). | S8, S9, S10 | Live URL loads; assets + JSON 200; CI green. **Blocked by U-1.** |
| **S12 — Platform filter & badge (data-driven)** | ✅ | Platform chips built from `library/platforms/` definitions; `platformId` filtering; `.badge--platform` on cards/detail; unknown `?platform=` normalized to `all`; module bump to `?v=4`. | S9, S10 | Base chips `All platforms`+`PS5`; `?platform=ps5` → `19 / 19`; `?platform=ps4` → normalized to all; `.badge--platform` 23 base / 24 detail (DEV-8, DEC-011). |

### 7.1 Dependency graph
See `development_plan/architecture.md` (Mermaid).

### 7.2 Mockup — when it retires uncertainty (optional, recommended)
**Status (as-built):** this stage was run — the `mockup/` prototype and its evidence (`DEVELOPMENT_MOCKUP_PROGRESS.MD`) validated the PS5 visual direction, interaction model, firmware UX and deep links; the direction was adopted by the product. The remaining mockup-stage uncertainty (icon/screenshot sourcing `U-3`) still applies.
Because "extremely beautiful" is subjective and high-stakes, a **static visual mockup** (Stage: mockup) should prove:
1. The color/typography/motion language reads as "PS5 dashboard".
2. Card hover/focus and category-tab interaction feel premium.
3. Responsive composition at 360 / 768 / 1440 px.
4. Detail modal/page legibility against the dark theme.
The mockup is throwaway unless reused as S2; the validated direction was adopted (see the status note above).

### 7.3 Executable commands (as-built where noted)
```bash
# Local preview (as-built) — serve the product at http://127.0.0.1:8080/
development/run_site.bat            # Windows one-click
python -m http.server 8080 --bind 127.0.0.1   # run from development/

# Structural validation (as-built, dependency-free)
node development/tests/validate-library.mjs   # -> OK (schemaVersion 2.0.0, 19 items, 1 platform)

# Schema validation (JSON Schema 2020-12; requires Node/ajv-cli)
npx --yes ajv-cli@5 validate -s development_plan/library.schema.json \
  -d development/library.json --spec=draft2020
npx --yes ajv-cli@5 validate -s development_plan/platform.schema.json \
  -d development/library/platforms/ps5/platform.json --spec=draft2020
npx --yes ajv-cli@5 validate -s development_plan/item.schema.json \
  -d "development/library/platforms/ps5/items/*.json" --spec=draft2020

# Headless DOM checks (as-built helper)
node development/tests/inspect-dom.mjs <dumped-dom.html>

# Acceptance/E2E (Playwright) — ☐ not yet added (DEV-5)
npx --yes playwright test

# Lighthouse budget check — ☐ not yet run (DEV-6)
npx --yes lighthouse http://127.0.0.1:8080 --preset=desktop --view
```

---

## 8. Validation strategy

| Layer | Method | Where | Status |
|---|---|---|---|
| Data (structure) | `development/tests/validate-library.mjs` (platform-aware, dependency-free) | `development/tests/` | ✅ passing (19 items, 1 platform) |
| Data (schema) | JSON Schema 2020-12 via ajv-cli (manifest / platform / item) | `library.schema.json`, `platform.schema.json`, `item.schema.json` | ◐ schemas ready; not yet wired to CI |
| Unit-ish | Pure functions (`filters.js`, `util.js` compatibility) | `development/js/` | ◐ exercised via headless runs |
| Acceptance/E2E | Playwright scenarios from `development_plan/acceptance.md` | `development/tests/` | ☐ not yet added (DEV-5) |
| A11y | axe-core via Playwright + Lighthouse | — | ☐ not yet run (DEV-6) |
| Perf | Lighthouse CI budgets | — | ☐ not yet measured |
| Links | Link checker (lychee or Node script) over item links | CI | ☐ not yet run |
| Manual | Visual/headless review; keyboard pass | — | ◐ headless screenshots reviewed; keyboard not tool-tested |

**Definition of "ready to implement"**: every MUST requirement has a testable acceptance scenario; the data contract is frozen and exemplified; assumptions are labeled; links in this plan resolve. This bar is met subject to §12.

---

## 9. Assumptions

| ID | Assumption | Reversible? | Impact if wrong |
|---|---|---|---|
| A1 | Zero-build static stack (vanilla HTML/CSS/JS) is acceptable. | Yes | Swap to Astro; re-plan generation/SEO slices. |
| A2 | The GitHub Pages publish root is undecided; the product currently lives under `development/` (blocked — see U-1/DEV-1). | Yes | Copy to `/docs` or add an Actions workflow (low effort). |
| A3 | The site is English-only in v1. | Yes | Add i18n (moderate). |
| A4 | The maintainer edits raw JSON in a text editor/GitHub web UI (manifest + platform + item files). | Yes | Could add a no-code CMS later. |
| A5 | No backend, accounts, analytics, or cookies. | No (by design) | Architecture change. |
| A6 | Categories are the four chosen topics, extensible via the manifest. | Yes | Add/rename in data. |
| A7 | Item `icon` values currently use **GitHub developer avatars as stand-ins** (14 URLs) plus 5 sprite words; these are not the projects' own icons. | Yes | Licensing/accuracy risk; replace with permitted per-project icons (U-3, DEC-007). |

---

## 10. Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| RISK-01 | Homebrew project facts (versions, firmware ranges, links) drift or are wrong. | High | Medium | Mark `verified:false`; store `source`; re-verify before publish; show `updated`. | Maintainer |
| RISK-02 | A linked project facilitates piracy, contradicting the lawful-homebrew stance. | Medium | High | Curation policy (DEC-005): official open-source pages only; no ROM/BIOS/key/PKG links; per-item warnings. | Maintainer |
| RISK-03 | Hand-edited JSON syntax errors break the live site. | Medium | Medium | Schema validation in CI + graceful runtime error + last-good cache. | Developer |
| RISK-04 | Proprietary font/asset licensing (e.g., SST). | Medium | Medium | DEC-007: no proprietary assets; use licensed fallbacks. | Developer |
| RISK-05 | Large library hurts render performance. | Low now | Medium | Paginate/virtualize and index search if > ~200 items. | Developer |
| RISK-06 | GitHub Pages caching delays content updates. | Low | Low | DEC-006 cache-busting (per-fetch `?v=<ts>`, `no-cache`). | Developer |
| RISK-07 | A stale cached ES module serves old logic after a change (observed). | Medium | Medium | DEC-009/NFR-R2: `?v=N` on `index.html` + all relative imports; bump on JS changes. | Developer |
| RISK-08 | Item icons hotlink third-party avatar images, risking rate limits, broken images, or licensing concerns. | Medium | Low-Med | Image-`error` fallback to the category icon (FR-16); replace with permitted per-project icons (U-3). | Maintainer |
| RISK-09 | Platform dimension could drift from the UI if code carried a hardcoded device list, or if a 2nd platform had no navigation path. | Low now | Medium | ✅ **Resolved for the filter/badge:** both are derived from `library/platforms/` definitions and auto-extend (DEC-011). Residue: optional platform-scoped routing only (§12 U-6). | Developer |

---

## 11. Traceability

| ID | Source / user goal | Acceptance | Planned slice | Verification (status) |
|---|---|---|---|---|
| FR-01 | Requirement 4 (JSON-driven) | Edit an item file → live change, no rebuild | S3/S9 | ✅ `validate-library.mjs` + headless render |
| FR-02 | Requirement 3 (topics) | Add category → new tab | S4 | ✅ headless: 5 topic buttons |
| FR-03 | Requirement 3 | Category shows only its items | S4 | ◐ logic present; click not automated |
| FR-04 | G-1, DEC-010 | Search in `#browse` + live count | S5/S10 | ✅ `?q=switch` → `1 / 19` |
| FR-05 | G-1, DEC-011 | Data-driven platform chips + `platformId` filter; unknown `?platform` → `all` | S5/S9/S12 | ✅ base chips `All platforms`+`PS5`; `?platform=ps5` → `19 / 19`; `?platform=ps4` → normalized to all (19); status-chip click not automated |
| FR-06 | G-1 | Sort by updated / name / curated | S5 | ✅ `?sort=name` ordering observed |
| FR-07 | G-1, UC-05 | Cold deep link resolves | S6 | ✅ `#/item/ps5-retroarch` modal opens |
| FR-08 | G-1, G-4 | Detail renders all fields | S6 | ✅ 3 sections + warnings block |
| FR-09 | NFR-S1, G-4 | `rel=noopener` on externals | S7 | ◐ code review |
| FR-10 | UC-03, RISK-01 | Firmware 14.00 → incompatible styling | S7 | ✅ `?fw=14.00` → 23 incompatible |
| FR-11 | G-4, RISK-02 | Disclaimer + per-item warnings visible | S7 | ✅ footer + detail warnings |
| FR-12 | NFR-R1 | Malformed → error; empty vs no-match | S3/S10 | ◐ prototype fixtures; same product code paths |
| FR-13 | NFR-M1, RISK-03 | Validator fails on missing field | S3/S8 | ✅ `validate-library.mjs` (platform-aware) |
| FR-14 | G-2 | `lastUpdated` shown | S8 | ◐ code present |
| FR-15 | G-2, DEV-7, DEV-8 | `platforms`→`platform.json`→items + `platformId`; filter + `.badge--platform` from definitions | S9/S12 | ✅ validator + HTTP 200; chips from definitions; `.badge--platform` 23 base / 24 detail (label `PS5` from `shortName`) |
| FR-16 | user request, DEC-007 | `icon` word/URL + fallback | S10 | ✅ 18 `<img>` + 5 SVG glyphs |
| NFR-P1 | G-3 | Lighthouse perf ≥ 90 | S8/S11 | ☐ not measured |
| NFR-A1 | G-3 | axe 0 critical; keyboard pass | S2/S8 | ☐ not tool-audited |
| NFR-S1 | NFR-S1 | `textContent` only; validated URLs | S3/S7 | ✅ code review |
| NFR-R1 | NFR-R1 | Retry + sessionStorage fallback | S3 | ◐ code present; not exercised in product |
| NFR-R2 | DEC-009 | `?v=N` module cache-busting | S10/S12 | ✅ entry + all imports carry `?v=4` |
| UC-01 | G-1 | Browse → open item | S4/S6 | ✅ headless render |
| UC-02 | G-1 | Search + filters combine | S5 | ◐ search verified; filter clicks not |
| UC-03 | G-1 | Firmware-aware guidance | S7 | ✅ `?fw=` sweeps |
| UC-04 | G-2 | Maintainer adds item/platform | S9 | ✅ runbooks + validator |
| UC-05 | G-1 | Share deep link | S6 | ✅ cold `#/item/...` |
| UC-06 | NFR-R1 | Degraded data path | S3 | ◐ code present; fixtures prototype-only |

---

## 12. Unresolved decisions (need owner input only if they block)

| ID | Question | Default if unanswered | Impact | Owner |
|---|---|---|---|---|
| U-1 | **Publish layout (blocker):** product is under `development/`; GitHub Pages "Deploy from a branch" accepts only `/` or `/docs`. Copy `development/` → `docs/`, or add an Actions workflow? | None (deploy stays blocked) | **High (blocks deployment)** | User |
| U-2 | Include a firmware-compatibility matrix **view**? (User did not select it.) | No dedicated view; compatibility shown per item + selector (FR-10). | Low-Med | User |
| U-3 | Source/ownership of item icons & screenshots. Current icons are **GitHub developer avatars as stand-ins** (14) + 5 sprite words. | Keep avatars + image-error fallback until permitted per-project icons are sourced (A7/FR-16). | Medium (legal) | User/Maintainer |
| U-4 | Add a "Guides / Get started" category later? | Not in v1; the manifest is extensible. | Low | User |
| U-5 | ~~Run the mockup stage before implementation?~~ **Resolved:** the mockup stage was run and its direction adopted (§7.2). | — | — | User |
| U-6 | **Platform UI (partly resolved).** The data-driven platform **filter** and `.badge--platform` badge are **DONE** (as-built; sourced only from `library/platforms/` definitions — DEC-011; DEV-8/DEV-9 reconciled in rev 1.2). Only optional residue remains: (a) platform-scoped navigation/routing/deep links (e.g. `#/platform/<id>`); (b) whether to re-surface the retained per-item device-variant `platform` array, and under what label. | No action needed for the filter/badge — they auto-extend when a 2nd platform is added; add routing only if cross-platform navigation is wanted. | Low | User/Developer |
| U-7 | Promote the query-param state (`?q/status/platform/sort/fw`) to a documented, supported feature? | Keep as an implemented extra (works today) but treat as provisional until confirmed. | Low | User |

**Resolved since rev 1.0:** DEV-2 (`item.icon` absent from the schema) — now in `item.schema.json` (FR-16); DEV-7 (data-model/schema described a monolithic inline `items[]`) — `data-model.md` + all three schemas rewritten for the platform layout (DEC-008). **Resolved in rev 1.2:** DEV-8/DEV-9 (the GUI uses a hardcoded device-variant platform filter/badge) — FR-05/FR-15, §12 U-6, `data-model.md`, `acceptance.md` and `design-system.md` now describe the data-driven `library/platforms/` model (DEC-011); `item.platform` is retained-but-GUI-unused.

---

## 13. Supporting-artifact index

| Path | Purpose | Status | Date | Evidence/notes |
|---|---|---|---|---|
| `development_plan/decisions.md` | DEC-001…DEC-011 decision records | ready | 2026-10-08 | DEC-004 updated; DEC-008/009/010 added; DEC-011 (GUI platform dimension) added |
| `development_plan/data-model.md` | Field-by-field reference for the modular platform library + runbooks | ready | 2026-10-08 | Rewritten for schemaVersion 2.0.0; §5 GUI platform mapping + §6 `platform` retained-but-GUI-unused |
| `development_plan/library.schema.json` | JSON Schema 2020-12 — **manifest** (`library.json`) | ready | 2026-10-08 | v2.0.0; validates `development/library.json` |
| `development_plan/platform.schema.json` | JSON Schema 2020-12 — **platform** (`platform.json`) | ready | 2026-10-08 | Validates `…/ps5/platform.json` |
| `development_plan/item.schema.json` | JSON Schema 2020-12 — **item** (incl. `icon`) | ready | 2026-10-08 | Validates `…/items/*.json`; `platform` retained (device variants) but GUI-unused |
| `development_plan/library.example.json` | Manifest example (illustrative) | draft | 2026-10-08 | Pair with `platform.example.json` / `item.example.json` |
| `development_plan/platform.example.json` | Platform example (illustrative) | draft | 2026-10-08 | — |
| `development_plan/item.example.json` | Item example (illustrative; **unverified content**) | draft | 2026-10-08 | Verify before publish |
| `development_plan/design-system.md` | Prospero/PS5 tokens, components, motion, a11y | ready | 2026-10-08 | §5.3/§5.7 document platform filter chips + `.badge--platform`; §5.7 as-built header/hero/search |
| `development_plan/use-cases.md` | UC-03, UC-04 full narratives | ready | 2026-10-08 | UC-04 updated for the platform structure |
| `development_plan/acceptance.md` | Acceptance scenarios (Given/When/Then) | ready | 2026-10-08 | A-01/A-04/A-21 updated; A-24…A-26 added; A-05 reworked + A-27/A-28 (data-driven platform filter/badge) |
| `development_plan/architecture.md` | As-built runtime architecture + Mermaid diagrams | ready | 2026-10-08 | Modular load flow; `?v=N` cache-busting |

**Plan-ready check:** each in-scope MUST requirement maps to ≥1 acceptance scenario; interfaces (routes, query params, JSON fields) agree across plan, the three schemas and examples; assumptions are explicit; internal links resolve. Remaining blockers are non-code: **U-1 (publish layout)** blocks deployment; U-3/U-6/U-7 are non-blocking.
