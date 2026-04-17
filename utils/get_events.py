#!/usr/bin/env python3
"""
Export events from a public Google Calendar ICS feed to JSON (no auth).
Also downloads image attachments to ./assets/events and saves them by Drive id when possible.
"""

import argparse
import json
import re
import os
import hashlib
from pathlib import Path
from datetime import datetime, date, time, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs, unquote

import requests
from icalendar import Calendar
from dateutil.tz import gettz
from dateutil.rrule import rrulestr


IMAGE_URL_RE = re.compile(r'https?://[^\s"\'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"\'<>]+)?', re.I)
ANY_URL_RE = re.compile(r'https?://[^\s"\'<>]+', re.I)

EVENT_IMAGES_DIR = Path("assets/events")


def _to_text(val: Any) -> Optional[str]:
    if val is None:
        return None
    try:
        return str(val)
    except Exception:
        return None


def _as_dt(value: Any, tzname: str) -> Tuple[Optional[datetime], bool]:
    if value is None:
        return None, False

    tz = gettz(tzname)
    dt = getattr(value, "dt", value)

    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=tz)
        return dt, False

    if isinstance(dt, date):
        return datetime.combine(dt, time.min).replace(tzinfo=tz), True

    return None, False


def _event_window(start_dt: datetime, end_dt: Optional[datetime], is_all_day: bool) -> Tuple[datetime, datetime]:
    if end_dt is not None:
        return start_dt, end_dt
    if is_all_day:
        return start_dt, start_dt + timedelta(days=1)
    return start_dt, start_dt + timedelta(hours=1)


def _overlaps(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> bool:
    return a0 < b1 and b0 < a1


def _extract_attachments(component: Any) -> List[Dict[str, Optional[str]]]:
    attach = component.get("ATTACH")
    if not attach:
        return []

    attach_list = attach if isinstance(attach, list) else [attach]
    out: List[Dict[str, Optional[str]]] = []

    for a in attach_list:
        url = str(a).strip()
        params = getattr(a, "params", None) or {}

        filename = params.get("FILENAME")
        fmttype = params.get("FMTTYPE")

        out.append(
            {
                "url": url,
                "filename": str(filename) if filename is not None else None,
                "fmttype": str(fmttype) if fmttype is not None else None,
            }
        )

    return out


def _images_from_attachments(attachments: List[Dict[str, Optional[str]]]) -> List[str]:
    out: List[str] = []
    seen = set()

    for a in attachments:
        url = a.get("url")
        fmttype = (a.get("fmttype") or "").lower()

        if not url:
            continue

        is_image = fmttype.startswith("image/") or IMAGE_URL_RE.search(url) is not None
        if is_image and url not in seen:
            seen.add(url)
            out.append(url)

    return out


def _extract_images(description: Optional[str]) -> List[str]:
    if not description:
        return []
    urls = IMAGE_URL_RE.findall(description)
    seen = set()
    out = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _extract_links(description: Optional[str]) -> List[str]:
    if not description:
        return []
    urls = ANY_URL_RE.findall(description)
    seen = set()
    out = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _parse_exdates(component: Any, tzname: str) -> List[datetime]:
    tz = gettz(tzname)
    out: List[datetime] = []

    ex = component.get("EXDATE")
    if not ex:
        return out

    ex_list = ex if isinstance(ex, list) else [ex]

    for item in ex_list:
        dts = getattr(item, "dts", None)
        if dts:
            for d in dts:
                dt = d.dt
                if isinstance(dt, datetime):
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=tz)
                    out.append(dt)
                elif isinstance(dt, date):
                    out.append(datetime.combine(dt, time.min).replace(tzinfo=tz))
            continue

        dt = getattr(item, "dt", None)
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=tz)
            out.append(dt)
        elif isinstance(dt, date):
            out.append(datetime.combine(dt, time.min).replace(tzinfo=tz))

    return out


def _rrule_to_string(rrule_val: Any) -> str:
    if rrule_val is None:
        return ""

    if isinstance(rrule_val, str):
        s = rrule_val.strip()
        if s.upper().startswith("RRULE:"):
            s = s.split(":", 1)[1].strip()
        return s

    try:
        d = dict(rrule_val)
    except Exception:
        s = str(rrule_val).strip()
        if s.upper().startswith("RRULE:"):
            s = s.split(":", 1)[1].strip()
        return s

    parts = []
    for k, v in d.items():
        if isinstance(v, (list, tuple)):
            vv = []
            for x in v:
                if isinstance(x, datetime):
                    if x.tzinfo is not None:
                        x = x.astimezone(gettz("UTC"))
                        vv.append(x.strftime("%Y%m%dT%H%M%SZ"))
                    else:
                        vv.append(x.strftime("%Y%m%dT%H%M%S"))
                else:
                    vv.append(str(x))
            v_str = ",".join(vv)
        else:
            v_str = str(v)

        parts.append(f"{k}={v_str}")

    return ";".join(parts)


def _expand_rrule(
    component: Any, dtstart: datetime, window_start: datetime, window_end: datetime, tzname: str
) -> List[datetime]:
    rrule_val = component.get("RRULE")
    if not rrule_val:
        return [dtstart]

    rule_str = _rrule_to_string(rrule_val)
    rule_str = re.sub(r"BYDAY=([+-]?\d+)(MO|TU|WE|TH|FR|SA|SU)", r"BYDAY=\2;BYSETPOS=\1", rule_str)
    if not rule_str:
        return [dtstart]

    try:
        rule = rrulestr(rule_str, dtstart=dtstart)
    except Exception as e:
        print("RRULE PARSE FAILED:", rule_str)
        print("DTSTART:", dtstart)
        print("ERROR:", repr(e))
        return [dtstart]

    occ = rule.between(window_start - timedelta(days=1), window_end, inc=True)

    try:
        exdates = set(_parse_exdates(component, tzname))
    except Exception:
        exdates = set()

    occ = [d for d in occ if d not in exdates]

    seen = set()
    out = []
    for d in occ:
        if d not in seen:
            seen.add(d)
            out.append(d)
    return out


def _get_recurrence_id(component: Any, tzname: str) -> Optional[datetime]:
    rid = component.get("RECURRENCE-ID")
    if not rid:
        return None
    rid_dt, _ = _as_dt(rid, tzname)
    return rid_dt


def _drive_file_id(url: str) -> Optional[str]:
    """
    Extract Drive file id from common URL forms.
    """
    try:
        u = url.strip()
        parsed = urlparse(u)

        # Query param id=
        qs = parse_qs(parsed.query)
        if "id" in qs and qs["id"]:
            return qs["id"][0]

        # /file/d/<id>/
        m = re.search(r"/d/([a-zA-Z0-9_-]{10,})", parsed.path)
        if m:
            return m.group(1)

        # uc?id=<id> or open?id=<id> already handled by query

        return None
    except Exception:
        return None


def _guess_ext_from_content_type(content_type: str) -> Optional[str]:
    if not content_type:
        return None
    ct = content_type.split(";", 1)[0].strip().lower()
    mapping = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    }
    return mapping.get(ct)


def _guess_ext_from_url(url: str) -> Optional[str]:
    try:
        path = urlparse(url).path
        path = unquote(path)
        m = re.search(r"\.(png|jpg|jpeg|gif|webp|svg)$", path, re.I)
        if not m:
            return None
        ext = m.group(1).lower()
        if ext == "jpeg":
            ext = "jpg"
        return ext
    except Exception:
        return None


def _safe_filename(name: str) -> str:
    name = os.path.basename(name.strip())
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    return name or "image"


def _download_image(
    session: requests.Session,
    url: str,
    dest_dir: Path,
    url_cache: Dict[str, str],
    preferred_name: Optional[str] = None,
) -> Optional[str]:
    """
    Download url to dest_dir.

    If it is a Drive link and we can get an id, save as <id>.<ext>.
    Otherwise save as <hash>.<ext>.

    Returns relative filepath string like "assets/events/abc123.png" or None if failed.
    """
    if not url:
        return None

    if url in url_cache:
        return url_cache[url]

    dest_dir.mkdir(parents=True, exist_ok=True)

    file_id = _drive_file_id(url)

    fetch_url = url
    if file_id:
        fetch_url = f"https://drive.google.com/uc?export=download&id={file_id}"

    try:
        resp = session.get(fetch_url, timeout=30, allow_redirects=True, stream=True)
        resp.raise_for_status()

        content_type = resp.headers.get("Content-Type", "")
        ext = _guess_ext_from_content_type(content_type) or _guess_ext_from_url(url) or "bin"

        name = None

        if preferred_name:
            preferred_name = _safe_filename(preferred_name)
            stem, given_ext = os.path.splitext(preferred_name)
            if given_ext:
                name = preferred_name
            else:
                name = f"{preferred_name}.{ext}"

        if not name and file_id:
            name = f"{file_id}.{ext}"

        if not name:
            h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]
            name = f"{h}.{ext}"

        out_path = dest_dir / name

        if out_path.exists() and out_path.stat().st_size > 0:
            rel = str(out_path.as_posix())
            url_cache[url] = rel
            return rel

        if "text/html" in content_type.lower():
            if fetch_url != url:
                resp2 = session.get(url, timeout=30, allow_redirects=True, stream=True)
                resp2.raise_for_status()
                content_type2 = resp2.headers.get("Content-Type", "")
                if "text/html" in (content_type2 or "").lower():
                    print("Skip (html response):", url)
                    return None
                resp = resp2
                ext = _guess_ext_from_content_type(content_type2) or _guess_ext_from_url(url) or ext

                if preferred_name:
                    preferred_name = _safe_filename(preferred_name)
                    stem, given_ext = os.path.splitext(preferred_name)
                    out_path = dest_dir / (preferred_name if given_ext else f"{preferred_name}.{ext}")
                elif file_id:
                    out_path = dest_dir / f"{file_id}.{ext}"

        with open(out_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)

        rel = str(out_path.as_posix())
        url_cache[url] = rel
        return rel

    except Exception as e:
        print("Image download failed:", url)
        print("  Error:", repr(e))
        return None


def export_public_ics(ics_url: str, window_start: datetime, window_end: datetime, tzname: str) -> Dict[str, Any]:
    r = requests.get(ics_url, timeout=30)
    r.raise_for_status()

    with open("utils/calendar_dump.ics", "w", encoding="utf-8") as f:
        f.write(r.text)
    print("Wrote utils/calendar_dump.ics")

    cal = Calendar.from_ical(r.text)

    events_out: List[Dict[str, Any]] = []

    # One session for all downloads (fewer TCP handshakes)
    session = requests.Session()
    url_cache: Dict[str, str] = {}

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        summary = _to_text(component.get("SUMMARY"))
        description = _to_text(component.get("DESCRIPTION"))
        location = _to_text(component.get("LOCATION"))
        uid = _to_text(component.get("UID"))
        url = _to_text(component.get("URL"))
        status = _to_text(component.get("STATUS"))
        categories = component.get("CATEGORIES")
        categories_text = None
        if categories is not None:
            if isinstance(categories, list):
                categories_text = [str(x) for x in categories]
            else:
                categories_text = [str(categories)]

        dtstart_raw = component.get("DTSTART")
        dtend_raw = component.get("DTEND")

        dtstart, is_all_day = _as_dt(dtstart_raw, tzname)
        dtend, is_all_day_end = _as_dt(dtend_raw, tzname)
        is_all_day = is_all_day or is_all_day_end

        if dtstart is None:
            continue

        recurrence_id = _get_recurrence_id(component, tzname)
        if recurrence_id is not None:
            starts = [recurrence_id]
        else:
            starts = _expand_rrule(component, dtstart, window_start, window_end, tzname)

        for occ_start in starts:
            base_start, base_end = _event_window(dtstart, dtend, is_all_day)
            duration = base_end - base_start
            occ_end = occ_start + duration

            if not _overlaps(occ_start, occ_end, window_start, window_end):
                continue

            attachments = _extract_attachments(component)

            images: List[str] = []
            images.extend(_extract_images(description))
            images.extend(_images_from_attachments(attachments))

            seen = set()
            images = [u for u in images if not (u in seen or seen.add(u))]

            # Download images and store local paths
            local_images: List[str] = []
            attachment_name_by_url = {a["url"]: a.get("filename") for a in attachments if a.get("url")}

            for img_url in images:
                saved = _download_image(
                    session,
                    img_url,
                    EVENT_IMAGES_DIR,
                    url_cache,
                    preferred_name=attachment_name_by_url.get(img_url),
                )
                if saved:
                    local_images.append(saved)

            event_obj: Dict[str, Any] = {
                "uid": uid,
                "title": summary,
                "description": description,
                "location": location,
                "start": occ_start.isoformat(),
                "end": occ_end.isoformat(),
                "allDay": bool(is_all_day),
                "url": url,
                "status": status,
                "categories": categories_text,
                "links": _extract_links(description),
                "attachments": attachments,
                "images": images,
                "localImages": local_images,
            }

            events_out.append(event_obj)

    events_out.sort(key=lambda e: e["start"] or "")

    return {
        "source": {"type": "public_ics", "icsUrl": ics_url},
        "timeZone": tzname,
        "windowStart": window_start.isoformat(),
        "windowEnd": window_end.isoformat(),
        "count": len(events_out),
        "events": events_out,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    # ap.add_argument(
    #     "--ics-url", default="https://calendar.google.com/calendar/ical/hq05amnbaa5pr0u7ulc2v2ic44%40group.calendar.google.com/public/full.ics"
    # )
    ap.add_argument(
        "--ics-url",
        default="https://calendar.google.com/calendar/ical/c_68253accc6c8fd6a59483d04329bc7149676eeb6c9b4b8715cf31647d83abb00%40group.calendar.google.com/public/full.ics",
    )
    ap.add_argument("--start", default="2026-05-01", help="YYYY-MM-DD or RFC3339 datetime")
    ap.add_argument("--end", default="2026-05-31", help="YYYY-MM-DD or RFC3339 datetime (end is exclusive)")
    ap.add_argument("--tz", default="America/New_York")
    ap.add_argument("--out", default="events.json")
    args = ap.parse_args()

    tz = gettz(args.tz)

    def parse_start_end(s: str, is_end: bool) -> datetime:
        if "T" not in s:
            d = datetime.strptime(s, "%Y-%m-%d").date()
            dt = datetime.combine(d, time.min)
            return dt.replace(tzinfo=tz)
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=tz)
        return dt

    window_start = parse_start_end(args.start, is_end=False)
    window_end = parse_start_end(args.end, is_end=True)

    payload = export_public_ics(args.ics_url, window_start, window_end, args.tz)

    with open(f"utils/{args.out}", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"Wrote {payload['count']} events to {args.out}")

    # js_out = args.out.replace(".json", ".js") if args.out.endswith(".json") else args.out + ".js"
    js_out = "event-data.js"
    with open(js_out, "w", encoding="utf-8") as f:
        f.write("// Auto generated from public Google Calendar ICS\n")
        f.write("export const RBM_EVENTS = ")
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Wrote JS const to {js_out}")


if __name__ == "__main__":
    main()
