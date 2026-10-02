#!/usr/bin/env python3
"""Render the Cx toolbar icons to match the site mark (ink tile + coral offset)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

INK = (14, 17, 19, 255)
CREAM = (251, 250, 244, 255)
CORAL = (219, 112, 76, 255)
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
SCALE = 8


def font_for(px: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, px, index=1)


def draw_tile(side: int, offset: int, radius: int, label: str, font_px: float) -> Image.Image:
    canvas = Image.new("RGBA", (side + offset, side + offset), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((offset, offset, offset + side - 1, offset + side - 1), radius=radius, fill=CORAL)
    draw.rounded_rectangle((0, 0, side - 1, side - 1), radius=radius, fill=INK)
    font = font_for(font_px)
    bbox = font.getbbox(label)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (side - tw) / 2 - bbox[0]
    y = (side - th) / 2 - bbox[1] + side * 0.02
    if len(label) == 2:
        gap = -font_px * 0.04
        c_bbox = font.getbbox("C")
        x_bbox = font.getbbox("x")
        cw, ch = c_bbox[2] - c_bbox[0], c_bbox[3] - c_bbox[1]
        xw, xh = x_bbox[2] - x_bbox[0], x_bbox[3] - x_bbox[1]
        total = cw + gap + xw
        cx = (side - total) / 2
        draw.text((cx - c_bbox[0], (side - ch) / 2 - c_bbox[1] + side * 0.02), "C", font=font, fill=CREAM)
        draw.text(
            (cx + cw + gap - x_bbox[0], (side - xh) / 2 - x_bbox[1] + side * 0.02),
            "x",
            font=font,
            fill=CREAM,
        )
    else:
        draw.text((x, y), label, font=font, fill=CREAM)
    return canvas


def render(size: int) -> Image.Image:
    hi = size * SCALE
    if size <= 16:
        offset, pad, tilt, label, font_ratio, radius_ratio = 1, 0, 0, "C", 0.56, 0.22
    elif size <= 32:
        offset, pad, tilt, label, font_ratio, radius_ratio = 2, 0, 0, "Cx", 0.42, 12 / 38
    elif size <= 48:
        offset, pad, tilt, label, font_ratio, radius_ratio = 3, 2, -4, "Cx", 0.38, 12 / 38
    else:
        offset, pad, tilt, label, font_ratio, radius_ratio = 8, 8, -4, "Cx", 0.37, 12 / 38

    offset_hi = offset * SCALE
    pad_hi = pad * SCALE
    side = hi - 2 * pad_hi - offset_hi
    radius = max(SCALE, round(side * radius_ratio))
    font_px = side * font_ratio
    tile = draw_tile(side, offset_hi, radius, label, font_px)
    if tilt:
        tile = tile.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    sheet = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))
    sheet.alpha_composite(tile, ((hi - tile.width) // 2, (hi - tile.height) // 2))
    return sheet.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        path = OUT / f"icon{size}.png"
        render(size).save(path, "PNG")
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
