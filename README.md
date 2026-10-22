# paulochang.com

Personal site of Paulo Chang, plus a handful of self-contained browser tools.

Live at **https://paulochang.com/**.

## Layout

The site is plain static files. A page's path in this repo is its path on the
site, so `diff/index.html` is served at `https://paulochang.com/diff/`.

```
index.html        Home
about/            Background and current focus
projects/         Index of the tools below
resume/           Roles, skills, certifications, languages
berlin-cleaning/  BSR street-cleaning map of Berlin
quotes/           A Moment of Light
diff/             Syntax-aware diff tool
json/             JSON query tool (JSONata)
paint/            Geometric wall designer
traffic/          Sliding-block traffic puzzle game
study-guide/      CCAR-F study guide
harness/          Agent harness tracker (generated, see below)
img/              Favicon and social card
_headers          Cloudflare Pages cache headers
```

Project pages:

- **Agent Harness Tracker** (`harness/`): live comparison of AI coding agents on
  shared-harness capabilities, with a coverage leaderboard, per-area heatmap, a
  compare view, tool cards and a changelog. Generated from a separate (private) research
  knowledge base by `node harness/sync.mjs <path/to/kb>` (or set `HARNESS_KB`), which validates
  the data, strips internal-only fields, and rewrites `harness/data.json`,
  the data embedded in `harness/index.html`, `harness/index.md` and the sitemap
  `lastmod`. Edit the page's markup and script by hand; never hand-edit the data.
  Wording-only edits don't count as a review: commit them in the KB with a subject
  starting `Copy:`, or sync uncommitted ones with `--copy`. Either way they add no
  changelog entry and keep the review dates. The main sources listed for each tool
  are set in `MAIN_SOURCES` in `sync.mjs`; add an entry when adding a tool.
- **CCAR-F Study Guide** (`study-guide/`): offline study guide for the Claude
  Certified Architect (Foundations) exam, in one zero-dependency HTML file.
- **Syntax-Aware Diff Tool** (`diff/`): Monaco diff editor with side-by-side and
  inline views, drag-and-drop input, and live change metrics.
- **JSON Query Tool** (`json/`): three-panel workbench with input, structure
  explorer, and a JSONata query box with autocomplete and live results.
- **BSR Straßenreinigung Berlin** (`berlin-cleaning/`): MapLibre GL map of Berlin's
  official street-cleaning classes, bilingual German/English, with address search
  and per-class filtering.
- **Geometric Wall Designer** (`paint/`): generates wall-paint patterns that can be
  painted with masking tape, so straight lines only and at most three colors.
- **Traffic** (`traffic/`): the 40 classic Rush Hour-style sliding-block puzzles —
  slide vehicles to free the red car, with a move counter, timer, and offline
  installable play as a PWA.
- **A Moment of Light** (`quotes/`): minimal reader that surfaces one short poem at
  a time from a curated client-side collection.

## Conventions

- **Markdown alternates.** Every page ships an `index.md` next to its `index.html`
  carrying the same text without the layout markup, declared in the HTML with
  `<link rel="alternate" type="text/markdown">`. Agents and AI crawlers are
  pointed at these.
- **Absolute URLs.** Canonical tags, `og:url`, JSON-LD, `sitemap.xml`,
  `robots.txt` and `llms.txt` all use `https://paulochang.com/`.
- **Hand-maintained indexes.** `llms.txt`, `sitemap.xml` and `robots.txt` are
  written by hand. Adding or removing a page means updating all three.
- **CSS.** The four core pages (Home, About, Projects, Resume) each inline the
  same full stylesheet in a `<style>` block, with no external CSS, so nothing
  loads late and shifts the layout. The CSS and JSON-LD are minified, and the
  four `<style>` blocks must stay byte-identical. To edit the CSS, expand it
  with `npx prettier --parser css`, make the change, minify it again with
  `npx esbuild --minify --loader=css`, and paste the result into all four
  pages. The project pages are self-contained.

## License

MIT, Copyright (c) 2022-2026 Paulo Chang. See [LICENSE](LICENSE).
