const PARTNERS = [
  {
    name: "12th State Cycling",
    description:
      "12th State Cycling Team is a dedicated group of cyclists competing primarily in gravel, mountain biking, and cyclocross events across the southeast. We ride every Wednesday night in Umstead State Park and run 1-2 choose-your-own-adventure benefit challenges throughout the year.",
    url: "https://instagram.com/12thstatecycling/",
    image: "assets/partners/12th-state-cycling.webp",
  },
  {
    name: "Bend Bar",
    description:
      "Bend Bar is the latest venture from the owners of Trophy Brewing Company. A full service bar featuring beer, wine, cocktails, and alternative beverages in a historic home with a covered patio and spacious backyard.",
    url: "https://www.trophybrewing.com/bend-bar",
    image: "assets/partners/bend_bar.webp",
  },
  {
    name: "Bicycle and Pedestrian Advocacy Committee (BPAC)",
    description:
      "The Bicycle and Pedestrian Advisory Commission (BPAC) is an all-volunteer advisory body appointed by the Raleigh City Council, making recommendations on walking and bicycling programs, policies, and funding priorities.",
    url: "https://raleighnc.gov/city-council/bicycle-pedestrian-advisory-commission-bpac",
    image: "assets/partners/bpac.webp",
  },
  {
    name: "Black Girls Do Bike",
    description:
      "Black Girls Do Bike cultivates a vibrant, inclusive community that centers women of color in cycling as riders, leaders, educators, and advocates.",
    url: "https://www.facebook.com/groups/blackgirlsdobikeraleighdurham",
    image: "assets/partners/black-girls-do-bike.webp",
  },
  {
    name: "Downtown Raleigh Alliance",
    description:
      "The Downtown Raleigh Alliance administers the Municipal Services District and supports downtown through ambassador programs, business development, and community engagement.",
    url: "https://downtownraleigh.org/",
    image: "assets/partners/dra.webp",
  },
  {
    name: "Greenway Gear Collective",
    description:
      "A nonprofit introducing people to outdoor recreation through education, community building, and bike repair, including rides, events, and a repair container at Lake Raleigh.",
    url: "https://greenwaygearcollective.org/",
    image: "assets/partners/greenway-gear-collective.webp",
  },
  {
    name: "High Dive Studios",
    description:
      "High Dive produces narrative shorts, feature-length films, and music videos with dynamic visuals and a playful, creative perspective rooted in North Carolina.",
    url: "https://highdivestudio.com",
    image: "assets/partners/high-dive-studios.webp",
  },
  {
    name: "NC Families for Safe Streets",
    description:
      "An advocacy group representing families affected by traffic violence, working for safer transportation systems and stronger safety policies in North Carolina.",
    url: "https://ncsafestreets.com/",
    image: "assets/partners/safe_streets.webp",
  },
  {
    name: "Oak City Cycling",
    description:
      "A local independent cycling shop in downtown Raleigh offering bikes, parts, repairs, and a full calendar of community rides and events.",
    url: "https://www.oakcitycycling.com/",
    image: "assets/partners/oak-city-cycling.webp",
  },
  {
    name: "Oak City Cycling Race Team",
    description:
      "A community-focused race team hosting events like short track MTB, cyclocross, and other cycling competitions throughout the year.",
    url: "https://instagram.com/oakcitycyclingteam",
    image: "assets/partners/oak-city-cycling-race-team.webp",
  },
  {
    name: "Raleigh Bike Polo",
    description:
      "A fast-paced, inclusive bike sport played on courts. New players are always welcome, with loaner bikes and equipment available.",
    url: "https://instagram.com/raleighbikepolo/",
    image: "assets/partners/raleigh-bike-polo.webp",
  },
  {
    name: "Raleigh Critical Mass",
    description:
      "A monthly community ride promoting shared streets for all users. All wheels welcome for a relaxed, no-drop group ride.",
    url: "https://instagram.com/raleighcriticalmass",
    image: "assets/partners/raleigh-critical-mass.webp",
  },
  {
    name: "Raleigh Parks",
    description:
      "Raleigh Parks manages over 200 parks, greenways, and recreational facilities offering programs, outdoor spaces, and community resources.",
    url: "https://raleighnc.gov/parks-and-recreation/services/find-community-center/know-you-go",
    image: "assets/partners/raleigh-parks.webp",
  },
  {
    name: "The Bike Library",
    description: "A combination bike shop and coffee shop offering service, espresso, and community events in Raleigh.",
    url: "https://thebikelibrary.com/",
    image: "assets/partners/tbl.webp",
  },
  {
    name: "The Rialto",
    description: "A historic movie theater in Raleigh hosting films, live performances, and community events.",
    url: "https://therialto.com/",
    image: "assets/partners/rialto.webp",
  },
  {
    name: "Trek Holly Park",
    description: "A Trek Bicycle store offering bikes, gear, and fast service, located centrally in Raleigh.",
    url: "https://www.trekbikes.com/",
    image: "assets/partners/trek.webp",
  },
  {
    name: "Trek North Raleigh",
    description: "A Trek Bicycle shop near major trails offering bikes, service, and cycling gear for all riders.",
    url: "https://www.trekbikes.com/",
    image: "assets/partners/trek.webp",
  },
  {
    name: "Triangle Offroad Cyclists",
    description: "The Triangle chapter of SORBA advocating for and maintaining natural surface trails in the region.",
    url: "https://www.torc-nc.org",
    image: "assets/partners/torc.webp",
  },
  {
    name: "Wake County Safe Routes to School",
    description:
      "A program promoting safe walking and biking for K–12 students through education and community initiatives.",
    url: null,
    image: "assets/partners/safe_routes.webp",
  },
];

// export function renderPartnersGrid(containerId = "partnersGrid") {
//   const container = document.getElementById(containerId);
//   if (!container) return;

//   container.innerHTML = "";

//   PARTNERS.forEach((partner, index) => {
//     const col = document.createElement("div");
//     col.className = "col";

//     const card = document.createElement("div");
//     card.className = "partner-tile";
//     card.setAttribute("tabindex", "0");
//     card.setAttribute("role", "button");
//     card.setAttribute("aria-expanded", "false");
//     card.setAttribute("aria-label", `${partner.name} details`);

//     card.innerHTML = `
//       <div class="partner-logo-wrap">
//         <img
//           src="${partner.image}"
//           class="img-fluid partner-logo"
//           alt="${escapeHTML(partner.name)}"
//           loading="lazy"
//         >
//       </div>
//       <div class="partner-popup" role="tooltip">
//         <div class="partner-popup-title">${escapeHTML(partner.name)}</div>
//         <div class="partner-popup-desc">${escapeHTML(partner.description)}</div>
//         ${
//           partner.url
//             ? `<a href="${partner.url}" target="_blank" rel="noopener noreferrer" class="partner-popup-link">Visit site</a>`
//             : ""
//         }
//       </div>
//     `;

//     col.appendChild(card);
//     container.appendChild(col);

//     const popup = card.querySelector(".partner-popup");

//     function openPopup() {
//       closeAllPartnerPopups(card);
//       card.classList.add("is-open");
//       card.setAttribute("aria-expanded", "true");
//     }

//     function closePopup() {
//       card.classList.remove("is-open");
//       card.setAttribute("aria-expanded", "false");
//     }

//     card.addEventListener("click", (e) => {
//       const clickedLink = e.target.closest("a");
//       if (clickedLink) return;

//       if (card.classList.contains("is-open")) {
//         closePopup();
//       } else {
//         openPopup();
//       }
//     });

//     card.addEventListener("mouseenter", () => {
//       if (window.matchMedia("(hover: hover)").matches) {
//         openPopup();
//       }
//     });

//     card.addEventListener("mouseleave", () => {
//       if (window.matchMedia("(hover: hover)").matches) {
//         closePopup();
//       }
//     });

//     card.addEventListener("focus", openPopup);
//     card.addEventListener("blur", (e) => {
//       if (!card.contains(e.relatedTarget)) {
//         closePopup();
//       }
//     });

//     card.addEventListener("keydown", (e) => {
//       if (e.key === "Escape") {
//         closePopup();
//         card.blur();
//       }
//       if (e.key === "Enter" || e.key === " ") {
//         e.preventDefault();
//         if (card.classList.contains("is-open")) {
//           closePopup();
//         } else {
//           openPopup();
//         }
//       }
//     });
//   });

//   document.addEventListener("click", (e) => {
//     if (!e.target.closest(".partner-tile")) {
//       closeAllPartnerPopups();
//     }
//   });
// }

// function closeAllPartnerPopups(except = null) {
//   document.querySelectorAll(".partner-tile.is-open").forEach((tile) => {
//     if (tile !== except) {
//       tile.classList.remove("is-open");
//       tile.setAttribute("aria-expanded", "false");
//     }
//   });
// }

// function escapeHTML(str) {
//   return String(str ?? "")
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#39;");
// }

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
          class="img-fluid partner-logo"
          alt="${escapeHTML(partner.name)}"
          loading="lazy"
        >
      </div>
    `;

    const open = () => {
      showPartnerPopover(partner, tile);
      tile.setAttribute("aria-expanded", "true");
    };

    const close = () => {
      if (activeTile === tile) {
        hidePartnerPopover();
      }
      tile.setAttribute("aria-expanded", "false");
    };

    tile.addEventListener("mouseenter", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        open();
      }
    });

    tile.addEventListener("mouseleave", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        close();
      }
    });

    tile.addEventListener("focus", open);

    tile.addEventListener("blur", () => {
      if (!window.matchMedia("(hover: hover)").matches) {
        return;
      }
      close();
    });

    tile.addEventListener("click", () => {
      if (activeTile === tile) {
        close();
      } else {
        open();
      }
    });

    col.appendChild(tile);
    container.appendChild(col);
  });
}

export { PARTNERS };
