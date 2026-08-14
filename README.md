# **<u>[▶ Live site: https://whitewater42.github.io/Satisfactory_BP_HaCk3Rr/](https://whitewater42.github.io/Satisfactory_BP_HaCk3Rr/)</u>**

# Satisfactory Blueprint Hacker — Web

A browser-based tool for editing and generating [Satisfactory](https://www.satisfactorygame.com/)
blueprint files (`.sbp`/`.sbpcfg` pairs) at the binary save-data level. This
is **not** a mod and doesn't touch the game itself — it reads/writes the same
blueprint files the game's in-game Blueprint Designer produces, outside the
game, then you place the edited file back into your `Blueprints` folder
normally.

Runs entirely client-side: upload a file, it's parsed and edited in your
browser tab, you download the result. Nothing is ever sent to a server —
there isn't one. The whole site is static files (HTML/CSS/JS) plus a tiny
zero-dependency local dev server for testing before deploy.

**Every blueprint this tool produces is meant to be handed to someone else to
use.** The guiding principle throughout is convenience for whoever places the
blueprint, over "fair" or realistic gameplay — e.g. a hacked battery that
never runs out of charge, not a realistic power grid.

## Quick start

No build step, no `npm install` — this is plain ES modules loaded straight by
the browser, and the one third-party dependency
([`@etothepii/satisfactory-file-parser`](https://www.npmjs.com/package/@etothepii/satisfactory-file-parser))
is imported from a CDN (`esm.sh`) directly in `app.mjs`. All you need is Node
for the local static-file server (browsers block ES module `import`/`fetch()`
against `file://` pages, so you can't just double-click `index.html`):

```
node serve.mjs
```

Then open **http://localhost:5500/** (not the `index.html` file directly).
Ctrl+C stops the server. That's the entire dev loop — edit a file, refresh
the browser tab.

## What's here today

Four tabs, all reachable from the nav bar in `index.html`/`app.mjs`:

- **Kit Generators** (`tabs/kitGenerators.mjs` + `tabs/kitPanel.mjs`) — four
  ready-made shopping-list kits, each packed into a free Personal Storage box
  sized to exactly fit: **MAM Full Unlock** (68 item types, 18,203 items, 161
  slots), **Tier/HUB Milestone Unlock** (32 item types, 71,725 items, 429
  slots), **Space Elevator Project Assembly** (12 item types, 9,056 items, 182
  slots — the finished parts to hand in, not the elevator building's own
  construction cost), and **Vehicle Emergency Kit** (7 fixed items, no
  picker — always generates the same kit). The first three let you
  check/uncheck individual item types before generating; the vehicle kit
  doesn't offer a picker since it's a fixed, pre-planned loadout.
- **Blueprint Editor** (`tabs/blueprintEditor.mjs`) — upload *any* blueprint
  and edit its build cost and machine contents: make the whole thing free,
  keep only a "basic materials" allowance real (Iron Plate/Rod/Reinforced
  Plate, Wire, Cable, Screws, Concrete), free specific buildable categories
  (see `data/catalog.json`) while leaving the rest costed, and/or pre-load a
  free full stack of any recipe ingredient into every production machine that
  needs it. Everything defaults to checked/free — this is opt-*out*, not
  opt-in.
- **Elevator Designer** (`tabs/elevatorDesigner.mjs`) — build a brand-new
  elevator shaft from scratch: list floors with a name and a height (meters
  or "big wall" units, 1 wall = 4m), and it generates a complete elevator
  with correctly positioned floor stops. Warns past 25 floors (the in-game
  floor-stop picker UI has exactly 25 slots; more has reproducibly crashed
  the game on placement) and hard-warns at/past 1997m (a real, unavoidable
  lethal damage-over-time altitude in this game). The graphical shaft preview
  panel is a placeholder — it's blocked on reference art assets, not on
  anything logical.
- **Personal Equipment Kit** (`tabs/equipmentKit.mjs`) — a single kit card
  (27 items: gear + a wide range of ammo/fuel) with category quick-select
  buttons (Mobility / Offence / Boom Boom, driven by each item's `tags` in
  `data/bundles/equipment_kit.json`) and a one-way nudge that auto-checks
  Packaged Liquid Biofuel when you check the Chainsaw.

## Project structure

```
index.html        Page shell + nav; loads app.mjs as a module
app.mjs            Tab router. SITE_VERSION badge, imports the Parser once
                    from esm.sh and passes it into every tab's render()
style.css          All styling
serve.mjs          Zero-dependency local dev server (Node http/fs/path only)

lib/               Reusable engine — framework-agnostic, no Node dependency
  blueprint-io.mjs      load/write a blueprint pair (ArrayBuffer in/out);
                        resolveRef/buildByNameMap/findByTypePath/filterByTypePath
  properties.mjs        low-level SaveGame property object builders
  inventory.mjs         resizeInventory (container/slot resize technique),
                        packStacks, fillSlots
  itemCosts.mjs         makeFree, stripPaths, isolateToEntries, summarize
  buildCost.mjs         resolves a placed buildable's REAL cost from its own
                        mBuiltWithRecipe reference (not a name-guessing scheme)
  ingredientPicker.mjs  finds production machines + their recipes, lists
                        distinct ingredients, fills selected ones
  elevator.mjs           parametric elevator generator (setFloors() entry point)
  personalStorageKit.mjs "pack a shopping list into a free Personal Storage
                        box" — shared by the two kit tabs
  kitStacking.mjs       total item count -> [full stacks + 1 remainder] specs
  download.mjs          triggers a browser file download from raw bytes
  fetchHelpers.mjs      fetchJson / fetchArrayBuffer wrappers

tabs/              One module per nav tab; each exports async render(container, Parser)

data/
  catalog.json          buildable-category -> real typePath map (Free-category
                        checkboxes). Each entry has a confidence field.
  recipes_trimmed.json  recipe -> ingredient (path/name/amount/stackSize) index
  bundles/*.json        pre-computed kit shopping lists (see above)

templates/         Real minimal .sbp/.sbpcfg pairs used as the "seed" blueprint
                    that generators build on top of (a 1-slot Personal Storage
                    box, a 1-floor elevator)
```

## How the editing actually works

The parser library (`@etothepii/satisfactory-file-parser`) turns a `.sbp` +
`.sbpcfg` pair into a JS object tree (`blueprint.objects[]`, each with a
`typePath`, `instanceName`, and a `properties` bag) and back. Every technique
in `lib/` is really just "read/mutate that object tree in a specific way,
confirmed to match what the game actually does with it in-game" — three
mechanics do almost all of the work:

**1. Build cost is a fixed, disconnected manifest.** A blueprint's placement
cost is *not* computed from what's physically in it — it's a separate array,
`blueprint.header.itemCosts`, computed once by the game when the blueprint
was originally captured in-game, and never recalculated afterward. That's the
entire reason any "make it free" feature can exist: editing
`mInventoryStacks`/machine contents after the fact never touches
`itemCosts`, so newly-added items are never charged. `lib/itemCosts.mjs`'s
`makeFree()` just sets it to `[]`; `isolateToEntries()` replaces it with a
specific, real cost computed from each placed object's own
`mBuiltWithRecipe` reference (see `lib/buildCost.mjs`) — that's how "Basic
materials only" and the free-category checkboxes keep *some* real cost while
freeing the rest, without ever needing to know what the blueprint originally
cost.

**2. Container/inventory resizing needs four things in lockstep, not just
one.** Naively resizing `mInventoryStacks` (the actual item array) does
nothing visible in-game by itself — three more things have to move with it:
`mArbitrarySlotSizes` and `mAllowedItemDescriptors` must be resized to the
same length, **and** `mAdjustedSizeDiff` (an `IntProperty` — new total minus
the container's original default slot count) must be set. Miss any one of
the four and the container silently displays its old slot count in-game
regardless of what the raw arrays say. This is `resizeInventory()` in
`lib/inventory.mjs`, confirmed in-game (not just "round-trips clean" —
actually placed and read in the running game) at 1, 5, 10, 500, and 10,000+
slots, both growing and shrinking a container past its default.

**3. Machine recipes/ingredients resolve through two different reference
styles.** A machine's `mCurrentRecipe` property holds the recipe's own class
path directly (usable as a lookup key into `data/recipes_trimmed.json` with
no extra indirection), but its `mInputInventory` is an in-blueprint instance
reference that has to be resolved via `instanceName` against
`buildByNameMap(blueprint)` first (`resolveRef()` in `blueprint-io.mjs`) —
same resolution pattern used for `mStorageInventory` on storage containers.
Once resolved, filling a slot is the same `mInventoryStacks`
array-of-`InventoryStack` shape as a storage container; slot index N = the
Nth ingredient listed in that recipe (confirmed on both single-slot
Constructors and multi-slot Assemblers/Manufacturers).

The elevator generator (`lib/elevator.mjs`) is the one piece that isn't
"edit something that already exists" — it clones an existing floor stop
object as a template and pushes new objects into `blueprint.objects[]`
directly, positioning each by writing `transform.translation.z` in
centimeters and registering it in the elevator's own
`mFloorStopInfos` list.

## Data files — what they are and how to extend them

- **`data/catalog.json`** — every buildable typePath used by the Blueprint
  Editor's free-category checkboxes, grouped into 10 categories (Signs,
  Lighting, Dimensional Storage, Power Poles + Wall Outlets, Power Switches,
  Power Storage, Industrial Storage, Industrial Fluid Buffer, Radar Tower,
  Personal Elevator). Each buildable entry has a `confidence` field
  (`confirmed` = proven against a real placed blueprint, not guessed from
  naming) and a `sources` array naming the blueprint file(s) it was
  confirmed against — treat any non-`confirmed` entry as unverified. To add a
  category: add a new key under `categories` with a `displayName` and a
  `buildables` array of `{displayName, typePath, confidence, sources}` — the
  UI picks up new categories automatically, no code change needed.
- **`data/recipes_trimmed.json`** — flat array of
  `{recipePath, ingredients: [{path, name, amount, stackSize}], ...}`,
  keyed by recipe class path. This is what `lib/ingredientPicker.mjs` and
  `lib/buildCost.mjs` both look up against.
- **`data/bundles/*.json`** — one file per kit,
  `{id, displayName, description, pickable, items: [{name, path, stackSize,
  count, tags?}], totalItems, totalStacks}`. `pickable: false` (only
  `vehicle_kit.json`) means the UI skips the item picker and always generates
  the full fixed list. To add a new kit tab entry, add a bundle file here and
  reference its URL in `tabs/kitGenerators.mjs`'s `BUNDLE_URLS` array (or
  build a dedicated tab like `equipmentKit.mjs` did, if it needs custom UI
  like category buttons).

Item paths and stack sizes ultimately trace back to the game's own
localization/recipe data (`en-US.json`/`Docs.json`), cross-checked against
[Goz3rr/SatisfactorySaveEditor](https://github.com/Goz3rr/SatisfactorySaveEditor)'s
reference path list — that resolution work happens upstream of this repo, not
in it. Treat everything already in `data/` as trustworthy; if you need a path
that isn't there yet, don't guess from the item's display name or icon
folder — icon-derived guesses have historically been wrong about 15% of the
time.

## Adding a new tab

1. Create `tabs/yourTab.mjs` exporting `async function render(container,
   Parser)` — `container` is an empty `<div>` to fill, `Parser` is the
   already-imported parser library instance (don't re-import it yourself).
2. Add `{ id, label, mod: './tabs/yourTab.mjs' }` to the `TABS` array in
   `app.mjs`. The router lazy-imports and caches each tab module on first
   visit.
3. Bump `SITE_VERSION` in `app.mjs` (the badge next to the nav title) — do
   this on **every** change to any tab/lib/app file, not just new tabs. It's
   the only way to tell, after a hard refresh, whether you're looking at
   current code or a stale cached bundle.

## How to verify a change is actually good

There's no automated test suite — verification is manual, in three layers,
roughly in order of how much it actually proves:

1. **Does it round-trip without throwing?** Upload a real blueprint, apply
   your edit, download the result, then re-upload *that* file back into the
   same tool and confirm it loads cleanly and shows the expected state (slot
   counts, checked categories, etc.). This catches malformed property
   objects but proves nothing about in-game behavior.
2. **Does the browser UI behave correctly across the actual states?** Click
   through: empty blueprint upload, a blueprint with no production machines
   (ingredient picker should say so, not error), toggling Free Blueprint vs.
   Basic Materials Only vs. category checkboxes (they're mutually exclusive
   in specific ways — check `blueprintEditor.mjs`'s toggle logic if you touch
   this), Select all/none buttons, the elevator's floor warnings at 25+
   floors and 1997m+.
3. **Does it work in the actual game?** This is the only step that actually
   confirms anything — round-tripping clean in the parser has, more than
   once in this project's history, turned out to not be sufficient (the
   container-resize technique looked correct for a long time before
   `mAdjustedSizeDiff` was found to be the missing piece). Place the
   generated/edited blueprint in Satisfactory and confirm: the cost prompt
   matches what you intended, slot counts and contents match, machines show
   the expected recipe/ingredients. If you don't have a way to test
   in-game, say so explicitly rather than reporting a change as confirmed
   working.

## Known gaps

- **Elevator shaft graphical preview** is a placeholder panel — needs
  reference wall/foundation/floor-stop tile art before it can be built, not
  blocked on anything else in that tab.
- **`buildCost.mjs`'s cost resolver doesn't fully handle variable-length
  buildables** (conveyor belts, pipes, power lines) — their real cost scales
  with placed length, which isn't captured by reading a fixed recipe off the
  object. Not currently a problem for any of the free-category list (signs,
  lighting, power poles, storage, etc. are all fixed-cost), but would need
  work before extending that list to belts/pipes.
- **"Hacked Blueprint Detector" (idea, not built)** — the inverse of the free
  tools: flag an *uploaded* blueprint as suspicious (near-empty `itemCosts`
  relative to what it should cost, more Power Shards/Somersloops installed
  than a building should allow, etc.) rather than editing it.

## Deployment

Static site, deployed via GitHub Pages directly from this repo — no build
step, no server. Pushing to `main` is the entire deploy process.
