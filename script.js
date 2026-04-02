import { RBM_EVENTS } from "./events.js";

/*************************************************
 * DATA + DOM REFERENCES
 *
 * Static data from events.js and the main DOM nodes
 * this script needs to control.
 *************************************************/

const events = RBM_EVENTS.events ?? [];
const tz = RBM_EVENTS.timeZone || "America/New_York";

const nav = document.getElementById("mainNav");
const navbarCollapse = document.getElementById("navbarResponsive");
const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse, { toggle: false });

const eventsSection = document.querySelector(".events-section");
if (!eventsSection) {
  throw new Error("Missing .events-section");
}

// Hide event content until the first time the Events section is positioned.
eventsSection.classList.add("prepositioning");

/*************************************************
 * RUNTIME STATE
 *
 * Mutable state used while the page is running.
 *************************************************/

const slides = [];
const preloadedImageUrls = new Set();

let currentIndex = 0;

let slideInterval = null;
const SLIDE_DELAY = 5000; // 5 seconds between automatic slide advances

let hasPositionedEvents = false;

/*************************************************
 * AUTO-ADVANCING EVENT SLIDES
 *
 * The Events section auto-advances unless the user
 * is hovering over it.
 *************************************************/

function stopAutoSlides() {
  if (slideInterval) {
    clearInterval(slideInterval);
    slideInterval = null;
  }
}

function startAutoSlides() {
  stopAutoSlides();

  slideInterval = setInterval(() => {
    const total = slides.length;
    const next = (currentIndex + 1) % total;
    fullpage_api.moveTo("events", next);
  }, SLIDE_DELAY);
}

// Pause auto-advance while the mouse is over the Events section.
eventsSection.addEventListener("mouseenter", stopAutoSlides);
eventsSection.addEventListener("mouseleave", startAutoSlides);

/*************************************************
 * SMALL EVENT UTILITIES
 *
 * Helpers for formatting and sanitizing event data
 * before it is inserted into the page.
 *************************************************/

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseISO(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatWhen(ev) {
  const start = parseISO(ev.start);
  const end = parseISO(ev.end);

  if (!start) return "";

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (ev.allDay) return dateFmt.format(start);

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) {
    return `${dateFmt.format(start)} • ${timeFmt.format(start)}`;
  }

  return `${dateFmt.format(start)} • ${timeFmt.format(start)} to ${timeFmt.format(end)}`;
}

function driveEmbedUrl(url) {
  const u = String(url ?? "");
  if (!u.includes("drive.google.com")) return u;

  let id = null;

  const matchId = u.match(/[?&]id=([^&]+)/);
  if (matchId) id = matchId[1];

  const matchFile = u.match(/\/file\/d\/([^/]+)/);
  if (!id && matchFile) id = matchFile[1];

  if (!id) return u;

  return `https://drive.usercontent.google.com/download?export=view&id=${encodeURIComponent(id)}`;
}

function bestImageUrl(ev) {
  if (ev.localImages?.length) return ev.localImages[0];
  if (ev.images?.length) return driveEmbedUrl(ev.images[0]);
  return null;
}

function sanitizeDescription(html) {
  const host = document.createElement("div");
  host.innerHTML = String(html ?? "");

  const allowedTags = new Set(["BR", "A"]);
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_ELEMENT);
  const toReplace = [];

  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (!allowedTags.has(el.tagName)) {
      toReplace.push(el);
    }
  }

  for (const el of toReplace) {
    el.replaceWith(document.createTextNode(el.textContent ?? ""));
  }

  host.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const safe = href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:");

    if (!safe) {
      a.replaceWith(document.createTextNode(a.textContent ?? ""));
      return;
    }

    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });

  return host.innerHTML;
}

/*************************************************
 * IMAGE PRELOADING
 *
 * Only preload images we might need soon, and only
 * once per URL.
 *************************************************/

function preloadImage(index) {
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

function placeholderHTML() {
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

function slideHTML(ev, isCurrent = false) {
  const title = escapeHTML(ev.title ?? "");
  const when = escapeHTML(formatWhen(ev) || "TBA");
  const where = escapeHTML(ev.location ?? "TBA");
  const desc = sanitizeDescription(ev.description ?? "");
  const imgUrl = bestImageUrl(ev);

  const loadingAttr = isCurrent ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const decodingAttr = isCurrent ? 'decoding="sync"' : 'decoding="async"';

  const imageBlock = imgUrl
    ? `
      <img
        src="${escapeHTML(imgUrl)}"
        alt="${title}"
        class="img-fluid rounded shadow event-image"
        ${loadingAttr}
        ${decodingAttr}
      >
    `
    : `
      <img
        src="assets/events/placeholder.png"
        alt="Bike Month Raleigh"
        class="img-fluid rounded shadow event-image"
        ${loadingAttr}
        ${decodingAttr}
      >
    `;

  return `
    <div class="event-slide-content section-inner container">
      <div class="row py-4 py-md-5">
        <div class="col-12">
          <h2 class="event-title mb-4">${title}</h2>
        </div>

        <div class="col-12 col-md-5 col-lg-4 mb-4 mb-md-0 text-center">
          ${imageBlock}
        </div>

        <div class="col-12 col-md-7 col-lg-8">
          <div class="event-details">
            <p class="mb-2"><strong>Location:</strong> ${where}</p>
            <p class="mb-2"><strong>Date:</strong> ${when}</p>
            <p class="mb-0">${desc}</p>
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
function setPlaceholder(slide) {
  if (slide.dataset.mode === "placeholder") return;
  const host = slide.querySelector(".slide-content-host");
  if (!host) return;
  host.innerHTML = placeholderHTML();
  slide.dataset.mode = "placeholder";
}

function setFull(slide, ev, isCurrent = false) {
  const host = slide.querySelector(".slide-content-host");
  if (!host) return;
  host.innerHTML = slideHTML(ev, isCurrent);
  slide.dataset.mode = "full";
}

function wrapIndex(i) {
  const total = slides.length;
  if (total === 0) return -1;
  return (i + total) % total;
}

function keepSet(center) {
  const keep = new Set();

  if (slides.length === 0) return keep;

  keep.add(wrapIndex(center - 1));
  keep.add(wrapIndex(center));
  keep.add(wrapIndex(center + 1));

  return keep;
}

function renderAround(center) {
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

function findInitialIndex() {
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
 * BIKE OVERLAY
 *
 * The bike lives once at the top of the Events
 * section, independent of individual slides.
 *************************************************/

function ensureBikeOverlay() {
  let overlay = eventsSection.querySelector(".bike-overlay");
  console.log(eventsSection);
  console.log(overlay);
  if (overlay) return overlay;
  console.log("yabba");

  overlay = document.createElement("div");
  overlay.className = "bike-overlay idle";
  overlay.innerHTML = `
    <div class="bike-track">
      <div class="background-layer sky-layer" aria-hidden="true"></div>
      <div class="background-layer scenery-layer" aria-hidden="true"></div>
      <div class="bike-sprite" aria-hidden="true"></div>
    </div>
  `;

  eventsSection.appendChild(overlay);
  return overlay;
}

function freezeBackgroundLayers() {
  const layers = eventsSection.querySelectorAll(".background-layer");

  layers.forEach((layer) => {
    const styles = window.getComputedStyle(layer);
    const bgPos = styles.backgroundPosition.split(" ");
    const x = bgPos[0];

    layer.style.setProperty("--bg-start-x", x);
    layer.style.animation = "none";

    void layer.offsetWidth;
  });
}

function resumeBackgroundLayers() {
  const layers = eventsSection.querySelectorAll(".background-layer");

  layers.forEach((layer) => {
    layer.style.animation = "";
  });
}

function setBikeFacingForward() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  if (!overlay) return;

  overlay.classList.remove("going-backward");
  overlay.classList.add("going-forward");
}

function setBikeFacingBackward() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  if (!overlay) return;

  overlay.classList.remove("going-forward");
  overlay.classList.add("going-backward");
}

function setBikeIdle() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  if (!overlay) return;

  overlay.classList.remove("pedaling");
  overlay.classList.add("idle");
}

function setBikePedaling() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  const sprite = eventsSection.querySelector(".bike-sprite");
  if (!overlay || !sprite) return;

  // Restart the pedal animation from the beginning each time.
  overlay.classList.remove("idle");
  overlay.classList.remove("pedaling");

  // Force a reflow so the animation restart is recognized.
  void sprite.offsetWidth;

  overlay.classList.add("pedaling");

  const handleEnd = (e) => {
    if (e.animationName !== "bike-pedal") return;
    sprite.removeEventListener("animationend", handleEnd);
    setBikeIdle();
  };

  sprite.addEventListener("animationend", handleEnd);
}

/*************************************************
 * BUILD THE EVENTS SECTION
 *
 * This clears and rebuilds all event slides, while
 * preserving the bike overlay at the top.
 *************************************************/

function buildSlides() {
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

/*************************************************
 * PAGE STARTUP
 *
 * 1. Build slides
 * 2. Choose the initial event
 * 3. Render the neighborhood around that event
 * 4. Initialize fullPage.js
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  buildSlides();

  currentIndex = findInitialIndex();
  renderAround(currentIndex);

  new fullpage("#fullpage", {
    licenseKey: "gplv3-license",
    credits: {
      enabled: false,
    },
    anchors: ["home", "about", "calendar", "events", "orgs"],
    menu: "#mainMenu",
    navigation: false,
    css3: true,
    scrollingSpeed: 700,
    autoScrolling: true,
    fitToSection: true,
    fixedElements: "#mainNav",
    paddingTop: nav.offsetHeight + "px",
    controlArrows: true,
    scrollOverflow: true,
    recordHistory: false,
    lockAnchors: true,

    /*********************************************
     * afterLoad
     *
     * Runs after landing on a vertical section.
     * Used here to:
     * - hide the collapsed navbar
     * - start/stop auto-sliding
     * - the first time we hit Events, jump to the
     *   correct event slide based on the date
     *********************************************/
    afterLoad: function (origin, destination) {
      bsCollapse.hide();

      if (destination.anchor === "events") {
        if (!hasPositionedEvents && events.length > 0) {
          hasPositionedEvents = true;
          renderAround(currentIndex);
          fullpage_api.silentMoveTo("events", currentIndex);

          requestAnimationFrame(() => {
            eventsSection.classList.remove("prepositioning");
            setBikeFacingForward();
            setBikeIdle();
          });
        } else {
          setBikeFacingForward();
          setBikeIdle();
        }

        startAutoSlides();
      } else {
        stopAutoSlides();
      }
    },

    /*********************************************
     * onLeave
     *
     * Runs when leaving a vertical section.
     * Used here to stop auto-sliding when leaving
     * the Events section.
     *********************************************/
    onLeave: function (origin, destination) {
      if (origin.anchor === "events" && destination.anchor !== "events") {
        stopAutoSlides();
      }
    },

    onSlideLeave: function (section, origin, destination, direction) {
      if (section.anchor !== "events") return;

      freezeBackgroundLayers();

      if (direction === "right") {
        setBikeFacingForward();
      } else if (direction === "left") {
        setBikeFacingBackward();
      }

      resumeBackgroundLayers();
      setBikePedaling();
      fullpage_api.setScrollingSpeed(2400);
    },

    /*********************************************
     * afterSlideLoad
     *
     * Runs after landing on a horizontal slide
     * inside a section. In the Events section,
     * this updates the current event index,
     * re-renders nearby slides, restarts the bike
     * pedal animation, and restarts auto-advance.
     *********************************************/
    afterSlideLoad: function (section, origin, destination) {
      if (destination.index === currentIndex) return;
      // restore normal speed
      fullpage_api.setScrollingSpeed(700);

      currentIndex = destination.index;
      renderAround(currentIndex);

      if (section.anchor === "events") {
        startAutoSlides();
      }
    },
  });
});

/*************************************************
 * RESIZE HANDLING
 *
 * Keep the CSS nav-height variable in sync with
 * the real navbar height, then ask fullPage.js to
 * recalculate layout.
 *************************************************/

window.addEventListener("resize", function () {
  document.documentElement.style.setProperty("--nav-height", nav.offsetHeight + "px");
  fullpage_api.reBuild();
});
