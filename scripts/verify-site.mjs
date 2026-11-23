// Checks the built site in _site/ (BLOG_SPEC.md section 12, checks 2 and 4 to 6).
// Run after `npx @11ty/eleventy`:  node scripts/verify-site.mjs
import fs from "node:fs";
import path from "node:path";
import { siteFiles, BLOG_BASE, ORIGIN } from "./blog-lib.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "_site");
const failures = [];
let checks = 0;

function check(ok, message) {
  checks += 1;
  if (!ok) failures.push(message);
}

function listFiles(dir, rel = "") {
  const found = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...listFiles(dir, relPath));
    else found.push(relPath);
  }
  return found;
}

if (!fs.existsSync(out)) {
  console.error("_site/ does not exist. Run `npx @11ty/eleventy` first.");
  process.exit(1);
}

const built = listFiles(out);

// ---- check 2: the existing site is unchanged ------------------------------
const expected = siteFiles(root);
for (const file of expected) {
  const copy = path.join(out, file);
  if (!fs.existsSync(copy)) {
    check(false, `missing from _site: ${file}`);
  } else {
    check(Buffer.compare(fs.readFileSync(path.join(root, file)), fs.readFileSync(copy)) === 0, `differs from the repo copy: ${file}`);
  }
}
const expectedSet = new Set(expected);
for (const file of built) {
  if (!file.startsWith("blog/")) check(expectedSet.has(file), `unexpected file outside blog/: ${file}`);
}

// ---- helpers for the blog checks ------------------------------------------

// Minimal XML well-formedness check: balanced tags, one root, valid entities.
function xmlProblem(xml) {
  const text = xml.replace(/<\?xml[\s\S]*?\?>/, "").replace(/<!--[\s\S]*?-->/g, "");
  const tag = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  const stack = [];
  let roots = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "<") {
      tag.lastIndex = i;
      const m = tag.exec(text);
      if (!m) return `bad markup near "${text.slice(i, i + 40)}"`;
      const [whole, closing, name, , selfClosing] = m;
      if (closing) {
        if (stack.pop() !== name) return `unexpected </${name}>`;
      } else {
        if (!stack.length) roots += 1;
        if (!selfClosing) stack.push(name);
      }
      i += whole.length;
    } else {
      const next = text.indexOf("<", i);
      const chunk = text.slice(i, next === -1 ? text.length : next);
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(chunk)) return `bad entity in "${chunk.trim().slice(0, 40)}"`;
      if (!stack.length && chunk.trim()) return "text outside the root element";
      i += chunk.length;
    }
  }
  if (stack.length) return `unclosed <${stack.pop()}>`;
  if (roots !== 1) return `${roots} root elements`;
  return null;
}

// Maps a root-absolute site URL to a file inside _site, or null.
function fileForUrl(url) {
  const clean = decodeURIComponent(url.replace(/[?#].*$/, ""));
  const candidates = clean.endsWith("/") ? [`${clean}index.html`] : [clean, `${clean}/index.html`];
  return candidates.map((c) => c.replace(/^\//, "")).find((c) => built.includes(c)) ?? null;
}

const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

// ---- check 4 to 6: blog pages ---------------------------------------------
const blogHtml = built.filter((f) => f.startsWith("blog/") && f.endsWith(".html"));
check(blogHtml.length > 0, "no blog HTML pages were built");

for (const file of blogHtml) {
  const html = fs.readFileSync(path.join(out, file), "utf8");
  const where = (msg) => `${file}: ${msg}`;

  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const isLd = /type="application\/ld\+json"/.test(attrs);
    check(isLd, where("script other than JSON-LD"));
    if (isLd) {
      try { JSON.parse(body); check(true); } catch (e) { check(false, where(`JSON-LD does not parse: ${e.message}`)); }
    }
  }
  check(!/<script\b[^>]*\ssrc=/.test(html), where("external script"));
  check(!/<link\b[^>]*rel="stylesheet"/.test(html), where("stylesheet link"));
  check(!/\son[a-z]+="/.test(html), where("inline event handler"));

  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  const ogUrl = (html.match(/<meta property="og:url" content="([^"]*)"/) || [])[1];
  check(canonical?.startsWith(BLOG_BASE), where(`canonical is ${canonical}`));
  check(ogUrl === canonical, where(`og:url (${ogUrl}) differs from canonical (${canonical})`));
  for (const link of html.matchAll(/<link\b[^>]*rel="(alternate|prev|next)"[^>]*>/g)) {
    check(attr(link[0], "href")?.startsWith(BLOG_BASE), where(`${link[1]} link is ${attr(link[0], "href")}`));
  }
  check(/<link rel="alternate" type="text\/markdown"/.test(html), where("no Markdown alternate"));
  check(/<link rel="alternate" type="application\/atom\+xml"/.test(html), where("no Atom alternate"));

  for (const tag of html.matchAll(/<(?:a|img)\b[^>]*>/g)) {
    const url = attr(tag[0], "href") ?? attr(tag[0], "src");
    if (!url || url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url)) continue;
    if (!url.startsWith("/")) {
      check(false, where(`relative link left in the page: ${url}`));
    } else {
      check(fileForUrl(url) !== null, where(`link target not in _site: ${url}`));
    }
  }
}

// ---- feed and sitemap ------------------------------------------------------
const feedFile = "blog/feed.xml";
const feed = built.includes(feedFile) ? fs.readFileSync(path.join(out, feedFile), "utf8") : null;
check(feed !== null, "blog/feed.xml was not built");
if (feed) {
  const problem = xmlProblem(feed);
  check(!problem, `blog/feed.xml is not well-formed XML: ${problem}`);
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  check(entries.length <= 20, "feed has more than 20 entries");
  const times = entries.map((e) => Date.parse((e.match(/<updated>([^<]*)<\/updated>/) || [])[1]));
  check(times.every((t) => !Number.isNaN(t)), "feed entry without a valid <updated>");
  check(times.every((t, i) => i === 0 || times[i - 1] >= t), "feed is not newest first");
  for (const e of entries) {
    const href = (e.match(/<link href="([^"]*)"/) || [])[1];
    check(href?.startsWith(BLOG_BASE), `feed entry link is not absolute: ${href}`);
    const content = (e.match(/<content type="html">([\s\S]*?)<\/content>/) || [])[1] || "";
    const decoded = content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    for (const tag of decoded.matchAll(/<(?:a|img)\b[^>]*>/g)) {
      const url = attr(tag[0], "href") ?? attr(tag[0], "src");
      if (url && !url.startsWith("#") && !/^[a-z][a-z0-9+.-]*:/i.test(url)) check(false, `feed content has a non-absolute link: ${url}`);
    }
  }
}

for (const file of ["blog/sitemap.xml"]) {
  const xml = built.includes(file) ? fs.readFileSync(path.join(out, file), "utf8") : null;
  check(xml !== null, `${file} was not built`);
  if (!xml) continue;
  const problem = xmlProblem(xml);
  check(!problem, `${file} is not well-formed XML: ${problem}`);
  for (const [, loc] of xml.matchAll(/<loc>([^<]*)<\/loc>/g)) {
    check(loc.startsWith(BLOG_BASE), `${file}: ${loc} is not under ${BLOG_BASE}`);
    check(fileForUrl(loc.replace(ORIGIN, "")) !== null, `${file}: ${loc} has no page in _site`);
  }
}

// The root sitemap is copied through unchanged, but it still has to be XML.
if (built.includes("sitemap.xml")) {
  const problem = xmlProblem(fs.readFileSync(path.join(out, "sitemap.xml"), "utf8"));
  check(!problem, `sitemap.xml is not well-formed XML: ${problem}`);
}

// ---- Markdown alternates ---------------------------------------------------
for (const file of built.filter((f) => f.startsWith("blog/") && f.endsWith(".md"))) {
  const md = fs.readFileSync(path.join(out, file), "utf8");
  for (const [, url] of md.matchAll(/\]\(([^)\s]*)/g)) {
    check(url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url), `${file}: link is not absolute: ${url}`);
  }
  for (const [, url] of md.matchAll(/<(?:a|img)\b[^>]*?\s(?:href|src)="([^"]*)"/g)) {
    check(url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url), `${file}: HTML link is not absolute: ${url}`);
  }
}

// ---- result ----------------------------------------------------------------
if (failures.length) {
  console.error(`FAIL: ${failures.length} of ${checks} checks failed`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: ${checks} checks passed (${expected.length} copied files identical, ${blogHtml.length} blog pages)`);
