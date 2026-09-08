(function () {
  var nav = document.querySelector('nav[aria-label="Sections"]');
  if (!nav || !("IntersectionObserver" in window)) return;

  var links = nav.querySelectorAll('a[href^="#"]');
  var linkByHeadingId = {};
  links.forEach(function (link) {
    linkByHeadingId[link.getAttribute("href").slice(1)] = link;
  });

  var headings = document.querySelectorAll("main h2[id]");

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var current = linkByHeadingId[entry.target.id];
        if (!current) return;
        links.forEach(function (link) {
          link.removeAttribute("aria-current");
        });
        current.setAttribute("aria-current", "location");
      });
    },
    { rootMargin: "-96px 0px -80% 0px" }
  );

  headings.forEach(function (heading) {
    observer.observe(heading);
  });
})();
