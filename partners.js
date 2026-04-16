import { PARTNERS } from "./partner-data.js";

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPopover() {
  let popover = document.getElementById("partnerPopover");

  if (!popover) {
    popover = document.createElement("div");
    popover.id = "partnerPopover";
    popover.className = "partner-popover-root";
    popover.hidden = true;
    document.body.appendChild(popover);
  }

  return popover;
}

let activeTile = null;

function hidePartnerPopover() {
  const popover = getPopover();
  popover.hidden = true;
  popover.innerHTML = "";
  activeTile = null;
}

function positionPartnerPopover(tile) {
  const popover = getPopover();
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

function showPartnerPopover(partner, tile) {
  const popover = getPopover();

  popover.innerHTML = `
    <div class="partner-popover-title">${escapeHTML(partner.name)}</div>
    <div class="partner-popover-desc">${escapeHTML(partner.description)}</div>
    ${
      partner.url
        ? `<a href="${escapeHTML(partner.url)}" target="_blank" rel="noopener noreferrer" class="partner-popover-link">Visit site</a>`
        : ""
    }
  `;

  popover.hidden = false;
  activeTile = tile;
  positionPartnerPopover(tile);
}

function attachGlobalPopoverListeners() {
  if (attachGlobalPopoverListeners.done) return;
  attachGlobalPopoverListeners.done = true;

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".partner-tile") && !e.target.closest("#partnerPopover")) {
      hidePartnerPopover();
      document.querySelectorAll(".partner-tile").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });
    }
  });

  window.addEventListener("resize", () => {
    if (activeTile) positionPartnerPopover(activeTile);
  });

  window.addEventListener(
    "scroll",
    () => {
      if (activeTile) positionPartnerPopover(activeTile);
    },
    true,
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hidePartnerPopover();
      document.querySelectorAll(".partner-tile").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });
    }
  });
}

export function renderPartnersGrid(containerId = "partnersGrid") {
  const container = document.getElementById(containerId);
  if (!container) return;

  attachGlobalPopoverListeners();
  getPopover();

  container.innerHTML = "";

  PARTNERS.forEach((partner) => {
    const col = document.createElement("div");
    col.className = "col";

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "partner-tile";
    tile.setAttribute("aria-label", `${partner.name} details`);
    tile.setAttribute("aria-expanded", "false");

    tile.innerHTML = `
      <div class="partner-logo-wrap">
        <img
          src="${escapeHTML(partner.image)}"
          class="partner-logo"
          alt="${escapeHTML(partner.name)}"
          loading="lazy"
        >
      </div>
    `;

    tile.addEventListener("click", (e) => {
      e.stopPropagation();

      if (activeTile === tile && !getPopover().hidden) {
        hidePartnerPopover();
        tile.setAttribute("aria-expanded", "false");
        return;
      }

      document.querySelectorAll(".partner-tile").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });

      showPartnerPopover(partner, tile);
      tile.setAttribute("aria-expanded", "true");
    });

    col.appendChild(tile);
    container.appendChild(col);
  });
}
