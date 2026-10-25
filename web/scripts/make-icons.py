"""Generates the Site Control app icons into web/public/icons/.

Run: python scripts/make-icons.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (15, 23, 42)        # slate-900
HAT = (245, 158, 11)     # amber-500
RIDGE = (217, 119, 6)    # amber-600
TICK = (34, 197, 94)     # green-500


def draw(size: int, scale: float, rounded: bool) -> Image.Image:
    s = size * 4  # draw large, shrink for smooth edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, s, s], fill=BG)

    def p(v: float) -> int:  # position inside the scaled safe area
        return int(s / 2 + (v - 0.5) * s * scale)

    # dome
    d.pieslice([p(0.2), p(0.22), p(0.8), p(0.82)], 180, 360, fill=HAT)
    # ridge on dome
    d.rounded_rectangle([p(0.46), p(0.22), p(0.54), p(0.52)], radius=int(s * 0.02), fill=RIDGE)
    # brim
    d.rounded_rectangle([p(0.1), p(0.5), p(0.9), p(0.6)], radius=int(s * 0.05 * scale), fill=HAT)
    # tick below the hat (attendance done)
    w = max(4, int(s * 0.055 * scale))
    d.line([(p(0.36), p(0.72)), (p(0.46), p(0.81)), (p(0.66), p(0.64))], fill=TICK, width=w, joint="curve")
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
draw(192, 1.0, True).save(OUT / "icon-192.png")
draw(512, 1.0, True).save(OUT / "icon-512.png")
draw(512, 0.72, False).save(OUT / "maskable-512.png")  # content kept inside Android's safe zone
draw(180, 0.9, False).convert("RGB").save(OUT / "apple-touch-180.png")
print("icons written to", OUT)
