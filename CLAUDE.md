# CLAUDE.md — pou-rocks.github.io

**This repo is the published site, not its source.** Every file here is the static export of a
Next.js app (`output: 'export'`) whose source lives elsewhere — *not on this machine*.
GitHub Pages serves this tree verbatim, so `main` **is** production.

## Working agreement

Agreed with the user on 2026-08-25. These four rules govern all work in this repo.

### 1. Claude is the sole developer

The user does not write or review code here. There is no second reader.

**Consequence:** no human review will catch a mistake. Correctness has to come from tests —
which is precisely why rule 3 exists. Rules 1 and 3 are load-bearing for each other.

### 2. No code comments

> I won't be reading it and you will be the only one who will read.

Do not annotate what code does; a future session can read the code. A **note** is permitted
only where it records something that cannot be re-derived from the code itself — a non-obvious
game rule, an upstream-bug workaround, the provenance of a magic constant. Test-drive it: if
deleting the line loses no information, don't write it.

Code only. Commit messages, this file, and user-facing prose stay written out.

### 3. Test-driven development

Red → green → refactor. The failing test comes first, then the implementation.

**Currently unrunnable — see [Blocker: no source](#blocker-no-source).** Until source and a
test runner exist, nothing in this repo can be genuinely TDD'd, and the only verification
available is output-level smoke testing. Never describe a change as test-driven when it wasn't.

### 4. Git and deploy

`git` and `gh` are both available. Commits are autonomous; **every push needs a fresh go-ahead.**

| Action | Authority |
|---|---|
| Commit on `develop` | Claude, autonomously — no need to ask |
| Push `develop` | **Ask first** — deploy-safe, but the user wants the call-out |
| Merge `develop` → `main` | **Ask first** |
| Push `main` | **Ask first — this is the deploy** |
| `gh workflow run` / `workflow_dispatch` | Never, unless explicitly instructed |
| Delete/force-push any branch | Never, unless explicitly instructed |

> About pushes, since it will trigger the deployment, let me call it out before you make a move.

Approval is **per-push, not standing** — one "go ahead" authorizes one push, not the next.

## Purpose and audience

This site exists to give **PoU alliance members** game information for *Dark War Survival*.
It is an alliance utility, not a general-purpose tool. Every design call resolves toward
"can a member find the number they need, fast, on the device they actually hold."

### UX rules

**Mobile first, desktop second.** Members read this on a phone, mid-game. Design and verify at
phone widths first; desktop is the supportive case, never the reference case.

- Build the phone layout first, then widen. Do not design at desktop and shrink.
- Anything wide — tables, timelines, the hive map — needs a working phone story
  (horizontal scroll in its own container, card fallback, or progressive disclosure).
  The page body must never scroll sideways.
- Touch targets, not hover targets. The Hive Map nav dropdown is currently hover-only
  (`relative group`), which does not exist on a phone — treat that pattern as a bug.
- Verify at 360-390 px CSS width before calling anything done.

## Localization policy

**Support exactly the languages the game officially supports — no others.** Terminology
follows the game, not a literal translation of the site's English.

Author in **English first**, then ship *full* localization for every supported locale in the
same change. A locale that lags is a bug, not a backlog item.

**Target: all 16.** Endonyms below are the game's own (string `390752`+, read from each
language's own blob), so the picker matches what members see in-game. Counts are parsed
`id=text` pairs at build 1.250.661.

| Locale | Endonym | Blob | Strings | Notes |
|---|---|---|---|---|
| `en` | English | 6 | 33,044 | Authoring language; `fallbackLng` |
| `ko` | 한국어 | 15 | 33,041 | Closest to game terms already (4 of 24 differ) |
| `ja` | 日本語 | 12 | 33,039 | |
| `zh` | 简体中文 | 14 | 35,073 | Game's source language. Bare `zh` (not `zh-Hans`) so existing users' stored `language:"zh"` keeps matching |
| `zh-Hant` | 繁體中文 | 11 | 35,235 | Label from game string `391083` |
| `ar` | اللغة العربية | 13 | 33,043 | **RTL** — the only one in the set |
| `id` | Bahasa Indonesia | 9 | 33,044 | |
| `th` | ไทย | 10 | 33,044 | **To add** |
| `vi` | Tiếng Việt | 4 | 33,041 | **To add** |
| `tr` | Türkçe | 1 | 33,041 | **To add** |
| `de` | Deutsch | 2 | 33,043 | **To add** |
| `fr` | Français | 7 | 33,044 | **To add** |
| `es` | Español | 8 | 33,044 | **To add** — Latin American (`Ustedes`, `Tomar`) |
| `pt` | Português | 3 | 33,044 | **To add** — Brazilian (`Você`, `Equipe`) |
| `it` | Italiano | 5 | 33,044 | **To add** |
| `ru` | Русский | 0 | **11,765** | **To add** — see caveat below |
| ~~`tl`~~ | — | — | — | **Remove.** Not a game language (decision, 2026-08-25) |

**Russian is only 33.5% translated in-game** — 11,765 of 33,044 ids, 21,964 missing. Its blob
also carries a stray untranslated header line (`RU包保存列`), which suggests work in progress
rather than a shipped language. Terminology rule 2 (fall back to the game's English) will fire
constantly here. **Open question: is Russian even selectable in the game's own settings?** If
it is not, reconsider shipping it. Do not treat 33.5% coverage as a translation bug on our side.

`zh-Hans` and `zh-Hant` share the endonym `中文` (`390759`) in-game; the table uses the explicit
forms so the picker is unambiguous. `繁體中文` is game-sourced, `简体中文` is conventional.

### Payload budget — this is a mobile-first constraint

The current architecture inlines **every locale into every payload**. That does not survive
going to 16:

| Artifact | Now (7 locales) | Projected (16) |
|---|---|---|
| `guides/index.txt` | 360 KB | **~800 KB** |
| `layout-*.js` (UI strings) | 88 KB | ~180 KB |

A member reading Korean on a phone currently downloads six languages they cannot read; at 16 it
would be fifteen. **Adding locales without changing this is a regression against the
mobile-first rule.** Load locale bundles on demand (dynamic import per locale, or split the
guides payload per locale) *before* or *with* the expansion — not after.

**Terminology rules:**

1. A game term uses the game's string for that locale, even where it diverges from the English.
   The game's own translations are loose — `Age of Science` is `研究科技` ("Research Technology")
   in Simplified Chinese. Follow the game anyway; that is what members see on their screen.
2. **Where the game leaves a term untranslated, use the game's English.** The Indonesian blob
   ships `Blade of Dominion` as `"Conquest Sword"` and `Scale of Law` as `"Scales of Order"` —
   in English. Mirror that rather than inventing an Indonesian term.
3. Site-authored copy (nav, guides prose, planner captions) is *not* game text — translate it
   naturally. Rules 1-2 bind only game nouns: theme names, event names, titles, resources.
4. Where an English game string maps to several string ids with divergent translations, the
   binding is **undecidable from the APK** and needs an in-game screenshot. Never guess.

## Game data

The game client is the authority for game facts. **Build 1.250.661** (versionCode 1593),
Unity 2021.3.58f1 IL2CPP:

    ~/Projects/dws/Dark+War+Survival_1.250.661_APKPure.xapk      (1.98 GB)

`../dws-wiki/CLAUDE.md` is the extraction handbook — read it before digging. It carries the
AssetBundle/Lua recipe, the frontmatter conventions, and a **Traps** section listing three
wrong answers already shipped in that project. Its extractors live in `../dws-wiki/tools/`
(`pack.py` reads the 1.88 GB asset pack **in place** — never extract it; note its XAPK path
still points at `~/Downloads`).

**Localization needs no Lua.** Unlike the numeric datatables, `datatable_lang_localization`
holds 16 plain-text `TextAsset` blobs of newline-separated `id=text` — strip the 8-byte
`UnityRaw` prefix, load with UnityPy, read directly. Sorting the objects by `path_id` yields
the language index order (English = 6), which is stable and matches dws-wiki's note.

The **APK/server boundary** from dws-wiki applies here too: numeric config and system identity
ship in the APK; display names for *rotating* content, milestones, prices and rotation order
come from the server and need a screenshot. "Not in the APK" is not the same as "false".

## Deploy mechanics

```
develop  ──► commit + push freely (no deploy)
                    │  on explicit instruction
                    ▼
main     ──► push ──► Actions ──► https://pou-rocks.github.io/
```

`.github/workflows/deploy-pages.yml`: checkout → `rm -rf .git .github` → `upload-pages-artifact`
(path `.`) → `deploy-pages`. No build step — the committed tree *is* the artifact.

Two independent gates keep non-`main` branches from deploying:

1. Trigger is `push: branches: [main]`.
2. The `github-pages` environment has a deployment branch policy allowing **only `main`**.

**`deploy.sh` is retired** (decision 2026-08-25). It lived in the lost source project and
force-pushed a fresh history over `main` on every run (`rm -rf out/.git; git init; push -f`) —
which is why history is one commit and old deployment SHAs dangle. **Never reintroduce it:** it
would destroy this repo's history and any uncommitted work in it.

Remote is SSH via the pre-existing `github-personal` alias (`ssh.github.com:443`, key
`id_ed25519` = XronAce). Port 22 is blocked by corporate ZTNA on this machine, and HTTPS/OAuth
pushes are refused for commits touching `.github/workflows/*` unless the token carries the
`workflow` scope — so SSH is the only working path, not merely a preference.

Pages config: `build_type: workflow`, source `main` `/`, no CNAME, HTTPS enforced,
`custom_404: true`. Concurrency group `pages-deploy` with `cancel-in-progress`.

**Everything committed is published.** The workflow uploads the whole repo (minus `.git`,
`.github`, and `CLAUDE.md`, which the strip step removes). A scratch script, an audit doc, or a stray export committed here becomes a
public URL. Analysis artifacts belong in `../dws-wiki` or a scratch dir, never in this repo.

**`.nojekyll` is load-bearing.** Without it Pages runs Jekyll, which ignores `_next/` for its
leading underscore and takes the whole site down. Never delete it.

## Working without source

The Next.js source is **permanently gone** (confirmed 2026-08-25). It lived at
`~/Projects/dws/pou-rocks-site`, was last active 09:52-10:00 that morning, and is not on disk,
in Trash, or in any reachable backup. **This repo is the only artifact.** Do not plan work that
assumes the source reappears, and do not re-litigate this.

What it was, recovered from a session transcript: Next.js 15.1.3, React 18.3.1, TypeScript 5.6,
Tailwind 3.4, i18next 23 + react-i18next 14 + browser-languagedetector, zustand 4.5,
react-markdown 10 (remark-gfm/emoji, rehype-slug/autolink/highlight), recharts 2.12,
gray-matter. Tree: `app/ components/ content/ i18n/ lib/ store/ types/ public/`. It also held an
**unpublished `app/bulletin` route** that never shipped.

### How changes are made now

Changes are patches to build output: minified chunks in `_next/static/chunks/`, pre-rendered
HTML, and RSC payloads (`index.txt`).

- **Never hand-author a webpack chunk.** Chunk loading runs through the runtime manifest
  (`webpack-*.js`, `_buildManifest.js`); a new chunk file will simply never load. Where new
  code-splitting is needed, use plain static files plus a runtime `fetch` instead.
- The two 360 KB chunks are **vendor, not app code** — `994` is Recharts, `942` is
  react-markdown/remark/rehype/highlight.js. Actual app code is only ~60-80 KB minified, which
  is what makes bundle surgery tractable at all.
- Prefer edits that are *additive and inspectable* (a new static file) over edits that rewrite
  minified logic. Every rewrite of minified code is a permanent maintenance cost.

### Where tooling goes

The deploy workflow runs `rm -rf .git .github` **before** uploading the artifact, so anything
under **`.github/` is stripped from the published site**. That is the only place in this repo
where build and test tooling can live without becoming a public URL. Everything else committed
is served.

### What TDD means here (rule 3)

With nothing unit-testable, tests run against the artifact. Build this harness under `.github/`
*before* further bundle surgery — it is what makes rule 3 real rather than aspirational:

| Check | Asserts |
|---|---|
| Syntax gate | every patched `.js` chunk parses (`node --check`) |
| i18n parity | every locale exposes the same key set as `en`; every `locales/*.json` is valid |
| Boot check | headless browser loads each route in each locale: no console error, root is not the loading skeleton |
| Route integrity | every internal href resolves to a file that exists |
| Payload budget | fail if a per-locale payload exceeds its ceiling |

Run it with `node --test .github/tests/*.test.mjs` — the glob is required, Node's runner will
not descend into a dot-directory. Zero dependencies; `boot.test.mjs` drives headless Chrome
over CDP using Node's built-in WebSocket and skips itself if Chrome is absent (~50s).
`invariants.test.mjs` guards what must not break; `i18n.test.mjs` encodes the target state and
is expected to be red until the work lands.

Red-green still applies: write the failing check first, then patch the bundle.

## Site structure

`/` issues a **307 redirect to `/planner`** — it renders nothing of its own.

| Route | Nav label | Notes |
|---|---|---|
| `/hive-map` | Hive Map → Current Map | First in nav; hover dropdown parent |
| `/hive-map/generator` | Hive Map Generator | |
| `/planner` | Planner | Redirect target of `/` |
| `/events` | Events | |
| `/guides` | Guides | Card grid; children not in nav |
| `/guides/[slug]` | — | 4 guides, all `featured: true` |

Guides: `formation1-power-optimization`, `hero-information`, `hero-orange-equipments`,
`hero-skills-and-levels`. Each ships all 7 locales inline in its RSC payload.

Header controls: Time Mode (Server = UTC-02 / Local), Timezone (12 zones), Language
(en, ko, zh, ja, id, tl, ar). Mobile repeats the nav in a drawer plus a labeled settings block.

The nav is defined only in `_next/static/chunks/app/layout-*.js` — the pre-rendered HTML is a
loading skeleton, so grepping the `.html` files for nav links finds nothing.

## Open i18n work

Audit run 2026-08-25 against build 1.250.661. 234 UI keys per locale; key-count parity is
intact across all 7. Of 59 game-domain keys, 24 bind to a game string by exact English match.

**63 terminology mismatches** against the game, by locale:

| Locale | Differ (of 24) | | Locale | Differ (of 24) |
|---|---|---|---|---|
| `ko` | 4 | | `id` | 13 |
| `zh` | 14 | | `ar` | 17 |
| `ja` | 15 | | | |

Korean is closest to the game; Arabic furthest. All 24 are now applied. The six that map to several string ids were resolved on 2026-08-25 by
policy (user decision: take the majority, and where there is none, pick one):

1. **Site evidence** — an existing site translation matching a candidate identifies that id.
   This turned out to be the strongest signal: the original translations were made from what
   the game actually renders, so they point at the real binding.
2. **Cross-locale majority** — the id whose value is the most common across all 16 blobs.
3. **Lowest id** — deterministic tie-break.

| Term | Chosen id | Method |
|---|---|---|
| `theme_names.shelter_expansion` | `370026` | site evidence (2 votes, 0 against) |
| `theme_names.unit_training` | `360013` | site evidence + majority |
| `theme_names.enemy_buster` | `370030` | site evidence |
| `event_names.Capital Clash` | `250101` | site evidence + majority (13) |
| `event_names.Armory Assault` | `475276` | majority — a true 12-12 tie, broken by lowest id |
| `official_titles.president` | `250045` | site evidence (4 of 5 locales) |

All six carry `confidence: provisional` in `game-terms.json`. **An in-game screenshot
supersedes any of them.** `Armory Assault` is the weakest — nothing distinguished the two
candidates — and dws-wiki's Traps section warns explicitly that majority-count heuristics lie,
so treat these as working answers, not settled facts.

**35 of 59 game-domain keys have no exact English match** — almost all `actions.*`
("Construction speed-ups", "Kill roamer zombies"). These are site phrasing for SP/AD score
rows. Binding them to official terms goes through `score_list` `name_ref` config extraction
(dws-wiki `write_visible.py` territory), not string matching. Not yet done.

**Blocked on source.** Removing `tl` is two surgical edits to the minified bundle and is
patchable. The 10-locale expansion is not: it needs 10 x 234 = 2,340 new UI strings plus
4 guides x 10 = 40 new guide documents, all re-rendered into the RSC payloads (`index.txt`)
and pre-rendered HTML, plus the lazy-loading change the payload budget requires. That is a
build, not a patch.

Scope at the 16-locale target: **3,744 UI strings** (16 x 234) and **64 guide documents**
(16 x 4). Terminology rules 1-2 bind only the ~24 game nouns per locale; the rest is ordinary
translation of site-authored prose.

## Calculators

Seven calculators live under `/calculator/`, plus a hub at `/calculator/`. They are
**standalone pages, not Next.js routes** — with the source gone, new routes cannot be added to
the app. All seven share one engine:

| File | Role |
|---|---|
| `calculator/app.js` | engine + every calculator spec, keyed off `<body data-calc>` |
| `calculator/shell.css` | the Tailwind utilities the app purged |
| `calculator/<slug>/index.html` | thin shell, generated |
| `.github/tools/build-calculator-pages.mjs` | generates hub + pages; `CALCULATORS` is the single source of truth |

**Calculator names come from one coherent game block, `11300012`-`11300023`** — a UI label set
that happens to name almost every system we calculate: `11300014` Hero Star Level, `11300017`
Hero Exclusive Equipment, `11300019` Hero Equipment, `11300020` Mod Vehicle Level, `11300022`
Mod Vehicle Parts, `11300023` Mod Vehicle Chip. Taking all names from one block keeps the
register consistent across 16 locales. Prefer it over composing your own phrases, which breaks
word order in German and Arabic. Russian is absent from this block and falls back to English.

**Position labels use the game's own `Star {0} Rank {1}` template (`129270`).** Hero stars and
exclusive weapons are both 5-tick ladders, and members sit part-way through a band, so the
selector must offer every tick. Weapons prefix the red tier with `156005` "Red", giving
"Red Star 1 Rank 1". Do **not** label ticks with the military rank names in `aps_heroes_rank`
(Reservist, 2nd Lieutenant IV) - they are a separate title system and members did not recognise
them.

**Hero equipment promotion levels 0-10 are all rank 0 grade 0**, so rank/grade does not
uniquely identify a row. The selector uses the level number; rank/grade appears in the
breakdown instead.

| Slug | Data | Materials |
|---|---|---|
| `precision-parts` | `data/precision-parts.json` | Precision Part |
| `vehicle-level` | `data/vehicle.json` | Gear (**per press**) |
| `vehicle-parts` | `data/vehicle.json` | Titanium + Blueprint |
| `hero-weapon` | `data/hero-weapons.json` | per-hero fragments |
| `hero-stars` | `data/hero-stars.json` | fragments |
| `hero-equipment` | `data/hero-equipment.json` | Power Core + Boost Ore + DX-Blueprint |
| `vehicle-chips` | `data/vehicle-chips.json` | duplicate chips |

**Tailwind purged everything the app never used.** Utilities like `bottom-0`, `inset-x-0`,
`max-w-3xl`, `shrink-0`, `pe-3` do not exist in `_next/static/css/*.css` — the sticky total bar
silently had no position until they were declared in `shell.css`. `calculator-css.test.mjs`
fails on any class with no rule anywhere; keep it passing.

Nav links are plain `<a>`, **not** Next `Link` — a `Link` would client-side route to a
non-existent route and 404 inside the app.

### Traps encoded in the data

- **Vehicle levelling is charged per button press, not per level.** The naive sum of per-press
  costs is 354,130; the real 1→500 total is **23,035,170**. The calculator shows press counts
  alongside cost because members cannot derive this by hand.
- **In-game prices can be lower than config.** dws-wiki verified vehicle L296 showing 760 Gears
  against config 845 — that is `845 x 0.90`, a Gear-cost buff. Every page carries a note.
- **Hero star band 0 breaks dws-wiki's rule.** "The last tick of each band is charged at the
  next band's rate" holds for bands 1-3 (15, 50, 100) but **not band 0**, which ends at 3 while
  band 1 starts at 5. Pinned by a test so the exception cannot be silently "fixed".
- `774000` and `893000` share name id `100292` — the game labels **both** "Mart". The generator
  suffixes duplicates within a locale.

### Not built, deliberately

- **Formation CP** — `K25`/`K26`/`K27` live in `battle_config`, which ships in no bundle. Only
  a user estimate exists. A CP calculator would be confidently wrong.
- **Combat factors** — 692 effects with descriptions but no numeric values; a searchable
  reference, not arithmetic.
- **Survival Preparedness / Alliance Duel** — already served by the Planner.

### Localization

Calculator chrome lives in `data/calc-i18n.json`, generated by the extractor. Two tiers, both
listed in the file:

- **`gameSourced`** — the string is the game's own, pulled by id from `datatable_lang_localization`
  and therefore professionally translated in all 16 locales. Prefer this always.
- **`handTranslated`** — no game equivalent exists (From, To, Short, Covered, Add row, …).
  These are mine and **want native review**; CJK and the European set are the ones I am most
  confident in.

**Verify a game string before adopting it — identical English does not mean identical meaning.**
`610022` "Required" is actually *"Required Building"* (`필요 건물`) and `129211` "Quality" is
*"Hero Quality"* (`영웅 품질`). Both were rejected after checking them across locales. This is
dws-wiki trap #2 in a new place.

Selector granularity follows the game's own ticks, not the band: building level for precision
parts, per-tick with in-game rank names for hero stars (`2★ · 중위II`), per-grade for chips.
Members are usually part-way through a band, so band-only pickers were unusable.

**Never name a local variable `t` in `calculator/app.js`** — `t()` is the translation function
and `var` hoisting silently shadows it for the whole enclosing function. This shipped twice as
"t is not a function", caught only by the boot test asserting zero console errors.

## Known issues

- **All pages share one `<title>`** (`DWS Planner`) and one description. Metadata is defined
  only in the root layout; no per-page `generateMetadata`, so guides have no distinct titles
  for search or link previews despite carrying localized `title`/`description` in frontmatter.
- **`nav.planner` has no fallback string** — called as `t("nav.planner")` in both desktop and
  mobile nav while every sibling passes a default. A missing key renders blank there.
- **Two zombie `pages-build-deployment` runs** stuck `queued` since 2026-07-02 (~1,280 h),
  left over from the pre-`workflow` Jekyll setup. Inert, but they are why the Pages API still
  reports `status: "errored"`. The legacy workflow can be disabled to clear the noise.
- **History is a single squashed commit.** Deployment records reference SHAs (`e4f4c0f`,
  `bd4ece3`, …) that no longer exist locally — you cannot `git log` back through past versions.
