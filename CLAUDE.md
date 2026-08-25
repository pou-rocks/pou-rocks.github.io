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
