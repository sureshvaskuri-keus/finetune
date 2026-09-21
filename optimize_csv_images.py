#!/usr/bin/env python3
"""
KEUS CSV image optimizer

What it does:
- Reads the four catalogue CSV files in this folder.
- Finds the IMAGE column.
- Converts raw ImgBB image URLs into WebP image-delivery URLs through wsrv.nl.
- Does NOT modify the original image stored on ImgBB.
- Is safe to run repeatedly.

Usage:
    python optimize_csv_images.py

Optional:
    python optimize_csv_images.py --quality 75
"""
from pathlib import Path
import argparse
import csv
import urllib.parse

FILES = [
    "downlights.csv",
    "tracklights.csv",
    "profiles.csv",
    "outdoor-lights.csv",
]

def is_imgbb(url):
    try:
        return urllib.parse.urlparse(url).hostname in {"i.ibb.co", "ibb.co", "www.ibb.co"}
    except Exception:
        return False

def source_from_wsrv(url):
    try:
        p = urllib.parse.urlparse(url)
        if p.hostname in {"wsrv.nl", "images.weserv.nl"}:
            src = (urllib.parse.parse_qs(p.query).get("url") or [""])[0]
            if src and not src.startswith(("http://", "https://")):
                src = "https://" + src
            return src
    except Exception:
        pass
    return ""

def optimize_url(url, quality):
    url = (url or "").strip()
    if not url:
        return url

    source = source_from_wsrv(url)
    if source:
        url = source

    if not is_imgbb(url):
        return url

    query = urllib.parse.urlencode({
        "url": url,
        "output": "webp",
        "q": str(quality),
    })
    return "https://wsrv.nl/?" + query

def process(path, quality):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = reader.fieldnames or []

    image_col = next(
        (h for h in fields if h.strip().lower() in {"image", "image url", "image link", "imageurl"}),
        None
    )
    if not image_col:
        print(f"{path.name}: IMAGE column not found - skipped")
        return

    changed = 0
    for row in rows:
        old = row.get(image_col, "")
        new = optimize_url(old, quality)
        if new != old:
            row[image_col] = new
            changed += 1

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"{path.name}: {changed} row(s) optimized")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--quality", type=int, default=78, choices=range(1, 101))
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent / 'data'
    for name in FILES:
        path = root / name
        if path.exists():
            process(path, args.quality)
        else:
            print(f"{name}: file not found - skipped")

if __name__ == "__main__":
    main()
