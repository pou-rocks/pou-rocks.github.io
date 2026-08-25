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

| Site locale | Game blob | Notes |
|---|---|---|
| `en` | 6 | Authoring language; `fallbackLng` |
| `ko` | 15 | |
| `zh-Hans` | 14 | Game's source language; blob is ~2,000 strings longer than the rest |
| `zh-Hant` | 11 | **To add** — the game ships it as a separate language |
| `ja` | 12 | |
| `id` | 9 | |
| `ar` | 13 | **RTL** — the only one; `dir` is set client-side from the list `["ar"]` |
| ~~`tl`~~ | — | **Remove.** Tagalog is not a game language (decision, 2026-08-25) |

Nine further game languages are unused and available if the alliance ever needs them:
`ru` (incomplete in-game), `tr`, `de`, `pt`, `vi`, `it`, `fr`, `es`, `th`.

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

Pages config: `build_type: workflow`, source `main` `/`, no CNAME, HTTPS enforced,
`custom_404: true`. Concurrency group `pages-deploy` with `cancel-in-progress`.

**Everything committed is published.** The workflow uploads the whole repo (minus `.git`
and `.github`). A scratch script, an audit doc, or a stray export committed here becomes a
public URL. Analysis artifacts belong in `../dws-wiki` or a scratch dir, never in this repo.

**`.nojekyll` is load-bearing.** Without it Pages runs Jekyll, which ignores `_next/` for its
leading underscore and takes the whole site down. Never delete it.

## Blocker: no source

There is no `package.json`, no `next.config.*`, no test runner, and no component source —
only minified chunks under `_next/static/chunks/` and per-route hydration skeletons. Checked
the siblings under `~/Projects/dws/`: `dws-wiki` is Markdown + Python extractors,
`pou/shelter-placement` and `SoS` are Python map generators. None is this app.

Consequences, in priority order:

- **Rule 3 cannot be honored.** No runner, nothing to write a unit test against.
- **Edits here are write-only.** Patching minified output works but is clobbered by the next
  export from the real source.
- Only smoke-level checks are possible today: route status codes, `buildId` consistency across
  `index.html` / `index.txt`, presence of `.nojekyll`, internal link integrity.

**Resolving this is prerequisite to normal development.** Locate the source project (another
machine, another remote, or a private repo) before any non-trivial change. If it is truly lost,
reconstructing it from this export is the alternative, and a much larger job.

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

Korean is closest to the game; Arabic furthest. **18 of 24 are unambiguous and can be applied
without further input.** The remaining 6 need an in-game screenshot to bind (rule 4 above):

| Term | Screen | Worst case |
|---|---|---|
| Shelter Expansion | Survival Preparedness themes | 2 candidates |
| Unit Training | Survival Preparedness themes | 3 |
| Enemy Buster | Alliance Duel themes | 2 |
| Capital Clash | Event calendar | **5** (Arabic) |
| Armory Assault | Event calendar | 2 |
| President | Alliance officer titles | 2 |

**35 of 59 game-domain keys have no exact English match** — almost all `actions.*`
("Construction speed-ups", "Kill roamer zombies"). These are site phrasing for SP/AD score
rows. Binding them to official terms goes through `score_list` `name_ref` config extraction
(dws-wiki `write_visible.py` territory), not string matching. Not yet done.

**Blocked on source.** Removing `tl` is two surgical edits to the minified bundle and is
patchable. Adding `zh-Hant` is not: it needs 234 new UI keys plus all 4 guides re-rendered
into the RSC payloads (`index.txt`) and pre-rendered HTML. That is a build, not a patch.

## Known issues

- **Push auth is broken.** Active `gh` account `dong-gi-yang_ktdev` has `push: false` on this
  repo (pull only); account `XronAce` — author of every commit — fails keyring login. Pushes
  will be rejected until this is fixed. Resolve *before* the first deploy, not during it.
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
