import { RBM_EVENTS } from "./events.js";

/*************************************************
 * GLOBALS
 *************************************************/

const events = RBM_EVENTS.events ?? [];
const tz = RBM_EVENTS.timeZone || "America/New_York";

const nav = document.getElementById("mainNav");
const navbarCollapse = document.getElementById("navbarResponsive");
const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse, { toggle: false });
const eventsSection = document.querySelector(".events-section");
eventsSection.classList.add("prepositioning");
const preloadedImageUrls = new Set();

if (!eventsSection) {
  throw new Error("Missing .events-section");
}

const slides = [];
let currentIndex = 0;

let slideInterval = null;
const SLIDE_DELAY = 5000; // 5 seconds
let hasPositionedEvents = false;

/*************************************************
 * auto advance event slides
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

// pause on hover
eventsSection.addEventListener("mouseenter", stopAutoSlides);
eventsSection.addEventListener("mouseleave", startAutoSlides);

/*************************************************
 * EVENTS
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

  if (!end) return `${dateFmt.format(start)} • ${timeFmt.format(start)}`;
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
    if (!allowedTags.has(el.tagName)) toReplace.push(el);
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

function setPlaceholder(slide) {
  if (slide.dataset.mode === "placeholder") return;
  slide.innerHTML = placeholderHTML();
  slide.dataset.mode = "placeholder";
}

function setFull(slide, ev, isCurrent = false) {
  slide.innerHTML = slideHTML(ev, isCurrent);
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

  preloadImage(wrapIndex(center));
  preloadImage(wrapIndex(center - 1));
  preloadImage(wrapIndex(center + 1));
  preloadImage(wrapIndex(center - 2));
  preloadImage(wrapIndex(center + 2));
}

// find next event
function findInitialIndex() {
  const now = new Date();

  let lastPastIndex = 0;

  for (let i = 0; i < events.length; i++) {
    const start = parseISO(events[i].start);
    const end = parseISO(events[i].end) || start;

    if (!start) continue;

    if (start <= now && now <= end) {
      return i; // event happening right now
    }

    if (start > now) {
      return i; // next upcoming event
    }

    lastPastIndex = i;
  }

  return lastPastIndex;
}

function buildSlides() {
  eventsSection.innerHTML = "";
  slides.length = 0;

  if (events.length === 0) {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.dataset.mode = "full";
    slide.innerHTML = `
      <div class="section-inner container">
        <div class="row py-4 py-md-5">
          <div class="col-12">
            <h2 class="event-title mb-4">No events</h2>
          </div>
        </div>
      </div>
    `;
    eventsSection.appendChild(slide);
    slides.push(slide);
    return;
  }

  events.forEach((ev, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.dataset.index = String(i);
    slide.dataset.anchor = `event-${i + 1}`;
    slide.dataset.mode = "placeholder";
    slide.innerHTML = placeholderHTML();

    eventsSection.appendChild(slide);
    slides.push(slide);
  });
}

/*************************************************
 * start up
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  buildSlides();

  currentIndex = findInitialIndex();
  renderAround(currentIndex);
  console.log(nav.offsetHeight);

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

    afterLoad: function (origin, destination) {
      bsCollapse.hide();

      if (destination.anchor === "events") {
        if (!hasPositionedEvents && events.length > 0) {
          hasPositionedEvents = true;
          renderAround(currentIndex);
          fullpage_api.silentMoveTo("events", currentIndex);

          requestAnimationFrame(() => {
            eventsSection.classList.remove("prepositioning");
          });
        }

        startAutoSlides();
      } else {
        stopAutoSlides();
      }
    },

    onLeave: function (origin, destination) {
      if (origin.anchor === "events" && destination.anchor !== "events") {
        stopAutoSlides();
      }
    },

    afterSlideLoad: function (section, origin, destination) {
      if (destination.index === currentIndex) return;
      currentIndex = destination.index;
      renderAround(currentIndex);

      if (section.anchor === "events") {
        startAutoSlides();
      }
    },
  });
});

window.addEventListener("resize", function () {
  document.documentElement.style.setProperty("--nav-height", nav.offsetHeight + "px");
  fullpage_api.reBuild();
});
