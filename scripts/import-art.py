#!/usr/bin/env python3
"""Imports the AI illustrations (Grok Bot) for the Padres trailer: cover-crops each to 1600x900, compresses it, and on
the scoreboard draws the real series numbers into its blank panels (code-drawn so the facts are exact).
Usage: import-art.py [srcdir] (default /workspace/hype-art)"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SRC = sys.argv[1] if len(sys.argv) > 1 else "/workspace/hype-art"
OUT = os.path.join(os.path.dirname(__file__), "../public/media/hype")
ANTON = "/usr/share/fonts/truetype/sand-box/google/Anton/Anton-Regular.ttf"
W, H = 1600, 900
INK = (46, 26, 10)
# Panel boxes on ill_scoreboard at 1600x900, measured on the art. The board is drawn tilted (rising to the right),
# so each column has its own row heights and the text is rotated to match.
COLS = [(444, 598), (618, 785), (806, 984), (1005, 1182)]
HEAD_Y = [(292, 348), (273, 331), (253, 313), (232, 294)]
ROWS = [[(377, 431), (453, 508), (522, 573), (587, 640)], [(361, 417), (439, 496), (510, 563), (578, 632)],
        [(344, 402), (424, 483), (498, 553), (568, 624)], [(326, 386), (409, 470), (485, 542), (557, 615)]]
TILT = 5.6  # degrees counterclockwise
# Series line score from ESPN: G1 MIL 3-2, G2 MIL 4-3, G3 SD 4-3. Series MIL 2, SD 1.
CELLS = {(0, 0): "MIL", (0, 3): "2", (1, 0): "SD", (1, 3): "1", (2, 0): "GAME", (2, 1): "1", (2, 2): "2", (2, 3): "3", (3, 0): "WIN", (3, 1): "MIL", (3, 2): "MIL", (3, 3): "SD"}

def cover(im):
    im = im.convert("RGB"); r = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))

def label(im, cx, cy, bw, bh, text, maxsize):
    d = ImageDraw.Draw(im); size = maxsize
    while size > 12:
        f = ImageFont.truetype(ANTON, size); l, t, r, b = d.textbbox((0, 0), text, font=f)
        if r - l <= bw * 0.84 and b - t <= bh * 0.74: break
        size -= 2
    tile = Image.new("RGBA", (int(bw * 1.6), int(bh * 2.2)), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), text, font=f, fill=INK + (255,), anchor="mm")
    tile = tile.rotate(TILT, resample=Image.BICUBIC, expand=True)
    im.paste(tile, (int(cx - tile.width / 2), int(cy - tile.height / 2)), tile)

for name in ("ill_ballpark", "ill_crowd", "ill_batter", "ill_pitcher", "ill_homer", "ill_whistle", "ill_skyline", "ill_scoreboard"):
    im = cover(Image.open(os.path.join(SRC, name + ".jpg")))
    if name == "ill_scoreboard":
        hy = [(a + b) / 2 for a, b in HEAD_Y]
        label(im, (COLS[0][0] + COLS[3][1]) / 2, (hy[0] + hy[3]) / 2, COLS[3][1] - COLS[0][0], 80, "NLDS  SERIES", 110)
        for (r, c), t in CELLS.items():
            (x0, x1), (y0, y1) = COLS[c], ROWS[c][r]
            label(im, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, t, 90 if r < 2 else 64)
    im.save(os.path.join(OUT, name + ".jpg"), quality=82, optimize=True, progressive=True)
    print("wrote", name, os.path.getsize(os.path.join(OUT, name + ".jpg")) // 1024, "KB")
