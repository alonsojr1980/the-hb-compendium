# Acceptance Scenarios

Executable-in-spirit, Playwright-shaped. Each scenario is falsifiable and maps to requirement IDs (see `DEVELOPMENT_PLAN.MD` §11). Delegate/fixture files are placed under `development/tests/` when automation is added (Playwright is not yet wired — plan S8/S11).

Conventions:
- "the app" = the deployable static site at `development/`, served locally (`python -m http.server 8080` from `development/`).
- The product's structural validator is `development/tests/validate-library.mjs` (platform-aware).
- `library.valid.json` = a small known fixture; `library.malformed.json` = invalid JSON; `library.missing-field.json` = violates the schema; `library.empty.json` = no items.

---

## A-01 — Content is data-driven and modular (FR-01)
**Given** the app is served with the platform-based library (`development/library.json` manifest + `development/library/platforms/ps5/…`)
**When** I load the page and read the project called "PS5 RetroArch"
**Then** its name, summary, and status render from `library/platforms/ps5/items/ps5_retroarch.json` (not hardcoded)
**And** editing that item file's `name` and reloading shows the new name with no rebuild
**And** changing `site.title` in the manifest changes the header and document title on reload.

## A-02 — Category tabs are generated (FR-02, UC-01)
**Given** `library.valid.json` defines categories `emulators, jailbreaks, tools, apps`
**When** the page loads
**Then** four topic tabs render in `order`
**And** adding a fifth category object and reloading produces a fifth tab.

## A-03 — Category grid shows only its items (FR-03)
**Given** the "Emulators" tab is active
**When** I read the grid
**Then** every card's item belongs to `category: emulators`
**And** the tab's count equals the number of rendered cards.

## A-04 — Search placement, matching, and live count (FR-04, DEC-010, UC-02)
**Given** the full library
**When** I look at the `#browse` section
**Then** the search field is the first control, above the topic tabs
**When** I type `switch`
**Then** the Nintendo Switch emulator card is visible
**And** cards whose name/summary/description/tags/author do not match are hidden
**And** the `#search-count` badge reads `1 / 19`
**And** the polite `#live` region announces the count
**When** I clear the search (via `#search-clear`)
**Then** all cards return and the badge shows the total (`19 projects`).

## A-05 — Filters combine (FR-05, UC-02, DEC-011)
**Given** the full library with one platform definition (`ps5`)
**When** I select `status = stable`
**Then** `alpha` and `beta` items are hidden
**When** I additionally select the platform chip `PS5` (chip id `ps5`)
**Then** only items that are stable **and** whose `platformId === "ps5"` remain
**And** the `#search-count` badge reflects the combined result count (`<n> / <total>`).
**When** I select `All platforms`
**Then** the platform constraint is lifted and only the status constraint applies.

## A-06 — Sorting (FR-06)
**Given** items with differing `updated` dates
**When** I choose "Recently updated"
**Then** cards are ordered by `updated` descending
**When** I choose "Curated"
**Then** cards follow `order` within the category (ties by array position).

## A-07 — Cold deep link to an item (FR-07, UC-05)
**Given** I open `#/item/ps5-retroarch` in a fresh browser context
**When** the app finishes loading
**Then** the detail for PS5 RetroArch renders without visiting the home grid first.

## A-08 — Unknown deep link is handled (FR-07, UC-05 — negative)
**Given** I open `#/item/does-not-exist`
**When** the app loads
**Then** a "not found" state appears with a link home
**And** no uncaught error is logged.

## A-09 — Detail completeness (FR-08)
**Given** an item with `version`, `license`, `firmware`, `warnings`, and `requires`
**When** I open its detail
**Then** all provided fields render
**And** each `requires` id that exists in the library renders as a link to that item
**And** a `requires` id that does not exist renders as plain text (no broken link).

## A-10 — External links are safe (FR-09, NFR-S1)
**Given** any item detail
**When** I inspect its external anchors
**Then** each has `target="_blank"` and `rel` containing `noopener` and `noreferrer`
**And** no anchor has an href beginning with `javascript:`.

## A-11 — Firmware compatibility (FR-10, UC-03)
**Given** the firmware selector is set to `13.60`
**When** I view an item with `firmware.max = "13.60"`
**Then** it is shown as compatible
**When** I set firmware to `14.00`
**Then** that item is dimmed with a warning and an accessible suffix "not compatible with firmware 14.00"
**And** the `aria-live` count updates.
**Edge:** setting firmware to `abc` shows inline validation and does not change state.
**Edge:** an item with no `firmware` object renders "Firmware unknown" and is **not** counted as compatible.

## A-12 — Disclaimer & warnings (FR-11)
**Given** the site footer
**Then** `site.disclaimer` is visible
**And** an item with `warnings: []` shows each warning on its detail (and card where specified).

## A-13 — Malformed JSON error state (FR-12, NFR-R1, UC-06)
**Given** the app is served with `library.malformed.json`
**When** I load the page
**Then** a human-readable error appears with a **Retry** action
**And** no uncaught exception reaches the console.

## A-14 — Missing required field (FR-12/FR-13, UC-06)
**Given** `library.missing-field.json` (an item lacks `category`)
**When** the runtime guard parses it
**Then** the invalid item is skipped and a non-blocking notice is shown
**And** valid items still render.

## A-15 — Empty category (FR-12 — edge)
**Given** a category with no items
**When** I select it
**Then** a helpful empty state renders (not a blank page) with a way to clear filters.

## A-16 — Cached fallback (NFR-R1, UC-06)
**Given** a successful load populated the session cache
**When** a subsequent fetch fails
**Then** the app offers the cached view with a "showing cached data" notice and a Retry action.

## A-17 — Keyboard & focus (NFR-A1)
**Given** keyboard-only navigation
**When** I Tab through the shell
**Then** focus is always visible, tabs/cards/filters are operable, the detail modal traps focus, and Esc closes it returning focus to the originating card.

## A-18 — Reduced motion (NFR-A1)
**Given** `prefers-reduced-motion: reduce`
**When** I hover/focus cards
**Then** transform/parallax animations are disabled or instant.

## A-19 — Responsive (NFR-D1)
**Given** viewport widths 360 / 768 / 1440 px
**When** the page loads
**Then** there is no horizontal scroll at 360 px, the grid reflows to 1/2/3-4 columns, and the detail view is usable at each width.

## A-20 — Performance & a11y budgets (NFR-P1, NFR-A1)
**Given** a production-like build served locally
**When** Lighthouse (mobile) runs
**Then** Performance ≥ 90, Accessibility ≥ 95, Best-Practices ≥ 95, SEO ≥ 90
**And** axe-core reports 0 critical violations.

## A-21 — Modular validation in CI (FR-13, FR-15, NFR-M1)
**Given** the platform-based `development/library.json`
**When** `node development/tests/validate-library.mjs` runs
**Then** it reads the manifest, resolves `platforms[]` → `platform.json` → `items/*.json`, and exits zero (OK)
**And** it reports `schemaVersion`, item count and platform count
**Given** an item file missing a required field (`id`, `name`, `category`, `summary`, `author`, `status`, `links`)
**When** the validator runs
**Then** the command exits non-zero.

## A-22 — Data freshness (FR-14)
**Given** `site.lastUpdated`
**Then** the footer displays that date.

## A-23 — Redirect for renamed item (UC-04/UC-05 — edge)
**Given** `redirects: { "old-id": "new-id" }`
**When** I open `#/item/old-id`
**Then** the detail for `new-id` renders (URL may normalize to the new id).

## A-24 — Platform-organized content (FR-15, DEC-008)
**Given** the manifest lists `platforms: ["library/platforms/ps5/platform.json"]`
**When** the app loads
**Then** it fetches that `platform.json`, reads its `itemFiles[]`, and loads each `items/<name>.json`
**And** every loaded item is tagged with that platform's `id` as `platformId`
**And** `/library.json`, `/library/platforms/ps5/platform.json`, and `…/items/*.json` each return HTTP 200
**When** a single item file is missing or malformed
**Then** only that item is skipped (console warning) and the rest render
**When** a second valid platform path (with its own `platform.json` + items) is added to `platforms[]`
**Then** its items also load and the app still renders
**And** a second platform filter chip appears (ordered by `order`, labelled `shortName || name || id`) and each new item shows a `.badge--platform` — no code change (DEC-011; optional platform-scoped routing remains open — plan §12 U-6).

## A-25 — Item icon: named word, image URL, and fallback (FR-16)
**Given** an item whose `icon` is a named word (e.g. `tool`)
**Then** its card and detail render the inline sprite glyph, not an `<img>`
**Given** an item whose `icon` is an `https://…` image URL
**Then** its card and detail render an `<img>` whose `src` is that URL
**Given** an item whose image URL fails to load (404/offline)
**Then** the `<img>` is replaced by the item's **category** icon and no broken-image placeholder remains
**Given** an item whose `icon` is an unknown word or omitted
**Then** the category icon is rendered.
*(Current data: all 19 items have `icon` — 14 image URLs + 5 words.)*

## A-26 — Module cache-busting (NFR-R2, DEC-009)
**Given** `development/index.html` and the modules under `development/js/`
**Then** the entry script is `js/main.js?v=<N>`
**And** every relative `import` in `js/*.js` carries the same `?v=<N>`
**When** a module changes and `N` is bumped everywhere
**Then** a reload fetches the new versioned module instead of a cached one
**And** the app boots to a rendered grid with no stale-module error.

## A-27 — Platform filter chips come from the definitions (FR-05, FR-15, DEC-011)
**Given** `library.json.platforms` defines exactly one platform (`library/platforms/ps5/platform.json`, `id: "ps5"`, `shortName: "PS5"`)
**When** the toolbar renders
**Then** the platform group (`#platform-toggle`) contains `All platforms` **and** one chip per platform definition, in `order`
**And** each chip's id and label come from the definition (`shortName || name || id`; here `PS5`) with no hardcoded device list in the code
**When** I load `?platform=ps5`
**Then** the count reads `19 / 19` ("Showing 19 of 19 projects") and every rendered item has `platformId === "ps5"`
**When** I load `?platform=<an id not in the definitions>` (e.g. `ps4`)
**Then** the platform filter is normalized to `all` on boot (19 projects) and the grid is **not** empty
**Given** a library whose `platforms` array is empty
**Then** the platform chip group is hidden (no `All platforms` chip alone).

## A-28 — Platform badge uses the definition's shortName (FR-05, FR-15, DEC-011)
**Given** the platform definition has `shortName: "PS5"` and `name: "PlayStation 5"`
**When** I view any card, and then an item's detail
**Then** a `.badge--platform` renders with text `PS5` (resolved by `item.platformId` → `shortName || name || id`)
**And** the base grid renders one `.badge--platform` per card (23 with the current 19 items + 4 featured) and the detail adds one more
**And** an item with no `platformId` renders no platform badge
**And** the badge is not derived from the per-item device-variant `platform` array (`["PS5","PS5 Pro"]`).
