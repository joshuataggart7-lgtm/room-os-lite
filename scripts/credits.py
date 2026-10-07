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
    o.write("\n## Sounds made for Lite\n\nsfx_cowbells, sfx_cowbell_single, bed_road, sting_fanclub and sting_closer are original procedural audio from scripts/synth-lite.py (no samples). radio_hype is the Room OS line narr_hype_generic run through a radio filter.\n")
    o.write("\n## Crowd chants and announcer lines (Oct 2026 refresh)\n\nGenerated with ElevenLabs for this project (prompts in scripts/gen-eleven.mjs), then given a stadium treatment by scripts/stadiumize.sh: a convolution reverb from a synthetic stadium impulse response (scripts/stadium_ir.py), the slap echo of delay towers, stereo width, and a real recorded crowd bed underneath.\n\n- AI-generated crowd chants and roars (ElevenLabs Sound Effects): chant_lets_go_padres, chant_hail_state, chant_whodat, chant_defense, chant_hotty_toddy_reply, sfx_crowd_hr, sfx_crowd_td, sfx_crowd_three, sfx_crowd_singalong, sfx_crowd_k, sfx_crowd_win, sfx_crowd_applause, sfx_crowd_closer, sfx_crowd_rise.\n- AI-generated announcer lines (ElevenLabs text to speech, eleven_v3, premade voice Brian; a generic PA voice, not any real announcer): every pa_*.mp3, plus the narration in hype_sd_trailer.mp3.\n- hype_sd_trailer.mp3 (the Padres trailer soundtrack, scripts/mix-trailer.py): ElevenLabs narration (eleven_v3, voice Brian) and ElevenLabs trailer effects (heartbeat, drums, booms, riser, crowd swell) mixed with the crowd clips above.\n- Real crowd recordings: the stands_bed_* beds and sfx_roar_* roars (see Sounds below).\n\nNo copyrighted music ships with Lite. Songs play only through Spotify's own embedded player.\n")
    o.write("\n## Sounds\n\n" + open(os.path.join(SRC, "packages/agent/sounds/SOUND_LICENSES.txt"), encoding="utf-8").read())
print(len(rows), "credits")
