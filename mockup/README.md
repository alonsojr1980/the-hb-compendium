# PS5 Homebrew Compendium — MOCKUP

Throwaway prototype used to validate the visual language, interaction model, and JSON-driven
workflow. **Simulated data** — see the banner in the app. Not production code.

## Run

Must be served over HTTP (the app fetches `library.json`; `file://` is blocked by the browser).

**Windows — one click (recommended):** double-click `run_mockup.bat`, or from a terminal:

```bat
mockup\run_mockup.bat            :: serves on http://127.0.0.1:8080/ and opens a browser
mockup\run_mockup.bat 8090       :: use a different port
mockup\run_mockup.bat 8090 nobrowser   :: don't open a browser (dev/testing)
```

The script auto-detects Python, serves the `mockup/` folder (so the URL is `http://127.0.0.1:8080/`),
binds to `127.0.0.1` on purpose, and works whether it sits in `mockup\` or the repository root.

**Manual options:**

```bash
# from inside mockup/ (serves at http://127.0.0.1:8080/)
python -m http.server 8080 --bind 127.0.0.1
# or
npx --yes serve -l 8080 .
```

## Smoke check

No dependencies required:

```bash
node mockup/smoke-check.mjs
```

Validates that `library.json` parses, every item has required fields, categories/`requires`
references resolve, and ids are unique.

## What to try

- The **header**: glowing brand mark, animated accent line, `Search` pill (or press `/`), and a
  **firmware chip** that appears once you set a firmware version. On narrow screens the nav
  collapses into a hamburger menu. The bar gains depth as you scroll.
- Topic tabs, status/platform filters, sorting, search.
- Type `13.60` in **Your firmware**, then `14.00` — watch incompatible cards dim.
- Open a card → detail overlay (focus trap, Esc closes, deep link `#/item/<id>`).
- Reload on `#/item/ps5-retroarch` — it should resolve cold.
- Edit `library.json`, reload — content changes with no rebuild.

## Shareable / testable state (query params)

The mockup reflects UI state in the address bar so links are reproducible:

| Param | Values | Effect |
|---|---|---|
| `q` | text | Search query |
| `status` | `stable`/`beta`/`alpha`/`experimental`/`discontinued` | Status filter |
| `platform` | `PS5` / `PS5 Pro` | Platform filter |
| `sort` | `curated` / `updated` / `name` | Sort order |
| `fw` | e.g. `13.60` | Firmware compatibility |
| `data` | `empty` / `malformed` | Load a demo fixture instead of `library.json` |
| `debug` | `1` | Appends a `#debug-overflow` diagnostic element |

Examples:
```
http://127.0.0.1:8080/mockup/?q=switch
http://127.0.0.1:8080/mockup/?fw=14.00
http://127.0.0.1:8080/mockup/?data=empty
http://127.0.0.1:8080/mockup/?data=malformed
```

## Demo fixtures

`fixtures/library.empty.json` (valid, zero projects) and `fixtures/library.malformed.json`
(deliberately invalid) let reviewers see the empty and error states without touching the real data.
These are demo-only; the whitelist is fixed in `app.js` (`DATA_SOURCES`) — no arbitrary paths.

## Banner

The hero background is `assets/banner.svg` — a hand-authored, scalable 1600×600 cinematic scene
(dark gradients, cyan/blue glows, light streaks, an angular emblem, particles, vignette). A
rasterized `assets/banner.png` (1600×600) is included for convenience. A CSS scrim
(`.hero::after`) darkens the left side so the hero copy stays readable over the art.

To regenerate the PNG from the SVG (requires Chrome):

```bat
chrome --headless=new --hide-scrollbars --window-size=1600,600 ^
  --screenshot=mockup\assets\banner.png http://127.0.0.1:8080/assets/banner.svg
```

## Item icons (`icon` field)

Each item's `icon` may be either:
- a **single word** naming a built-in icon (e.g. `gamepad`, `unlock`, `tool`, `app`), or
- an **image URL or path** (`https://…` or `./relative/path.png`).

URL icons render as an `<img>`; if the image fails to load, the card falls back to the item's
category icon, so a broken URL never leaves an empty card. If `icon` is omitted or is an unknown
word, the category icon is used as the default.

> In this mockup, URL icons point at developer GitHub avatars as **stand-ins**. For production,
> replace each with the project's own icon (with the owner's permission) — see the licensing
> note in `DEVELOPMENT_PLAN.MD` (DEC-007).

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, inline icon sprite |
| `styles.css` | Design tokens + components (PS5-inspired) |
| `app.js` | Fetch, route, filter, render, detail, a11y |
| `library.json` | Simulated content (schema-shaped) |
| `fixtures/` | Demo-only empty + malformed data sources |
| `run_mockup.bat` | One-click Windows launcher (serve + open browser) |
| `smoke-check.mjs` | Dependency-free data validation |
| `check-dom.mjs` | Headless DOM verification helper |

## Known limitations (prototype scope)

- `sessionStorage`/`localStorage` only; no backend, accounts, or analytics.
- No schema library bundled — the smoke check is a lightweight structural guard, not full JSON Schema.
- Images are generated gradients; no real artwork (licensing deliberately avoided).
- Content facts (versions, authors, URLs, firmware) are illustrative and unverified.
