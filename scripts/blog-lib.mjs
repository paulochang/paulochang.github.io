// Helpers shared by eleventy.config.mjs, the post data file, the tests and the
// verification script. Plain ESM, no dependencies beyond what Eleventy ships.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import slugify from "@sindresorhus/slugify";

export const ORIGIN = "https://paulochang.com";
export const BLOG_BASE = `${ORIGIN}/blog/`;

// Top-level repo entries that are never part of the deployed site.
export const PASSTHROUGH_DENYLIST = [
  ".git", ".obsidian", ".trash", "node_modules", "_site", "blog-src",
  "package.json", "package-lock.json", "eleventy.config.mjs", "scripts",
  ".node-version", ".gitignore", ".DS_Store", ".claude", "dist",
];

function isDenied(relPath) {
  return PASSTHROUGH_DENYLIST.includes(relPath.split("/")[0]) || path.basename(relPath) === ".DS_Store";
}

function walk(root, rel = "") {
  const found = [];
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (isDenied(relPath)) continue;
    if (entry.isDirectory()) found.push(...walk(root, relPath));
    else if (entry.isFile()) found.push(relPath);
  }
  return found;
}

// Files that get copied into _site unchanged: tracked by git, minus the denylist.
// Falls back to scanning the directory when git is not available.
export function siteFiles(root = process.cwd()) {
  let names;
  try {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    names = out.split("\0").filter(Boolean);
  } catch {
    return walk(root).sort();
  }
  return names
    .filter((name) => !isDenied(name))
    .filter((name) => {
      try { return fs.statSync(path.join(root, name)).isFile(); } catch { return false; }
    })
    .sort();
}

// The core pages keep their stylesheet inline, so the blog reads it from there.
export function readSiteStyle(root = process.cwd()) {
  const file = path.join(root, "about", "index.html");
  const match = fs.readFileSync(file, "utf8").match(/<style>([\s\S]*?)<\/style>/);
  if (!match) throw new Error(`No <style> block found in ${file}; the blog takes its stylesheet from there.`);
  return match[1];
}

// ---- slugs and dates -------------------------------------------------------

export function slugifyText(text) {
  return slugify(String(text), { decamelize: false });
}

// ---- tags ------------------------------------------------------------------

export const RESERVED_TAG_NAMES = ["all", "posts", "blogList", "tagList"];

export function tagSlug(name) {
  return slugifyText(String(name).replaceAll("/", "-"));
}

// Accepts a list, a string (single, comma- or space-separated) or nothing.
// Returns [{ name, slug }], deduplicated case-insensitively, in order.
export function normalizeTags(raw, file) {
  if (raw === undefined || raw === null) return [];
  const where = file ? `${file}: ` : "";
  const isScalar = (v) => typeof v === "string" || typeof v === "number";
  if (!isScalar(raw) && !(Array.isArray(raw) && raw.every((v) => v === null || v === undefined || isScalar(v)))) {
    throw new Error(`${where}\`tags\` must be a list of tags or a string, got ${JSON.stringify(raw)}.`);
  }
  const entries = Array.isArray(raw) ? raw : String(raw).split(/[,\s]+/);
  const seen = new Set();
  const tags = [];
  for (const entry of entries) {
    if (entry === undefined || entry === null) continue;
    const name = String(entry).trim().replace(/^#/, "");
    if (name === "") continue;
    if (!/^[\p{L}\p{N}_\-/]+$/u.test(name) || /^\p{N}+$/u.test(name)) {
      throw new Error(`${where}invalid tag "${entry}". Tags use letters, digits, _, - and /, with at least one non-digit and no spaces.`);
    }
    const slug = tagSlug(name);
    if (!slug) {
      throw new Error(`${where}invalid tag "${entry}". A tag must contain letters or digits that form a URL slug.`);
    }
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push({ name, slug });
  }
  return tags;
}

export function postSlug(data) {
  const slug = slugifyText(data.slug || data.page.fileSlug);
  if (!slug) throw new Error(`Cannot build a URL slug for ${data.page.inputPath}`);
  return slug;
}

export function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

const berlin = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "longOffset",
});

function berlinParts(value) {
  const parts = Object.fromEntries(berlin.formatToParts(toDate(value)).map((p) => [p.type, p.value]));
  const offset = parts.timeZoneName.replace("GMT", "") || "+00:00";
  return { ...parts, offset };
}

// DD.MM.YYYY in Berlin time
export function displayDate(value) {
  const p = berlinParts(value);
  return `${p.day}.${p.month}.${p.year}`;
}

// 2026-11-23T00:30:00+01:00
export function isoDate(value) {
  const p = berlinParts(value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${p.offset}`;
}

// 2026-11-23
export function isoDay(value) {
  return isoDate(value).slice(0, 10);
}

// ---- text helpers ----------------------------------------------------------

export function stripMarkdown(markdown) {
  return String(markdown)
    .replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, " ")
    .replace(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/gm, (_, text) => (/[.!?:]$/.test(text) ? text : `${text}.`))
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(markdown, length = 200) {
  const text = stripMarkdown(markdown);
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}

// JSON for a <script type="application/ld+json"> block
export function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// ---- link resolution -------------------------------------------------------

function safeDecode(text) {
  try { return decodeURIComponent(text); } catch { return text; }
}

// markdown-it plugin: give every heading a slug id, so links with a #fragment can land on it.
export function headingIds(md) {
  md.core.ruler.push("heading_ids", (state) => {
    const used = new Set();
    state.tokens.forEach((token, i) => {
      if (token.type !== "heading_open") return;
      const text = state.tokens[i + 1].children
        .filter((t) => t.type === "text" || t.type === "code_inline")
        .map((t) => t.content)
        .join("");
      const base = slugifyText(text) || "section";
      let id = base;
      for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
      used.add(id);
      token.attrSet("id", id);
    });
  });
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Decide what to do with one relative link found in a post.
 * ctx: { fromFile, attachmentsDir, posts: Map<absPath, url>, drafts: Set<absPath>, fileExists(absPath) }
 * Returns { action: "keep" } | { action: "rewrite", href } | { action: "unlink", reason }
 */
export function resolveLink(href, ctx) {
  const raw = href.trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return { action: "keep" };
  }
  const [, pathPart, rest] = raw.match(/^([^?#]*)(.*)$/);
  const hash = rest.includes("#") ? rest.slice(rest.indexOf("#")) : "";
  // Headings get slug ids (see headingIds), so a fragment like #A%20heading becomes #a-heading.
  const postHash = hash.length > 1 ? `#${slugifyText(safeDecode(hash.slice(1)))}` : hash;
  let decoded;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    return { action: "unlink", reason: "malformed link" };
  }
  const target = path.resolve(path.dirname(ctx.fromFile), decoded);

  if (ctx.posts.has(target)) return { action: "rewrite", href: ctx.posts.get(target) + postHash };
  if (ctx.drafts.has(target)) return { action: "unlink", reason: "target is a draft" };
  if (isInside(target, ctx.attachmentsDir) && ctx.fileExists(target)) {
    const rel = path.relative(ctx.attachmentsDir, target).split(path.sep).map(encodeURIComponent).join("/");
    return { action: "rewrite", href: `/blog/attachments/${rel}${hash}` };
  }
  return { action: "unlink", reason: "target not found" };
}

const unescapeAttr = (s) => s.replace(/&amp;/g, "&");
const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const absolutize = (href) => (href.startsWith("/") ? ORIGIN + href : href);

/**
 * Rewrite relative <a href> and <img src> in rendered post HTML.
 * options: { absolute: boolean (prefix rewritten URLs with the origin), warn(message) }
 */
export function rewriteHtmlLinks(html, ctx, { absolute = false, warn = () => {} } = {}) {
  const apply = (href) => {
    const result = resolveLink(unescapeAttr(href), ctx);
    if (result.action === "unlink") warn(`${ctx.fromFile}: dropped link "${unescapeAttr(href)}" (${result.reason})`);
    return result;
  };

  return html
    .replace(/(<a\b[^>]*?\shref=")([^"]*)("[^>]*>)([\s\S]*?)<\/a>/g, (whole, open, href, close, inner) => {
      const result = apply(href);
      if (result.action === "unlink") return inner;
      if (result.action === "keep") return whole;
      const url = absolute ? absolutize(result.href) : result.href;
      return `${open}${escapeAttr(url)}${close}${inner}</a>`;
    })
    .replace(/<img\b[^>]*>/g, (tag) => {
      const src = tag.match(/\ssrc="([^"]*)"/);
      if (!src) return tag;
      const result = apply(src[1]);
      if (result.action === "keep") return tag;
      if (result.action === "unlink") return (tag.match(/\salt="([^"]*)"/) || [, ""])[1];
      const url = absolute ? absolutize(result.href) : result.href;
      return tag.replace(src[0], ` src="${escapeAttr(url)}"`);
    });
}

/**
 * Same job for raw Markdown (the .md alternates): relative links become absolute
 * URLs on paulochang.com, links to drafts or missing files keep only their text.
 * Fenced code blocks are left alone.
 */
export function rewriteMarkdownLinks(markdown, ctx, { warn = () => {} } = {}) {
  const linkPattern = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]*)((?:\s+"[^"]*")?)\s*\)/g;
  let fence = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s{0,3}(```|~~~)/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (fence === marker[1]) fence = null;
        return line;
      }
      if (fence) return line;
      // raw HTML links and images get the same treatment as Markdown ones
      const rewritten = rewriteHtmlLinks(line, ctx, { absolute: true, warn });
      return rewritten.replace(linkPattern, (whole, bang, text, target, title) => {
        const href = target.replace(/^<|>$/g, "");
        const result = resolveLink(href, ctx);
        if (result.action === "unlink") {
          warn(`${ctx.fromFile}: dropped link "${href}" (${result.reason})`);
          return text;
        }
        const url = result.action === "rewrite" ? absolutize(result.href) : absolutize(href);
        return `${bang}[${text}](${url}${title})`;
      });
    })
    .join("\n");
}

/**
 * Inline `#tag` words in a post body. Tags only publish from the `tags:`
 * property, so a `#tag` typed in prose (an Obsidian habit) is a mistake worth
 * warning about. Returns the tag names, without the `#`, in order of first use.
 *
 * Ignored: front matter, fenced and inline code, heading markers, URL
 * fragments and hex colours. A word that is all hex digits and exactly 3, 4, 6
 * or 8 characters long (`#fff`, `#face`, `#bad`) is treated as a colour, so a
 * real tag like `#face` is missed. That ambiguity is accepted.
 */
export function findInlineTags(body) {
  // Drop fenced blocks (an unclosed fence runs to the end) and indented code
  // blocks (4 spaces or a tab, after a blank line or another indented line).
  let fence = null;
  let prevBlankOrIndented = true;
  const kept = [];
  for (const line of String(body).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(```|~~~)/);
    if (fence) {
      if (marker && marker[1] === fence) fence = null;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    const indented = /^(?: {4}|\t)/.test(line) && line.trim() !== "";
    if (indented && prevBlankOrIndented) continue;
    prevBlankOrIndented = line.trim() === "" || indented;
    kept.push(line);
  }
  const text = kept
    .join("\n")
    .replace(/(`+)[^`]*?\1/g, "")
    .replace(/^\s{0,3}#{1,6}[ \t]/gm, "")
    .replace(/\]\([^)\s]*#[^)]*\)/g, "]()")
    .replace(/https?:\/\/[^\s)]*/g, "")
    .replace(/(^|[^\p{L}\p{N}_])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\p{L}\p{N}_\-/])/gu, "$1");
  const found = new Set();
  for (const match of text.matchAll(/(^|\s)#([\p{L}_][\p{L}\p{N}_\-/]*)/gmu)) found.add(match[2]);
  return [...found];
}
