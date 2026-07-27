from pathlib import Path
import math
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "wardrobe_sprite.webp"
OUTPUT = ROOT / "wardrobe_icons.webp"

ITEMS = [
    ("B-01", True), ("B-02", True), ("B-03", True), ("B-04", True),
    ("T-01", True), ("T-02", True), ("T-03", True), ("T-04", True), ("T-05", True),
    ("H-01", True), ("H-02", False),
    ("S-01", True), ("S-02", True), ("S-03", False), ("S-04", True),
    ("LS-01", True), ("LS-02", True),
    ("SH-01", True), ("SH-02", True), ("SH-03", True), ("SH-04", True),
    ("J-01", True), ("J-02", True), ("J-03", True), ("J-04", True),
]

CELL_W, CELL_H = 300, 380
OUT_COLS, OUT_ROWS = 5, 5


def flat_positions():
    sequence = []
    for item_id, has_worn in ITEMS:
        sequence.append((item_id, "flat"))
        if has_worn:
            sequence.append((item_id, "worn"))
    sequence.append(("body", "front"))
    result = {}
    for i, key in enumerate(sequence):
        if key[1] == "flat":
            result[key[0]] = (i % 8, i // 8)
    return result


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
    mask[:10] = cv2.GC_BGD
    mask[-10:] = cv2.GC_BGD
    mask[:, :10] = cv2.GC_BGD
    mask[:, -10:] = cv2.GC_BGD

    yy, xx = np.ogrid[:h, :w]
    center = ((xx - w * .5) / (w * .43)) ** 2 + ((yy - h * .52) / (h * .45)) ** 2 < 1
    mask[center] = cv2.GC_PR_FGD
    mask[dist > 34] = cv2.GC_PR_FGD
    mask[dist > 55] = cv2.GC_FGD

    try:
        bg_model = np.zeros((1, 65), np.float64)
        fg_model = np.zeros((1, 65), np.float64)
        cv2.grabCut(bgr, mask, None, bg_model, fg_model, 6, cv2.GC_INIT_WITH_MASK)
        fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except cv2.error:
        fg = np.where(dist > 25, 255, 0).astype(np.uint8)

    kernel = np.ones((5, 5), np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, kernel, iterations=2)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)

    n, labels, stats, _ = cv2.connectedComponentsWithStats((fg > 0).astype(np.uint8), 8)
    keep = np.zeros_like(fg)
    cx, cy = w / 2, h / 2
    candidates = []
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if area < 450:
            continue
        px, py = x + ww / 2, y + hh / 2
        score = area - 2.2 * ((px - cx) ** 2 + (py - cy) ** 2)
        candidates.append((score, i))
    for _, i in sorted(candidates, reverse=True)[:3]:
        keep[labels == i] = 255
    if keep.max() == 0:
        keep = fg

    keep = cv2.dilate(keep, np.ones((3, 3), np.uint8), iterations=1)
    keep = cv2.GaussianBlur(keep, (0, 0), 1.4)
    return keep


def cartoonize(rgb: np.ndarray) -> np.ndarray:
    smooth = cv2.bilateralFilter(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), 9, 55, 55)
    smooth = cv2.cvtColor(smooth, cv2.COLOR_BGR2RGB)

    small = cv2.resize(smooth, (96, 122), interpolation=cv2.INTER_AREA)
    data = small.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 16, 1.0)
    _, labels, centers = cv2.kmeans(data, 9, None, criteria, 2, cv2.KMEANS_PP_CENTERS)
    quant = centers[labels.flatten()].reshape(small.shape).astype(np.uint8)
    quant = cv2.resize(quant, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.adaptiveThreshold(cv2.medianBlur(gray, 5), 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                  cv2.THRESH_BINARY,  nine := 9, 7)
    edges = 255 - edges
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
    edge_alpha = (edges.astype(np.float32) / 255.0 * .68)[..., None]
    out = (quant.astype(np.float32) * (1 - edge_alpha) + 20 * edge_alpha).clip(0, 255).astype(np.uint8)
    return out


def render_icon(crop: Image.Image) -> Image.Image:
    rgb = np.array(crop.convert("RGB"))
    mask = foreground_mask(rgb)
    art = cartoonize(rgb)

    ys, xs = np.where(mask > 28)
    if len(xs) == 0:
        x0, y0, x1, y1 = 18, 18, rgb.shape[1] - 18, rgb.shape[0] - 18
    else:
        x0, x1 = max(0, xs.min() - 8), min(rgb.shape[1], xs.max() + 9)
        y0, y1 = max(0, ys.min() - 8), min(rgb.shape[0], ys.max() + 9)

    rgba = np.dstack([art, mask])
    subject = Image.fromarray(rgba, "RGBA").crop((x0, y0, x1, y1))

    max_w, max_h = 252, 322
    scale = min(max_w / max(1, subject.width), max_h / max(1, subject.height))
    subject = subject.resize((max(1, int(subject.width * scale)), max(1, int(subject.height * scale))), Image.Resampling.LANCZOS)

    bg = Image.new("RGBA", (CELL_W, CELL_H), (248, 245, 238, 255))
    draw = ImageDraw.Draw(bg)
    for r, alpha in [(150, 18), (112, 14), (76, 10)]:
        draw.ellipse((150-r, 190-r*.55, 150+r, 190+r*.55), fill=(229, 214, 190, alpha))

    shadow = Image.new("RGBA", subject.size, (0, 0, 0, 0))
    shadow.putalpha(subject.getchannel("A").filter(ImageFilter.GaussianBlur(8)))
    shadow_rgb = Image.new("RGBA", subject.size, (42, 30, 18, 70))
    shadow_rgb.putalpha(shadow.getchannel("A").point(lambda v: int(v * .30)))

    px = (CELL_W - subject.width) // 2
    py = (CELL_H - subject.height) // 2 + 4
    bg.alpha_composite(shadow_rgb, (px + 5, py + 10))
    bg.alpha_composite(subject, (px, py))

    # Fine illustrated contour around the isolated garment.
    alpha = np.array(subject.getchannel("A"))
    outline = cv2.dilate((alpha > 35).astype(np.uint8) * 255, np.ones((3, 3), np.uint8), iterations=1)
    outline = np.maximum(0, outline.astype(np.int16) - (alpha > 35).astype(np.int16) * 255).astype(np.uint8)
    outline_img = Image.new("RGBA", subject.size, (35, 27, 20, 0))
    outline_img.putalpha(Image.fromarray((outline * .62).astype(np.uint8)))
    bg.alpha_composite(outline_img, (px, py))
    bg.alpha_composite(subject, (px, py))
    return bg.convert("RGB")


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source sprite: {SOURCE}")
    src = Image.open(SOURCE).convert("RGB")
    positions = flat_positions()
    canvas = Image.new("RGB", (OUT_COLS * CELL_W, OUT_ROWS * CELL_H), (248, 245, 238))

    for idx, (item_id, _) in enumerate(ITEMS):
        col, row = positions[item_id]
        crop = src.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))
        icon = render_icon(crop)
        out_col, out_row = idx % OUT_COLS, idx // OUT_COLS
        canvas.paste(icon, (out_col * CELL_W, out_row * CELL_H))

    canvas.save(OUTPUT, "WEBP", quality=90, method=6)
    print(f"Generated {OUTPUT} ({OUTPUT.stat().st_size / 1024:.1f} KiB)")


if __name__ == "__main__":
    main()
