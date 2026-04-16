import {
  events,
  eventsSection,
  slides,
  preloadedImageUrls,
  currentIndex,
  slideInterval,
  SLIDE_DELAY,
  isHoveringEvents,
  isFocusInEvents,
  setIsHoveringEvents,
  setIsFocusInEvents,
  setSlideInterval,
} from "./event-state.js";

import { escapeHTML, formatWhen, formatLocation, sanitizeDescription, bestImageUrl, parseISO } from "./event-utils.js";

/*************************************************
 * AUTO-ADVANCING EVENT SLIDES
 *
 * The Events section auto-advances unless the user
 * is hovering over it.
 *************************************************/

export function stopAutoSlides() {
  if (slideInterval) {
    clearInterval(slideInterval);
    setSlideInterval(null);
  }
}

export function startAutoSlides() {
  if (isHoveringEvents || isFocusInEvents) return;
  stopAutoSlides();

  const id = setInterval(() => {
    const total = slides.length;
    const next = (currentIndex + 1) % total;
    fullpage_api.moveTo("events", next);
  }, SLIDE_DELAY);

  setSlideInterval(id);
}

// Pause auto-advance while the mouse is over the Events section.
export function bindEventsSectionInteractions() {
  eventsSection.addEventListener("mouseenter", () => {
    setIsHoveringEvents(true);
    stopAutoSlides();
  });

  eventsSection.addEventListener("mouseleave", () => {
    setIsHoveringEvents(false);
    startAutoSlides();
  });

  eventsSection.addEventListener("focusin", () => {
    setIsFocusInEvents(true);
    stopAutoSlides();
  });

  eventsSection.addEventListener("focusout", () => {
    setIsFocusInEvents(eventsSection.contains(document.activeElement));
    if (!eventsSection.contains(document.activeElement)) {
      startAutoSlides();
    }
  });
}

/*************************************************
 * IMAGE PRELOADING
 *
 * Only preload images we might need soon, and only
 * once per URL.
 *************************************************/

export function preloadImage(index) {
  if (index < 0 || index >= events.length) return;

  const ev = events[index];
  if (!ev) return;

  const url = bestImageUrl(ev);
  if (!url || preloadedImageUrls.has(url)) return;

  const img = new Image();
  img.src = url;

  preloadedImageUrls.add(url);
}

/*************************************************
 * SLIDE HTML TEMPLATES
 *
 * Two visual states:
 * - placeholder slide: cheap to render
 * - full slide: actual event content
 *************************************************/

export function placeholderHTML() {
  return `
    <div class="event-slide-content section-inner container">
      <div class="row py-4 py-md-5">
        <div class="col-12">
          <div class="event-panel border bg-light p-3" style="min-height: 300px;"></div>
        </div>
      </div>
    </div>
  `;
}

export function getPlaceholderNumber(ev) {
  if (!ev.placeholderNumber) {
    ev.placeholderNumber = Math.floor(Math.random() * 3) + 1;
  }
  return ev.placeholderNumber;
}

export function slideHTML(ev, isCurrent = false) {
  const title = escapeHTML(ev.title ?? "");
  const when = escapeHTML(formatWhen(ev) || "TBA");
  const where = escapeHTML(formatLocation(ev.location) || "TBA");
  const desc = sanitizeDescription(ev.description ?? "");
  const imgUrl = bestImageUrl(ev);

  const loadingAttr = isCurrent ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const decodingAttr = isCurrent ? 'decoding="sync"' : 'decoding="async"';
  const n = getPlaceholderNumber(ev);
  const imageBlock = imgUrl
    ? `
      <img
        src="${escapeHTML(imgUrl)}"
        alt="${title}"
        class="img-fluid rounded shadow event-image"
        onerror="this.onerror=null; this.src='assets/events/placeholder1.svg';"
        ${loadingAttr}
        ${decodingAttr}
      >
    `
    : `
      <img
        src="assets/events/placeholder${n}.svg"
        alt="Bike Month Raleigh"
        class="img-fluid rounded shadow event-image"
        onerror="this.onerror=null; this.src='assets/events/placeholder1.svg';"
        ${loadingAttr}
        ${decodingAttr}
      >
    `;

  return `
    <div class="event-slide-content section-inner container">
      <div class="row py-4 py-md-5">

        <div class="col-12 d-md-none">
          <h2 class="event-title mb-4">${title}</h2>
        </div>

        <div class="col-12 col-md-5 col-lg-4 mb-4 mb-md-0 text-center">
          ${imageBlock}
        </div>

        <div class="col-12 col-md-7 col-lg-8">
          <div class="event-details">
            <h2 class="event-title mb-4 d-none d-md-block">${title}</h2>
            <p class="mb-2"><strong>Where:</strong> ${where}</p>
            <p class="mb-2"><strong>When:</strong> ${when}</p>
            <div class="mb-0">${desc}</div>
          </div>
        </div>

      </div>
    </div>
  `;
}

/*************************************************
 * SLIDE RENDERING HELPERS
 *
 * We keep all slide shells in the DOM, but only
 * fully render the current slide and its immediate
 * neighbors.
 *************************************************/

export function setPlaceholder(slide) {
  if (slide.dataset.mode === "placeholder") return;
  const host = slide.querySelector(".slide-content-host");
  if (!host) return;
  host.innerHTML = placeholderHTML();
  slide.dataset.mode = "placeholder";
}

export function setFull(slide, ev, isCurrent = false) {
  const host = slide.querySelector(".slide-content-host");
  if (!host) return;
  host.innerHTML = slideHTML(ev, isCurrent);
  slide.dataset.mode = "full";
}

export function wrapIndex(i) {
  const total = slides.length;
  if (total === 0) return -1;
  return (i + total) % total;
}

export function keepSet(center) {
  const keep = new Set();

  if (slides.length === 0) return keep;

  keep.add(wrapIndex(center - 1));
  keep.add(wrapIndex(center));
  keep.add(wrapIndex(center + 1));

  return keep;
}

export function renderAround(center) {
  const keep = keepSet(center);

  slides.forEach((slide, i) => {
    if (keep.has(i)) {
      setFull(slide, events[i], i === center);
    } else {
      setPlaceholder(slide);
    }
  });

  // Preload the current neighborhood first, then a little farther out.
  preloadImage(wrapIndex(center));
  preloadImage(wrapIndex(center - 1));
  preloadImage(wrapIndex(center + 1));
  preloadImage(wrapIndex(center - 2));
  preloadImage(wrapIndex(center + 2));
}

/*************************************************
 * INITIAL EVENT SELECTION
 *
 * Choose which event the Events section should
 * start on:
 * - current event if one is happening now
 * - otherwise the next future event
 * - otherwise the most recent past event
 *************************************************/

export function findInitialIndex() {
  const now = new Date();
  let lastPastIndex = 0;

  for (let i = 0; i < events.length; i++) {
    const start = parseISO(events[i].start);
    const end = parseISO(events[i].end) || start;

    if (!start) continue;

    if (start <= now && now <= end) {
      return i;
    }

    if (start > now) {
      return i;
    }

    lastPastIndex = i;
  }

  return lastPastIndex;
}

/*************************************************
 * BUILD THE EVENTS SECTION
 *
 * This clears and rebuilds all event slides, while
 * preserving the bike overlay at the top.
 *************************************************/

export function buildSlides() {
  slides.length = 0;

  events.forEach((ev, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.dataset.index = String(i);
    slide.dataset.anchor = `event-${i + 1}`;
    slide.dataset.mode = "placeholder";

    slide.innerHTML = `<div class="slide-content-host">${placeholderHTML()}</div>`;

    eventsSection.appendChild(slide);
    slides.push(slide);
  });
}
