#!/usr/bin/env python3
"""Builds src/credits.json and public/LICENSES.md from the Room OS media/LICENSES.md, for only the files Lite ships."""
import json, os, re, sys
SRC = os.environ.get("SRC", "/workspace/stadium-room-v3")
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
shipped = set(os.listdir(os.path.join(root, "public/media")))
rows = []
lines = open(os.path.join(SRC, "media/LICENSES.md"), encoding="utf-8").readlines() + open(os.path.join(root, "sources/EXTRA_LICENSES.md"), encoding="utf-8").readlines()
for line in lines:
    if not line.startswith("| ") or line.startswith("| File") or line.startswith("|---"): continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 5 or cells[0] not in shipped: continue
    f, source, author, lic, notes = cells[:5]
    url = re.search(r"https?://\S+", source); lurl = re.search(r"\((https?://[^)]+)\)", lic)
    rows.append({"file": f, "source": source.split(":")[0], "url": url.group(0) if url else "", "author": author,
                 "license": re.sub(r"\s*\(https?://[^)]+\)", "", lic), "licenseUrl": lurl.group(1) if lurl else "", "notes": notes})
missing = shipped - {r["file"] for r in rows}
if missing: sys.exit(f"no license row for: {sorted(missing)}")
json.dump(rows, open(os.path.join(root, "src/credits.json"), "w"), indent=1)
with open(os.path.join(root, "public/LICENSES.md"), "w", encoding="utf-8") as o:
    o.write("# Room OS Lite: media sources and licenses\n\nPhotos and clips are adapted (cropped, resized, re-encoded); adaptations carry the original license.\n"
            "CC BY-SA adaptations are shared under the same license.\n\n| File | Source | Author | License | Notes |\n|---|---|---|---|---|\n")
    for r in rows: o.write(f"| {r['file']} | {r['url']} | {r['author']} | {r['license']} {r['licenseUrl']} | {r['notes']} |\n")
    o.write("\n## Sounds made for Lite\n\nsfx_cowbells, sfx_cowbell_single, bed_road and sting_fanclub are original procedural audio from scripts/synth-lite.py (no samples). radio_hype is the Room OS line narr_hype_generic run through a radio filter.\n")
    o.write("\n## Sounds\n\n" + open(os.path.join(SRC, "packages/agent/sounds/SOUND_LICENSES.txt"), encoding="utf-8").read())
print(len(rows), "credits")
