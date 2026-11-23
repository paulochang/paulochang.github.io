// Run with: node --test scripts/blog-lib.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  resolveLink, rewriteHtmlLinks, rewriteMarkdownLinks, displayDate, isoDate, slugifyText, excerpt,
} from "./blog-lib.mjs";

const postsDir = "/repo/blog-src/posts";
const attachmentsDir = "/repo/blog-src/attachments";
const ctx = {
  fromFile: `${postsDir}/Current post.md`,
  attachmentsDir,
  posts: new Map([[`${postsDir}/Some Other Post.md`, "/blog/other/"], [`${postsDir}/Über uns.md`, "/blog/uber-uns/"]]),
  drafts: new Set([`${postsDir}/Secret.md`]),
  fileExists: (file) => file === `${attachmentsDir}/Pasted image 1.png`,
};

test("leaves absolute, anchor, mailto and root-relative links alone", () => {
  for (const href of ["https://example.com/a", "#section", "mailto:a@b.c", "/about/", "//cdn.example.com/x"]) {
    assert.deepEqual(resolveLink(href, ctx), { action: "keep" }, href);
  }
});

test("rewrites a post link, decoding %20 and keeping the fragment", () => {
  assert.deepEqual(resolveLink("Some%20Other%20Post.md#a-heading", ctx), { action: "rewrite", href: "/blog/other/#a-heading" });
});

test("turns a heading fragment into the heading id", () => {
  assert.equal(resolveLink("Some%20Other%20Post.md#A%20Heading%20Here", ctx).href, "/blog/other/#a-heading-here");
});

test("decodes non-ASCII file names", () => {
  assert.equal(resolveLink("%C3%9Cber%20uns.md", ctx).href, "/blog/uber-uns/");
});

test("rewrites attachment links", () => {
  assert.deepEqual(resolveLink("../attachments/Pasted%20image%201.png", ctx), {
    action: "rewrite",
    href: "/blog/attachments/Pasted%20image%201.png",
  });
});

test("unlinks drafts and missing targets", () => {
  assert.equal(resolveLink("Secret.md", ctx).action, "unlink");
  assert.match(resolveLink("Secret.md", ctx).reason, /draft/);
  assert.equal(resolveLink("Nope.md", ctx).action, "unlink");
  assert.equal(resolveLink("../attachments/missing.png", ctx).action, "unlink");
  assert.equal(resolveLink("../../index.html", ctx).action, "unlink");
});

test("rewrites HTML, drops dead links but keeps their text", () => {
  const warnings = [];
  const html = [
    '<p><a href="Some%20Other%20Post.md#x">earlier</a> and <a href="Secret.md">hidden</a></p>',
    '<p><img src="../attachments/Pasted%20image%201.png" alt="shot"> <a href="https://example.com/?a=1&amp;b=2">out</a></p>',
  ].join("");
  const result = rewriteHtmlLinks(html, ctx, { warn: (m) => warnings.push(m) });
  assert.match(result, /<a href="\/blog\/other\/#x">earlier<\/a>/);
  assert.match(result, /and hidden<\/p>/);
  assert.match(result, /<img src="\/blog\/attachments\/Pasted%20image%201\.png" alt="shot">/);
  assert.match(result, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.equal(warnings.length, 1);
});

test("absolute mode prefixes the origin", () => {
  const result = rewriteHtmlLinks('<a href="Some%20Other%20Post.md">x</a>', ctx, { absolute: true });
  assert.match(result, /href="https:\/\/paulochang\.com\/blog\/other\/"/);
});

test("rewrites Markdown links to absolute URLs and skips code fences", () => {
  const md = [
    "See [earlier](Some%20Other%20Post.md#top) and ![shot](../attachments/Pasted%20image%201.png).",
    "A [hidden](Secret.md) link and a [root](/about/) link.",
    "```",
    "[not a link](Some%20Other%20Post.md)",
    "```",
  ].join("\n");
  const warnings = [];
  const result = rewriteMarkdownLinks(md, ctx, { warn: (m) => warnings.push(m) }).split("\n");
  assert.equal(result[0], "See [earlier](https://paulochang.com/blog/other/#top) and ![shot](https://paulochang.com/blog/attachments/Pasted%20image%201.png).");
  assert.equal(result[1], "A hidden link and a [root](https://paulochang.com/about/) link.");
  assert.equal(result[3], "[not a link](Some%20Other%20Post.md)");
  assert.equal(warnings.length, 1);
});

test("dates display in Berlin time", () => {
  const date = new Date("2026-11-22T23:30:00Z"); // 00:30 on the 23rd in Berlin
  assert.equal(displayDate(date), "23.11.2026");
  assert.equal(isoDate(date), "2026-11-23T00:30:00+01:00");
  assert.equal(isoDate(new Date("2026-07-01T12:00:00Z")), "2026-07-01T14:00:00+02:00");
});

test("slugs and excerpts", () => {
  assert.equal(slugifyText("Welcome to my blog"), "welcome-to-my-blog");
  assert.match(slugifyText("Über Größe"), /^(u|ue)ber-gr(o|oe)(ss|ß|s)e$/);
  assert.equal(excerpt("Hello **world** with [a link](x) and `code`."), "Hello world with a link and code.");
  const long = excerpt("word ".repeat(100));
  assert.ok(long.length <= 201 && long.endsWith("…"));
});

test("headings do not run into the next paragraph in excerpts", () => {
  assert.equal(excerpt("## A Heading\n\nbody text"), "A Heading. body text");
  assert.equal(excerpt("# Why?\n\nbody"), "Why? body");
});

test("raw HTML links in Markdown alternates are rewritten", () => {
  const warnings = [];
  const md = 'See <a href="Some%20Other%20Post.md#x">it</a>, <a href="Secret.md">no</a> <img src="../attachments/Pasted%20image%201.png" alt="s">';
  const result = rewriteMarkdownLinks(md, ctx, { warn: (m) => warnings.push(m) });
  assert.equal(result, 'See <a href="https://paulochang.com/blog/other/#x">it</a>, no <img src="https://paulochang.com/blog/attachments/Pasted%20image%201.png" alt="s">');
  assert.equal(warnings.length, 1);
});
