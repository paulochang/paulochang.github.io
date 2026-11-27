import { ORIGIN, postSlug, excerpt, isoDate, normalizeTags } from "../../scripts/blog-lib.mjs";

const showDrafts = () => process.env.BLOG_DRAFTS === "1";
const author = { "@id": `${ORIGIN}/#paulo-chang` };

// Written as functions, not template strings, because markdownTemplateEngine is off.
export default {
  layout: "post.njk",
  eleventyComputed: {
    permalink: (data) => {
      if (data.draft === true && !showDrafts()) return false;
      return `/blog/${postSlug(data)}/`;
    },
    // In preview mode drafts stay visible to the `blogList` collection, which filters them itself.
    eleventyExcludeFromCollections: (data) => data.draft === true && !showDrafts(),
    // Drafts may have no date; page.date is the file time then.
    postDate: (data) => data.date || data.page.date,
    postTags: (data) => normalizeTags(data.tags, data.page?.inputPath),
    metaDescription: (data) => data.description || excerpt(data.page.rawInput || ""),
    jsonldData: (data) => ({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: data.title,
      datePublished: isoDate(data.date || data.page.date),
      dateModified: isoDate(data.updated || data.date || data.page.date),
      url: `${ORIGIN}/blog/${postSlug(data)}/`,
      inLanguage: "en",
      author,
      publisher: author,
      ...(normalizeTags(data.tags, data.page?.inputPath).length && {
        keywords: normalizeTags(data.tags, data.page?.inputPath).map((t) => t.name).join(", "),
      }),
    }),
  },
};
