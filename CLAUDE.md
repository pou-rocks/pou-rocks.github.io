# CLAUDE.md — pou-rocks.github.io

**This site is retired.** On 2026-10-05 its pages — the Planner, Events, the
Calculators and the Hive Map — moved into the PoU alliance manager
(`dws-manager-bot/dws-manager-bot.github.io`, served at
https://pou.actuallyplaying.com), behind Discord sign-in for the alliance's
members. The guides were not carried over.

What is left here is a redirect. `index.html` and `404.html` are the same page:
it sends any address on this site to the same path on the new one, where the
old paths (`/planner`, `/events`, `/calculator/<slug>`, `/hive-map`,
`/hive-map/generator`) still exist. Pages serves `404.html` for every path that
has no file, which is what makes every old link redirect.

The last version of the site itself is commit `79e1cfd`; its history is the
record of the static build and the bundle patches made to it.

Push to `main` deploys (`.github/workflows/deploy-pages.yml`). `.nojekyll` is
kept so Pages serves the files as they are.
