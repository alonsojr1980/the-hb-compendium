# Use Cases

Full narratives for the complex flows. Simple flows are covered by `acceptance.md`.

## UC-01 — Discover by topic
**Actor:** newcomer. **Goal:** find a relevant emulator/tool.
1. Lands on `#/`. Sees hero, topic tabs, and a featured rail.
2. Selects a topic tab → grid filters to that category; URL becomes `#/category/<id>`.
3. Scans cards (name, summary, status, firmware badge).
4. Activates a card → detail opens at `#/item/<id>`.
**Success:** user reaches a project's official source page.

## UC-02 — Search & filter
**Actor:** returning user. **Goal:** narrow to something specific.
1. Types in search (matches name/summary/tags/author).
2. Adds a status filter (e.g. `stable`) and/or platform/tag chips.
3. Result count updates via `aria-live`.
4. Clears filters → full list returns.
**Success:** the exact desired item is visible; empty result shows a helpful empty state.

## UC-03 — Firmware-aware browsing *(complex)*
**Actor:** user who knows their console firmware. **Goal:** avoid incompatible tools.
**Precondition:** user knows their exact build (e.g. `13.60`), from `Settings → System → System Software`.
1. User opens the firmware selector and enters `13.60`; value is persisted (`localStorage`).
2. App computes compatibility for each item: `firmware.min ≤ F ≤ firmware.max` (inclusive). Items with missing bounds are marked **unknown**, not compatible (see `data-model.md` §7).
3. Incompatible cards render dimmed with a warning icon and an accessible suffix ("not compatible with firmware 13.60").
4. An `aria-live` region announces: "N items compatible with 13.60."
5. User opens an incompatible item: detail shows a prominent warning and its supported range; links remain available with a caution.
6. User changes firmware to `14.00`: all items whose max is `13.60` become incompatible; the count updates.
**Alternate flows:**
- Input invalid (e.g. `7`, `abc`) → inline validation, no state change.
- No items compatible → empty state explains and suggests checking the firmware list.
**Success:** the user does not attempt an unsupported install; the compatibility model matches the data.

> **As-built note (2026-10-08):** compatibility styling, the firmware chip and `?fw=` deep-link are implemented and verified (`?fw=14.00` → 23 incompatible). The live-region announcement currently reports the **visible item count** ("N projects shown"), not a compatibility-specific sentence; the "N items compatible" wording above remains the target.

## UC-04 — Maintainer updates the library *(complex)*
**Actor:** maintainer. **Goal:** publish a new item, correction, or new platform without touching code.
**Precondition:** repo write access; understands the modular platform layout (`data-model.md`).
**Main flow — add or edit an item:**
1. Create/edit `library/platforms/<platform_id>/items/<name>.json` as a single bare item object.
   Filename = item `id` with hyphens → underscores (`ps5-retroarch` → `ps5_retroarch.json`).
2. Follow `data-model.md`: `category` must match a `categories[].id`; tags in slug form; `icon` is a named word or an image URL/path; set `updated` to today; set `verified: true` only after confirming against the official source.
3. If the file is new, add its filename to that platform's `platform.json` → `itemFiles`.
4. Validate locally:
   `node development/tests/validate-library.mjs`
   and, for a stricter field check:
   `npx --yes ajv-cli@5 validate -s development_plan/item.schema.json -d development/library/platforms/ps5/items/<name>.json --spec=draft2020`.
5. Commit and push to the default branch.
6. GitHub Pages serves the updated files; the site reflects the change on next load (per-fetch busting per DEC-006). No rebuild.

**Alternate flow — add a new platform:**
1. Create `library/platforms/<id>/platform.json` with at least `id`, `name`, `itemFiles`.
2. Add item files under `library/platforms/<id>/items/`.
3. Append the platform file's path to `library.json` → `platforms`.
4. Validate the manifest (`library.schema.json`) and platform (`platform.schema.json`), then commit. The GUI platform filter and `.badge--platform` badge extend automatically from the definitions — no code change (DEC-011).
   *(Optional platform-scoped navigation/routing is not built yet — plan §12 U-6.)*

**Alternate flows:**
- Validation fails → fix and re-run; because no build pipeline is required, the live site is unaffected until the files are correct (runtime guard + last-good cache protect users).
- Renamed/removed item → add an entry to `redirects` so old deep links resolve.
- A single malformed item file is skipped by the loader with a console warning; the rest still render.
**Success:** change is live within a page reload; schema/cross-checks pass; existing deep links still work.

## UC-05 — Deep-link & share
**Actor:** user. **Goal:** send a specific item to someone.
1. User copies `…#/item/<id>`.
2. Recipient opens it cold (new tab). App loads `library.json`, resolves `id`, and renders the detail directly (after redirect resolution if needed).
3. Invalid/unknown id → friendly "not found" state with a link home.
**Success:** cold deep link resolves; unknown id is handled gracefully.

## UC-06 — Degraded data
**Actor:** user. **Goal:** get a useful experience even when data/network fails.
1. `library.json` is malformed, or the network fails.
2. App shows a friendly error with **Retry**; if a previous good copy exists in `sessionStorage`, it offers the cached view with a "showing cached data" notice.
3. If JSON is valid but a single item is invalid, the app skips that item and surfaces a non-blocking notice rather than failing the whole page (defensive parsing).
**Success:** no blank page and no uncaught error; user can retry or browse cached data.
