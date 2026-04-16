import { eventsSection } from "./event-state.js";

/*************************************************
 * BIKE OVERLAY
 *
 * The bike lives once at the top of the Events
 * section, independent of individual slides.
 *************************************************/

export function freezeBackgroundLayers() {
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

export function resumeBackgroundLayers() {
  const layers = eventsSection.querySelectorAll(".background-layer");

  layers.forEach((layer) => {
    layer.style.animation = "";
  });
}

export function setBikeFacingForward() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  if (!overlay) return;

  overlay.classList.remove("going-backward");
  overlay.classList.add("going-forward");
}

export function setBikeFacingBackward() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  if (!overlay) return;

  overlay.classList.remove("going-forward");
  overlay.classList.add("going-backward");
}

export function setBikeIdle() {
  const overlay = eventsSection.querySelector(".bike-overlay");
  if (!overlay) return;

  overlay.classList.remove("pedaling");
  overlay.classList.add("idle");
}

export function setBikePedaling() {
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
