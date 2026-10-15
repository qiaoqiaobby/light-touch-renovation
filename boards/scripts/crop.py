"""裁切与取色：按 boards/data/crops.json 从 docs/images 裁图，提取主色，输出到 mid/jalo/crops/。

用法：python3 boards/scripts/crop.py [--review]
--review 另外拼出核对用的总表 mid/jalo/crops/_review-XX.jpg，每张 20 块，标 id 与名称。

主色：在 CIELAB 里做 k-means（k=5），只保留占比不少于 8% 的簇，按占比排序。
现状材质块直接从 VR/VR离线全景.html 解出所需的立方体面再裁切，规格写在 BASE 里，同样取色。
"""
import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from skimage import color as skc
from sklearn.cluster import KMeans

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "boards/data/crops.json"
OUT = ROOT / "mid/jalo/crops"
LONG = 560
MIN_SHARE = 0.08

VR = ROOT / "VR/VR离线全景.html"
FACES = ["right", "left", "up", "down", "front", "back"]  # faces 数组顺序，见 VR/README.md

# 现状材质块：场景序号、立方体面、2048 px 面上的像素框 [x, y, 边长]。
# 位置先按 materials.js 的参考色在全景里做色差搜索，再逐块目视确认是该材质的平整部分。
BASE = [
    {"id": "base-tile", "scene": 6, "face": "down", "box": [768, 1088, 256], "name": "客厅抛光地砖"},
    {"id": "base-wall", "scene": 5, "face": "front", "box": [384, 512, 256], "name": "客厅白墙"},
    {"id": "base-ceiling", "scene": 4, "face": "up", "box": [1664, 384, 256], "name": "吊顶"},
    {"id": "base-blue", "scene": 5, "face": "front", "box": [1472, 1536, 256], "name": "蓝色护墙板"},
    {"id": "base-redwood", "scene": 2, "face": "right", "box": [896, 1088, 256], "name": "红棕木柜"},
    {"id": "base-cabwhite", "scene": 8, "face": "right", "box": [320, 448, 256], "name": "卧室白色柜体"},
    {"id": "base-kitblue", "scene": 3, "face": "front", "box": [832, 1792, 256], "name": "厨房蓝色橱柜"},
    {"id": "base-bedfloor", "scene": 11, "face": "down", "box": [1100, 1350, 400], "name": "卧室灰调木纹地板"},
]


def pano_faces(wanted):
    """从全景单文件的第 44 行（sceneData JSON）解出需要的面，返回 {(场景, 面): Image}。"""
    with VR.open(encoding="utf8") as f:
        for n, line in enumerate(f, 1):
            if n == 44:
                break
    data = json.loads(line[line.index(">") + 1:line.rindex("</script>")])
    out = {}
    for scene, face in wanted:
        uri = data["scenes"][scene]["faces"][FACES.index(face)]
        out[(scene, face)] = Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGB")
    return out


def palette(img: Image.Image, k: int = 5):
    small = np.asarray(img.convert("RGB").resize((96, 96))) / 255.0
    lab = skc.rgb2lab(small).reshape(-1, 3)
    km = KMeans(n_clusters=k, n_init=4, random_state=0).fit(lab)
    shares = np.bincount(km.labels_, minlength=k) / len(lab)
    out = []
    for i in np.argsort(-shares):
        if shares[i] < MIN_SHARE:
            continue
        rgb = skc.lab2rgb(km.cluster_centers_[i].reshape(1, 1, 3)).reshape(3)
        hx = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in np.clip(rgb, 0, 1))
        out.append({"hex": hx, "lab": [round(float(v), 1) for v in km.cluster_centers_[i]], "share": round(float(shares[i]), 3)})
    return out


def edges(img: Image.Image):
    g = np.asarray(img.convert("L").resize((160, round(160 * img.height / img.width)))) / 255.0
    gx = np.abs(np.diff(g, axis=1, prepend=g[:, :1]))
    gy = np.abs(np.diff(g, axis=0, prepend=g[:1, :]))
    return np.hypot(gx, gy)


def flat_share(img: Image.Image):
    """平整背景占比：低彩度且局部几乎没有纹理的像素比例，用来发现裁进了大片墙面、顶面。"""
    e = edges(img)
    rgb = np.asarray(img.convert("RGB").resize((e.shape[1], e.shape[0]))) / 255.0
    chroma = np.hypot(*skc.rgb2lab(rgb)[..., 1:].transpose(2, 0, 1))
    k = 5
    pad = np.pad(e, k // 2, mode="edge")
    local = np.lib.stride_tricks.sliding_window_view(pad, (k, k)).mean(axis=(-1, -2))
    return float(((local < 0.012) & (chroma < 10)).mean())


def trim(img: Image.Image, cut=0.05, margin=0.03):
    """按边缘能量收边：去掉四周累计不到 cut 的边缘能量所在的条带，再留 margin 余量。"""
    e = edges(img)
    H, W = e.shape
    def span(profile, n):
        c = np.cumsum(profile) / profile.sum()
        a, b = int(np.searchsorted(c, cut)), int(np.searchsorted(c, 1 - cut))
        m = round(margin * n)
        return max(0, a - m), min(n, b + 1 + m)
    x0, x1 = span(e.sum(0), W)
    y0, y1 = span(e.sum(1), H)
    sx, sy = img.width / W, img.height / H
    return (round(x0 * sx), round(y0 * sy), round(x1 * sx), round(y1 * sy))


def save(img: Image.Image, cid: str):
    img = img.convert("RGB")
    s = LONG / max(img.size)
    if s < 1:
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    p = OUT / f"{cid}.webp"
    img.save(p, "WEBP", quality=74, method=6)
    return img, p.stat().st_size


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads(SPEC.read_text(encoding="utf8"))
    files = {p.stem: p for p in (ROOT / "docs/images").iterdir()}
    result, problems = {}, []
    for c in spec["crops"]:
        src = files.get(str(c["img"]))
        if src is None:
            problems.append(f"{c['id']}：找不到图 {c['img']}")
            continue
        x0, y0, x1, y1 = c["box"]
        if not (0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1):
            problems.append(f"{c['id']}：裁切框越界 {c['box']}")
            continue
        im = Image.open(src)
        W, H = im.size
        box = (round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H))
        first = im.crop(box)
        before = flat_share(first)
        if c.get("trim", True):
            t = trim(first, cut=c.get("trimCut", 0.05))
            box = (box[0] + t[0], box[1] + t[1], box[0] + t[2], box[1] + t[3])
        if min(box[2] - box[0], box[3] - box[1]) < 240:
            problems.append(f"{c['id']}：裁切后短边不足 240 px")
        piece = im.crop(box)
        after = flat_share(piece)
        if after > 0.45:
            problems.append(f"{c['id']}：平整背景占 {after:.0%}，裁切框需要收紧")
        cut, size = save(piece, c["id"])
        result[c["id"]] = {**c, "px": list(box), "flat": [round(before, 3), round(after, 3)],
                           "w": cut.width, "h": cut.height, "bytes": size, "palette": palette(cut)}

    faces = pano_faces({(b["scene"], b["face"]) for b in BASE})
    for b in BASE:
        im = faces[(b["scene"], b["face"])]
        x, y, s = b["box"]
        cut, size = save(im.crop((x, y, x + s, y + s)), b["id"])
        result[b["id"]] = {**b, "w": cut.width, "h": cut.height, "bytes": size, "palette": palette(cut, 3)}

    (OUT / "crops.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf8")
    total = sum(v["bytes"] for v in result.values())
    print(f"裁切 {len(result)} 块，合计 {total / 1024:.0f} KB")
    fl = [v["flat"] for v in result.values() if "flat" in v]
    if fl:
        b, a = np.mean([f[0] for f in fl]), np.mean([f[1] for f in fl])
        print(f"平整背景占比均值：收边前 {b:.1%}，收边后 {a:.1%}")
    for p in problems:
        print("问题：", p)

    if "--review" in sys.argv:
        font = ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", 18)
        items = list(result.values())
        S = 280
        for k in range(0, len(items), 20):
            sheet = Image.new("RGB", (5 * S, 4 * (S + 46)), "white")
            d = ImageDraw.Draw(sheet)
            for j, it in enumerate(items[k:k + 20]):
                im = Image.open(OUT / f"{it['id']}.webp")
                im.thumbnail((S - 8, S - 8))
                x, y = (j % 5) * S, (j // 5) * (S + 46)
                sheet.paste(im, (x + (S - im.width) // 2, y + 4))
                d.text((x + 4, y + S), it["id"], fill="black", font=font)
                d.text((x + 4, y + S + 22), it["name"], fill=(90, 90, 90), font=font)
                for n, pc in enumerate(it["palette"][:4]):
                    d.rectangle([x + S - 26 - n * 22, y + S + 4, x + S - 8 - n * 22, y + S + 40], fill=pc["hex"])
            sheet.save(OUT / f"_review-{k // 20 + 1:02d}.jpg", quality=82)


if __name__ == "__main__":
    main()
