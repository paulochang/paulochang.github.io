export default function (eleventyConfig) {
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("blog-src/posts/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addFilter("dateFormat", function (date) {
    const d = new Date(date);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}.${mm}.${yyyy}`;
  });

  eleventyConfig.addFilter("excerpt", function (post) {
    if (post.data && post.data.description) {
      return post.data.description;
    }
    const content = post.templateContent || "";
    const stripped = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, 200);
  });

  return {
    dir: {
      input: "blog-src",
      output: "public",
      includes: "_includes",
    },
  };
}
