# paulochang.com

Personal site of Paulo Chang, plus a handful of self-contained browser tools.

Live at **https://paulochang.com/**.

## Layout

The site is plain static files. A page's path in this repo is its path on the
site, so `diff/index.html` is served at `https://paulochang.com/diff/`. The one
exception is the blog: Eleventy renders `blog-src/` into `_site/blog/` and copies
every other tracked file into `_site/` unchanged, and Cloudflare Pages serves
`_site/` (see Blog below).

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
blog-src/         Blog posts and templates (built into /blog/)
scripts/          Blog sync and verification scripts
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
  To share the tracker as one file, run `node harness/standalone.mjs` after a sync. It
  writes `dist/agent-harness-tracker.html` (gitignored) with the site nav, site URLs and
  links to sibling files removed, and fails if the page markup no longer matches.
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

## Blog

Posts are written in an Obsidian vault named `Blog` in iCloud Drive and built from
`blog-src/posts/` (one Markdown file per post, filename = title). The writing
workflow is in `blog-src/HOW-TO-PUBLISH.md`, which is also copied into the vault.
Posts can have `tags` in the front matter; tag pages are at `/blog/tags/`.

- `npm run notes` copies the vault's `posts/` and `attachments/` into `blog-src/`.
  It never deletes anything and lists files that only exist in the repo.
- A post needs `title` and `date` (with a UTC offset) in its front matter.
  `draft: true` keeps it out of the build, so drafts are safe to commit.
- `npm run serve` previews the site locally (`BLOG_DRAFTS=1 npm run serve` shows
  drafts too). `npm run build` writes `_site/`, and
  `node scripts/verify-site.mjs` checks that every page outside `/blog/` is copied
  byte for byte.
- A push to `master` deploys. A post without a `date`, or two posts with the same
  slug, fails the Cloudflare Pages build.

## Conventions

- **Markdown alternates.** Every page ships an `index.md` next to its `index.html`
  carrying the same text without the layout markup, declared in the HTML with
  `<link rel="alternate" type="text/markdown">`. Agents and AI crawlers are
  pointed at these.
- **Absolute URLs.** Canonical tags, `og:url`, JSON-LD, `sitemap.xml`,
  `robots.txt` and `llms.txt` all use `https://paulochang.com/`.
- **Hand-maintained indexes.** `llms.txt`, `sitemap.xml` and `robots.txt` are
  written by hand. Adding or removing a page means updating all three. Blog posts
  are the exception: the blog sitemap, feed and `blog/index.md` are generated.
- **CSS.** The four core pages (Home, About, Projects, Resume) each inline the
  same full stylesheet in a `<style>` block, with no external CSS, so nothing
  loads late and shifts the layout. The CSS and JSON-LD are minified, and the
  four `<style>` blocks must stay byte-identical. To edit the CSS, expand it
  with `npx prettier --parser css`, make the change, minify it again with
  `npx esbuild --minify --loader=css`, and paste the result into all four
  pages. The project pages are self-contained.

## License

MIT, Copyright (c) 2022-2026 Paulo Chang. See [LICENSE](LICENSE).
