#!/usr/bin/env python3
"""Draws the Padres trailer's comic panels (1600x900) from scratch with PIL: bold flat shapes, brown and gold, halftone
dots, speed lines and starbursts. Generic silhouettes only: no real people, no logos, no team marks.
These are stand-ins until AI illustrations land at the same file names (public/media/hype/<id>.jpg).
Usage: comic-panels.py [outdir]"""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
OUT = sys.argv[1] if __name__ == "__main__" and len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "../public/media/hype")
os.makedirs(OUT, exist_ok=True)
W, H = 1600, 900
G = "/usr/share/fonts/truetype/sand-box/google"
ANTON = f"{G}/Anton/Anton-Regular.ttf"; BANG = f"{G}/Bangers/Bangers-Regular.ttf"
INK = (18, 11, 6); BROWN = (47, 36, 29); BROWN2 = (82, 60, 42); GOLD = (255, 196, 37); GOLD2 = (230, 150, 20)
CREAM = (255, 241, 205); RED = (196, 28, 44); DRED = (90, 10, 18); WHITE = (255, 255, 255)
R = random.Random(7)

def font(p, s): return ImageFont.truetype(p, s)
def grad(top, bot, w=W, h=H):
    im = Image.new("RGB", (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1); d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bot)))
    return im
def rays(im, cx, cy, n, c1, c2, spin=0):
    d = ImageDraw.Draw(im); L = 3000
    for i in range(n):
        a0 = spin + 2 * math.pi * i / n; a1 = spin + 2 * math.pi * (i + 0.5) / n
        d.polygon([(cx, cy), (cx + L * math.cos(a0), cy + L * math.sin(a0)), (cx + L * math.cos(a1), cy + L * math.sin(a1))], fill=c1 if i % 2 == 0 else c2)
def burst(d, cx, cy, r1, r2, n, fill, outline=INK, width=8, jitter=0.0):
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n; r = (r2 if i % 2 == 0 else r1) * (1 + R.uniform(-jitter, jitter))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=fill, outline=outline, width=width)
def halftone(im, color, spacing=16, maxr=6, fn=None, alpha=110):
    """Dots whose size follows fn(x, y) in 0..1."""
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for y in range(0, im.size[1] + spacing, spacing):
        off = spacing // 2 if (y // spacing) % 2 else 0
        for x in range(-spacing, im.size[0] + spacing, spacing):
            v = fn(x + off, y) if fn else 0.5
            r = maxr * max(0.0, min(1.0, v))
            if r > 0.6: d.ellipse([x + off - r, y - r, x + off + r, y + r], fill=color + (alpha,))
    im.paste(lay, (0, 0), lay)
def speed(im, cx, cy, n=90, color=CREAM, r0=380, alpha=150, width=(2, 7)):
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for _ in range(n):
        a = R.uniform(0, 2 * math.pi); r1 = r0 + R.uniform(0, 260); r2 = r1 + R.uniform(250, 900)
        d.line([(cx + r1 * math.cos(a), cy + r1 * math.sin(a)), (cx + r2 * math.cos(a), cy + r2 * math.sin(a))], fill=color + (alpha,), width=R.randint(*width))
    im.paste(lay, (0, 0), lay)
def vignette(im, k=0.55):
    m = Image.new("L", im.size, 0); d = ImageDraw.Draw(m)
    d.ellipse([-W * 0.25, -H * 0.3, W * 1.25, H * 1.3], fill=255); m = m.filter(ImageFilter.GaussianBlur(160))
    dark = Image.new("RGB", im.size, INK)
    return Image.composite(im, Image.blend(im, dark, k), m)
def frame(im):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, W - 1, H - 1], outline=INK, width=18)
    return im
def text(d, xy, s, f, fill=GOLD, stroke=INK, sw=10, shadow=12, anchor="mm"):
    x, y = xy
    if shadow: d.text((x + shadow, y + shadow), s, font=f, fill=INK, anchor=anchor, stroke_width=sw, stroke_fill=INK)
    d.text((x, y), s, font=f, fill=fill, anchor=anchor, stroke_width=sw, stroke_fill=stroke)
def fit(s, path, maxw, start):
    sz = start
    while sz > 40 and font(path, sz).getlength(s) > maxw: sz -= 6
    return font(path, sz)
def limb(d, pts, w, fill):
    d.line(pts, fill=fill, width=w, joint="curve")
    for x, y in (pts[0], pts[-1]): d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=fill)
def figure(im, parts, ox, oy, s, fill=INK, rim=GOLD, rimw=10):
    """parts: list of ('limb', [(x,y)...], width) | ('circle', (x,y), r) | ('poly', [...]) in a 100-unit box."""
    for color, extra in ((rim, rimw), (fill, 0)):
        d = ImageDraw.Draw(im)
        for p in parts:
            if p[0] == "limb": limb(d, [(ox + x * s, oy + y * s) for x, y in p[1]], int(p[2] * s + extra * 2), color)
            elif p[0] == "circle":
                (x, y), r = p[1], p[2] * s + extra; d.ellipse([ox + x * s - r, oy + y * s - r, ox + x * s + r, oy + y * s + r], fill=color)
            elif p[0] == "poly":
                pts = [(ox + x * s, oy + y * s) for x, y in p[1]]
                if extra:
                    cx = sum(a for a, _ in pts) / len(pts); cy = sum(b for _, b in pts) / len(pts)
                    pts = [(cx + (a - cx) * (1 + extra / 120), cy + (b - cy) * (1 + extra / 120)) for a, b in pts]
                d.polygon(pts, fill=color)
def light_tower(im, x, y, h, glow=True):
    d = ImageDraw.Draw(im)
    d.polygon([(x - 8, y + h), (x + 8, y + h), (x + 4, y), (x - 4, y)], fill=INK)
    bx, by, bw, bh = x - 70, y - 70, 140, 80
    if glow:
        g = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
        gd.ellipse([bx - 160, by - 140, bx + bw + 160, by + bh + 140], fill=CREAM + (120,))
        g = g.filter(ImageFilter.GaussianBlur(70)); im.paste(g, (0, 0), g)
    d = ImageDraw.Draw(im)
    d.rectangle([bx, by, bx + bw, by + bh], fill=INK)
    for r in range(4):
        for c in range(7):
            cx, cy = bx + 12 + c * 19.5, by + 12 + r * 19
            d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=CREAM)
def stands(im, top, color=BROWN, dots=GOLD, rows=5):
    d = ImageDraw.Draw(im)
    d.polygon([(0, top), (W, top - 40), (W, H), (0, H)], fill=color)
    for r in range(rows):
        y = top + 18 + r * 26
        for x in range(0, W, 14):
            if R.random() < 0.75:
                c = dots if R.random() < 0.35 else CREAM if R.random() < 0.2 else BROWN2
                d.ellipse([x - 4, y - 4 - x * 0.025, x + 4, y + 4 - x * 0.025], fill=c)
def save(im, name):
    im = frame(im.convert("RGB")); im.save(os.path.join(OUT, f"{name}.jpg"), quality=78, optimize=True, progressive=True); print("wrote", name)

# ---------- scenes
def ballpark():
    im = grad((14, 9, 5), (60, 42, 26))
    halftone(im, GOLD, 22, 4, lambda x, y: 0.4 - y / H * 0.4, 60)
    for x, h in ((170, 420), (560, 360), (1040, 360), (1430, 420)): light_tower(im, x, 120 + (420 - h), h)
    d = ImageDraw.Draw(im)
    # upper deck and crowd
    d.polygon([(0, 380), (W, 380), (W, 520), (0, 520)], fill=BROWN)
    for r in range(5):
        for x in range(0, W, 13):
            if R.random() < 0.8: d.ellipse([x - 4, 392 + r * 25 - 4, x + 4, 392 + r * 25 + 4], fill=GOLD if R.random() < 0.3 else BROWN2 if R.random() < 0.6 else CREAM)
    # outfield wall + field
    d.rectangle([0, 520, W, 545], fill=GOLD2)
    d.polygon([(0, 545), (W, 545), (W, H), (0, H)], fill=(34, 58, 26))
    for i in range(10):
        if i % 2: d.polygon([(i * 160 - 400 * (1 - i / 10), H), ((i + 1) * 160 - 400 * (1 - (i + 1) / 10), H), ((i + 1) * 160, 545), (i * 160, 545)], fill=(44, 72, 32))
    # infield dirt and diamond from behind the plate
    d.pieslice([300, 560, 1300, 1260], 180, 360, fill=(150, 98, 52))
    d.polygon([(800, 610), (1080, 760), (800, 905), (520, 760)], fill=(40, 70, 30))
    for a, b in (((800, 905), (1500, 545)), ((800, 905), (100, 545))): d.line([a, b], fill=CREAM, width=7)
    d.ellipse([760, 735, 840, 775], fill=(170, 112, 60)); d.ellipse([792, 748, 808, 756], fill=CREAM)
    for bx, by in ((1080, 760), (520, 760), (800, 610)): d.polygon([(bx, by - 10), (bx + 14, by), (bx, by + 10), (bx - 14, by)], fill=CREAM)
    halftone(im, INK, 14, 5, lambda x, y: (y - 545) / 600 if y > 545 else 0, 90)
    speed(im, 800, 300, 40, CREAM, 500, 60)
    return vignette(im, 0.45)
def crowd():
    im = grad((40, 26, 14), (12, 8, 4))
    rays(im, 800, -200, 26, (66, 46, 28), (40, 26, 14))
    halftone(im, GOLD, 18, 5, lambda x, y: 0.6 - y / H * 0.6, 70)
    for row, (y0, scale, col) in enumerate(((330, 0.7, BROWN2), (470, 0.85, BROWN), (640, 1.05, (30, 20, 12)), (820, 1.3, INK))):
        d = ImageDraw.Draw(im)
        x = R.uniform(-40, 0)
        while x < W + 60:
            s = scale * R.uniform(0.9, 1.1); hx, hy = x, y0 + R.uniform(-12, 12)
            d.ellipse([hx - 26 * s, hy - 30 * s, hx + 26 * s, hy + 26 * s], fill=col)
            d.rounded_rectangle([hx - 52 * s, hy + 20 * s, hx + 52 * s, hy + 200 * s], radius=int(30 * s), fill=col)
            if R.random() < 0.7:  # arm up with a towel
                side = R.choice((-1, 1)); ax, ay = hx + side * 40 * s, hy + 30 * s; tx, ty = hx + side * 70 * s, hy - 120 * s
                limb(d, [(ax, ay), (tx, ty)], int(18 * s), col)
                tc = GOLD if R.random() < 0.7 else CREAM
                ang = R.uniform(-0.6, 0.6); wv = 34 * s
                pts = [(tx, ty)]
                for k in range(7):
                    pts.append((tx + side * k * 14 * s + math.sin(k + ang * 5) * 8 * s, ty - 10 * s - k * 9 * s + math.cos(k * 1.3) * wv * 0.3))
                for k in range(6, -1, -1):
                    pts.append((tx + side * k * 14 * s + math.sin(k + ang * 5) * 8 * s + side * 6 * s, ty + 42 * s - k * 9 * s + math.cos(k * 1.3) * wv * 0.3))
                d.polygon(pts, fill=tc, outline=INK, width=max(2, int(4 * s)))
            x += R.uniform(80, 120) * scale
    speed(im, 800, 0, 50, GOLD, 300, 70)
    return vignette(im, 0.35)
BATTER = [("limb", [(44, 26), (50, 52)], 13), ("limb", [(56, 26), (52, 52)], 13), ("limb", [(47, 50), (37, 67), (28, 86)], 8), ("limb", [(28, 86), (21, 87)], 5),
          ("limb", [(53, 50), (61, 69), (66, 87)], 8), ("limb", [(66, 87), (72, 88)], 5),
          ("limb", [(45, 25), (38, 31), (30, 33)], 5), ("limb", [(56, 25), (46, 35), (31, 34)], 5),
          ("poly", [(31, 31), (31, 36), (-6, 30), (-8, 25)]), ("circle", (50, 14), 7.5), ("poly", [(42, 12), (58, 9), (59, 15), (39, 16)]), ("limb", [(50, 21), (50, 26)], 7)]
PITCHER = [("limb", [(47, 24), (53, 48)], 13), ("limb", [(58, 24), (54, 48)], 13), ("limb", [(55, 47), (57, 68), (56, 88)], 8), ("limb", [(56, 88), (63, 89)], 5),
           ("limb", [(50, 47), (36, 38), (40, 58)], 8), ("limb", [(40, 58), (35, 60)], 5),
           ("limb", [(47, 23), (37, 26), (31, 31)], 5), ("circle", (29, 33), 4.5), ("limb", [(58, 23), (70, 18), (78, 8)], 5), ("circle", (79, 6), 2.6),
           ("circle", (53, 13), 7.5), ("poly", [(46, 10), (59, 7), (61, 11), (40, 13)]), ("limb", [(53, 20), (53, 25)], 7)]
def batter():
    im = Image.new("RGB", (W, H), BROWN); rays(im, 560, 360, 30, GOLD, GOLD2, 0.1)
    halftone(im, (255, 230, 140), 18, 7, lambda x, y: 1 - math.hypot(x - 560, y - 360) / 900, 130)
    speed(im, 560, 360, 80, WHITE, 300, 120)
    figure(im, BATTER, 620, 70, 8.6)
    d = ImageDraw.Draw(im); burst(d, 560, 330, 50, 95, 12, CREAM, INK, 6, 0.15); d.ellipse([536, 306, 584, 354], fill=WHITE, outline=INK, width=5)
    d.arc([520, 300, 560, 360], 300, 60, fill=RED, width=4); d.arc([560, 300, 600, 360], 120, 240, fill=RED, width=4)
    stands(im, 800, INK, BROWN2, 3)
    return vignette(im, 0.3)
def pitcher():
    im = grad((10, 6, 3), (50, 34, 20))
    g = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.polygon([(640, -50), (960, -50), (1250, 900), (350, 900)], fill=GOLD + (70,)); g = g.filter(ImageFilter.GaussianBlur(30)); im.paste(g, (0, 0), g)
    halftone(im, GOLD, 16, 6, lambda x, y: 0.9 - abs(x - 800) / 500, 90)
    d = ImageDraw.Draw(im); d.ellipse([420, 760, 1180, 980], fill=(120, 80, 42)); d.ellipse([560, 790, 1040, 900], fill=(150, 100, 52))
    d.rectangle([760, 815, 840, 828], fill=CREAM)
    figure(im, PITCHER, 520, 40, 8.6)
    speed(im, 1190, 90, 50, CREAM, 120, 110, (2, 5))
    return vignette(im, 0.35)
def homer():
    im = grad((8, 5, 3), (70, 44, 22))
    d = ImageDraw.Draw(im)
    for _ in range(90): x, y = R.uniform(0, W), R.uniform(0, H * 0.6); d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=CREAM)
    light_tower(im, 230, 260, 640); light_tower(im, 1380, 300, 600)
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    pts = [(300 + t * 9.2, 760 - 520 * math.sin(t / 100 * math.pi * 0.62)) for t in range(0, 101)]
    for i in range(len(pts) - 1):
        ld.line([pts[i], pts[i + 1]], fill=GOLD + (int(40 + 200 * i / 100),), width=int(4 + i * 0.36))
    im.paste(lay, (0, 0), lay)
    bx, by = pts[-1]; d = ImageDraw.Draw(im)
    burst(d, bx, by, 70, 150, 14, GOLD, INK, 7, 0.2)
    d.ellipse([bx - 44, by - 44, bx + 44, by + 44], fill=WHITE, outline=INK, width=6)
    d.arc([bx - 70, by - 40, bx - 10, by + 40], 300, 60, fill=RED, width=5); d.arc([bx + 10, by - 40, bx + 70, by + 40], 120, 240, fill=RED, width=5)
    speed(im, bx, by, 60, CREAM, 160, 120, (2, 6))
    stands(im, 760, INK, GOLD, 5)
    return vignette(im, 0.3)
def whistle():
    im = Image.new("RGB", (W, H), BROWN); rays(im, 1050, 300, 24, (70, 50, 32), BROWN, 0.2)
    halftone(im, GOLD, 18, 6, lambda x, y: 1 - math.hypot(x - 1050, y - 300) / 1000, 90)
    d = ImageDraw.Draw(im)
    # steam puffs rising from the horn mouth
    for k in range(26):
        t = k / 25; cx = 1080 + t * 330 + R.uniform(-40, 40); cy = 380 - t * 360 + R.uniform(-30, 30); r = 50 + t * 120
        d.ellipse([cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6], fill=INK)
    for k in range(26):
        t = k / 25; R2 = random.Random(k); cx = 1080 + t * 330 + R2.uniform(-40, 40); cy = 380 - t * 360 + R2.uniform(-30, 30); r = 50 + t * 120
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CREAM if k % 3 else WHITE)
    # brass horn: pipe, valve block, flared bell
    d.rectangle([180, 520, 760, 580], fill=GOLD2, outline=INK, width=8)
    d.rounded_rectangle([600, 470, 760, 640], radius=16, fill=GOLD, outline=INK, width=8)
    d.polygon([(760, 500), (1040, 330), (1110, 420), (1120, 560), (1040, 650), (760, 610)], fill=GOLD, outline=INK, width=10)
    d.ellipse([1040, 320, 1150, 660], fill=GOLD2, outline=INK, width=10); d.ellipse([1065, 360, 1130, 620], fill=INK)
    d.line([(800, 515), (1030, 380)], fill=CREAM, width=10)
    speed(im, 1100, 480, 70, WHITE, 200, 120)
    text(d, (420, 300), "WHOOOO!", font(BANG, 170), CREAM, INK, 10, 10)
    d.rectangle([0, 760, W, H], fill=INK)
    for x in range(0, W, 60): d.line([(x, 760), (x + 30, 900)], fill=BROWN2, width=4)
    return vignette(im, 0.3)
def skyline():
    im = grad((10, 6, 4), (80, 50, 24), H=H) if False else grad((10, 6, 4), (90, 56, 24))
    d = ImageDraw.Draw(im)
    for _ in range(70): x, y = R.uniform(0, W), R.uniform(0, 300); d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=CREAM)
    g = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g); gd.ellipse([200, 380, 1400, 800], fill=GOLD + (90,)); g = g.filter(ImageFilter.GaussianBlur(90)); im.paste(g, (0, 0), g)
    d = ImageDraw.Draw(im); x = -20; horizon = 600
    while x < W:
        bw = R.uniform(50, 130); bh = R.uniform(120, 420) * (1.3 if 500 < x < 1100 else 1)
        top = horizon - bh; col = R.choice((INK, (28, 18, 10), (40, 28, 16)))
        d.rectangle([x, top, x + bw, horizon], fill=col)
        if R.random() < 0.3: d.polygon([(x, top), (x + bw / 2, top - R.uniform(30, 90)), (x + bw, top)], fill=col)
        for wy in range(int(top) + 14, horizon - 8, 22):
            for wx in range(int(x) + 8, int(x + bw) - 8, 16):
                if R.random() < 0.55: d.rectangle([wx, wy, wx + 7, wy + 11], fill=GOLD if R.random() < 0.75 else CREAM)
        x += bw + R.uniform(0, 12)
    d.rectangle([0, horizon, W, H], fill=(16, 10, 6))
    for y in range(horizon + 6, H, 9):
        for _ in range(26):
            xx = R.uniform(0, W); ww = R.uniform(20, 120); c = GOLD if R.random() < 0.6 else BROWN2
            d.line([(xx, y), (xx + ww, y)], fill=c, width=3)
    halftone(im, GOLD, 16, 4, lambda x, y: 0.5 if y < 300 else 0, 50)
    return vignette(im, 0.35)
def scoreboard():
    im = grad((14, 9, 5), (46, 32, 20)); rays(im, 800, 450, 28, (60, 42, 26), (30, 20, 12))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([230, 110, 1370, 800], radius=26, fill=INK, outline=GOLD2, width=14)
    for i in range(0, 60):  # bulb border
        t = i / 60; per = 2 * (1100 + 650)
        p = t * per
        if p < 1100: x, y = 250 + p, 130
        elif p < 1750: x, y = 1350, 130 + (p - 1100)
        elif p < 2850: x, y = 1350 - (p - 1750), 780
        else: x, y = 250, 780 - (p - 2850)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=CREAM if i % 2 else GOLD)
    led = Image.new("L", (W, H), 0); ld = ImageDraw.Draw(led)
    ld.text((800, 240), "NLDS  SERIES", font=font(ANTON, 96), fill=255, anchor="mm")
    ld.text((520, 470), "MIL", font=font(ANTON, 170), fill=255, anchor="mm"); ld.text((1080, 470), "2", font=font(ANTON, 230), fill=255, anchor="mm")
    ld.text((520, 680), "SD", font=font(ANTON, 170), fill=255, anchor="mm"); ld.text((1080, 680), "1", font=font(ANTON, 230), fill=255, anchor="mm")
    dots = Image.new("L", (W, H), 0); dd = ImageDraw.Draw(dots)
    for y in range(0, H, 9):
        for x in range(0, W, 9): dd.ellipse([x, y, x + 6, y + 6], fill=255)
    m = ImageChops.multiply(led, dots)
    glow = Image.new("RGB", (W, H), GOLD); im.paste(Image.new("RGB", (W, H), (120, 70, 0)), (0, 0), led.filter(ImageFilter.GaussianBlur(14)).point(lambda v: v // 2))
    im.paste(glow, (0, 0), m)
    d = ImageDraw.Draw(im); d.line([(300, 330), (1300, 330)], fill=GOLD2, width=6); d.line([(800, 360), (800, 760)], fill=BROWN2, width=4)
    return vignette(im, 0.3)
def card(title, kicker="", hot=False, sub=""):
    bg1, bg2 = ((150, 18, 32), (96, 10, 20)) if hot else (BROWN2, BROWN)
    im = Image.new("RGB", (W, H), bg2); rays(im, 800, 450, 32, bg1, bg2, R.uniform(0, 1))
    halftone(im, GOLD if not hot else (255, 120, 100), 16, 7, lambda x, y: 1 - math.hypot(x - 800, y - 450) / 950, 90)
    speed(im, 800, 450, 70, CREAM, 520, 90)
    d = ImageDraw.Draw(im)
    burst(d, 800, 450, 330, 470, 22, INK if not hot else (40, 4, 8), INK, 1, 0.12)
    f = fit(title, ANTON, 1300, 330)
    text(d, (800, 470 if kicker else 450), title, f, WHITE if hot else GOLD, INK, 14, 16)
    if kicker: text(d, (800, 470 - f.size * 0.62 - 40), kicker, font(BANG, 74), CREAM, INK, 7, 7)
    if sub: text(d, (800, 470 + f.size * 0.55 + 40), sub, font(BANG, 70), CREAM, INK, 7, 7)
    return vignette(im, 0.3)

if __name__ == "__main__":
    for name, fn in (("ill_ballpark", ballpark), ("ill_crowd", crowd), ("ill_batter", batter), ("ill_pitcher", pitcher), ("ill_homer", homer), ("ill_whistle", whistle), ("ill_skyline", skyline), ("ill_scoreboard", scoreboard)):
        save(fn(), name)
    for name, args in (("c_02", ("0-2", "DOWN IN THE SERIES")), ("c_g1", ("MIL 3  SD 2", "GAME 1")), ("c_g2", ("MIL 4  SD 3", "GAME 2")), ("c_out", ("COUNTED OUT", "EVERYBODY SAID")),
                       ("c_g3", ("SD 4  MIL 3", "GAME 3 · PETCO PARK", False, "STILL ALIVE")), ("c_odds", ("NOBODY BELIEVES", "ALL THE ODDS AGAINST THEM")), ("c_goose", ("GOOSE",)), ("c_peter", ("PETER",)),
                       ("c_city", ("THIS CITY",)), ("c_need", ("NEED THIS", "", True)), ("c_wogh", ("WIN OR GO HOME", "NLDS GAME 4", True)), ("c_nlds", ("NLDS", "THE PADRES")), ("c_g4", ("GAME 4", "TONIGHT")),
                       ("c_petco", ("PETCO PARK", "SAN DIEGO")), ("c_lets", ("LET'S GO PADRES", "", True))):
        save(card(*args), name)
