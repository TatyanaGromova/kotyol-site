// Мобильное меню.
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

// Lightbox для галереи и карусели «Наши работы».
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
  const galleryItems = document.querySelectorAll(".gallery__item[data-image]");

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => {
      const imagePath = item.dataset.image;
      if (!imagePath) return;
      openLightbox(imagePath);
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });
}

// Карусель «Наши работы»: одно крупное фото без наслоения + ряд миниатюр для выбора.
(function initWorksCarousel() {
  const root = document.getElementById("worksCarousel");
  const ring = document.getElementById("worksRing");
  const thumbsHost = document.getElementById("worksThumbs");
  if (!root || !ring || !thumbsHost) return;

  const frames = Array.from(ring.querySelectorAll(".works-carousel__frame"));
  const titleEl = document.getElementById("worksSlideTitle");
  const metaEl = document.getElementById("worksSlideMeta");
  const descEl = document.getElementById("worksSlideDesc");
  const btnPrev = document.getElementById("worksPrev");
  const btnNext = document.getElementById("worksNext");
  const btnOpen = document.getElementById("worksOpenLightbox");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 1;
  let autoplayTimer = null;
  const len = frames.length;
  if (len === 0) return;

  const thumbButtons = [];

  frames.forEach((frame, i) => {
    const img = frame.querySelector("img");
    const t = frame.dataset.workTitle;
    if (img && t) img.alt = `Фото объекта: ${t}`;

    const tb = document.createElement("button");
    tb.type = "button";
    tb.className = "works-carousel__thumb";
    tb.setAttribute("role", "tab");
    tb.setAttribute("aria-label", t || `Слайд ${i + 1}`);
    tb.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
    const ti = document.createElement("img");
    ti.src = frame.dataset.image || "";
    ti.alt = "";
    ti.setAttribute("aria-hidden", "true");
    tb.appendChild(ti);
    tb.addEventListener("click", () => goTo(i));
    thumbsHost.appendChild(tb);
    thumbButtons.push(tb);
  });

  function clearAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function startAutoplay() {
    clearAutoplay();
    if (reducedMotion.matches) return;
    autoplayTimer = window.setInterval(() => {
      activeIndex = (activeIndex + 1) % len;
      applyState();
    }, 5000);
  }

  function updatePanel() {
    const frame = frames[activeIndex];
    if (!frame || !titleEl || !metaEl || !descEl) return;
    titleEl.textContent = frame.dataset.workTitle || "";
    metaEl.textContent = frame.dataset.workMeta || "";
    descEl.textContent = frame.dataset.workDesc || "";
    frames.forEach((f, i) => {
      f.setAttribute("aria-current", i === activeIndex ? "true" : "false");
    });
  }

  function applyFrames() {
    frames.forEach((frame, index) => {
      frame.classList.toggle("works-carousel__frame--active", index === activeIndex);
    });
  }

  function updateThumbs() {
    thumbButtons.forEach((tb, i) => {
      const on = i === activeIndex;
      tb.classList.toggle("is-active", on);
      tb.setAttribute("aria-selected", on ? "true" : "false");
      if (on) {
        tb.scrollIntoView({
          inline: "center",
          block: "nearest",
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      }
    });
  }

  function applyState() {
    if (descEl) descEl.classList.add("is-switching");
    applyFrames();
    updatePanel();
    updateThumbs();
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (descEl) descEl.classList.remove("is-switching");
      }, 100);
    });
  }

  function goTo(index) {
    activeIndex = (index + len) % len;
    clearAutoplay();
    applyState();
    startAutoplay();
  }

  function handlePrev() {
    goTo(activeIndex - 1);
  }

  function handleNext() {
    goTo(activeIndex + 1);
  }

  frames.forEach((frame) => {
    frame.addEventListener("click", () => {
      if (!frame.classList.contains("works-carousel__frame--active")) return;
      const path = frame.dataset.image;
      if (path) openLightbox(path);
    });
  });

  if (btnPrev) btnPrev.addEventListener("click", handlePrev);
  if (btnNext) btnNext.addEventListener("click", handleNext);

  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      const path = frames[activeIndex]?.dataset.image;
      if (path) openLightbox(path);
    });
  }

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  });

  reducedMotion.addEventListener("change", () => {
    applyState();
    if (reducedMotion.matches) clearAutoplay();
    else startAutoplay();
  });

  applyState();
  startAutoplay();
})();

// Круговая 3D-галерея «Наши услуги» (адаптация circular-gallery: скролл + автоповорот + drag).
(function initServicesRing() {
  const root = document.getElementById("servicesRing");
  const track = document.getElementById("servicesRingTrack");
  const stage = root?.querySelector(".services-ring__stage");
  if (!root || !track || !stage) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) {
    root.classList.add("services-ring--flat");
    return;
  }

  const panels = Array.from(root.querySelectorAll(".services-ring__panel"));
  const count = panels.length || 7;
  const step = 360 / count;
  const btnPrev = document.getElementById("servicesRingPrev");
  const btnNext = document.getElementById("servicesRingNext");

  let userDeg = 0;
  let autoDeg = 0;
  let isScrolling = false;
  let scrollTimer = null;
  let rafId = 0;

  let dragPointer = false;
  let dragStartX = 0;
  let dragStartUser = 0;
  let lastTouchX = 0;

  function scrollProgress() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    return h > 0 ? window.scrollY / h : 0;
  }

  function scrollDegrees() {
    return scrollProgress() * 220;
  }

  function updateRadius() {
    const w = stage.offsetWidth || 400;
    const tz = Math.min(340, Math.max(190, w * 0.38));
    root.style.setProperty("--ring-tz", `${tz}px`);
  }

  function totalAngle() {
    return scrollDegrees() + autoDeg + userDeg;
  }

  function apply() {
    const angle = totalAngle();
    track.style.transform = `translate(-50%, -50%) rotateY(${-angle}deg)`;
    for (let i = 0; i < count; i += 1) {
      const panel = panels[i];
      const itemAngle = i * step;
      let d = (((itemAngle - angle) % 360) + 360) % 360;
      if (d > 180) d = 360 - d;
      panel.style.opacity = String(Math.max(0.32, 1 - d / 180));
    }
  }

  function tick() {
    if (!isScrolling) autoDeg += 0.035;
    updateRadius();
    apply();
    rafId = window.requestAnimationFrame(tick);
  }

  function stopTick() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  window.addEventListener(
    "scroll",
    () => {
      isScrolling = true;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        isScrolling = false;
      }, 160);
    },
    { passive: true }
  );

  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      userDeg += e.deltaY * 0.055;
    },
    { passive: false }
  );

  stage.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragPointer = true;
    dragStartX = e.clientX;
    dragStartUser = userDeg;
    stage.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragPointer) return;
    userDeg = dragStartUser + (e.clientX - dragStartX) * 0.32;
  });

  window.addEventListener("mouseup", () => {
    if (!dragPointer) return;
    dragPointer = false;
    stage.style.cursor = "";
  });

  stage.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      dragPointer = true;
      lastTouchX = e.touches[0].clientX;
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchmove",
    (e) => {
      if (!dragPointer || !e.touches[0]) return;
      const x = e.touches[0].clientX;
      userDeg += (x - lastTouchX) * 0.45;
      lastTouchX = x;
    },
    { passive: true }
  );

  stage.addEventListener("touchend", () => {
    dragPointer = false;
  });

  function nudge(delta) {
    userDeg += delta;
  }

  if (btnPrev) btnPrev.addEventListener("click", () => nudge(-step));
  if (btnNext) btnNext.addEventListener("click", () => nudge(step));

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudge(-step);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nudge(step);
    }
  });

  let resizeT = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(updateRadius, 80);
  });

  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      stopTick();
      root.classList.add("services-ring--flat");
    } else {
      root.classList.remove("services-ring--flat");
      updateRadius();
      if (!rafId) rafId = window.requestAnimationFrame(tick);
    }
  });

  updateRadius();
  rafId = window.requestAnimationFrame(tick);
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
