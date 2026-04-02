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

function formatLocation(location) {
  const s = String(location ?? "").trim();
  if (!s) return "";

  // Remove trailing country
  let cleaned = s.replace(/,\s*USA$/i, "");

  // Remove trailing ZIP
  cleaned = cleaned.replace(/\s+\d{5}(?:-\d{4})?$/i, "");

  // Remove trailing state abbreviation when it appears before the ZIP/country
  cleaned = cleaned.replace(/,\s*[A-Z]{2}$/i, "");

  return cleaned.trim();
}

function formatWhen(ev) {
  const start = parseISO(ev.start);
  const end = parseISO(ev.end);

  if (!start) return "";

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (ev.allDay) {
    return dateFmt.format(start);
  }

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  const formatShortTime = (d) => timeFmt.format(d).replace(":00", "").replace(" AM", "am").replace(" PM", "pm");

  if (!end) {
    return `${dateFmt.format(start)} · ${formatShortTime(start)}`;
  }

  return `${dateFmt.format(start)} · ${formatShortTime(start)}-${formatShortTime(end)}`;
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

function getPlaceholderNumber(ev) {
  if (!ev.placeholderNumber) {
    ev.placeholderNumber = Math.floor(Math.random() * 3) + 1;
  }
  return ev.placeholderNumber;
}

function slideHTML(ev, isCurrent = false) {
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
        ${loadingAttr}
        ${decodingAttr}
      >
    `
    : `
      <img
        src="assets/events/placeholder${n}.svg"
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

function setNavTheme(anchor) {
  const nav = document.getElementById("mainNav");
  nav.classList.remove("home", "about", "calendar", "events", "orgs");
  nav.classList.add(anchor);
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

function formatMonthTitle(year, monthIndex) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

function formatMonthEventTime(ev) {
  const start = parseISO(ev.start);
  if (!start || ev.allDay) return "All day";

  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return fmt.format(start).replace(":00", "").replace(" AM", "am").replace(" PM", "pm");
}

function getEventLocalParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return { year, month, day };
}

function getDayKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getEventDayKey(ev) {
  const start = parseISO(ev.start);
  if (!start) return null;

  const parts = getEventLocalParts(start);
  return getDayKey(parts.year, parts.month - 1, parts.day);
}

function getEventsForMonth(year, monthIndex) {
  return events
    .filter((ev) => {
      const start = parseISO(ev.start);
      if (!start) return false;

      const parts = getEventLocalParts(start);
      return parts.year === year && parts.month === monthIndex + 1;
    })
    .sort((a, b) => {
      const aStart = parseISO(a.start)?.getTime() ?? 0;
      const bStart = parseISO(b.start)?.getTime() ?? 0;
      return aStart - bStart;
    });
}

function groupEventsByDay(eventsForMonth) {
  const byDay = new Map();

  eventsForMonth.forEach((ev) => {
    const key = getEventDayKey(ev);
    if (!key) return;

    if (!byDay.has(key)) {
      byDay.set(key, []);
    }

    byDay.get(key).push(ev);
  });

  return byDay;
}

function eventColorClass(index) {
  const classes = ["event-blue", "event-green", "event-orange", "event-pink"];
  return classes[index % classes.length];
}

function renderMonthEventPill(ev, index) {
  const title = escapeHTML(ev.title ?? "Untitled Event");
  const time = escapeHTML(formatMonthEventTime(ev));
  const colorClass = eventColorClass(index);

  return `
    <a href="#events" class="month-event-pill ${colorClass}">
      <span class="month-event-time">${time}</span>
      <span class="month-event-name">${title}</span>
    </a>
  `;
}

function renderMonthDayCell(dayNumber, dayEvents, isOutside = false) {
  const outsideClass = isOutside ? " is-outside" : "";
  const pills = isOutside ? "" : dayEvents.map((ev, i) => renderMonthEventPill(ev, i)).join("");

  return `
    <div class="month-day${outsideClass}">
      <div class="month-day-number">${dayNumber}</div>
      ${pills}
    </div>
  `;
}

function buildMonthViewHTML(year, monthIndex) {
  const monthName = escapeHTML(formatMonthTitle(year, monthIndex));
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = firstOfMonth.getDay();

  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  const eventsForMonth = getEventsForMonth(year, monthIndex);
  const eventsByDay = groupEventsByDay(eventsForMonth);

  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = [];

  for (let i = 0; i < dow.length; i++) {
    cells.push(`<div class="month-view-dow">${dow[i]}</div>`);
  }

  for (let i = 0; i < firstWeekday; i++) {
    const dayNumber = prevMonthDays - firstWeekday + i + 1;
    cells.push(renderMonthDayCell(dayNumber, [], true));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = getDayKey(year, monthIndex, day);
    const dayEvents = eventsByDay.get(key) ?? [];
    cells.push(renderMonthDayCell(day, dayEvents, false));
  }

  const totalCellsSoFar = cells.length - 7;
  const trailingCount = (7 - (totalCellsSoFar % 7)) % 7;

  for (let day = 1; day <= trailingCount; day++) {
    cells.push(renderMonthDayCell(day, [], true));
  }

  return `
    <div class="month-view-shell">
      <div class="month-view-header">
        <div class="month-view-title-wrap">
          <h3 class="month-view-title">${monthName}</h3>
          <p class="month-view-subtitle">Bike Month Raleigh events</p>
        </div>
      </div>

      <div class="month-view-grid">
        ${cells.join("")}
      </div>
    </div>
  `;
}

function renderMonthView(year, monthIndex) {
  const host = document.getElementById("monthView");
  if (!host) return;

  host.innerHTML = buildMonthViewHTML(year, monthIndex);
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
  renderMonthView(2026, 4);
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

      setNavTheme(destination.anchor);

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
        fullpage_api.setScrollingSpeed(700);
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
        fullpage_api.setScrollingSpeed(700);
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
