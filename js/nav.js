(function () {
  var nav = document.querySelector('nav[aria-label="Sections"]');
  if (!nav) return;

  // Keep the "scroll past the nav" offset in sync with the nav's actual
  // rendered height, so an anchor link never lands a heading underneath it.
  function updateNavHeight() {
    document.documentElement.style.setProperty("--nav-height", nav.offsetHeight + "px");
  }
  updateNavHeight();
  window.addEventListener("resize", updateNavHeight);
  window.addEventListener("load", updateNavHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateNavHeight);
  }

  // Mobile menu toggle
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");

  function closeMenu() {
    nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    nav.classList.add("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  }

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      if (nav.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!nav.classList.contains("is-open")) return;
      closeMenu();
      toggle.focus();
    });

    window.addEventListener("resize", closeMenu);
  }

  // Highlight the nav link for the section currently in view
  if (!("IntersectionObserver" in window)) return;

  var navLinks = nav.querySelectorAll('a[href^="#"]');
  var linkByHeadingId = {};
  navLinks.forEach(function (link) {
    linkByHeadingId[link.getAttribute("href").slice(1)] = link;
  });

  var headings = document.querySelectorAll("main h2[id]");

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var current = linkByHeadingId[entry.target.id];
        if (!current) return;
        navLinks.forEach(function (link) {
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
