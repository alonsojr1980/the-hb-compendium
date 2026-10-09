# Design System — "Prospero" (PS5 system-UI aesthetic)

Target: the site should feel like the PS5 dashboard — dark, cinematic, spacious, with PlayStation Blue accents and premium motion. See DEC-007: **do not bundle proprietary Sony fonts, logos, or artwork.** Achieve the feel with licensed/system assets.

Design tokens below are the single source of truth; implement them as CSS custom properties in `:root`.

## 1. Color tokens

| Token | Hex | Role |
|---|---|---|
| `--bg-primary` | `#000000` | App background (OLED-friendly, cinematic). |
| `--bg-secondary` | `#1f1f1f` | Cards / elevated surfaces. |
| `--bg-tertiary` | `#2d2d2d` | Hover, inputs. |
| `--bg-elevated` | `#383838` | Modals, dropdowns, popovers. |
| `--ps-blue` | `#003791` | Brand core (headers, key accents). |
| `--ps-blue-light` | `#0070d1` | Interactive elements, links, active tab. |
| `--ps-blue-bright` | `#00bfff` | Focus rings, highlights. |
| `--text-primary` | `#ffffff` | Primary text. |
| `--text-secondary` | `#c9c9c9` | Body text. |
| `--text-tertiary` | `#8a8a8a` | Captions, meta. |
| `--success` | `#2ecc71` | status `stable`. |
| `--info` | `#00bfff` | status `beta`. |
| `--warning` | `#f5a623` | status `alpha` / warnings. |
| `--danger` | `#e5484d` | `experimental`, `discontinued`, destructive. |

**Contrast:** body text must reach ≥ 4.5:1 on its surface (NFR-A1). `--text-tertiary` is for non-essential/meta text only.

## 2. Typography

- **Stack (DEC-007):** `--font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;` — optionally self-hosted Inter variable font (subset, `font-display: swap`). SST is explicitly not used.
- Scale (desktop; step down on mobile):

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Hero title | 48px | 700 | 1.1 | -0.02em |
| Page title | 32px | 700 | 1.2 | -0.01em |
| Section header | 24px | 600 | 1.3 | 0 |
| Card title | 18px | 600 | 1.3 | 0 |
| Body large | 16px | 400 | 1.5 | 0 |
| Body | 14px | 400 | 1.5 | 0 |
| Caption | 12px | 400 | 1.4 | 0.01em |
| Badge/label | 11px | 700 | 1 | 0.05em (uppercase) |

## 3. Spacing, radius, elevation

- Spacing scale (px): `4, 8, 12, 16, 24, 32, 48, 64` → `--space-1..8`.
- Radius: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-pill: 999px`.
- Elevation: `--shadow-card: 0 8px 24px rgba(0,0,0,.45)`; focus glow `0 0 0 3px var(--ps-blue-bright), 0 0 24px rgba(0,112,209,.5)`.
- Content max width `--container: 1280px`; gutters 16px (mobile) → 32px (desktop).

## 4. Motion

- Durations: `--dur-fast: 150ms`, `--dur-base: 350ms`, `--dur-slow: 500ms`; easing `--ease: cubic-bezier(0.22, 0.61, 0.36, 1)`.
- Card hover: translateY(-4px) + shadow + subtle scale (≤1.02); cover-flow-inspired carousel for featured items (MAY).
- All motion wrapped in `@media (prefers-reduced-motion: reduce)` → disabled/instant (NFR-A1).

## 5. Layout & components

### 5.1 Shell
- **Top bar (sticky):** translucent, blurred backdrop; project wordmark (no Sony marks); links: Discover, topics, search, About/Disclaimer.
- **Hero:** featured rail + site tagline + a primary **"Browse projects" CTA** (the search field now lives in the browse section — §5.7). Left third of the banner is intentionally dark so hero copy reads over it.
- **Topic tabs:** the four categories, rendered from JSON; active underline in `--ps-blue-light`; keyboard-operable (`role="tablist"` semantics or nav + `aria-current`).
- **Filter bar:** status chips, **data-driven platform chips** (built from `library/platforms/` definitions — §5.3, DEC-011), tag chips, sort select, live result count.
- **Grid:** responsive `auto-fill, minmax(260px, 1fr)`; cards at ≥ 260px.
- **Footer:** `site.disclaimer` (lawful-homebrew + trademark notice), `lastUpdated`, repo link.

### 5.2 Item card
- Fields: icon/placeholder, `name`, `summary`, badges (`status`, **platform from the platform definition**, firmware range), optional "Unverified" badge, tags.
- Whole card is a link to `#/item/<id>`; visible focus state; hover motion (§4).
- Incompatible-with-selected-firmware state: dimmed + warning icon + `aria-label` suffix.

### 5.3 Badges & chips
- Status colors per §1; uppercase 11px.
- Firmware badge e.g. `7.00–13.60`; unknown shows `Firmware unknown`.
- **Platform badge (`.badge--platform`, as-built, DEC-011):** a PlayStation-blue pill on cards and in the detail header, placed after the firmware badge. Its text is the item's platform **definition** label, `shortName || name || id` (currently `PS5`), resolved from `item.platformId`; an item without `platformId` renders no platform badge. It does **not** use the per-item device-variant `platform` array.
- **Filter chips:** status chips and **platform chips** share the `.chip` control. The platform group (`#platform-toggle`) is built from the platform **definitions**, never a hardcoded list: `All platforms` + one chip per `library/platforms/*/platform.json`, ordered by `order`, labelled `shortName || name || id`, with each chip's id equal to the platform `id`. Selecting a chip sets `state.platform` and filters cards to `item.platformId === chip id`. The whole group is **hidden when zero platforms are defined** (as is `All platforms`).

### 5.4 Detail view
- Modal (desktop) / full-screen sheet (mobile); focus trap; Esc/back closes and restores focus to the originating card.
- Sections: header (name/author/version), status/platform/firmware, description, warnings, requirements (links to related items if present), links (source/releases/docs/video), license, `updated`, `verified` state.

### 5.5 States
- **Loading:** skeleton cards (not a spinner-only screen).
- **Empty:** a genuinely empty library shows "This library is empty".
- **No-match:** when filters/search exclude everything, a query-aware panel ("No projects match" + the term + Clear filters) is shown.
- **Error:** message + Retry, plus a last-good cache notice.

### 5.6 Firmware selector
- Compact input (major.minor) persisted in `localStorage`; changing it re-styles incompatible cards/detail and toggles the header firmware chip. The polite `#live` region announces the visible item count.

### 5.7 As-built refinements — header, hero, search, platform filter (2026-10-08)
Implemented in `development/`; these refine the tokens above without changing them.

**Sticky header**
- **Brand mark:** larger angular, custom-drawn emblem with a radial glow on hover; wordmark + a `COMPENDIUM` micro-label in PlayStation blue.
- **Active-nav underline:** the current topic is marked with `aria-current="page"` and an animated glowing underline.
- **Scroll state (`.is-scrolled`):** toggled after 8px scroll; deepens shadow/blur and turns the bar solid.
- **Animated accent line:** a sheen gradient along the bottom edge.
- **Firmware chip (`#fw-chip`):** appears only when a valid firmware is set; shows `FW <version>` with a status dot; clicking focuses the firmware field.
- **Source link (`#source-link`):** GitHub mark, shown only when `site.repo` is a valid https URL.
- **Search pill (`#search-focus`):** labelled `Search` with a `/` keyboard hint; scrolls to and focuses the browse search.
- **Mobile menu:** at ≤1080px the nav collapses to a hamburger (`#mobilemenu`), closed by click-outside or Esc; chip/ghost icons simplify at ≤760px.
- **Rule:** `[hidden] { display: none !important; }` so `hidden` cannot be overridden by a component `display` rule (this fixed a phantom firmware chip).

**Hero**
- Banner background `assets/banner.svg` with `assets/banner.png` fallback/OG image and a left-to-dark CSS scrim.
- Primary **"Browse projects" CTA** (`#hero-cta`) smooth-scrolls to `#browse`.
- Hint "or press `/` to search"; `/` focuses the search field unless an input/select/textarea is focused.

**Search-in-browse**
- The search form is the **first element of `#browse`**, above the topic tabs.
- **Count badge (`#search-count`)** sits beside the field: `"19 projects"` when idle, `"<n> / <total>"` while filtering.
- **Clear button (`#search-clear`)** appears when the field is non-empty.
- **Result line (`#resultline`)** shows "Showing N of M projects" only while filtering; the default total is otherwise carried by the hero stats.
- **Live region (`#live`, polite)** announces "N project(s) shown"; the visible result line no longer duplicates `aria-live`.

**Platform filter & badge (as-built, DEC-011)**
- The platform filter chips and the `.badge--platform` badge are derived **solely** from the `library/platforms/` definitions (see §5.3); the per-item device-variant `platform` array is no longer rendered.
- `?platform=<id>` accepts only a defined platform id; an unknown value is normalized to `all` on boot so the grid never sticks empty.
- With the current single platform the toolbar reads `All platforms` + `PS5` and each card shows a `PS5` badge; adding a second platform extends both automatically, ordered by `order`.

## 6. Iconography
- Use a permissive open icon set (e.g. Phosphor/Material Symbols) plus custom simple shapes for category keys `gamepad`, `unlock`, `tool`, `app`. No Sony iconography.

## 7. Accessibility requirements (WCAG 2.2 AA)
- Landmarks, skip-link, logical heading order.
- All interactive elements reachable and operable by keyboard; focus never trapped except in modal (with Esc escape).
- Focus visible everywhere (`:focus-visible` using §1 glow).
- Color is never the only signal (status also has text/icon).
- `aria-live="polite"` for result counts and load errors.
- Motion respects `prefers-reduced-motion`.
- Target size ≥ 24×24 CSS px (WCAG 2.2 SC 2.5.8).

## 8. Responsive targets
| Breakpoint | Behavior |
|---|---|
| < 480px | 1-column grid, full-screen detail, condensed nav. |
| 480–1024px | 2-column grid, sticky filter bar. |
| ≥ 1024px | 3–4 column grid, hover motion, modal detail. |
No horizontal scroll at 360 px.

## 9. Reference palette source
Derived from publicly documented PlayStation brand hues (PlayStation Blue `#003791` / `#0070d1`) and the PS5 "five dimensions" design narrative (dark cinematic backgrounds, minimal control-center UI, camera-like transitions). See `development_plan/decisions.md` DEC-007 for the licensing boundary.
