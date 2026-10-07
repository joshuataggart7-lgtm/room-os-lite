#!/usr/bin/env python3
"""Original procedural sounds for Room OS Lite (no samples): a stadium of cowbells, a single cowbell,
a road hum for the drive, the fan club sting (a sad trombone), plus a radio-filtered hype call made by
filtering the Room OS announcer line narr_hype_generic. Writes MP3s with ffmpeg."""
import os, subprocess, sys, wave
import numpy as np
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/sounds"
SRC = os.environ.get("SRC", "/workspace/stadium-room-v3")
SR = 44100
rng = np.random.default_rng(7)

def write(name, stereo, br="96k"):
    path = os.path.join(OUT, name + ".mp3")
    if os.path.exists(path): return
    x = stereo / max(1e-9, np.abs(stereo).max()) * 0.89
    tmp = f"/tmp/{name}.wav"
    with wave.open(tmp, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-b:a", br, path], check=True)

def bell_hit(f, dur=0.35):
    """One cowbell strike: inharmonic metal partials with fast decay and a stick click."""
    t = np.arange(int(SR * dur)) / SR
    parts = [(1.0, 1.0, 9), (1.504, 0.7, 12), (2.17, 0.35, 16), (2.93, 0.2, 22), (4.1, 0.1, 30)]
    s = sum(a * np.sign(np.sin(2 * np.pi * f * r * t)) * 0.25 * np.exp(-d * t) + a * np.sin(2 * np.pi * f * r * t) * np.exp(-d * t) for r, a, d in parts)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.6
    return (s + click) * np.minimum(1, t * 2000)

def cowbells(secs, bells, rate=(7, 12)):
    n = int(SR * secs); out = np.zeros((n, 2))
    env = np.minimum(1, np.arange(n) / (SR * 0.6)) * np.minimum(1, (n - np.arange(n)) / (SR * 1.5))
    for _ in range(bells):
        f = rng.uniform(480, 900); pan = rng.uniform(-0.9, 0.9); gain = rng.uniform(0.25, 1.0)
        t = rng.uniform(0, 0.4)
        r = rng.uniform(*rate)
        while t < secs - 0.3:
            h = bell_hit(f * rng.uniform(0.99, 1.01), 0.3) * gain * rng.uniform(0.6, 1.0)
            i = int(t * SR); j = min(n, i + len(h))
            out[i:j, 0] += h[: j - i] * (1 - pan) / 2; out[i:j, 1] += h[: j - i] * (1 + pan) / 2
            t += 1 / r * rng.uniform(0.7, 1.3)
    return out * env[:, None]

def road(secs):
    n = int(SR * secs)
    b = np.cumsum(rng.standard_normal((n, 2)), axis=0)
    b -= np.convolve(b[:, 0], np.ones(4000) / 4000, mode="same")[:, None]  # remove drift
    t = np.arange(n) / SR
    hum = 0.3 * np.sin(2 * np.pi * 58 * t) + 0.2 * np.sin(2 * np.pi * 87 * t)
    mod = 1 + 0.15 * np.sin(2 * np.pi * t / 7.3) + 0.08 * np.sin(2 * np.pi * t / 2.1)
    x = (b / np.abs(b).max() + hum[:, None] * 0.4) * mod[:, None]
    fade = int(SR * 2); x[:fade] *= np.linspace(0, 1, fade)[:, None]; x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return x

def trombone():
    notes = [(233.1, 0.45), (220.0, 0.45), (207.7, 0.45), (196.0, 1.5)]
    out = []
    for i, (f, d) in enumerate(notes):
        t = np.arange(int(SR * d)) / SR
        vib = 1 + (0.012 * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t * 3) if i == 3 else 0)
        ph = 2 * np.cumsum(np.pi * f * vib / SR)
        s = sum(np.sin(k * ph) / k ** 1.2 for k in range(1, 9))
        env = np.minimum(1, t * 30) * np.minimum(1, (d - t) * 12)
        out.append(s * env)
    x = np.concatenate(out)
    return np.stack([x, x], axis=1)

os.makedirs(OUT, exist_ok=True)
def closer_sting():
    """Lights out: a breaker clunk, a sub drone that swells, and three heavy hits. Original, not any song."""
    secs = 7.0; t = np.arange(int(SR * secs)) / SR; x = np.zeros_like(t)
    rng = np.random.default_rng(3)
    clunk = rng.standard_normal(int(SR * 0.08)) * np.exp(-np.arange(int(SR * 0.08)) / (SR * 0.015)); x[:len(clunk)] += clunk * 0.9
    drone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 61.7 * t) + 0.25 * np.sin(2 * np.pi * 82 * t * (1 + 0.002 * np.sin(2 * np.pi * 0.3 * t))))
    env = np.clip((t - 0.2) / 4.5, 0, 1) ** 1.6 * np.clip((secs - t) / 0.6, 0, 1)
    x += drone * env * 0.45
    for k, at in enumerate((4.6, 5.3, 6.0)):
        i = int(at * SR); n = int(SR * 0.9); tt = np.arange(n) / SR
        hit = (np.sin(2 * np.pi * (55 - 25 * tt) * tt) * np.exp(-tt / 0.35) + rng.standard_normal(n) * np.exp(-tt / 0.05) * 0.4) * (0.8 + 0.1 * k)
        x[i:i + n] += hit[: len(x) - i]
    x = np.tanh(x * 1.4) * 0.8
    return np.stack([x, np.roll(x, 90)], axis=1)

write("sting_closer", closer_sting())
write("sfx_cowbells", cowbells(7, 60))
write("sfx_cowbell_single", cowbells(2.2, 3, (6, 9)))
write("bed_road", road(30), "64k")
write("sting_fanclub", trombone())
radio = os.path.join(OUT, "radio_hype.mp3")
if not os.path.exists(radio):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", os.path.join(SRC, "packages/agent/sounds/narr_hype_generic.mp3"),
                    "-af", "highpass=f=350,lowpass=f=3200,acompressor=threshold=0.1:ratio=6,volume=1.6,aecho=0.6:0.3:20:0.2", "-ac", "2", "-b:a", "96k", radio], check=True)
print("lite sounds ok")
