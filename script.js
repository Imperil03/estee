document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const progressBar = document.getElementById("scrollProgress");
let scrollable = 0;
let progressFrame = 0;

const measureProgress = () => {
  scrollable = document.documentElement.scrollHeight - window.innerHeight;
};

const updateProgress = () => {
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress / 100))})`;
  progressFrame = 0;
};

const requestProgressUpdate = () => {
  if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
};

window.addEventListener("scroll", requestProgressUpdate, { passive: true });
window.addEventListener("resize", () => {
  measureProgress();
  requestProgressUpdate();
}, { passive: true });
measureProgress();
requestProgressUpdate();

const revealItems = document.querySelectorAll(".reveal");
const charts = document.querySelectorAll("[data-chart]");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
  charts.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6%" });

  revealItems.forEach((item) => revealObserver.observe(item));
  charts.forEach((item) => revealObserver.observe(item));
}

const counters = document.querySelectorAll(".counter[data-count]");

const animateCounter = (element) => {
  const target = Number(element.dataset.count);
  const duration = 850;
  const start = performance.now();

  const frame = (now) => {
    const elapsed = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    element.textContent = Math.round(target * eased);
    if (elapsed < 1) requestAnimationFrame(frame);
  };

  element.textContent = "0";
  requestAnimationFrame(frame);
};

if (!reducedMotion && "IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.7 });
  counters.forEach((counter) => counterObserver.observe(counter));
}

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".image-button").forEach((button) => {
  button.addEventListener("click", () => {
    lightboxImage.src = button.dataset.image;
    lightboxImage.alt = button.dataset.alt;
    lightboxTitle.textContent = button.dataset.alt;
    lightbox.showModal();
  });
});

const closeLightbox = () => lightbox.close();

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

let detailsState = [];
window.addEventListener("beforeprint", () => {
  revealItems.forEach((item) => item.classList.add("is-visible"));
  charts.forEach((item) => item.classList.add("is-visible"));
  detailsState = [...document.querySelectorAll("details")].map((details) => details.open);
  document.querySelectorAll("details").forEach((details) => { details.open = true; });
});

window.addEventListener("afterprint", () => {
  document.querySelectorAll("details").forEach((details, index) => {
    details.open = detailsState[index] ?? details.open;
  });
  detailsState = [];
});
