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

// Карусель «Наши работы» (логика как у circular-testimonials: 3 карточки, gap, автоплей).
(function initWorksCarousel() {
  const root = document.getElementById("worksCarousel");
  const ring = document.getElementById("worksRing");
  if (!root || !ring) return;

  const frames = Array.from(ring.querySelectorAll(".works-carousel__frame"));
  const titleEl = document.getElementById("worksSlideTitle");
  const metaEl = document.getElementById("worksSlideMeta");
  const descEl = document.getElementById("worksSlideDesc");
  const btnPrev = document.getElementById("worksPrev");
  const btnNext = document.getElementById("worksNext");
  const btnOpen = document.getElementById("worksOpenLightbox");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let autoplayTimer = null;
  const len = frames.length;
  if (len === 0) return;

  frames.forEach((frame) => {
    const img = frame.querySelector("img");
    const t = frame.dataset.workTitle;
    if (img && t) img.alt = `Фото объекта: ${t}`;
  });

  function calculateGap(width) {
    const minWidth = 1024;
    const maxWidth = 1456;
    const minGap = 60;
    const maxGap = 86;
    let g;
    if (width <= minWidth) g = minGap;
    else if (width >= maxWidth) g = Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
    else g = minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
    return Math.min(g, Math.max(40, width * 0.12));
  }

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

  function applyTransforms() {
    const w = ring.offsetWidth || 1200;
    const gap = calculateGap(w);
    const maxStickUp = gap * 0.8;

    if (reducedMotion.matches) {
      frames.forEach((frame, index) => {
        const isActive = index === activeIndex;
        frame.style.zIndex = isActive ? "3" : "1";
        frame.style.opacity = isActive ? "1" : "0";
        frame.style.pointerEvents = isActive ? "auto" : "none";
        frame.style.transform = "translateX(0) translateY(0) scale(1)";
      });
      return;
    }

    frames.forEach((frame, index) => {
      const isActive = index === activeIndex;
      const isLeft = (activeIndex - 1 + len) % len === index;
      const isRight = (activeIndex + 1) % len === index;

      frame.style.transition = "transform 0.8s cubic-bezier(0.4, 2, 0.3, 1), opacity 0.8s cubic-bezier(0.4, 2, 0.3, 1)";

      if (isActive) {
        frame.style.zIndex = "3";
        frame.style.opacity = "1";
        frame.style.pointerEvents = "auto";
        frame.style.transform = "translateX(0px) translateY(0px) scale(1) rotateY(0deg)";
      } else if (isLeft) {
        frame.style.zIndex = "2";
        frame.style.opacity = "1";
        frame.style.pointerEvents = "auto";
        frame.style.transform = `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(15deg)`;
      } else if (isRight) {
        frame.style.zIndex = "2";
        frame.style.opacity = "1";
        frame.style.pointerEvents = "auto";
        frame.style.transform = `translateX(${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(-15deg)`;
      } else {
        frame.style.zIndex = "1";
        frame.style.opacity = "0";
        frame.style.pointerEvents = "none";
        frame.style.transform = "translateX(0px) translateY(0px) scale(0.8) rotateY(0deg)";
      }
    });
  }

  function applyState() {
    if (descEl) descEl.classList.add("is-switching");
    applyTransforms();
    updatePanel();
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (descEl) descEl.classList.remove("is-switching");
      }, 120);
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

  frames.forEach((frame, index) => {
    frame.addEventListener("click", () => {
      if (index === activeIndex) return;
      goTo(index);
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

  let resizeRaf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => applyTransforms());
  });

  reducedMotion.addEventListener("change", () => {
    applyState();
    if (reducedMotion.matches) clearAutoplay();
    else startAutoplay();
  });

  applyState();
  startAutoplay();
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
