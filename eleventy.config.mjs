import fs from "node:fs";
import path from "node:path";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import {
  ORIGIN, BLOG_BASE, siteFiles, readSiteStyle, displayDate, isoDate, isoDay, toDate,
  jsonLd, headingIds, normalizeTags, tagSlug, RESERVED_TAG_NAMES, rewriteHtmlLinks, rewriteMarkdownLinks,
} from "./scripts/blog-lib.mjs";

const root = import.meta.dirname;
const postsDir = path.join(root, "blog-src", "posts");
const attachmentsDir = path.join(root, "blog-src", "attachments");
const showDrafts = process.env.BLOG_DRAFTS === "1";

const isPostFile = (inputPath) => {
  const abs = path.resolve(root, inputPath);
  return path.dirname(abs) === postsDir && abs.endsWith(".md");
};

// Filled while the site builds, read by the link rewriting below.
const publishedPosts = new Map(); // absolute input path -> URL
const draftPosts = new Set();

const warned = new Set();
const warnOnce = (message) => {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[blog] warning: ${message}`);
};

const linkContext = (fromFile) => ({
  fromFile,
  attachmentsDir,
  posts: publishedPosts,
  drafts: draftPosts,
  fileExists: (file) => fs.existsSync(file),
});

const byDateAscending = (a, b) => a.date - b.date || a.inputPath.localeCompare(b.inputPath);

export default function (eleventyConfig) {
  // ---- the existing site, copied through unchanged -------------------------
  // Passthrough paths are relative to the project root, not to blog-src.
  for (const file of siteFiles(root)) eleventyConfig.addPassthroughCopy({ [file]: file });
  eleventyConfig.addPassthroughCopy({ "blog-src/attachments/**": "blog/attachments" });

  eleventyConfig.ignores.add("blog-src/templates/**");
  eleventyConfig.ignores.add("blog-src/attachments/**");
  eleventyConfig.ignores.add("blog-src/HOW-TO-PUBLISH.md");

  // Curly quotes and dashes, as Medium renders them. Code is left untouched.
  eleventyConfig.amendLibrary("md", (md) => md.set({ typographer: true }));
  eleventyConfig.amendLibrary("md", headingIds);

  // ---- global data ---------------------------------------------------------
  eleventyConfig.addGlobalData("site", { origin: ORIGIN, blogBase: BLOG_BASE, name: "Paulo Chang" });
  eleventyConfig.addGlobalData("siteCss", () => readSiteStyle(root));

  // ---- posts: raw front matter checks --------------------------------------
  // page.date is always filled in from the file time, so the check has to look
  // at the front matter itself, which is what `data` is here.
  eleventyConfig.addPreprocessor("blog-post-checks", "md", function (data, content) {
    if (!isPostFile(this.inputPath)) return;
    const abs = path.resolve(root, this.inputPath);
    if (data.draft === true) {
      draftPosts.add(abs);
      return;
    }
    draftPosts.delete(abs);
    if (!data.date) {
      throw new Error(`${path.basename(this.inputPath)} has no \`date\` in its front matter. Add one, or set \`draft: true\`.`);
    }
    for (const tag of normalizeTags(data.tags, this.inputPath)) {
      if (RESERVED_TAG_NAMES.some((name) => name.toLowerCase() === tag.name.toLowerCase())) {
        throw new Error(`${this.inputPath}: tag "${tag.name}" is reserved (${RESERVED_TAG_NAMES.join(", ")}). Pick another name.`);
      }
    }
    if (content.includes("[[")) {
      warnOnce(`${path.basename(this.inputPath)} contains "[[" and may have wikilinks; use Markdown links.`);
    }
  });

  // ---- collections ---------------------------------------------------------
  const blogPosts = (api) => api.getAll().filter((item) => isPostFile(item.inputPath) && item.url);

  // Oldest first, which is what the feed plugin expects (it reverses with sort "auto").
  eleventyConfig.addCollection("posts", (api) => {
    const posts = blogPosts(api).filter((item) => item.data.draft !== true).sort(byDateAscending);
    publishedPosts.clear();
    for (const item of blogPosts(api)) {
      if (item.data.draft !== true || showDrafts) publishedPosts.set(path.resolve(root, item.inputPath), item.url);
    }
    return posts;
  });

  // What the list pages show: the posts, plus drafts when previewing with BLOG_DRAFTS=1.
  eleventyConfig.addCollection("blogList", (api) => blogPosts(api).filter((item) => showDrafts || item.data.draft !== true).sort(byDateAscending));

  // Tags with their posts, newest first. Built from the same list the pages show.
  eleventyConfig.addCollection("tagList", (api) => {
    const posts = blogPosts(api).filter((item) => showDrafts || item.data.draft !== true).sort(byDateAscending);
    const byKey = new Map(); // lowercase name -> { name, slug, posts }
    for (const item of posts) {
      for (const tag of normalizeTags(item.data.tags, item.inputPath)) {
        const key = tag.name.toLowerCase();
        if (!byKey.has(key)) byKey.set(key, { name: tag.name, slug: tagSlug(tag.name), posts: [] });
        byKey.get(key).posts.push(item);
      }
    }
    const bySlug = new Map();
    for (const tag of byKey.values()) {
      const other = bySlug.get(tag.slug);
      if (other) throw new Error(`Tags "${other.name}" and "${tag.name}" both map to the URL slug "${tag.slug}". Rename one.`);
      bySlug.set(tag.slug, tag);
      tag.posts.reverse();
    }
    return [...byKey.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  });

  // ---- filters -------------------------------------------------------------
  eleventyConfig.addFilter("displayDate", displayDate);
  eleventyConfig.addFilter("isoDate", isoDate);
  eleventyConfig.addFilter("isoDay", isoDay);
  eleventyConfig.addFilter("jsonLd", jsonLd);
  eleventyConfig.addFilter("lastModified", (post) => post.data.updated || post.date);
  eleventyConfig.addFilter("newestDate", (posts) => (posts.length ? new Date(Math.max(...posts.map((p) => toDate(p.data.updated || p.date)))) : null));

  // The Markdown alternate of a post: title, date line, body with absolute links.
  eleventyConfig.addFilter("postMarkdown", (post) => {
    const raw = post.rawInput ?? post.data.page.rawInput;
    const body = rewriteMarkdownLinks(raw, linkContext(path.resolve(root, post.inputPath)), { warn: warnOnce }).trim();
    const dates = [`Published ${displayDate(post.date)}`];
    if (post.data.updated) dates.push(`updated ${displayDate(post.data.updated)}`);
    return [
      `# ${post.data.title}`,
      "",
      `${dates.join(", ")}.`,
      "",
      body,
      "",
      "---",
      "",
      `HTML version: ${ORIGIN}${post.url}`,
      "",
    ].join("\n");
  });

  // ---- link rewriting in rendered posts and in the feed --------------------
  // Runs on post pages and, through renderTransforms, on the feed content.
  eleventyConfig.addTransform("blog-post-links", function (content) {
    const inputPath = this.page?.inputPath;
    if (!inputPath || !isPostFile(inputPath)) return content;
    // baseHref is only set when the feed asks for absolute URLs
    return rewriteHtmlLinks(content, linkContext(path.resolve(root, inputPath)), {
      absolute: Boolean(this.baseHref),
      warn: warnOnce,
    });
  });

  // ---- feed ----------------------------------------------------------------
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/blog/feed.xml",
    collection: { name: "posts", limit: 20 },
    metadata: {
      language: "en",
      title: "Paulo Chang: Blog",
      subtitle: "Posts by Paulo Chang.",
      base: BLOG_BASE,
      author: { name: "Paulo Chang" },
    },
  });

  // Transforms run in insertion order. The link rewrite has to see the relative links
  // before Eleventy's own HTML base transform turns them into absolute ones (the feed
  // content goes through both), so move it to the front.
  const { "blog-post-links": linkTransform, ...otherTransforms } = eleventyConfig.transforms;
  for (const name of Object.keys(eleventyConfig.transforms)) delete eleventyConfig.transforms[name];
  Object.assign(eleventyConfig.transforms, { "blog-post-links": linkTransform }, otherTransforms);

  return {
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: false,
    dir: { input: "blog-src", output: "_site", includes: "_includes" },
  };
}
