# The Homebrew Compendium

A community-curated directory of homebrew, published as a static site on GitHub Pages.

- **Repository:** https://github.com/alonsojr1980/the-hb-compendium
- **Live site:** https://alonsojr1980.github.io/the-hb-compendium/

Contributors add or edit **data files only** and open a Pull Request. You do **not** need to run or
serve the site yourself — a maintainer merges your PR and GitHub Pages republishes the site
automatically.

---

## Repository layout

| Path | What it is |
|---|---|
| `development/` | The **site** that GitHub Pages serves (the published folder). |
| `development/library.json` | Library **manifest**: site metadata, categories, redirects, and the list of platforms. |
| `development/library/platforms/<platform>/` | One folder per platform: `platform.json`, an `items/` folder, and an optional thumbnail. |
| `development/assets/` | Site images (banner, favicon, tile art, item screenshots). |
| `development/tests/` | Validator + unit tests. |
| `development_plan/`, `mockup/` | Maintainer design notes / throwaway prototype (not published). |

The site reads `development/library.json` at runtime and renders the platforms and items it lists.

---

## Contributing (fork → Pull Request)

1. **Fork** this repository and create a branch:
   `git checkout -b add-my-project`
2. Add or edit the data files (see below). Keep changes **data-only**.
3. **Validate locally:**
   `node development/tests/validate-library.mjs`
4. Commit and push to your fork, then open a **Pull Request** against `main`.
5. A maintainer reviews and merges. GitHub Pages then republishes `development/`.

> Do not edit the site code (`development/*.html`, `development/js/**`, `development/styles.css`)
> unless your PR is specifically a code change and you have discussed it in an issue first.

---

## Add a new item

1. Create `development/library/platforms/<platform>/items/<name>.json`
   (filename convention: the item `id` with hyphens replaced by underscores — `my-project` →
   `my_project.json`):

   ```json
   {
     "id": "my-project",
     "name": "My Project",
     "category": "emulators",
     "icon": "gamepad",
     "thumbnails": ["assets/items/my-project/01.png"],
     "summary": "One-line summary.",
     "description": "A longer description of the project.",
     "author": "your-name",
     "version": "1.0.0",
     "updated": "2026-10-09",
     "status": "stable",
     "firmware": { "min": "7.00", "max": "13.60" },
     "tags": ["retro", "multi-system"],
     "links": {
       "source": "https://github.com/you/my-project",
       "releases": "https://github.com/you/my-project/releases"
     },
     "license": "MIT",
     "warnings": [],
     "verified": false,
     "order": 10
   }
   ```

2. Add the filename to that platform's `platform.json` → `itemFiles` array.
3. (Optional) put screenshots under `development/assets/items/<id>/` and list them in
   `thumbnails`.

### Item fields

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Stable slug (`[a-z0-9-]`), used in URLs (`#/item/<id>`). |
| `name` | yes | Display name. |
| `category` | yes | Must match a `categories[].id` in `library.json`. |
| `summary` | yes | One line. |
| `author` | yes | Author / maintainer. |
| `status` | yes | `stable`, `beta`, `alpha`, `experimental` or `discontinued`. |
| `links.source` | yes | Must be an `https://` URL (official/open-source page). |
| `icon` | no | Sprite word (`gamepad`, `unlock`, `tool`, `app`) or an image URL/path. |
| `thumbnails` | no | Array of image paths/URLs shown in the item's gallery. |
| `description` | no | Paragraph. |
| `version`, `updated`, `license` | no | Display only. |
| `firmware.min` / `firmware.max` | no | `MAJOR.MM` (e.g. `7.00`), inclusive. |
| `tags`, `warnings`, `requires` | no | Arrays; `requires` references other item ids. |
| `verified` | no | `true` only after checking the project against its official source. |
| `featured`, `order` | no | Featured rail / curated sort order. |

---

## Add a new platform

1. Create the folder `development/library/platforms/<id>/`.
2. Add `platform.json`:

   ```json
   {
     "id": "switch",
     "name": "Nintendo Switch",
     "shortName": "Switch",
     "description": "Nintendo Switch homebrew — emulators, tools and apps.",
     "icon": "gamepad",
     "thumbnail": "",
     "browseBG": "linear-gradient(135deg, rgba(2,19,47,0.8), rgba(70,80,150,0.8))",
     "order": 2,
     "itemFiles": []
   }
   ```

   - `itemFiles` must list every item file in the platform's `items/` folder.
   - `thumbnail` may be empty; the site then uses the first existing
     `library/platforms/<id>/thumb.png|jpg|jpeg|svg`.
3. Add item files under `.../<id>/items/` and list them in `itemFiles`.
4. Register the platform in `development/library.json` → `platforms`:

   ```json
   "platforms": [
     "library/platforms/ps5/platform.json",
     "library/platforms/switch/platform.json"
   ]
   ```
5. Validate: `node development/tests/validate-library.mjs`.

---

## Local preview (optional)

The site must be served over HTTP (it fetches `library.json`):

```bash
cd development
python -m http.server 8080 --bind 127.0.0.1   # -> http://127.0.0.1:8080/
```

On Windows you can also double-click `development/run_site.bat`.

---

## Rules & disclaimer

- Link to **official / open-source** project pages only.
- **Do not** host or link ROMs, BIOS files, keys, game dumps or copyrighted packages.
- All external links must be `https://`.
- A project by [ALONSOJR1980](https://github.com/alonsojr1980); not affiliated with any console vendor.
  All trademarks belong to their respective owners.

---

## Deployment (maintainers)

GitHub Pages is built by the workflow in `.github/workflows/deploy-pages.yml`, which uploads the
**`development/` folder** as the Pages artifact on every push to `main`.

> GitHub Pages' "Deploy from a branch" mode only allows `/` or `/docs`, so an GitHub Actions
> workflow is used to publish the `/development` folder.
