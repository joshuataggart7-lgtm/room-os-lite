#!/usr/bin/env python3
"""Mixes the Padres trailer soundtrack from src/trailer.json into public/sounds/hype_sd_trailer.mp3.
Sources: ElevenLabs narration and trailer effects (raw, in $RAW, default /workspace/el-raw) plus Lite's licensed crowd sounds.
No music. Usage: mix-trailer.py"""
import json, os, subprocess
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.environ.get("RAW", "/workspace/el-raw"); S = os.path.join(ROOT, "public/sounds")
plan = json.load(open(os.path.join(ROOT, "src/trailer.json"))); total = plan["total"]
args = ["ffmpeg", "-loglevel", "error", "-y"]; fl = []
for i, a in enumerate(plan["audio"]):
    src = os.path.join(RAW, a["s"] + ".mp3")
    if not os.path.exists(src): src = os.path.join(S, a["s"] + ".mp3")
    args += (["-stream_loop", "-1"] if a.get("loop") else []) + ["-i", src]
    ms = int(a["t"] * 1000); dur = a.get("until", total) - a["t"]
    chain = f"[{i}]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{dur:.3f}"
    if a.get("vo"):  # trailer narrator: tight, present, a short hall tail
        chain += ",highpass=f=70,acompressor=threshold=0.08:ratio=4:attack=5:release=120:makeup=2,aecho=0.8:0.5:60|110:0.18|0.1,volume=1.5"
    if a.get("until"): chain += f",afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6"
    chain += f",volume={a.get('gain', 1.0)},adelay={ms}|{ms}[a{i}]"
    fl.append(chain)
n = len(plan["audio"])
fl.append("".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0:duration=longest,atrim=0:{total},afade=t=out:st={total - 2.5}:d=2.5,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.2:LRA=11[out]")
out = os.path.join(S, "hype_sd_trailer.mp3")
subprocess.run(args + ["-filter_complex", ";".join(fl), "-map", "[out]", "-ar", "44100", "-b:a", "160k", out], check=True)
print(out)
