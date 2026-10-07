#!/usr/bin/env python3
"""Renders the shareable Padres trailer MP4 (1280x720, 64 s) from src/trailer.json and the comic panels in
public/media/hype, with the pre-mixed trailer soundtrack (ElevenLabs narration and effects, CC0 crowd, no music).
Usage: render-hype.py out.mp4 "SD vs MIL" "TONIGHT · 9:00 PM CT" "NLDS GAME 4 · FS1" """
import importlib.util, json, os, subprocess, sys, tempfile
out, title, kicker, sub = sys.argv[1:5]
ROOT = os.path.join(os.path.dirname(__file__), ".."); HY = os.path.join(ROOT, "public/media/hype")
spec = importlib.util.spec_from_file_location("cp", os.path.join(os.path.dirname(__file__), "comic-panels.py")); cp = importlib.util.module_from_spec(spec); spec.loader.exec_module(cp)
tmp = tempfile.mkdtemp()
tonight = os.path.join(tmp, "tonight.jpg"); cp.frame(cp.card(title, kicker, True, sub)).save(tonight, quality=90)
plan = json.load(open(os.path.join(ROOT, "src/trailer.json"))); total = plan["total"]; shots = plan["shots"]
W, H, FPS = 1280, 720, 30
segs = []
for i, s in enumerate(shots):
    f0 = round(s["t"] * FPS); f1 = round((shots[i + 1]["t"] if i + 1 < len(shots) else total) * FPS); n = f1 - f0
    img = tonight if s["img"] == "tonight" else os.path.join(HY, s["img"] + ".jpg")
    fx = s.get("fx", "in"); p = int(n * 0.18) or 1
    z, x, y = {
        "punch": (f"if(lt(on,{p}),1.35-0.33*on/{p},1.02+0.07*(on-{p})/{max(1, n - p)})", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),
        "slow": (f"1.0+0.06*on/{n}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),
        "in": (f"1.0+0.14*on/{n}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),
        "out": (f"1.16-0.14*on/{n}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),
        "left": ("1.14", f"(iw-iw/zoom)*(1-on/{n})", "ih/2-(ih/zoom/2)"),
        "right": ("1.14", f"(iw-iw/zoom)*on/{n}", "ih/2-(ih/zoom/2)"),
    }[fx]
    vf = f"scale=3200:-2,zoompan=z='{z}':x='{x}':y='{y}':d={n}:s={W}x{H}:fps={FPS}"
    if s.get("dim"): vf += ",eq=brightness=-0.12:saturation=0.6"
    if s.get("shake"): vf += f",crop={W - 56}:{H - 56}:'28+24*sin(n*2.3)*exp(-n/7)':'28+20*cos(n*3.1)*exp(-n/7)',scale={W}:{H}"
    if s.get("flash"): vf += ",fade=t=in:st=0:d=0.18:color=white"
    seg = os.path.join(tmp, f"s{i:02d}.mp4")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", img, "-vf", vf, "-frames:v", str(n), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-r", str(FPS), seg], check=True)
    segs.append(seg)
lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
video = os.path.join(tmp, "video.mp4")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], check=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-i", os.path.join(ROOT, "public/sounds/hype_sd_trailer.mp3"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                "-movflags", "+faststart", "-t", str(total), out], check=True)
print(out)
