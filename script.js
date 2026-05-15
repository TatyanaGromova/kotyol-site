if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.addEventListener("load", () => {
  if (!window.location.hash) window.scrollTo(0, 0);
});

(function initHeroSloganTyping() {
  const el = document.querySelector(".hero__slogan.hero-typing[data-text]");
  if (!el) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const charDelay = () => 50 + Math.random() * 10;

  const text = (el.getAttribute("data-text") || "").trim();
  const measure = el.querySelector(".hero-typing__measure");
  const output = el.querySelector(".hero-typing__output");
  if (!text || !measure || !output) return;

  measure.textContent = text;

  if (reduce) {
    output.textContent = text;
    el.classList.add("typing-done", "hero-typing--instant");
    return;
  }

  output.textContent = "";

  function tick() {
    const i = output.textContent.length;
    if (i >= text.length) {
      el.classList.add("typing-done");
      return;
    }
    output.textContent = text.slice(0, i + 1);
    if (output.textContent.length >= text.length) {
      el.classList.add("typing-done");
      return;
    }
    window.setTimeout(tick, charDelay());
  }
  tick();
})();

(function initPlanningCardsReveal() {
  const section = document.querySelector("#planning");
  const grid = document.getElementById("planningGrid");
  const wrap = document.getElementById("planningGridWrap");
  const svg = document.getElementById("planningRoutes");
  if (!section || !grid) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileRoutes = window.matchMedia("(max-width: 768px)");

  const ROUTE_BUILD_DELAY_MS = 1180;
  const ROUTE_STAGGER_MS = 110;
  const ROUTE_DURATION_MS = 1050;
  const MOBILE_ROUTE_DURATION_MS = 1100;
  const MOBILE_LINE_X = 13;
  const CARD_REVEAL_STAGGER_MS = 140;

  const DESKTOP_PAIRS = [
    [1, 2],
    [2, 3],
    [2, 5],
    [4, 5],
    [5, 6],
  ];
  const TABLET_PAIRS = [
    [1, 2],
    [2, 4],
    [4, 3],
    [3, 5],
    [5, 6],
  ];

  let routesDrawTimer = 0;
  let resizeTimer = 0;
  let hasBeenInView = false;

  function getGridColumns() {
    const style = window.getComputedStyle(grid);
    const template = style.gridTemplateColumns || "";
    const cols = template.split(" ").filter(Boolean).length;
    return cols || 1;
  }

  function getConnectionPairs() {
    const cols = getGridColumns();
    if (cols >= 3) return DESKTOP_PAIRS;
    if (cols === 2) return TABLET_PAIRS;
    return [];
  }

  function edgePoint(rect, gridRect, side, inset = 10) {
    const cx = rect.left + rect.width / 2 - gridRect.left;
    const cy = rect.top + rect.height / 2 - gridRect.top;
    if (side === "right") {
      return [rect.right - gridRect.left - inset, cy];
    }
    if (side === "left") {
      return [rect.left - gridRect.left + inset, cy];
    }
    if (side === "bottom") {
      return [cx, rect.bottom - gridRect.top - inset];
    }
    return [cx, rect.top - gridRect.top + inset];
  }

  function anchorsForPair(cardA, cardB, gridRect) {
    const ra = cardA.getBoundingClientRect();
    const rb = cardB.getBoundingClientRect();
    const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2);
    const dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx >= 0) {
        return [edgePoint(ra, gridRect, "right"), edgePoint(rb, gridRect, "left")];
      }
      return [edgePoint(ra, gridRect, "left"), edgePoint(rb, gridRect, "right")];
    }
    if (dy >= 0) {
      return [edgePoint(ra, gridRect, "bottom"), edgePoint(rb, gridRect, "top")];
    }
    return [edgePoint(ra, gridRect, "top"), edgePoint(rb, gridRect, "bottom")];
  }

  function curvedPath([x1, y1], [x2, y2]) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const bend = Math.min(dist * 0.28, 56);
    const nx = -dy / dist;
    const ny = dx / dist;
    const c1x = x1 + dx * 0.28 + nx * bend;
    const c1y = y1 + dy * 0.28 + ny * bend;
    const c2x = x1 + dx * 0.72 + nx * bend;
    const c2y = y1 + dy * 0.72 + ny * bend;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  function mobileVerticalPath(points) {
    if (!points.length) return "";
    if (points.length === 1) {
      return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    }

    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length; i += 1) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const bend = 7;
      const c1x = x0 - bend;
      const c1y = y0 + (y1 - y0) * 0.34;
      const c2x = x1 - bend;
      const c2y = y0 + (y1 - y0) * 0.66;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  }

  function cardCenterInWrap(card, gridRect) {
    const rect = card.getBoundingClientRect();
    return [
      MOBILE_LINE_X,
      rect.top + rect.height / 2 - gridRect.top,
    ];
  }

  function finishRouteBuild(svgEl, { animatePath }) {
    svgEl.classList.remove("planning-routes--draw", "planning-routes--static");

    if (!animatePath) {
      return;
    }

    requestAnimationFrame(() => {
      svgEl.classList.add("planning-routes--draw");
    });
  }

  function updateMobileNodePositions() {
    if (!wrap || !svg) return;
    const cards = [...grid.querySelectorAll(".planning-card")];
    const nodes = [...svg.querySelectorAll(".planning-routes__node")];
    const gridRect = wrap.getBoundingClientRect();
    cards.forEach((card, index) => {
      const [, y] = cardCenterInWrap(card, gridRect);
      if (nodes[index]) {
        nodes[index].setAttribute("cy", y.toFixed(1));
      }
    });
  }

  function setupPathDash(path, { animate, duration, delay, hidden = false }) {
    const length = path.getTotalLength();
    path.style.setProperty("--route-length", String(length));
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    if (animate) {
      path.style.setProperty("--route-duration", `${duration}ms`);
      path.style.setProperty("--route-delay", `${delay}ms`);
    } else if (!hidden) {
      path.style.strokeDashoffset = "0";
    }
  }

  function buildMobileRoutes({ animatePath, animateNodes }) {
    const cards = [...grid.querySelectorAll(".planning-card")];
    const gridRect = wrap.getBoundingClientRect();

    svg.setAttribute("width", String(Math.max(0, Math.round(gridRect.width))));
    svg.setAttribute("height", String(Math.max(0, Math.round(gridRect.height))));
    svg.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);
    svg.innerHTML = "";
    svg.classList.remove(
      "planning-routes--grid",
      "planning-routes--draw",
      "planning-routes--static",
      "planning-routes--nodes-in"
    );
    svg.classList.add("planning-routes--mobile");

    if (!cards.length || gridRect.width < 1 || gridRect.height < 1) return;

    const points = cards.map((card) => cardCenterInWrap(card, gridRect));
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", mobileVerticalPath(points));
    path.classList.add("planning-routes__path", "planning-routes__path--trace");
    svg.appendChild(path);
    setupPathDash(path, {
      animate: animatePath,
      duration: MOBILE_ROUTE_DURATION_MS,
      delay: 0,
      hidden: !animatePath,
    });

    points.forEach((point, index) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      node.setAttribute("cx", String(point[0]));
      node.setAttribute("cy", String(point[1].toFixed(1)));
      node.setAttribute("r", "4.5");
      node.classList.add("planning-routes__node");
      node.style.setProperty("--node-delay", `${index * CARD_REVEAL_STAGGER_MS}ms`);
      svg.appendChild(node);
    });

    if (!animatePath && !animateNodes) {
      svg.classList.add("planning-routes--static");
      return;
    }

    if (animateNodes) {
      requestAnimationFrame(() => {
        svg.classList.add("planning-routes--nodes-in");
      });
    }

    finishRouteBuild(svg, { animatePath });
  }

  function drawMobilePath() {
    const path = svg?.querySelector(".planning-routes__path--trace");
    if (!path) {
      buildMobileRoutes({ animatePath: true, animateNodes: false });
      return;
    }

    updateMobileNodePositions();
    const points = [...grid.querySelectorAll(".planning-card")].map((card) =>
      cardCenterInWrap(card, wrap.getBoundingClientRect())
    );
    path.setAttribute("d", mobileVerticalPath(points));
    setupPathDash(path, {
      animate: true,
      duration: MOBILE_ROUTE_DURATION_MS,
      delay: 0,
    });
    finishRouteBuild(svg, { animatePath: true });
  }

  function buildGridRoutes({ animate }) {
    const cards = [...grid.querySelectorAll(".planning-card")];
    const pairs = getConnectionPairs();
    const gridRect = wrap.getBoundingClientRect();

    svg.setAttribute("width", String(Math.max(0, Math.round(gridRect.width))));
    svg.setAttribute("height", String(Math.max(0, Math.round(gridRect.height))));
    svg.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);
    svg.innerHTML = "";
    svg.classList.remove("planning-routes--mobile");
    svg.classList.add("planning-routes--grid");

    if (!pairs.length || gridRect.width < 1 || gridRect.height < 1) return;

    pairs.forEach(([from, to], index) => {
      const cardA = cards[from - 1];
      const cardB = cards[to - 1];
      if (!cardA || !cardB) return;

      const [start, end] = anchorsForPair(cardA, cardB, gridRect);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", curvedPath(start, end));
      path.classList.add("planning-routes__path");
      svg.appendChild(path);
      setupPathDash(path, {
        animate,
        duration: ROUTE_DURATION_MS,
        delay: index * ROUTE_STAGGER_MS,
      });
    });

    finishRouteBuild(svg, { animatePath: animate });
  }

  function buildRoutes({ animate }) {
    if (!wrap || !svg) return;

    if (mobileRoutes.matches) {
      buildMobileRoutes({
        animatePath: animate,
        animateNodes: animate,
      });
      return;
    }

    buildGridRoutes({ animate });
  }

  function scheduleRoutes(animate) {
    window.clearTimeout(routesDrawTimer);

    const delay = animate ? ROUTE_BUILD_DELAY_MS : 0;
    routesDrawTimer = window.setTimeout(() => {
      if (mobileRoutes.matches && animate) {
        drawMobilePath();
        return;
      }
      buildRoutes({ animate });
    }, delay);
  }

  function onResize() {
    if (!hasBeenInView) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      buildRoutes({ animate: reducedMotion.matches });
    }, 120);
  }

  function onInview() {
    hasBeenInView = true;
    if (!reducedMotion.matches) {
      grid.classList.add("planning-grid--inview");
      if (mobileRoutes.matches) {
        requestAnimationFrame(() => {
          buildMobileRoutes({ animatePath: false, animateNodes: true });
        });
      }
    }
    scheduleRoutes(!reducedMotion.matches);
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      onInview();
      obs.disconnect();
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  io.observe(section);

  window.addEventListener("resize", onResize, { passive: true });
  mobileRoutes.addEventListener("change", () => {
    if (!hasBeenInView) return;
    scheduleRoutes(!reducedMotion.matches);
  });
})();

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => navMenu.classList.toggle("open"));
  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navMenu.classList.remove("open"));
  });
}

// Анимация появления блоков при прокрутке (аналог идеи story-scroll / GSAP ScrollTrigger,
// без React и без тяжёлых библиотек — только IntersectionObserver + CSS transitions).
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const activateAll = () => {
    revealElements.forEach((el) => el.classList.add("active"));
  };

  if (reducedMotion.matches) {
    activateAll();
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("active");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) activateAll();
  });
}

initScrollReveal();

(function initSiteTicker() {
  const ticker = document.querySelector(".site-ticker");
  if (!ticker) return;

  const track = ticker.querySelector(".site-ticker__track");
  const firstGroup = ticker.querySelector(".site-ticker__group:not([aria-hidden])");
  if (!track || !firstGroup) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const updateDistance = () => {
    const distance = firstGroup.getBoundingClientRect().width;
    if (distance > 0) {
      track.style.setProperty("--ticker-distance", `${distance}px`);
    }
  };

  if (!reduceMotion.matches) {
    updateDistance();
    window.addEventListener("resize", updateDistance, { passive: true });
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateDistance).catch(() => {});
    }
    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) {
        track.style.removeProperty("--ticker-distance");
      } else {
        updateDistance();
      }
    });
  }
})();

// Счетчики достижений в hero.
const counters = document.querySelectorAll("[data-counter]");
const startCounter = (element) => {
  const target = Number(element.dataset.counter || 0);
  const duration = 1400;
  const start = performance.now();

  const frame = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = String(Math.floor(eased * target));
    if (progress < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};

const countersObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      startCounter(entry.target);
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.5 }
);
counters.forEach((counter) => countersObserver.observe(counter));

// Запуск анимации блока "Как мы работаем" при появлении в зоне видимости.
const timeline = document.getElementById("timeline");
if (timeline) {
  const processDots = timeline.querySelectorAll(".process-dot");
  const timelineObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        timeline.classList.add("process-animate");
        processDots.forEach((dot, index) => {
          setTimeout(() => dot.classList.add("active"), 300 + index * 300);
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );
  timelineObserver.observe(timeline);
}

// Открытие первого FAQ по умолчанию для повышения вовлечения.
const firstFaqItem = document.querySelector(".faq-list details");
if (firstFaqItem) {
  firstFaqItem.open = true;
}

// Lightbox: галерея на странице, карточки «Наши работы» (если есть), слайдер «Наши работы».
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

function openLightbox(imagePath) {
  if (!lightbox || !lightboxImage || !imagePath) return;
  lightboxImage.src = imagePath;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
}

if (lightbox && lightboxImage && lightboxClose) {
  const openers = document.querySelectorAll(
    ".gallery__item[data-image], .work-card[data-image], .works-slider__lightbox[data-image]"
  );

  openers.forEach((item) => {
    item.addEventListener("click", () => {
      const imagePath = item.dataset.image;
      if (!imagePath) return;
      openLightbox(imagePath);
    });
    if (item.matches(".work-card, .works-slider__lightbox")) {
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const imagePath = item.dataset.image;
        if (imagePath) openLightbox(imagePath);
      });
    }
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });
}

// «Наши услуги»: desktop — scroll-лента; mobile (≤768px) — карусель как отзывы.
(function initServicesRibbon() {
  const root = document.getElementById("servicesRibbon");
  const viewport = document.getElementById("servicesRibbonViewport");
  const track = document.getElementById("servicesRibbonTrack");
  const btnPrev = document.getElementById("servicesRibbonPrev");
  const btnNext = document.getElementById("servicesRibbonNext");
  const dotsWrap = document.getElementById("servicesRibbonDots");
  if (!root || !viewport || !track) return;

  const mql = window.matchMedia("(max-width: 768px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = reducedMotion.matches;

  const slides = () => Array.from(track.querySelectorAll(".services-ribbon__slide"));
  let active = 0;
  let timer = null;
  const INTERVAL = 4500;
  let dotButtons = [];
  let mode = null;

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.textContent = "";
    dotButtons = slides().map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "services-ribbon__dot" + (i === 0 ? " is-active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.setAttribute("aria-label", `Услуга ${i + 1}`);
      b.addEventListener("click", () => {
        goTo(i);
        restartAutoplay();
      });
      dotsWrap.appendChild(b);
      return b;
    });
  }

  function circTier(i) {
    const n = slides().length;
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    const ad = Math.abs(d);
    if (ad === 0) return 0;
    if (ad === 1) return 1;
    return 2;
  }

  function updateSlides() {
    slides().forEach((slide, i) => {
      slide.classList.remove("is-tier-0", "is-tier-1", "is-tier-2");
      slide.classList.add(`is-tier-${circTier(i)}`);
      slide.setAttribute("aria-hidden", i === active ? "false" : "true");
    });
    dotButtons.forEach((b, i) => {
      b.classList.toggle("is-active", i === active);
      b.setAttribute("aria-selected", i === active ? "true" : "false");
    });
  }

  function updateTransform(instant) {
    const list = slides();
    const n = list.length;
    if (!n) return;
    if (instant) track.classList.add("is-no-transition");
    const v = viewport.getBoundingClientRect().width;
    const sw = list[0].getBoundingClientRect().width;
    const cell = n > 1 ? list[1].offsetLeft - list[0].offsetLeft : sw;
    const x = (v - sw) / 2 - active * cell;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    if (instant) {
      requestAnimationFrame(() => {
        track.offsetHeight;
        track.classList.remove("is-no-transition");
      });
    }
  }

  function isWrapOneStep(from, to) {
    const n = slides().length;
    return (from === 0 && to === n - 1) || (from === n - 1 && to === 0);
  }

  function goTo(index) {
    const n = slides().length;
    if (!n) return;
    const to = ((index % n) + n) % n;
    if (to === active) return;
    const from = active;
    const wrap = isWrapOneStep(from, to);
    active = to;
    updateSlides();
    if (wrap) updateTransform(true);
    else updateTransform(false);
  }

  function next() {
    goTo(active + 1);
  }

  function prev() {
    goTo(active - 1);
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (!reduce) timer = window.setInterval(next, INTERVAL);
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  function stepSize() {
    const list = slides();
    if (!list.length) return Math.max(120, viewport.clientWidth * 0.82);
    const first = list[0];
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 20;
    return first.getBoundingClientRect().width + gap;
  }

  function scrollByCards(direction) {
    const delta = stepSize() * direction;
    viewport.scrollBy({
      left: delta,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  function updateScrollArrows() {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
    if (btnPrev) btnPrev.disabled = viewport.scrollLeft <= 2;
    if (btnNext) btnNext.disabled = viewport.scrollLeft >= maxScroll - 1;
  }

  function onScrollArrowClick(direction) {
    scrollByCards(direction);
    window.requestAnimationFrame(updateScrollArrows);
  }

  function enableCarousel() {
    if (mode === "carousel") return;
    mode = "carousel";
    root.classList.add("services-ribbon--carousel");
    viewport.scrollLeft = 0;
    track.style.transform = "";
    active = 0;
    buildDots();
    updateSlides();
    updateTransform(false);
    startAutoplay();
    if (btnPrev) {
      btnPrev.disabled = false;
      btnPrev.onclick = () => {
        prev();
        restartAutoplay();
      };
    }
    if (btnNext) {
      btnNext.disabled = false;
      btnNext.onclick = () => {
        next();
        restartAutoplay();
      };
    }
    root.onmouseenter = stopAutoplay;
    root.onmouseleave = startAutoplay;
  }

  function enableScroll() {
    if (mode === "scroll") return;
    mode = "scroll";
    root.classList.remove("services-ribbon--carousel");
    stopAutoplay();
    root.onmouseenter = null;
    root.onmouseleave = null;
    track.style.transform = "";
    track.classList.remove("is-no-transition");
    if (dotsWrap) dotsWrap.textContent = "";
    dotButtons = [];
    slides().forEach((slide) => {
      slide.classList.remove("is-tier-0", "is-tier-1", "is-tier-2");
      slide.removeAttribute("aria-hidden");
    });
    if (btnPrev) {
      btnPrev.onclick = () => onScrollArrowClick(-1);
    }
    if (btnNext) {
      btnNext.onclick = () => onScrollArrowClick(1);
    }
    updateScrollArrows();
  }

  function applyMode() {
    if (mql.matches) enableCarousel();
    else enableScroll();
    window.requestAnimationFrame(() => {
      if (mql.matches) updateTransform(false);
      else updateScrollArrows();
    });
  }

  viewport.addEventListener("keydown", (e) => {
    if (!mql.matches) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollByCards(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollByCards(1);
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
      restartAutoplay();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
      restartAutoplay();
    }
  });

  viewport.addEventListener(
    "scroll",
    () => {
      if (!mql.matches) window.requestAnimationFrame(updateScrollArrows);
    },
    { passive: true }
  );

  mql.addEventListener("change", applyMode);
  window.addEventListener(
    "resize",
    () => {
      applyMode();
    },
    { passive: true }
  );

  window.addEventListener("load", () => window.requestAnimationFrame(applyMode), { once: true });
  track.querySelectorAll("img").forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => window.requestAnimationFrame(applyMode), { once: true });
    }
  });

  applyMode();
})();

// Слайдер «Наши работы»: автопрокрутка 4.5s при видимости ≥35%, пауза при наведении.
(function initWorksSlider() {
  const root = document.getElementById("worksSlider");
  if (!root) return;

  const slides = [
    { src: "images/boiler-1.jpeg", title: "Котёл Kotitonttu", meta: "г. Сатка", desc: "Монтаж котла в частном доме." },
    { src: "images/boiler-2.jpeg", title: "Котёл Ferroli", meta: "г. Сатка", desc: "Установка котла и подготовка к запуску." },
    { src: "images/boiler-3.jpeg", title: "Монтаж котла", meta: "Саткинский район", desc: "Подключение и обвязка на объекте." },
    { src: "images/boiler-4.jpeg", title: "Замена котла", meta: "Саткинский район", desc: "Демонтаж старого и установка нового оборудования." },
    { src: "images/boiler-5.jpg", title: "Котельная установка", meta: "г. Сатка", desc: "Аккуратная установка и разводка труб." },
    { src: "images/boiler-6.jfif", title: "Пуск и настройка", meta: "Саткинский район", desc: "Настройка режимов работы и проверка безопасности." },
    { src: "images/boiler-7.jfif", title: "Котёл на объекте", meta: "Саткинский район", desc: "Готовая котельная в частном доме." },
    { src: "images/chimney-1.jfif", title: "Монтаж дымохода", meta: "Саткинский район", desc: "Устройство дымоудаления по нормам." },
    { src: "images/chimney-2.jfif", title: "Коаксиальный вывод", meta: "г. Сатка", desc: "Вывод продуктов сгорания через стену." },
    { src: "images/chimney-3.jfif", title: "Наружный дымоход", meta: "Саткинский район", desc: "Вывод дымохода по фасаду дома." },
    { src: "images/chimney-4.jfif", title: "Дымоход через кровлю", meta: "Саткинский район", desc: "Проход через кровлю и герметизация." },
    { src: "images/chimney-5.jfif", title: "Проход через перекрытие", meta: "Саткинский район", desc: "Узел прохода с теплоизоляцией." },
    { src: "images/chimney-6.jfif", title: "Фасадный дымоход", meta: "г. Сатка", desc: "Вертикальный участок по наружной стене." },
    { src: "images/chimney-7.jfif", title: "Дымоходная система", meta: "Саткинский район", desc: "Сборка и крепление элементов дымохода." },
    { src: "images/otoplenie-1.jpg", title: "Система отопления", meta: "г. Сатка", desc: "Радиаторы и разводка отопления в частном доме." },
  ];

  const imgEl = document.getElementById("worksSliderHeroImg");
  const lbBtn = document.getElementById("worksSliderOpenLb");
  const titleEl = document.getElementById("worksSliderTitle");
  const metaEl = document.getElementById("worksSliderMeta");
  const descEl = document.getElementById("worksSliderDesc");
  const thumbsBar = document.getElementById("worksSliderThumbs");
  if (!thumbsBar) return;

  thumbsBar.textContent = "";
  slides.forEach((s, j) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "works-slider__thumb" + (j === 0 ? " is-active" : "");
    btn.setAttribute("data-slide", String(j));
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", j === 0 ? "true" : "false");
    btn.setAttribute("aria-label", `Слайд ${j + 1}: ${s.title}`);
    const im = document.createElement("img");
    im.src = s.src;
    im.alt = "";
    im.width = 120;
    im.height = 72;
    im.loading = "lazy";
    im.decoding = "async";
    btn.appendChild(im);
    thumbsBar.appendChild(btn);
  });

  const thumbs = Array.from(thumbsBar.querySelectorAll(".works-slider__thumb"));

  let idx = 0;
  let timer = null;
  let inView = false;
  let hover = false;
  const INTERVAL = 4500;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function scrollThumbsToActive() {
    const active = thumbs[idx];
    if (!active || !thumbsBar) return;
    const nextLeft = active.offsetLeft + active.offsetWidth / 2 - thumbsBar.clientWidth / 2;
    thumbsBar.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  function apply(i) {
    const n = ((i % slides.length) + slides.length) % slides.length;
    idx = n;
    const s = slides[idx];
    if (imgEl) {
      imgEl.src = s.src;
      imgEl.alt = s.title;
    }
    if (lbBtn) lbBtn.dataset.image = s.src;
    if (titleEl) titleEl.textContent = s.title;
    if (metaEl) metaEl.textContent = s.meta;
    if (descEl) descEl.textContent = s.desc;
    thumbs.forEach((btn, j) => {
      const on = j === idx;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    window.requestAnimationFrame(scrollThumbsToActive);
  }

  function nextSlide() {
    apply(idx + 1);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function restartAutoplay() {
    stop();
    if (!reduce && inView && !hover) {
      timer = window.setInterval(nextSlide, INTERVAL);
    }
  }

  thumbs.forEach((btn, j) => {
    btn.addEventListener("click", () => {
      apply(j);
      restartAutoplay();
    });
  });

  root.addEventListener("mouseenter", () => {
    hover = true;
    stop();
  });
  root.addEventListener("mouseleave", () => {
    hover = false;
    restartAutoplay();
  });

  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (!e) return;
      inView = Boolean(e.isIntersecting && e.intersectionRatio >= 0.35);
      if (inView) restartAutoplay();
      else stop();
    },
    { threshold: [0, 0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.75, 1] }
  );
  io.observe(root);

  apply(0);
})();

// Карусель «Отзывы клиентов» (кейсы): центр, соседи, точки, автопрокрутка.
(function initCaseReviewsCarousel() {
  const root = document.getElementById("caseReviewsCarousel");
  const viewport = document.getElementById("caseReviewsViewport");
  const track = document.getElementById("caseReviewsTrack");
  const dotsWrap = document.getElementById("caseReviewsDots");
  const btnPrev = document.getElementById("caseReviewsPrev");
  const btnNext = document.getElementById("caseReviewsNext");
  if (!root || !viewport || !track || !dotsWrap || !btnPrev || !btnNext) return;

  const slides = Array.from(track.querySelectorAll(".case-reviews-carousel__slide"));
  const n = slides.length;
  if (n === 0) return;

  let active = 0;
  let timer = null;
  const INTERVAL = 4500;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  dotsWrap.textContent = "";
  const dotButtons = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "case-reviews-carousel__dot" + (i === 0 ? " is-active" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", i === 0 ? "true" : "false");
    b.setAttribute("aria-label", `Отзыв ${i + 1}`);
    b.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(b);
    return b;
  });

  function circTier(i) {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    const ad = Math.abs(d);
    if (ad === 0) return 0;
    if (ad === 1) return 1;
    return 2;
  }

  function updateSlides() {
    slides.forEach((slide, i) => {
      slide.classList.remove("is-tier-0", "is-tier-1", "is-tier-2");
      slide.classList.add(`is-tier-${circTier(i)}`);
      const isAct = i === active;
      slide.setAttribute("aria-hidden", isAct ? "false" : "true");
    });
    dotButtons.forEach((b, i) => {
      b.classList.toggle("is-active", i === active);
      b.setAttribute("aria-selected", i === active ? "true" : "false");
    });
  }

  function updateTransform(instant) {
    if (instant) track.classList.add("is-no-transition");
    const v = viewport.getBoundingClientRect().width;
    const sw = slides[0].getBoundingClientRect().width;
    const cell = n > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : sw;
    const x = (v - sw) / 2 - active * cell;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    if (instant) {
      requestAnimationFrame(() => {
        track.offsetHeight;
        track.classList.remove("is-no-transition");
      });
    }
  }

  function isWrapOneStep(from, to) {
    return (from === 0 && to === n - 1) || (from === n - 1 && to === 0);
  }

  function goTo(index) {
    const to = ((index % n) + n) % n;
    if (to === active) return;
    const from = active;
    const wrap = isWrapOneStep(from, to);
    active = to;
    updateSlides();
    if (wrap) updateTransform(true);
    else updateTransform(false);
  }

  function next() {
    goTo(active + 1);
  }

  function prev() {
    goTo(active - 1);
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (!reduce) timer = window.setInterval(next, INTERVAL);
  }

  btnNext.addEventListener("click", () => {
    next();
    stopAutoplay();
    startAutoplay();
  });
  btnPrev.addEventListener("click", () => {
    prev();
    stopAutoplay();
    startAutoplay();
  });

  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);

  window.addEventListener(
    "resize",
    () => {
      window.requestAnimationFrame(() => updateTransform(false));
    },
    { passive: true }
  );

  updateSlides();
  updateTransform(false);
  startAutoplay();
})();

// VK: на mobile — deep-link в приложение, иначе https://vk.me/gazkotelsatka; на desktop — только web.
(function initVkMobileDeepLink() {
  const VK_WEB = "https://vk.me/gazkotelsatka";
  const VK_APP = "vk://vk.com/write-230364838";
  const FALLBACK_MS = 1200;

  const vkLinks = document.querySelectorAll(
    'a.social-sticky__btn--vk, a[href="https://vk.me/gazkotelsatka"]'
  );
  if (!vkLinks.length) return;

  function isMobileUserAgent() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent
    );
  }

  function openVkOnMobile() {
    let fellBack = false;

    const fallback = () => {
      if (fellBack) return;
      fellBack = true;
      window.location.assign(VK_WEB);
    };

    const cancelFallback = () => {
      if (fellBack) return;
      fellBack = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onBlur);
    };

    const onVisibilityChange = () => {
      if (document.hidden) cancelFallback();
    };
    const onPageHide = () => cancelFallback();
    const onBlur = () => cancelFallback();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("blur", onBlur);

    const timer = window.setTimeout(fallback, FALLBACK_MS);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none";
    iframe.src = VK_APP;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), FALLBACK_MS + 400);

    window.location.href = VK_APP;
  }

  vkLinks.forEach((link) => {
    if (!link.href.includes("vk.me/gazkotelsatka") && !link.classList.contains("social-sticky__btn--vk")) {
      return;
    }
    link.addEventListener("click", (event) => {
      if (!isMobileUserAgent()) return;
      event.preventDefault();
      openVkOnMobile();
    });
  });
})();

// Обработка формы заявки.
const requestForm = document.getElementById("requestForm");
const formMessage = document.getElementById("formMessage");

if (requestForm && formMessage) {
  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    formMessage.textContent = "Спасибо! Мы свяжемся с вами в ближайшее время.";
    requestForm.reset();
  });
}
