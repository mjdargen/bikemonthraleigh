import { RBM_EVENTS } from "./event-data.js";

const MOBILE_BREAKPOINT = 768;
const MAY_START = "2026-05-01";
const JUNE_START = "2026-06-01";

function isMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function firstImageForEvent(eventData) {
  if (eventData.localImages?.length) return eventData.localImages[0];
  if (eventData.images?.length) return eventData.images[0];
  return "";
}

function isEventInMay(event) {
  const start = new Date(event.start);
  return start.getFullYear() === 2026 && start.getMonth() === 4;
}

function mapEvents(events) {
  return events.filter(isEventInMay).map((event, index) => ({
    id: event.uid ? `${event.uid}-${index}` : `event-${index}`,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: !!event.allDay,
    extendedProps: {
      source: event,
      photo: firstImageForEvent(event),
    },
  }));
}

function formatEventDateRange(startInput, endInput, allDay, timeZone) {
  const start = new Date(startInput);
  const end = new Date(endInput);

  if (allDay) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(start);
  }

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(start);

  const startTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(start);

  const endTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(end);

  return `${datePart} • ${startTime} to ${endTime}`;
}

export function initCalendar() {
  const calendarEl = document.getElementById("calendar-container");

  const modal = document.getElementById("event-modal");
  const modalClose = document.getElementById("event-modal-close");
  const modalBackdrop = modal.querySelector(".event-modal-backdrop");
  const modalTitle = document.getElementById("event-modal-title");
  const modalDate = document.getElementById("event-modal-date");
  const modalLocation = document.getElementById("event-modal-location");
  const modalDescription = document.getElementById("event-modal-description");
  const modalImage = document.getElementById("event-modal-image");
  const modalLinks = document.getElementById("event-modal-links");

  function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function clearLinks() {
    modalLinks.innerHTML = "";
  }

  function addLinkButton(href, label) {
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    modalLinks.appendChild(a);
  }

  function renderEventModal(fcEvent) {
    const source = fcEvent.extendedProps?.source ?? {};
    const photo = fcEvent.extendedProps?.photo ?? "";

    modalTitle.textContent = fcEvent.title || "";
    modalDate.textContent = formatEventDateRange(
      source.start || fcEvent.start,
      source.end || fcEvent.end,
      !!source.allDay,
      RBM_EVENTS.timeZone,
    );

    modalLocation.textContent = source.location || "";
    modalDescription.innerHTML = source.description || "";

    if (photo) {
      modalImage.src = photo;
      modalImage.classList.remove("hidden");
    } else {
      modalImage.classList.add("hidden");
    }

    clearLinks();

    source.attachments?.forEach((a, i) => addLinkButton(a.url, a.filename || `Attachment ${i + 1}`));

    source.links?.forEach((link, i) => addLinkButton(link, `Link ${i + 1}`));

    if (source.url) addLinkButton(source.url, "Event Link");

    openModal();
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: isMobile() ? "listMonth" : "dayGridMonth",
    initialDate: MAY_START,
    validRange: { start: MAY_START, end: JUNE_START },
    headerToolbar: false,
    height: "auto",
    events: mapEvents(RBM_EVENTS.events),

    dayMaxEvents: true,
    fixedWeekCount: false,
    showNonCurrentDates: false,

    views: {
      listMonth: { buttonText: "Agenda" },
      dayGridMonth: { buttonText: "Month", displayEventTime: false },
    },

    listDayFormat: {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
    listDaySideFormat: false,

    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit",
      meridiem: "short",
    },

    eventClick(info) {
      info.jsEvent.preventDefault();
      renderEventModal(info.event);
    },

    dayHeaderClassNames() {
      return ["rbm-dow"];
    },
  });

  calendar.render();

  function syncResponsiveView() {
    const nextView = isMobile() ? "listMonth" : "dayGridMonth";
    if (calendar.view.type !== nextView) {
      calendar.changeView(nextView, MAY_START);
    }
  }

  window.addEventListener("resize", syncResponsiveView);

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}
