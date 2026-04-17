function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPopover(popoverId = "gridPopover") {
  let popover = document.getElementById(popoverId);

  if (!popover) {
    popover = document.createElement("div");
    popover.id = popoverId;
    popover.className = "partner-popover-root";
    popover.hidden = true;
    document.body.appendChild(popover);
  }

  return popover;
}

let activeTile = null;
let activePopoverId = null;

function hideGridPopover(popoverId = activePopoverId || "gridPopover") {
  const popover = getPopover(popoverId);
  popover.hidden = true;
  popover.innerHTML = "";
  activeTile = null;
  activePopoverId = null;
}

function positionGridPopover(tile, popoverId = activePopoverId || "gridPopover") {
  const popover = getPopover(popoverId);
  if (!tile || popover.hidden) return;

  const gap = 12;
  const edgePad = 12;

  const tileRect = tile.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();

  let left = tileRect.left + tileRect.width / 2 - popRect.width / 2;
  left = Math.max(edgePad, Math.min(left, window.innerWidth - popRect.width - edgePad));

  let top = tileRect.top - popRect.height - gap;
  let placement = "top";

  if (top < edgePad) {
    top = tileRect.bottom + gap;
    placement = "bottom";
  }

  if (top + popRect.height > window.innerHeight - edgePad) {
    top = Math.max(edgePad, window.innerHeight - popRect.height - edgePad);
  }

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.dataset.placement = placement;
}

function showGridPopover(item, tile, popoverId = "gridPopover") {
  const popover = getPopover(popoverId);

  popover.innerHTML = `
    <div class="partner-popover-title">${escapeHTML(item.name)}</div>
    <div class="partner-popover-desc">${escapeHTML(item.description)}</div>
    ${
      item.url
        ? `<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="partner-popover-link">Visit site</a>`
        : ""
    }
  `;

  popover.hidden = false;
  activeTile = tile;
  activePopoverId = popoverId;
  positionGridPopover(tile, popoverId);
}

function attachGlobalPopoverListeners() {
  if (attachGlobalPopoverListeners.done) return;
  attachGlobalPopoverListeners.done = true;

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".partner-tile") && !e.target.closest(".partner-popover-root")) {
      hideGridPopover();
      document.querySelectorAll(".partner-tile").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });
    }
  });

  window.addEventListener("resize", () => {
    if (activeTile && activePopoverId) {
      positionGridPopover(activeTile, activePopoverId);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (activeTile && activePopoverId) {
        positionGridPopover(activeTile, activePopoverId);
      }
    },
    true,
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideGridPopover();
      document.querySelectorAll(".partner-tile").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });
    }
  });
}

export function renderInfoGrid(containerId, items, options = {}) {
  const {
    popoverId = "gridPopover",
    tileClass = "partner-tile",
    colClass = "col",
    logoWrapClass = "partner-logo-wrap",
    logoClass = "partner-logo",
    popoverLabel = "details",
  } = options;

  const container = document.getElementById(containerId);
  if (!container) return;

  attachGlobalPopoverListeners();
  getPopover(popoverId);

  container.innerHTML = "";

  items.forEach((item) => {
    const col = document.createElement("div");
    col.className = colClass;

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = tileClass;
    tile.setAttribute("aria-label", `${item.name} ${popoverLabel}`);
    tile.setAttribute("aria-expanded", "false");

    tile.innerHTML = `
      <div class="partner-content">
        <div class="${logoWrapClass}">
          <img
            src="${escapeHTML(item.image)}"
            class="${logoClass}"
            alt="${escapeHTML(item.alt || item.name)}"
            loading="lazy"
          >
        </div>
        <div class="grid-label small mt-1 text-center">
          ${escapeHTML(item.name)}
        </div>
      </div>
    `;

    tile.addEventListener("click", (e) => {
      e.stopPropagation();

      const popover = getPopover(popoverId);

      if (activeTile === tile && activePopoverId === popoverId && !popover.hidden) {
        hideGridPopover(popoverId);
        tile.setAttribute("aria-expanded", "false");
        return;
      }

      document.querySelectorAll(`.${tileClass}`).forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });

      showGridPopover(item, tile, popoverId);
      tile.setAttribute("aria-expanded", "true");
    });

    col.appendChild(tile);
    container.appendChild(col);
  });
}
