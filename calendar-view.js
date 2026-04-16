import { events, tz } from "./event-state.js";
import { escapeHTML, parseISO } from "./event-utils.js";

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

export function renderMonthView(year, monthIndex) {
  const host = document.getElementById("monthView");
  if (!host) return;

  host.innerHTML = buildMonthViewHTML(year, monthIndex);
}
