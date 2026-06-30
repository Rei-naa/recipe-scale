(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const authImages = [
    { file: "sourdough-hero.png", position: "50% 58%" },
    { file: "pasta.png", position: "62% 58%" },
    { file: "chocoCake.png", position: "50% 58%" },
    { file: "pumpkin_Soup.png", position: "50% 56%" },
    { file: "prep-counter.png", position: "50% 55%" },
    { file: "salmon.png", position: "54% 56%" }
  ];
  const authSlideIntervalMs = 5600;
  const revealSelectors = [
    "main > section:not(.hero)",
    ".section-heading",
    ".feature-card",
    ".cta-panel",
    ".calculator-section > .recipe-panel",
    ".calculator-workspace > *",
    ".results-section > h2",
    ".results-card",
    ".saved-head > *",
    ".saved-card",
    ".recipe-hero-detail",
    ".recipe-detail-grid > .detail-card",
    ".auth-card"
  ];

  function authImagePath(fileName, fallbackImage) {
    const source = fallbackImage ? fallbackImage.getAttribute("src") || "" : "";
    const marker = "assets/images/";
    const markerIndex = source.indexOf(marker);

    if (markerIndex !== -1) {
      return source.slice(0, markerIndex + marker.length) + fileName;
    }

    return "../assets/images/" + fileName;
  }

  function preloadImages(paths) {
    paths.forEach(function (path) {
      const image = new Image();
      image.src = path;
    });
  }

  function initAuthImageSlideshow() {
    document.querySelectorAll(".auth-visual").forEach(function (visual) {
      if (visual.dataset.slideshowReady === "true") return;

      const fallbackImage = visual.querySelector(":scope > img");
      if (!fallbackImage) return;

      const slideItems = authImages.map(function (image) {
        return {
          path: authImagePath(image.file, fallbackImage),
          position: image.position || "50% 50%"
        };
      });

      preloadImages(slideItems.map(function (image) {
        return image.path;
      }));

      const slideshow = document.createElement("div");
      slideshow.className = "auth-slideshow";
      slideshow.setAttribute("aria-hidden", "true");

      slideItems.forEach(function (image, index) {
        const slide = document.createElement("img");
        slide.className = "auth-slide" + (index === 0 ? " is-active" : "");
        slide.src = image.path;
        slide.alt = "";
        slide.decoding = "async";
        slide.style.objectPosition = image.position;
        slideshow.appendChild(slide);
      });

      visual.insertBefore(slideshow, fallbackImage);
      visual.classList.add("is-slideshow-ready");
      visual.dataset.slideshowReady = "true";

      if (reduceMotion.matches || slideItems.length < 2) return;

      const slides = Array.from(slideshow.querySelectorAll(".auth-slide"));
      let activeIndex = 0;
      slides[activeIndex].classList.add("is-motion-enabled");

      window.setInterval(function () {
        slides[activeIndex].classList.remove("is-active", "is-motion-enabled");
        activeIndex = (activeIndex + 1) % slides.length;
        slides[activeIndex].classList.add("is-active", "is-motion-enabled");
      }, authSlideIntervalMs);
    });
  }

  function revealElement(element) {
    element.classList.add("is-visible");
  }

  function collectRevealElements(root) {
    const scope = root || document;
    const elements = [];

    revealSelectors.forEach(function (selector) {
      if (scope.nodeType === 1 && scope.matches(selector)) {
        elements.push(scope);
      }

      scope.querySelectorAll(selector).forEach(function (element) {
        elements.push(element);
      });
    });

    return Array.from(new Set(elements));
  }

  function initRevealAnimations() {
    if (reduceMotion.matches) {
      document.documentElement.classList.add("reduced-motion");
      collectRevealElements(document).forEach(revealElement);
      return;
    }

    document.documentElement.classList.add("reveal-ready");

    if (!("IntersectionObserver" in window)) {
      collectRevealElements(document).forEach(revealElement);
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealElement(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.15
    });

    function prepareElements(root) {
      collectRevealElements(root).forEach(function (element, index) {
        if (element.classList.contains("is-visible")) return;
        element.classList.add("fade-up");
        element.style.transitionDelay = Math.min(index * 60, 240) + "ms";
        observer.observe(element);
      });
    }

    prepareElements(document);

    const mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          prepareElements(node);
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAuthImageSlideshow();
      initRevealAnimations();
    }, { once: true });
  } else {
    initAuthImageSlideshow();
    initRevealAnimations();
  }
})();
