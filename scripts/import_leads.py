#!/usr/bin/env python3
"""
One-off, re-runnable import of lead_tracker_2.xlsx into the sales pipeline.

    pip install openpyxl
    python3 scripts/import_leads.py lead_tracker_2.xlsx \
        --api http://localhost:8080/api --user devadmin --password ...

Reads the "Warm Leads" and "Cold Leads" sheets, maps their columns onto the pipeline's import
shape, and POSTs everything to /platform/pipeline/import as the given PLATFORM_ADMIN. The server
matches warm rows by a stable key (the sheet's Lead ID, or a slug of the name when there is
none) and cold rows by Lead ID, so running this twice updates rows rather than duplicating them,
and never moves a lead an operator has since worked. Use --dry-run to see the payload without
sending it.

Column matching is by header keyword, case-insensitive, so a renamed column ("Phone number"
instead of "Phone") still lands. Unknown columns are ignored and listed at the end.
"""
import argparse
import datetime as dt
import getpass
import json
import re
import sys
import urllib.request

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

# header keyword(s) -> payload field. First match wins, in this order.
WARM_COLUMNS = [
    (("lead id", "id"), "externalKey"),
    (("name", "clinic"), "name"),
    (("category",), "category"),
    (("type", "speciality", "specialty"), "type"),
    (("phone", "mobile", "contact no"), "phone"),
    (("address", "area", "location"), "address"),
    (("source",), "source"),
    (("referred", "referrer", "referral"), "referredBy"),
    (("contact person", "contact", "person"), "contactPerson"),
    (("interested", "interest"), "interested"),
    (("stage", "status"), "stage"),
    (("next action", "action"), "nextAction"),
    (("due", "follow up date", "follow-up date", "followup"), "nextActionDue"),
    (("notes", "remarks", "comment"), "notes"),
    (("added", "created", "date added"), "addedOn"),
    (("contacted",), "contactedOn"),
    (("demo",), "demoOn"),
    (("onboard",), "onboardingOn"),
    (("training", "setup"), "trainingDoneOn"),
    (("live", "go-live", "go live"), "goLiveOn"),
]

COLD_COLUMNS = [
    (("lead id", "id"), "sourceId"),
    (("name", "clinic"), "name"),
    (("category",), "category"),
    (("type", "speciality", "specialty"), "type"),
    (("phone", "mobile"), "phone"),
    (("rating",), "rating"),
    (("review",), "reviewCount"),
    (("distance", "dist", "km"), "distanceKm"),
    (("address", "area"), "address"),
    (("source",), "source"),
]


def norm(s):
    return re.sub(r"\s+", " ", str(s or "")).strip().lower()


def map_headers(headers, spec):
    """Column index -> field, matching each field once, most specific keyword first."""
    mapping, used = {}, set()
    for keywords, field in spec:
        for i, h in enumerate(headers):
            hn = norm(h)
            if i in used or not hn:
                continue
            if any(k == hn or k in hn for k in keywords):
                mapping[i] = field
                used.add(i)
                break
    unknown = [headers[i] for i in range(len(headers)) if i not in used and norm(headers[i])]
    return mapping, unknown


def as_date(v):
    if v in (None, ""):
        return None
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%d %B %Y", "%d-%b-%Y", "%d-%b-%y", "%d/%m/%y"):
        try:
            return dt.datetime.strptime(s[:len(fmt) + 4], fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s  # let the server warn about it


def as_text(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    return s or None


def as_num(v, kind=float):
    if v in (None, ""):
        return None
    try:
        return kind(str(v).replace(",", "").strip())
    except ValueError:
        return None


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", norm(name)).strip("-")[:100]


def read_sheet(wb, wanted):
    for ws in wb.worksheets:
        if wanted in norm(ws.title):
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                return [], []
            return list(rows[0]), rows[1:]
    sys.exit(f"No sheet named like '{wanted}' in the workbook (found: {[w.title for w in wb.worksheets]})")


def build(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    unknowns = {}

    headers, rows = read_sheet(wb, "warm")
    mapping, unknowns["Warm Leads"] = map_headers(headers, WARM_COLUMNS)
    warm = []
    for r in rows:
        rec = {field: r[i] for i, field in mapping.items() if i < len(r)}
        if not as_text(rec.get("name")):
            continue
        out = {}
        for field, v in rec.items():
            if field.endswith("On") or field == "nextActionDue":
                out[field] = as_date(v)
            else:
                out[field] = as_text(v)
        out["externalKey"] = out.get("externalKey") or "warm:" + slug(out["name"])
        warm.append(out)

    headers, rows = read_sheet(wb, "cold")
    mapping, unknowns["Cold Leads"] = map_headers(headers, COLD_COLUMNS)
    cold = []
    for r in rows:
        rec = {field: r[i] for i, field in mapping.items() if i < len(r)}
        if not as_text(rec.get("name")):
            continue
        out = {k: as_text(v) for k, v in rec.items() if k not in ("rating", "reviewCount", "distanceKm")}
        out["rating"] = as_num(rec.get("rating"))
        out["reviewCount"] = as_num(rec.get("reviewCount"), int)
        out["distanceKm"] = as_num(rec.get("distanceKm"))
        out["sourceId"] = out.get("sourceId") or "cold:" + slug(out["name"])
        cold.append(out)

    return {"warm": warm, "cold": cold}, unknowns


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("xlsx")
    ap.add_argument("--api", default="http://localhost:8080/api")
    ap.add_argument("--user", default="devadmin")
    ap.add_argument("--password")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    payload, unknowns = build(args.xlsx)
    print(f"{len(payload['warm'])} warm rows, {len(payload['cold'])} cold rows")
    for sheet, cols in unknowns.items():
        if cols:
            print(f"  ignored columns in {sheet}: {cols}")
    if args.dry_run:
        print(json.dumps(payload, indent=2)[:4000])
        return

    password = args.password or getpass.getpass(f"Password for {args.user}: ")
    login = urllib.request.Request(args.api + "/platform/auth/login", method="POST",
                                   headers={"content-type": "application/json"},
                                   data=json.dumps({"username": args.user, "password": password}).encode())
    token = json.load(urllib.request.urlopen(login))["token"]
    req = urllib.request.Request(args.api + "/platform/pipeline/import", method="POST",
                                 headers={"content-type": "application/json", "Authorization": "Bearer " + token},
                                 data=json.dumps(payload).encode())
    result = json.load(urllib.request.urlopen(req))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
