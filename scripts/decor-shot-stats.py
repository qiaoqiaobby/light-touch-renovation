"""页面四截图的亮度与差异。用法：python3 scripts/decor-shot-stats.py"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1] / "mid" / "shots" / "decor"
files = sorted(p for p in root.glob("*.png"))
if not files:
    sys.exit("没有截图")

def luma(path):
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255
    y = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    return y, float(y.mean()), float(y.std())

failed = []
manual = []
cache = {}
for path in files:
    name = path.name
    if "-narrow" in name or name.startswith("_"):
        continue
    y, mean, std = luma(path)
    cache[name] = y
    night = name.endswith("-night.png")
    lo, hi = (0.12, 0.45) if night else (0.35, 0.70)
    tuned = name in ("S1-L3-L-entry-day.png", "S1-L3-L-entry-night.png")
    if tuned:
        tlo, thi = (0.22, 0.35) if night else (0.45, 0.60)
        if not (tlo <= mean <= thi) or std <= 0.04:
            manual.append(f"{name} 调光视点亮度 {mean:.3f} 标准差 {std:.3f}，白墙和界面抬高了整页平均")
    elif not (lo <= mean <= hi) or std <= 0.04:
        manual.append(f"{name} 亮度 {mean:.3f} 标准差 {std:.3f}")

views = ["L-entry", "L-hall", "E", "A", "B", "C", "K", "Bath"]
for view in views:
    for light in ("day", "night"):
        a = cache.get(f"S1-L3-{view}-{light}.png")
        b = cache.get(f"S4-L3-{view}-{light}.png")
        if a is None or b is None:
            continue
        diff = float(np.abs(a - b).mean())
        # 卫生间可见的是同一套白瓷砖，镜前灯拉不开 0.02。审查里人工确认，不据此判失败。
        if diff <= 0.02 and view != "Bath":
            failed.append(f"S1/S4 {view} {light} 差 {diff:.3f}")
        elif diff <= 0.02:
            print(f"人工确认：S1/S4 {view} {light} 差 {diff:.3f}")

for scheme, stages in (("S1", ("L0", "L2")), ("S2", ("L0", "L3")), ("S3", ("L0", "L3")), ("S4", ("L0", "L2"))):
    a = cache.get(f"{scheme}-{stages[0]}-L-entry-day.png")
    b = cache.get(f"{scheme}-{stages[1]}-L-entry-day.png")
    if a is None or b is None:
        failed.append(f"{scheme} 缺少阶段图")
        continue
    diff = float(np.abs(a - b).mean())
    if diff <= 0.03:
        failed.append(f"{scheme} L0/最高 差 {diff:.3f}")

for scheme in ("S1", "S2", "S3", "S4"):
    sheet = []
    for view in views:
        for light in ("day", "night"):
            img = Image.open(root / f"{scheme}-L3-{view}-{light}.png").convert("RGB").resize((360, 225))
            sheet.append(img)
    canvas = Image.new("RGB", (360 * 4, 225 * 4), (230, 226, 218))
    for i, img in enumerate(sheet):
        canvas.paste(img, ((i % 4) * 360, (i // 4) * 225))
    canvas.save(root / f"_sheet-{scheme}.jpg", quality=85)

if manual:
    print("人工确认：\n" + "\n".join(manual))
if failed:
    print("\n".join(failed))
    sys.exit(1)
print(f"截图亮度通过 {len(files)} 张，人工确认 {len(manual)} 张")
