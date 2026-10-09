# The Homebrew Compendium

A static, JSON-driven directory of homebrew — emulators, jailbreaks, payloads/tools
and apps. No framework, no build step. Content lives in a modular JSON library (a manifest plus
one file per platform and per item).

> A project by [ALONSOJR1980](https://github.com/alonsojr1980). For lawful homebrew on a console you
> own or are authorized to modify only. This project links to official/open-source pages and does
> not host ROMs, BIOS files, keys, game dumps or copyrighted packages. Modifying a console may void
> warranties, risk account restrictions, or brick the device. Not affiliated with, or endorsed by,
> any console manufacturer or game publisher. All product names, logos and brands are the property
> of their respective owners and are used for identification purposes only.

## Run locally

Must be served over HTTP (the site fetches `library.json`); opening `index.html` directly is
blocked by the browser.

**Windows — one click:** double-click `run_site.bat`, or from a terminal:

```bat
development\run_site.bat                :: serves on http://127.0.0.1:8080/ and opens a browser
development\run_site.bat 8090           :: use a different port
development\run_site.bat 8090 nobrowser :: don't open a browser (dev/testing)
```

The script auto-detects Python, serves this folder, binds to `127.0.0.1`, and works whether it
sits in `development\` or the repository root.

**Manual options:**

```bash
# from this folder
python -m http.server 8080 --bind 127.0.0.1
# -> http://127.0.0.1:8080/
```

or any static server (e.g. `npx --yes serve -l 8080 .`).

## Deploy to GitHub Pages

This directory is the deployable site. Two options:

1. **Publish from `/docs`** — copy/move this directory to `docs/` at the repo root and set
   Pages → Build and deployment → Source → *Deploy from a branch* → `main` / `/docs`.
2. **GitHub Actions** — a workflow that uploads this directory as the Pages artifact
   (requires a repo-root workflow file).

`.nojekyll` is included so files are served as-is.

## Content structure

The library is modular and organized by **platform**:

```
library.json                                      manifest: schemaVersion, site, categories, redirects, platforms[]
library/platforms/<platform_id>/platform.json     platform metadata + itemFiles[]
library/platforms/<platform_id>/items/*.json      one file per item
```

Example: `library/platforms/ps5/platform.json` + `library/platforms/ps5/items/etahen.json`.

A manifest (and each platform's `itemFiles`) is required because static hosting (GitHub Pages)
cannot list a directory. Legacy flat `itemFiles` and inline `items` are still accepted by the loader.

### Extend with a new platform

1. Create `library/platforms/<id>/platform.json` with at least `id`, `name`, and `itemFiles`
   (optionally `shortName`, `order`, `icon`, `thumbnail`, `browseBG`, `description`).
2. Add item files under `library/platforms/<id>/items/`.
3. Add the platform file's path to `library.json` → `platforms`.

### Add or edit an item

1. Create/edit `library/platforms/<platform_id>/items/<name>.json` (a single item object).
   Filename convention: item id with hyphens → underscores (`ps5-retroarch` → `ps5_retroarch.json`).
2. Add its filename to that platform's `platform.json` → `itemFiles`.
3. Validate: `node tests/validate-library.mjs`.
4. Commit and push — no rebuild.

### Rules

- `id` and `categories[].id` are stable slugs used in URLs (`#/item/<id>` / `#/category/<id>`).
- `category` must match a `categories[].id`; `requires[]` should reference existing item ids.
- `icon` may be a **named word** (`gamepad`, `unlock`, `tool`, `app`) or an **image URL/path**;
  a failed image falls back to the category icon.
- `thumbnails` (optional) is an array of image paths/URLs. When an item is opened, they are shown
  as a vertical column to the right of the detail body (outside it), each sliding in from the
  right, staggered from top to bottom. Clicking one opens a full-screen **gallery** starting at
  that image (previous/next via the on-screen buttons or the arrow keys, `Esc` to close).
- Platform `thumbnail` (optional) is an image path/URL used as the background of that platform's
  selector tile (rendered above the search bar). If `thumbnail` is missing or empty, the tile
  falls back to the first existing file among `library/platforms/<id>/thumb.png`, `thumb.jpg`,
  `thumb.jpeg`, `thumb.svg`. Platform `browseBG` (optional) is a raw CSS `background` value
  applied to `#browse` while that platform is selected, and cleared for `All platforms`.
- `firmware` bounds are `MAJOR.MM` (e.g. `7.00`, `13.60`) and are compared inclusively.
- The platform id is attached to each item as `platformId` at load time.
- Set `verified: true` only after checking the project against its official source.

Validate after editing:

```bash
node tests/validate-library.mjs
```

## Tests

Dependency-free, run with the Node built-in test runner:

```bash
# structural validation of the library
node tests/validate-library.mjs

# unit tests for the pure logic (js/util.js, js/filters.js)
node --test tests/util.test.mjs tests/filters.test.mjs
```

There is no browser-automation/E2E suite (no dependency); interactive behavior is verified
manually against these checks. Module cache-busting currently uses `?v=7` (see below).

## Shareable URL state

`?q=`, `?status=`, `?platform=`, `?sort=`, `?fw=` reflect the current view and deep-link it.
Routes: `#/`, `#/category/<id>`, `#/item/<id>`.

## Module cache-busting

JS modules are referenced with a `?v=N` query (`index.html` and every relative `import`). When you
change any file under `js/`, bump `N` in `index.html` and in the `js/*.js` imports so browsers and
CDNs can't serve stale modules (a stale `data.js` is what produces a spurious
"Could not load library.json" error after a data-format change).

## Architecture

| Path | Responsibility |
|---|---|
| `index.html` | Shell, inline SVG icon sprite |
| `styles.css` | Design tokens + components (PS5-inspired) |
| `js/main.js` | Boot, routing, actions, event wiring |
| `js/data.js` | Fetch, validate, cache `library.json` |
| `js/state.js` | Application state + tiny event emitter |
| `js/filters.js` | Pure search / filter / sort |
| `js/render.js` | All DOM rendering |
| `js/router.js` | Hash routing |
| `js/a11y.js` | Live region + focus trap |
| `js/util.js` | DOM/icon/firmware helpers |
| `library.json` | Manifest: site metadata, categories, redirects, `platforms` |
| `library/platforms/` | Platform definitions (`platform.json`) + `items/*.json` |
| `assets/` | Banner (SVG + PNG), favicon, platform tile thumbnails |
| `tools/` | Migration helpers (`split-library.mjs`, `restructure-platforms.mjs`) |
| `run_site.bat` | One-click Windows launcher (serve + open browser) |
| `tests/` | Data validation + unit tests (`util.test.mjs`, `filters.test.mjs`) |

All JSON-derived text is inserted with `textContent`/DOM construction (no `innerHTML` of data),
and external links require `https:` and carry `rel="noopener noreferrer"`.
