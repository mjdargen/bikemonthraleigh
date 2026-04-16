import { tz } from "./event-state.js";

/*************************************************
 * SMALL EVENT UTILITIES
 *
 * Helpers for formatting and sanitizing event data
 * before it is inserted into the page.
 *************************************************/

export function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function parseISO(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLocation(location) {
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

export function formatWhen(ev) {
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

export function driveEmbedUrl(url) {
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

export function bestImageUrl(ev) {
  if (ev.localImages?.length) return ev.localImages[0];
  if (ev.images?.length) return driveEmbedUrl(ev.images[0]);
  return null;
}

export function sanitizeDescription(html) {
  const host = document.createElement("div");
  host.innerHTML = String(html ?? "");

  const allowedTags = new Set(["P", "BR", "A", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI"]);

  const walker = document.createTreeWalker(host, NodeFilter.SHOW_ELEMENT);
  const toUnwrap = [];

  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (!allowedTags.has(el.tagName)) {
      toUnwrap.push(el);
    }
  }

  for (const el of toUnwrap) {
    el.replaceWith(...el.childNodes);
  }

  autolinkTextNodes(host);

  host.querySelectorAll("a").forEach((a) => {
    let href = (a.getAttribute("href") || "").trim();

    // Clean punctuation accidentally captured at the end
    href = trimTrailingPunctuation(href);

    const safe = href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:");

    if (!safe) {
      a.replaceWith(...a.childNodes);
      return;
    }

    a.setAttribute("href", href);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });

  return host.innerHTML.trim();
}

export function autolinkTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (!node.nodeValue.trim()) continue;
    if (node.parentElement?.closest("a")) continue;

    textNodes.push(node);
  }

  for (const node of textNodes) {
    const frag = linkifyText(node.nodeValue);
    if (frag) {
      node.replaceWith(frag);
    }
  }
}

export function linkifyText(text) {
  const fragment = document.createDocumentFragment();

  // URLs with protocol OR plain emails
  const pattern = /(\bhttps?:\/\/[^\s<]+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/gi;

  let lastIndex = 0;
  let matchFound = false;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    matchFound = true;

    const start = match.index;
    const rawMatch = match[0];

    if (start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    const cleaned = trimTrailingPunctuation(rawMatch);
    const trailing = rawMatch.slice(cleaned.length);

    const a = document.createElement("a");
    const isEmail = !cleaned.startsWith("http://") && !cleaned.startsWith("https://");

    a.textContent = cleaned;
    a.href = isEmail ? `mailto:${cleaned}` : cleaned;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    fragment.appendChild(a);

    if (trailing) {
      fragment.appendChild(document.createTextNode(trailing));
    }

    lastIndex = start + rawMatch.length;
  }

  if (!matchFound) return null;

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return fragment;
}

export function trimTrailingPunctuation(str) {
  return str.replace(/[),.;!?]+$/g, "");
}
