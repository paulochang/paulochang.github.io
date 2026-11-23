import { ORIGIN, postSlug, excerpt, isoDate } from "../../scripts/blog-lib.mjs";

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
    }),
  },
};
