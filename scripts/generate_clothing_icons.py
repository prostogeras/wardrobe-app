from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "wardrobe_sprite.webp"
OUTPUT = ROOT / "wardrobe_icons.webp"
MANIFEST = ROOT / "wardrobe_icons.json"
PREVIEW = ROOT / "wardrobe_icons_preview.webp"

CELL_W, CELL_H = 300, 380
SOURCE_COLS = 8
OUT_COLS, OUT_ROWS = 5, 5

# Explicit source coordinates from the original wardrobe sprite.
# This table is the single source of truth and prevents item mix-ups.
SOURCE_POSITIONS = {
    "B-01": (0, 0), "B-02": (2, 0), "B-03": (4, 0), "B-04": (6, 0),
    "T-01": (0, 1), "T-02": (2, 1), "T-03": (4, 1), "T-04": (6, 1), "T-05": (0, 2),
    "H-01": (2, 2), "H-02": (4, 2),
    "S-01": (5, 2), "S-02": (7, 2), "S-03": (1, 3), "S-04": (2, 3),
    "LS-01": (4, 3), "LS-02": (6, 3),
    "SH-01": (0, 4), "SH-02": (2, 4), "SH-03": (4, 4), "SH-04": (6, 4),
    "J-01": (0, 5), "J-02": (2, 5), "J-03": (4, 5), "J-04": (6, 5),
}

ORDER = [
    "B-01", "B-02", "B-03", "B-04",
    "T-01", "T-02", "T-03", "T-04", "T-05",
    "H-01", "H-02",
    "S-01", "S-02", "S-03", "S-04",
    "LS-01", "LS-02",
    "SH-01", "SH-02", "SH-03", "SH-04",
    "J-01", "J-02", "J-03", "J-04",
]


def foreground_mask(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)

    border = np.concatenate([
        lab[:18].reshape(-1, 3), lab[-18:].reshape(-1, 3),
        lab[:, :18].reshape(-1, 3), lab[:, -18:].reshape(-1, 3),
    ], axis=0)
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(lab - bg, axis=2)

    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[:8] = cv2.GC_BGD
    mask[-8:] = cv2.GC_BGD
    mask[:, :8] = cv2.GC_BGD
    mask[:, -8:] = cv2.GC_BGD

    yy, xx = np.ogrid[:h, :w]
    center = ((xx - w * .5) / (w * .46)) ** 2 + ((yy - h * .51) / (h * .47)) ** 2 < 1
    mask[center] = cv2.GC_PR_FGD
    mask[dist > 30] = cv2.GC_PR_FGD
    mask[dist > 50] = cv2.GC_FGD

    try:
        bg_model = np.zeros((1, 65), np.float64)
        fg_model = np.zeros((1, 65), np.float64)
        cv2.grabCut(bgr, mask, None, bg_model, fg_model, 6, cv2.GC_INIT_WITH_MASK)
        fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except cv2.error:
        fg = np.where(dist > 25, 255, 0).astype(np.uint8)

    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)

    n, labels, stats, _ = cv2.connectedComponentsWithStats((fg > 0).astype(np.uint8), 8)
    keep = np.zeros_like(fg)
    cx, cy = w / 2, h / 2
    ranked = []
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if area < 350:
            continue
        px, py = x + ww / 2, y + hh / 2
        ranked.append((area - 1.8 * ((px - cx) ** 2 + (py - cy) ** 2), i))
    for _, i in sorted(ranked, reverse=True)[:4]:
        keep[labels == i] = 255
    if keep.max() == 0:
        keep = fg

    keep = cv2.dilate(keep, np.ones((3, 3), np.uint8), iterations=1)
    return cv2.GaussianBlur(keep, (0, 0), 1.2)


def cartoonize(rgb: np.ndarray) -> np.ndarray:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    smooth = cv2.bilateralFilter(bgr, 11, 62, 62)
    smooth = cv2.cvtColor(smooth, cv2.COLOR_BGR2RGB)

    small = cv2.resize(smooth, (110, 140), interpolation=cv2.INTER_AREA)
    data = small.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 18, .8)
    _, labels, centers = cv2.kmeans(data, 11, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    quant = centers[labels.flatten()].reshape(small.shape).astype(np.uint8)
    quant = cv2.resize(quant, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    line = cv2.adaptiveThreshold(
        cv2.medianBlur(gray, 5), 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 7,
    )
    line = 255 - line
    line = cv2.dilate(line, np.ones((2, 2), np.uint8), iterations=1)
    alpha = (line.astype(np.float32) / 255.0 * .55)[..., None]
    return (quant.astype(np.float32) * (1 - alpha) + 24 * alpha).clip(0, 255).astype(np.uint8)


def render_icon(crop: Image.Image) -> Image.Image:
    rgb = np.array(crop.convert("RGB"))
    mask = foreground_mask(rgb)
    art = cartoonize(rgb)

    ys, xs = np.where(mask > 28)
    if len(xs):
        x0, x1 = max(0, xs.min() - 8), min(rgb.shape[1], xs.max() + 9)
        y0, y1 = max(0, ys.min() - 8), min(rgb.shape[0], ys.max() + 9)
    else:
        x0, y0, x1, y1 = 10, 10, rgb.shape[1] - 10, rgb.shape[0] - 10

    subject = Image.fromarray(np.dstack([art, mask]), "RGBA").crop((x0, y0, x1, y1))
    scale = min(258 / max(1, subject.width), 330 / max(1, subject.height))
    subject = subject.resize(
        (max(1, int(subject.width * scale)), max(1, int(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )

    bg = Image.new("RGBA", (CELL_W, CELL_H), (250, 248, 243, 255))
    draw = ImageDraw.Draw(bg)
    draw.rounded_rectangle((12, 12, CELL_W - 12, CELL_H - 12), 24, fill=(247, 243, 236, 255))
    draw.ellipse((42, 94, 258, 310), fill=(231, 220, 203, 32))

    px = (CELL_W - subject.width) // 2
    py = (CELL_H - subject.height) // 2

    shadow_alpha = subject.getchannel("A").filter(ImageFilter.GaussianBlur(9))
    shadow = Image.new("RGBA", subject.size, (38, 29, 22, 0))
    shadow.putalpha(shadow_alpha.point(lambda v: int(v * .25)))
    bg.alpha_composite(shadow, (px + 6, py + 10))

    alpha = np.array(subject.getchannel("A"))
    outline = cv2.dilate((alpha > 32).astype(np.uint8) * 255, np.ones((4, 4), np.uint8), 1)
    outline = np.maximum(0, outline.astype(np.int16) - (alpha > 32).astype(np.int16) * 255).astype(np.uint8)
    outline_img = Image.new("RGBA", subject.size, (28, 22, 18, 0))
    outline_img.putalpha(Image.fromarray((outline * .72).astype(np.uint8)))
    bg.alpha_composite(outline_img, (px, py))
    bg.alpha_composite(subject, (px, py))
    return bg.convert("RGB")


def main():
    if set(ORDER) != set(SOURCE_POSITIONS):
        raise SystemExit("ORDER and SOURCE_POSITIONS contain different IDs")
    if len(ORDER) != 25 or len(set(ORDER)) != 25:
        raise SystemExit("Expected exactly 25 unique wardrobe IDs")
    if not SOURCE.exists():
        raise SystemExit(f"Missing source sprite: {SOURCE}")

    source = Image.open(SOURCE).convert("RGB")
    expected_min = (SOURCE_COLS * CELL_W, 6 * CELL_H)
    if source.width < expected_min[0] or source.height < expected_min[1]:
        raise SystemExit(f"Unexpected source sprite size: {source.size}")

    canvas = Image.new("RGB", (OUT_COLS * CELL_W, OUT_ROWS * CELL_H), (250, 248, 243))
    manifest = {"cellWidth": CELL_W, "cellHeight": CELL_H, "cols": OUT_COLS, "rows": OUT_ROWS, "items": {}}

    for index, item_id in enumerate(ORDER):
        source_col, source_row = SOURCE_POSITIONS[item_id]
        crop = source.crop((
            source_col * CELL_W, source_row * CELL_H,
            (source_col + 1) * CELL_W, (source_row + 1) * CELL_H,
        ))
        icon = render_icon(crop)
        target_col, target_row = index % OUT_COLS, index // OUT_COLS
        canvas.paste(icon, (target_col * CELL_W, target_row * CELL_H))
        manifest["items"][item_id] = {
            "source": {"col": source_col, "row": source_row},
            "target": {"col": target_col, "row": target_row},
            "index": index,
        }

    canvas.save(OUTPUT, "WEBP", quality=92, method=6)
    canvas.save(PREVIEW, "WEBP", quality=82, method=4)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {OUTPUT.name}: {canvas.size}, 25 ID-safe cells")


if __name__ == "__main__":
    main()
