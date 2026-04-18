import { renderInfoGrid } from "./grid.js";
import { PARTNERS } from "./partner-data.js";
import { SPONSORS } from "./sponsor-data.js";
import { initCalendar } from "./calendar.js";

import {
  events,
  nav,
  bsCollapse,
  eventsSection,
  currentIndex,
  hasPositionedEvents,
  setCurrentIndex,
  setHasPositionedEvents,
} from "./event-state.js";

import { buildSlides, findInitialIndex, renderAround } from "./event-slides.js";

import {
  freezeBackgroundLayers,
  resumeBackgroundLayers,
  setBikeFacingForward,
  setBikeFacingBackward,
  setBikeIdle,
  setBikePedaling,
} from "./event-bike.js";

function setNavTheme(anchor) {
  const nav = document.getElementById("mainNav");
  nav.classList.remove("home", "calendar", "events", "partners", "about");
  nav.classList.add(anchor);
}

/*************************************************
 * PAGE STARTUP
 *
 * 1. Build slides
 * 2. Choose the initial event
 * 3. Render the neighborhood around that event
 * 4. Initialize fullPage.js
 *************************************************/

export function initPage() {
  initCalendar();

  PARTNERS.sort((a, b) => a.name.localeCompare(b.name));
  SPONSORS.sort((a, b) => a.name.localeCompare(b.name));
  renderInfoGrid("partnersGrid", PARTNERS, {
    popoverId: "partnersPopover",
    popoverLabel: "details",
  });
  renderInfoGrid("sponsorsGrid", SPONSORS, {
    popoverId: "sponsorsPopover",
    popoverLabel: "details",
  });

  buildSlides();

  setCurrentIndex(findInitialIndex());
  renderAround(currentIndex);

  new fullpage("#fullpage", {
    licenseKey: "gplv3-license",
    credits: {
      enabled: false,
    },
    anchors: ["home", "calendar", "events", "partners", "about"],
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
          setHasPositionedEvents(true);
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
      } else {
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

      setCurrentIndex(destination.index);
      renderAround(currentIndex);
    },
  });
}

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

document.addEventListener("DOMContentLoaded", () => {
  initPage();
});
