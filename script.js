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

// Lightbox для галереи.
const galleryItems = document.querySelectorAll(".gallery__item");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

if (lightbox && lightboxImage && lightboxClose) {
  const closeLightbox = () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.src = "";
  };

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => {
      const imagePath = item.dataset.image;
      if (!imagePath) return;
      lightboxImage.src = imagePath;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
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
