import { RBM_EVENTS } from "./event-data.js";

/*************************************************
 * DATA + DOM REFERENCES
 *
 * Static data from events.js and the main DOM nodes
 * this script needs to control.
 *************************************************/

export const events = RBM_EVENTS.events ?? [];
export const tz = RBM_EVENTS.timeZone || "America/New_York";

export const nav = document.getElementById("mainNav");
export const navbarCollapse = document.getElementById("navbarResponsive");
export const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse, { toggle: false });

export const eventsSection = document.querySelector(".events-section");
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

export const slides = [];
export const preloadedImageUrls = new Set();

export let currentIndex = 0;

export let slideInterval = null;
export const SLIDE_DELAY = 6000; // 6 seconds between automatic slide advances

export let hasPositionedEvents = false;

export let isHoveringEvents = false;
export let isFocusInEvents = false;

export function setCurrentIndex(value) {
  currentIndex = value;
}

export function setSlideInterval(value) {
  slideInterval = value;
}

export function setHasPositionedEvents(value) {
  hasPositionedEvents = value;
}

export function setIsHoveringEvents(value) {
  isHoveringEvents = value;
}

export function setIsFocusInEvents(value) {
  isFocusInEvents = value;
}
