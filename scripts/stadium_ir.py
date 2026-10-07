"""Writes a synthetic stereo stadium impulse response (open-air bowl: early slap off the stands, long diffuse tail)."""
import sys, numpy as np, wave
sr = 44100; n = int(sr * 3.2); rng = np.random.default_rng(7)
t = np.arange(n) / sr
ir = np.zeros((n, 2))
for ch in range(2):
    tail = rng.standard_normal(n) * np.exp(-t / 0.75) * (1 - np.exp(-t / 0.02))
    # darken the tail over time (air absorption)
    out = np.zeros(n); y = 0.0
    for i in range(n):
        a = 0.35 + 0.6 * min(1.0, t[i] / 2.5)
        y = a * y + (1 - a) * tail[i]; out[i] = y
    ir[:, ch] = out * 3
    for d, g in [(0.045, .5), (0.11, .35), (0.19 + ch * 0.013, .45), (0.31 - ch * 0.02, .25), (0.47, .15)]:
        k = int(d * sr); ir[k:k + 40, ch] += g * np.hanning(40)
ir[0, :] = 1.0
ir /= np.abs(ir).max()
w = wave.open(sys.argv[1], "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((ir * 32767 * 0.9).astype("<i2").tobytes()); w.close()
