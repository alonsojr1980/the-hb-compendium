# Data Model — modular, platform-based library

This is the field-by-field reference for the compendium's content. Since `schemaVersion` **2.0.0** the library is **modular and organized by platform**. There is no single file containing all items.

Authoritative machine contracts (JSON Schema 2020-12):
- `development_plan/library.schema.json` — the **manifest** (`library.json`).
- `development_plan/platform.schema.json` — a **platform** (`library/platforms/<id>/platform.json`).
- `development_plan/item.schema.json` — a single **item** (`…/items/<name>.json`).

The runtime copies are `development/library.json` and `development/library/platforms/ps5/*`. The implementation's own structural validator is `development/tests/validate-library.mjs`.

## 1. Layout and filename conventions

```text
library.json                                        manifest: schemaVersion, site, categories, redirects, platforms[]
library/platforms/<platform_id>/platform.json       platform metadata + itemFiles[]
library/platforms/<platform_id>/items/<name>.json   one bare item object per file
```

| Rule | Detail |
|---|---|
| Item filename | `item.id` with `-` → `_`, plus `.json`. Example: `ps5-retroarch` → `ps5_retroarch.json`. |
| Platform folder | Lowercase slug, mirrors `platform.id` (`ps5/`). |
| Paths in manifest | Relative to the manifest (`library/platforms/ps5/platform.json`). |
| Why a manifest exists | Static hosts (GitHub Pages) cannot list directories, so every file must be enumerated. |
| `platformId` | Attached to each loaded item at runtime from its platform; **not** persisted in item files. |

## 2. Manifest — `library.json`

```jsonc
{
  "schemaVersion": "2.0.0",
  "site": { /* metadata + disclaimer */ },
  "categories": [ /* topic definitions */ ],
  "redirects": { "old-item-id": "new-item-id" },
  "platforms": [ "library/platforms/ps5/platform.json" ]
}
```

| Field | Required | Type | Notes |
|---|---|---|---|
| `schemaVersion` | yes | semver string | Contract version. **Current 2.0.0.** Minor = additive fields; major = breaking layout/field change. App warns (not crashes) on unknown majors. |
| `site` | yes | object | See §3. |
| `categories` | yes | array | See §4. At least one, shared across platforms. |
| `redirects` | no | object | Old `item.id` → new `item.id`; the app resolves old `#/item/<old>` links. |
| `platforms` | yes | array of path strings | ORDERED. At least one. Each is a relative path to a `platform.json`. |

**Legacy loader tolerance (not part of the target schema):** the loader in `development/js/data.js` also accepts a flat `itemFiles[]` array or an inline `items[]` array for backward compatibility with pre-2.0 libraries. New content must use `platforms[]`.

## 3. `site`

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | string | Site name in header/`<title>`. |
| `tagline` | no | string | Hero subtitle. |
| `description` | no | string | Meta description / OpenGraph. |
| `lastUpdated` | yes | date (`YYYY-MM-DD`) | Content revision date; shown in the footer. |
| `disclaimer` | yes | string | Lawful-homebrew / unofficial notice (DEC-005). Rendered in the footer. |
| `repo` | no | https URL | Public repository for "edit this library" links. Must be a real URL; currently a placeholder (`your-user/…`) — see DEV-4. |
| `defaultFirmwareHint` | no | `MAJOR.MM` string | e.g. `"13.60"`; may pre-fill the firmware selector. |

## 4. `categories[]` (in the manifest)

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | yes | slug `[a-z0-9-]+` | **Stable**; used in routes and by `item.category`. |
| `name` | yes | string | Display label. |
| `description` | no | string | Shown under the category heading. |
| `icon` | no | string | App sprite key: `gamepad`, `unlock`, `tool`, `app`. Unknown keys fall back to a default glyph. |
| `order` | no | integer | Ascending display order; ties broken by array order. |

**Chosen categories:** `emulators`, `jailbreaks`, `tools`, `apps`.

## 5. Platform — `library/platforms/<id>/platform.json`

```jsonc
{
  "id": "ps5",
  "name": "PlayStation 5",
  "shortName": "PS5",
  "description": "Native PlayStation 5 homebrew — emulators, jailbreaks, tools and apps.",
  "icon": "gamepad",
  "order": 1,
  "itemFiles": [ "ps5_retroarch.json", "etahen.json" ]
}
```

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | yes | slug | **Stable**. Attached to each loaded item as `platformId`. |
| `name` | yes | string | Display name, e.g. `PlayStation 5`. |
| `shortName` | no | string | Compact chip label, e.g. `PS5`. |
| `description` | no | string | One-line platform summary. |
| `icon` | no | string | App sprite key (see §4). |
| `order` | no | integer | Ascending display order across platforms. |
| `itemFiles` | yes | array of filenames | ORDERED. Filenames live under this platform's `items/`. May be empty. |

### 5.1 GUI mapping — platform dimension (as-built, DEC-011)

The platform dimension shown in the GUI is derived **only** from these platform definitions, keyed by `item.platformId`. The per-item device-variant `platform` array is not involved (see §6).

| GUI element | Source (data-driven) |
|---|---|
| Platform filter chips (`#platform-toggle`) | `library.json.platforms[]` definitions, sorted by `order`; rendered as `All platforms` + one chip per definition, labelled `shortName \|\| name \|\| id`, with chip id = the platform `id`. The group is **hidden when zero platforms are defined**. |
| Platform filtering | `state.platform !== 'all' && item.platformId !== state.platform` — no device-variant logic. |
| Card + detail badge `.badge--platform` | Item's `platformId` looked up in the definitions; label = `shortName \|\| name \|\| id` (current `PS5`). No badge when the item has no `platformId`. |
| Unknown `?platform=<id>` | Normalized to `all` on boot (prevents a stuck empty filter after a platform is renamed/removed). |

Adding a platform is a **data-only** change: create `platform.json` + `items/`, append its path to `library.json.platforms[]`; the filter and badges extend automatically. Optional platform-scoped routing is still open (plan §12 U-6).

## 6. Item — `library/platforms/<id>/items/<name>.json`

A **bare** item object (no wrapper). Fields marked (*) are what the product's validator/renderer rely on.

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` * | yes | slug | **Stable** deep-link key. Filename derives from it (`-`→`_`). |
| `name` * | yes | string | Display name. |
| `category` * | yes | category id | **Cross-check:** must exist in `categories[].id`. |
| `icon` | no | string | **Named word** (`gamepad`, `unlock`, `tool`, `app`, `search`, `external`, `close`, `chevron`, `alert`, `check`, `cpu`, `sparkle`, `shield`) **or** an image URL/path (`https://`, `//`, `/`, `./`, `../`). Rendered as `<img>` for URLs, else as the inline sprite glyph; an unknown word or a failed image falls back to the item's **category icon**. Populated for all 19 current items (14 URLs + 5 words). |
| `summary` * | yes | string ≤ 280 | One-line card text. |
| `description` | no | string | Longer detail text, rendered as escaped plain text. |
| `author` * | yes | string | Project author/maintainer. |
| `version` | no | string | Human string; display only. Empty string allowed. |
| `updated` | no | date | Last verification date; drives "Recently updated" sort. |
| `status` * | yes | enum | `stable`, `beta`, `alpha`, `experimental`, `discontinued`. |
| `platform` | no | array enum | **RETAINED but NOT surfaced by the GUI** (device variants). Values `PS5`, `PS5 Pro`; omitted/empty = assume PS5. Kept valid in `item.schema.json` because the current item files contain it, but the GUI does **not** read it — the platform dimension comes from `item.platformId` + the platform definition (§5.1). May be re-surfaced later under a different label (plan §12 U-6). |
| `firmware` | no | object | `{ min, max, notes }`, `MAJOR.MM`. Omitted = unspecified. |
| `tags` | no | array slug | Lowercase, hyphenated. Powers search. |
| `links.source` * | yes | https URL | **Official/open-source page only** (DEC-005). |
| `links.releases` | no | https URL | Release/downloads page. |
| `links.docs` | no | https URL | Docs/readme. |
| `links.video` | no | https URL | Demo/guide video. |
| `requires` | no | array item id | **Cross-check:** each id should exist; the app links it if present, else renders a non-link badge. |
| `license` | no | string | SPDX-ish string (e.g. `GPL-3.0`). Empty string allowed. |
| `warnings` | no | array string | Safety/legal/technical warnings. |
| `verified` | no | boolean (default false) | Maintainer-confirmed; unverified renders an "Unverified" badge (RISK-01). |
| `featured` | no | boolean | Pin to the hero featured rail. |
| `order` | no | integer | Manual order within category (used by "Curated" sort). |
| `platformId` | read-only | slug | Added at load time from the platform; not persisted. |
| `media` | no | object | **LEGACY/deprecated** (v1). Superseded by top-level `icon`; kept only so very old inline items still validate. Not used by the product. |

**Card/detail links** consider `source`, `releases`, `docs`, `video`, in that order.

## 7. Cross-field rules NOT expressible in JSON Schema
Checked by `development/tests/validate-library.mjs`:
1. Every `item.category` exists in `categories[].id`.
2. Every `requires[]` id resolves to a known item id (warns, does not fail).
3. `item.id` values are globally unique across platforms; `category.id` values are unique; platform `id` values are unique.
4. `redirects` values resolve to item ids (warns otherwise).
5. `links.source` is `https:` for every item.
6. `firmware.min ≤ firmware.max` when both are present (string compare is safe for `X.XX`).
7. Filename convention: `<id with - → _>.json` (warn/documented, not enforced by the validator).

## 8. Firmware semantics
- Values are `MAJOR.MM` with a two-digit minor (`7.00`, `13.60`, `14.00`) so a simple `major*1000+minor` integer compare is safe.
- Compatibility of user firmware `F`: `min ≤ F ≤ max` (inclusive) when the bound exists.
- Missing bounds mean **unknown**, shown as such — **not** "compatible". This matters for FR-10/RISK-01.
- Compatibility states returned by the app: `unset` (no firmware chosen), `unknown` (no bounds), `compatible`, `incompatible` (below `min` or above `max`).

## 9. Update runbooks (maintainer)

### 9.1 Add or edit an item (usual case)
1. Create/edit `library/platforms/<platform_id>/items/<name>.json` as a single bare item object.
   Filename = `id` with hyphens → underscores (`ps5-retroarch` → `ps5_retroarch.json`).
2. Add the filename to that platform's `platform.json` → `itemFiles` (if new).
3. Set `updated` to today and `verified: true` only after confirming against the official source.
4. Validate:
   ```bash
   node development/tests/validate-library.mjs
   npx --yes ajv-cli@5 validate -s development_plan/item.schema.json \
     -d development/library/platforms/ps5/items/<name>.json --spec=draft2020
   ```
5. Commit and push. No rebuild — the live site fetches the files.

### 9.2 Add a new platform
1. Create `library/platforms/<id>/platform.json` with at least `id`, `name`, `itemFiles`.
2. Add item files under `library/platforms/<id>/items/`.
3. Append the platform file's path to `library.json` → `platforms`.
4. Validate the manifest + platform, then commit. The loader tags each item with `platformId`; the GUI filter chips and `.badge--platform` badge extend automatically with no code change (DEC-011, §5.1).
   *(Optional platform-scoped navigation/routing is still open — plan §12 U-6.)*

### 9.3 Remove/rename an item
Add a `redirects` entry (old id → new id) so old `#/item/<old>` deep links resolve.

## 10. Migration & rollback
- **versioning:** additive field = bump minor; breaking layout/field change = bump major. The loader tolerates unknown majors.
- **1.0.0 → 2.0.0 (executed):** a monolithic `library.json` with inline `items[]` was migrated to the platform layout by `development/tools/split-library.mjs` (inline → flat `items/`) then `development/tools/restructure-platforms.mjs` (flat → `platforms/`). The old `items/` folder was removed.
- **Legacy support:** the loader still resolves flat `itemFiles` and inline `items`, so a 1.x file still renders; but the target schema (§2) requires `platforms[]`.
- **Rollback:** content and code are plain git files; rollback = revert the commit. No database.

## 11. Privacy/security
- No personal data is stored. No analytics fields.
- All JSON-derived text is inserted with `textContent`/DOM construction; anchors are created only for `https:` URLs and carry `rel="noopener noreferrer"` (NFR-S1).
