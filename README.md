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
css/site.css      Shared stylesheet
img/              Favicon, social card, icons
```

Project pages:

- **BSR Straßenreinigung Berlin** (`berlin-cleaning/`): MapLibre GL map of Berlin's
  official street-cleaning classes, bilingual German/English, with address search
  and per-class filtering.
- **A Moment of Light** (`quotes/`): minimal reader that surfaces one short poem at
  a time from a curated client-side collection.
- **Syntax-Aware Diff Tool** (`diff/`): Monaco diff editor with side-by-side and
  inline views, drag-and-drop input, and live change metrics.
- **JSON Query Tool** (`json/`): three-panel workbench with input, structure
  explorer, and a JSONata query box with autocomplete and live results.
- **Geometric Wall Designer** (`paint/`): generates wall-paint patterns that can be
  painted with masking tape, so straight lines only and at most three colors.
- **Traffic** (`traffic/`): the 40 classic Rush Hour-style sliding-block puzzles —
  slide vehicles to free the red car, with a move counter, timer, and offline
  installable play as a PWA.
- **CCAR-F Study Guide** (`study-guide/`): offline study guide for the Claude
  Certified Architect (Foundations) exam, in one zero-dependency HTML file.

## Conventions

- **Markdown alternates.** Every page ships an `index.md` next to its `index.html`
  carrying the same text without the layout markup, declared in the HTML with
  `<link rel="alternate" type="text/markdown">`. Agents and AI crawlers are
  pointed at these.
- **Absolute URLs.** Canonical tags, `og:url`, JSON-LD, `sitemap.xml`,
  `robots.txt` and `llms.txt` all use `https://paulochang.com/`.
- **Hand-maintained indexes.** `llms.txt`, `sitemap.xml` and `robots.txt` are
  written by hand. Adding or removing a page means updating all three.
- **CSS.** The four core pages (Home, About, Projects, Resume) inline their
  critical CSS in a `<style>` block and load `css/site.css` for the rest. The
  inlining exists to avoid layout shift, so keep it. The project pages are
  self-contained and do not use `css/site.css`.

## License

MIT, Copyright (c) 2022-2026 Paulo Chang. See [LICENSE](LICENSE).
