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

// Lightbox: галерея на странице и карточки «Наши работы».
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
  const openers = document.querySelectorAll(".gallery__item[data-image], .work-card[data-image]");

  openers.forEach((item) => {
    item.addEventListener("click", () => {
      const imagePath = item.dataset.image;
      if (!imagePath) return;
      openLightbox(imagePath);
    });
    if (item.matches(".work-card")) {
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

// Горизонтальная лента «Наши услуги»: стрелки прокручивают по одной карточке, плавный scroll.
(function initServicesRibbon() {
  const viewport = document.getElementById("servicesRibbonViewport");
  const track = document.getElementById("servicesRibbonTrack");
  const btnPrev = document.getElementById("servicesRibbonPrev");
  const btnNext = document.getElementById("servicesRibbonNext");
  if (!viewport || !track) return;

  const cards = () => Array.from(track.querySelectorAll(".services-ribbon__card"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function stepSize() {
    const list = cards();
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

  function updateArrows() {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
    if (btnPrev) btnPrev.disabled = viewport.scrollLeft <= 2;
    if (btnNext) btnNext.disabled = viewport.scrollLeft >= maxScroll - 1;
  }

  btnPrev?.addEventListener("click", () => scrollByCards(-1));
  btnNext?.addEventListener("click", () => scrollByCards(1));

  viewport.addEventListener("scroll", () => window.requestAnimationFrame(updateArrows), { passive: true });

  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByCards(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByCards(1);
    }
  });

  window.addEventListener("resize", () => window.requestAnimationFrame(updateArrows));

  window.addEventListener("load", () => window.requestAnimationFrame(updateArrows), { once: true });
  track.querySelectorAll("img").forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => window.requestAnimationFrame(updateArrows), { once: true });
    }
  });

  updateArrows();
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
