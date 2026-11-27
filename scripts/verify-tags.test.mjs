// Builds Eleventy against a throwaway copy of the blog setup (OS temp dir) that holds a
// draft post with a unique tag, and checks that the tag only gets a page when drafts are shown.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = path.resolve(import.meta.dirname, "..");
const eleventyBin = path.join(repo, "node_modules", "@11ty", "eleventy", "cmd.cjs");

const post = (title, tags, draft) => `---
title: ${title}
date: 2026-01-01T10:00:00+01:00
description: Fixture post.
tags:
  - ${tags}
draft: ${draft}
---
Fixture body.
`;

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-tags-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.copyFileSync(path.join(repo, "eleventy.config.mjs"), path.join(dir, "eleventy.config.mjs"));
  fs.copyFileSync(path.join(repo, "scripts", "blog-lib.mjs"), path.join(dir, "scripts", "blog-lib.mjs"));
  fs.writeFileSync(path.join(dir, "package.json"), '{"type":"module"}\n');
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(dir, "node_modules"));
  // The blog reads its stylesheet from about/index.html.
  fs.mkdirSync(path.join(dir, "about"));
  fs.writeFileSync(path.join(dir, "about", "index.html"), "<style>body{}</style>\n");
  // Everything in blog-src except the real posts and attachments.
  fs.cpSync(path.join(repo, "blog-src"), path.join(dir, "blog-src"), {
    recursive: true,
    filter: (src) => !/blog-src\/(posts|attachments)\/./.test(src.split(path.sep).join("/")),
  });
  fs.mkdirSync(path.join(dir, "blog-src", "attachments"), { recursive: true });
  const posts = path.join(dir, "blog-src", "posts");
  fs.mkdirSync(posts, { recursive: true });
  fs.copyFileSync(path.join(repo, "blog-src", "posts", "posts.11tydata.mjs"), path.join(posts, "posts.11tydata.mjs"));
  fs.writeFileSync(path.join(posts, "published.md"), post("Published", "livetag", false));
  fs.writeFileSync(path.join(posts, "secret.md"), post("Secret", "draftonly", true));
  return dir;
}

function build(dir, env = {}) {
  const output = path.join(dir, "_site");
  fs.rmSync(output, { recursive: true, force: true });
  const { BLOG_DRAFTS, ...base } = process.env;
  const res = spawnSync(process.execPath, [eleventyBin], { cwd: dir, env: { ...base, ...env }, encoding: "utf8" });
  assert.equal(res.status, 0, `eleventy failed:\n${res.stdout}\n${res.stderr}`);
  return output;
}

test("a tag used only by drafts gets no page in production, but does with BLOG_DRAFTS=1", (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const prod = build(dir);
  assert.ok(fs.existsSync(path.join(prod, "blog/tags/livetag/index.html")), "published tag page is missing");
  assert.ok(!fs.existsSync(path.join(prod, "blog/tags/draftonly")), "draft-only tag page was built");
  assert.ok(!fs.existsSync(path.join(prod, "blog/secret")), "draft post was built");
  assert.ok(!fs.readFileSync(path.join(prod, "blog/tags/index.html"), "utf8").includes("draftonly"), "draft-only tag is listed on the tag index");
  assert.ok(!fs.readFileSync(path.join(prod, "blog/sitemap.xml"), "utf8").includes("draftonly"), "draft-only tag is in the sitemap");

  const preview = build(dir, { BLOG_DRAFTS: "1" });
  assert.ok(fs.existsSync(path.join(preview, "blog/tags/draftonly/index.html")), "draft preview should build the tag page");
});
