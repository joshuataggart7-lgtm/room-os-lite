#!/usr/bin/env python3
"""Renders a shareable Padres hype MP4 (1280x720, ~70 s) from the licensed photos and clips in public/media, with
video-board title cards and only licensed audio: the AI-generated announcer and crowd clips plus a real crowd bed.
No copyrighted music. Card text is passed in (taken from ESPN at render time).
Usage: render-hype.py out.mp4 "NLDS - GAME 4" "MIL LEADS SERIES 2-1" "elim|" "SD vs MIL" "TONIGHT 9:00 PM CT · FS1" """
import os, subprocess, sys, tempfile
out, note, summary, flag, matchup, when = sys.argv[1:7]
ROOT = os.path.join(os.path.dirname(__file__), "..")
M = os.path.join(ROOT, "public/media"); S = os.path.join(ROOT, "public/sounds")
FONT = "/usr/share/fonts/truetype/sand-box/google/Anton/Anton-Regular.ttf"
SHOTS = ["sd_bay_morning.jpg", "sd_gaslamp_arch_day.jpg", "petco_park_at_the_park.jpg", "s_petco_section_135_panorama.jpg", "s_petco_dusk_downtown.jpg", "v_ballpark_aerial_night.mp4",
         "s_petco_panorama.jpg", "s_petco_night_behind_plate.jpg", "s_petco_night_low.jpg", "v_crowd_stands.mp4", "s_petco_night_lower_level.jpg", "v_baseball_seats_night.mp4", "sd_gaslamp_street.jpg", "s_sd_night_bay.jpg", "v_fireworks_crowd.mp4"]
cards = [("PADRES BASEBALL", "PETCO PARK", False)]
if note: cards.append((note.upper(), "POSTSEASON", False))
if summary: cards.append((summary.upper(), "THE SERIES", False))
if flag == "elim": cards.append(("WIN OR GO HOME", "ELIMINATION GAME", True))
if matchup: cards.append((matchup.upper(), when.upper(), False))
final = ("LET'S GO PADRES", "BROWN AND GOLD", True)
steps = [("card", ("SAN DIEGO", "ROOM OS PRESENTS", False), 3.5)]
si = 0
def shot(secs):
    global si; steps.append(("shot", SHOTS[si % len(SHOTS)], secs)); si += 1
for _ in range(6): shot(3.4)
for c in cards: steps.append(("card", c, 2.8)); shot(2.6); shot(2.2); shot(2.0)
for _ in range(6): shot(1.4)
steps.append(("card", final, 4.0))
total = sum(s[2] for s in steps)
tmp = tempfile.mkdtemp()
W, H, FPS = 1280, 720, 30
def esc(t): return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\u2019").replace(",", "\\,")
segs = []
for k, (kind, what, secs) in enumerate(steps):
    seg = os.path.join(tmp, f"s{k:02d}.mp4"); n = int(secs * FPS)
    flash = f"fade=t=in:st=0:d=0.25:color=white"
    if kind == "card":
        title, kicker, hot = what
        bg = "0x9b1022" if hot else "0x4a3626"; col = "white" if hot else "0xffc425"
        vf = (f"vignette=PI/5,"
              f"drawtext=fontfile={FONT}:text='{esc(kicker)}':fontcolor=0xc9b27a:fontsize=34:x=(w-text_w)/2:y=h/2-130,"
              f"drawtext=fontfile={FONT}:text='{esc(title)}':fontcolor={col}:fontsize=120:x=(w-text_w)/2:y=h/2-60:shadowcolor=black@0.6:shadowx=0:shadowy=4,"
              f"drawgrid=w=iw:h=4:t=1:c=black@0.25,{flash}")
        cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=c={bg}:s={W}x{H}:r={FPS}:d={secs}", "-vf", vf]
    elif what.endswith(".mp4"):
        cmd = ["ffmpeg", "-loglevel", "error", "-y", "-stream_loop", "-1", "-i", os.path.join(M, what), "-t", str(secs),
               "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},eq=contrast=1.08:saturation=1.1,{flash}"]
    else:
        z = ["min(zoom+0.0011,1.18)", "if(eq(on,1),1.18,max(zoom-0.0011,1.02))", "1.12", "1.12"][k % 4]
        x = ["iw/2-(iw/zoom/2)", "iw/2-(iw/zoom/2)", f"(iw-iw/zoom)*on/{n}", f"(iw-iw/zoom)*(1-on/{n})"][k % 4]
        cmd = ["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", os.path.join(M, what), "-t", str(secs),
               "-vf", f"scale=2560:-2,zoompan=z='{z}':x='{x}':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},eq=contrast=1.08:saturation=1.1,{flash}"]
    cmd += ["-frames:v", str(n), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", seg]
    subprocess.run(cmd, check=True); segs.append(seg)
lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
video = os.path.join(tmp, "video.mp4")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], check=True)
cues = [("stands_bed_ballpark", 0, 0.55), ("sfx_crowd_rise", 0, 0.7), ("pa_sd_hype_intro", 1.2, 1.0), ("sfx_roar_huge", total * 0.3, 0.5),
        ("sfx_crowd_hr", total * 0.45, 0.8), ("chant_lets_go_padres", total - 7.5, 0.9), ("sfx_ships_whistle", total - 4, 0.9), ("sfx_crowd_win", total - 3.5, 0.6)]
if flag == "elim": cues.append(("pa_sd_win_or_go_home", total * 0.62, 1.0))
args = ["ffmpeg", "-loglevel", "error", "-y", "-i", video]
fl = []
for i, (name, at, g) in enumerate(cues):
    args += (["-stream_loop", "-1"] if name.startswith("stands_bed") else []) + ["-i", os.path.join(S, name + ".mp3")]
    ms = int(at * 1000)
    fl.append(f"[{i+1}]atrim=0:{total},adelay={ms}|{ms},volume={g}[a{i}]")
fl.append("".join(f"[a{i}]" for i in range(len(cues))) + f"amix=inputs={len(cues)}:normalize=0:duration=longest,atrim=0:{total},afade=t=out:st={total-1.5}:d=1.5,loudnorm=I=-14:TP=-1.2[aout]")
args += ["-filter_complex", ";".join(fl), "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", str(total), out]
subprocess.run(args, check=True)
print(f"{out} {total:.1f}s")
