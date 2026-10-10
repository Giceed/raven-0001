from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def build(size: int) -> None:
    scale = size / 512
    image = Image.new("RGB", (size, size), "#070b11")
    draw = ImageDraw.Draw(image)
    def point(x, y): return (round(x * scale), round(y * scale))
    def box(values): return tuple(round(value * scale) for value in values)
    draw.rounded_rectangle(box((0, 0, 512, 512)), radius=round(112 * scale), fill="#070b11")
    draw.ellipse(box((72, 72, 440, 440)), fill="#6d28d9")
    draw.polygon([point(356,157),point(435,290),point(379,305),point(275,377),point(154,418),point(231,360),point(166,236)], fill="#05070b")
    draw.ellipse(box((314,225,350,261)), fill="#f8fafc")
    draw.ellipse(box((324,235,342,253)), fill="#05070b")
    draw.polygon([point(386,260),point(435,290),point(379,305)], fill="#facc15")
    image.save(ROOT / "icons" / f"raven-{size}.png", optimize=True)

for icon_size in (192, 512):
    build(icon_size)

