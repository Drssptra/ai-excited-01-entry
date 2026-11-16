#!/usr/bin/env python3
"""ai-excited-01: The Dandelion That Learned to Fly.

Draws, with the Python standard library only, a single 1024x1024 PNG:
on a deep night hill, one dandelion lets go -- and its seeds do not
drift, they turn into birds and race in a golden flock toward the moon.

Deterministic: fixed seed, no clock, no network, no input files.
Writes exactly one file: <MAKEFUN_OUTPUT_DIR or /output>/entry.png
"""
import math
import os
import random
import struct
import zlib

W = 1024
H = 1024
RNG = random.Random(20261116)

# ---------------------------------------------------------------- pixels
buf = bytearray(W * H * 3)


def _idx(x, y):
    return (y * W + x) * 3


def put(x, y, r, g, b, a=1.0):
    """Blend one pixel; a in [0, 1]."""
    if x < 0 or y < 0 or x >= W or y >= H:
        return
    i = _idx(x, y)
    if a >= 1.0:
        buf[i] = r
        buf[i + 1] = g
        buf[i + 2] = b
    else:
        buf[i] = int(buf[i] * (1 - a) + r * a)
        buf[i + 1] = int(buf[i + 1] * (1 - a) + g * a)
        buf[i + 2] = int(buf[i + 2] * (1 - a) + b * a)


def disc(cx, cy, rad, r, g, b, a=1.0):
    rad = int(rad)
    if rad <= 0:
        return
    x0 = max(0, int(cx) - rad)
    x1 = min(W - 1, int(cx) + rad)
    y0 = max(0, int(cy) - rad)
    y1 = min(H - 1, int(cy) + rad)
    rr = rad * rad
    for y in range(y0, y1 + 1):
        dy = y - cy
        dx = int(math.sqrt(max(0, rr - dy * dy)))
        xa = max(x0, int(cx) - dx)
        xb = min(x1, int(cx) + dx)
        for x in range(xa, xb + 1):
            put(x, y, r, g, b, a)


def soft_disc(cx, cy, rad, r, g, b, peak=0.55):
    """Glow disc fading to transparent at the edge."""
    steps = 48
    for k in range(steps, 0, -1):
        t = k / steps
        disc(cx, cy, rad * t, r, g, b, peak * (1 - t) * 0.22)


def line(x0, y0, x1, y1, width, r, g, b, a=1.0):
    n = int(max(abs(x1 - x0), abs(y1 - y0), 1)) + 1
    rad = max(1.0, width / 2.0)
    for i in range(n + 1):
        t = i / n
        disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad, r, g, b, a)


def bezier(p0, p1, p2, width, r, g, b, a=1.0, steps=90):
    prev = p0
    for i in range(1, steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        line(prev[0], prev[1], x, y, width, r, g, b, a)
        prev = (x, y)


def polygon(points, r, g, b, a=1.0):
    """Scanline fill of a simple polygon."""
    ys = [p[1] for p in points]
    y0 = max(0, int(min(ys)))
    y1 = min(H - 1, int(max(ys)) + 1)
    n = len(points)
    for y in range(y0, y1 + 1):
        xs = []
        for i in range(n):
            x1, y1p = points[i]
            x2, y2p = points[(i + 1) % n]
            if (y1p <= y < y2p) or (y2p <= y < y1p):
                xs.append(x1 + (y - y1p) * (x2 - x1) / (y2p - y1p))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            xa = max(0, int(xs[k]))
            xb = min(W - 1, int(xs[k + 1]))
            for x in range(xa, xb + 1):
                put(x, y, r, g, b, a)


def bird(cx, cy, s, tilt, r, g, b, a=1.0):
    """A bird as two swept stroke-wings meeting at the body (a gull chevron)."""
    c = math.cos(tilt)
    sn = math.sin(tilt)

    def rot(px, py):
        return (cx + px * c - py * sn, cy + px * sn + py * c)

    w = max(2.0, s * 0.16)
    # each wing: a gentle arc from the body out and up
    for sgn in (-1, 1):
        p0 = rot(0, 0)
        p1 = rot(sgn * s * 0.55, -s * 0.55)
        p2 = rot(sgn * s, -s * 0.28)
        bezier(p0, p1, p2, w, r, g, b, a, steps=14)
    disc(cx, cy, max(2.0, s * 0.10), r, g, b, a)


def lerp(a, b, t):
    return a + (b - a) * t


# ---------------------------------------------------------------- sky
# Vertical night gradient: indigo -> deep teal -> dark ground haze.
stops = [(0.00, (9, 13, 46)), (0.45, (13, 42, 66)),
         (0.75, (12, 62, 76)), (1.00, (7, 26, 40))]
for y in range(H):
    t = y / (H - 1)
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            f = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            r = int(lerp(c0[0], c1[0], f))
            g = int(lerp(c0[1], c1[1], f))
            b = int(lerp(c0[2], c1[2], f))
            break
    row = bytes((r, g, b)) * W
    buf[y * W * 3:(y + 1) * W * 3] = row

# Stars: many small, a few bright with a cross sparkle.
for _ in range(260):
    x = RNG.uniform(0, W)
    y = RNG.uniform(0, 620)
    br = RNG.uniform(0.35, 1.0)
    v = int(200 * br + 55)
    s = RNG.choice([1, 1, 1, 2])
    disc(x, y, s, v, v, int(v * 0.92), 0.55 + 0.45 * br)

# ---------------------------------------------------------------- moon
MX, MY, MR = 800, 185, 108
soft_disc(MX, MY, MR * 2.1, 255, 214, 130, peak=0.5)
soft_disc(MX, MY, MR * 1.45, 255, 226, 160, peak=0.6)
disc(MX, MY, MR, 252, 240, 205)
disc(MX - 28, MY - 22, 20, 232, 216, 178)
disc(MX + 34, MY + 18, 14, 236, 221, 184)
disc(MX + 8, MY + 48, 10, 238, 224, 188)
disc(MX - 52, MY + 38, 12, 234, 219, 182)

# ---------------------------------------------------------------- hills
polygon([(0, 1024), (0, 905), (180, 862), (380, 898), (560, 852),
         (760, 892), (1024, 848), (1024, 1024)], 10, 34, 52)
polygon([(0, 1024), (0, 962), (260, 928), (520, 962), (780, 930),
         (1024, 958), (1024, 1024)], 7, 24, 38)

# ---------------------------------------------------------------- dandelion
HX, HY = 392, 452          # head centre
STEM_TOP = (HX, HY + 42)
# stem: gentle S-curve down to the ground
bezier(STEM_TOP, (348, 700), (372, 1024), 9, 74, 150, 74, 0.95)
bezier(STEM_TOP, (348, 700), (372, 1024), 4, 140, 205, 110, 0.7)
# two pointed leaves hugging the stem
polygon([(362, 762), (296, 712), (288, 700), (330, 748), (366, 786)],
         52, 128, 62)
polygon([(360, 852), (428, 806), (440, 800), (398, 842), (364, 876)],
         46, 118, 58)

# golden light trail from the head toward the moon (under the flock)
bezier((HX + 40, HY - 30), (540, 310), (690, 255), 10, 255, 196, 110, 0.28)
bezier((HX + 40, HY - 30), (540, 310), (690, 255), 4, 255, 226, 150, 0.5)

# head core
soft_disc(HX, HY, 95, 255, 190, 90, peak=0.5)
disc(HX, HY, 52, 214, 158, 62)
disc(HX, HY, 38, 238, 186, 84)
disc(HX - 10, HY - 12, 14, 255, 214, 120)

# fluffy head: ~300 fine filaments radiating, densest up and right
for _ in range(300):
    ang = RNG.uniform(-math.pi, math.pi)
    # bias the spread toward the sky and the moon
    if RNG.random() < 0.55:
        ang = RNG.uniform(-2.6, 0.6)
    length = RNG.uniform(70, 150)
    ex = HX + math.cos(ang) * length
    ey = HY + math.sin(ang) * length * 0.92
    sx = HX + math.cos(ang) * 40
    sy = HY + math.sin(ang) * 36
    warm = RNG.random() < 0.5
    col = (255, 226, 150) if warm else (245, 244, 232)
    line(sx, sy, ex, ey, 1.6, col[0], col[1], col[2], 0.85)
    # fluffy tuft at the tip
    disc(ex, ey, RNG.uniform(3.5, 6.5), col[0], col[1], col[2], 0.9)
    disc(ex + RNG.uniform(-4, 4), ey + RNG.uniform(-4, 4), 2.5,
         255, 255, 250, 0.7)

# ---------------------------------------------------------------- the flock
# Seeds detach from the head and, along one diagonal, become birds.
# Path: head -> (560, 330) -> hero bird -> moon.
def flock_point(t):
    """Quadratic bezier head -> moon, t in [0, 1]."""
    x = (1 - t) ** 2 * (HX + 30) + 2 * (1 - t) * t * 540 + t * t * 700
    y = (1 - t) ** 2 * (HY - 40) + 2 * (1 - t) * t * 330 + t * t * 255
    return x, y


for i in range(64):
    t = (i / 63.0) ** 1.15
    bx, by = flock_point(t)
    # scatter around the path, widening mid-flight
    spread = 26 + 70 * math.sin(math.pi * min(t * 1.15, 1.0))
    bx += RNG.uniform(-spread, spread)
    by += RNG.uniform(-spread * 0.7, spread * 0.7)
    gold = RNG.random() < 0.6
    col = (255, 205, 110) if gold else (250, 248, 238)
    if t < 0.22:
        # still a seed: dot with a wispy tail back toward the head
        disc(bx, by, RNG.uniform(3, 5), col[0], col[1], col[2], 0.95)
        line(bx, by, bx - 14, by + 8, 1.5, col[0], col[1], col[2], 0.6)
    elif t < 0.5:
        # half seed, half bird: dot sprouting wings
        disc(bx, by, 3.5, col[0], col[1], col[2], 0.95)
        bird(bx, by, RNG.uniform(9, 15), -0.5, col[0], col[1], col[2], 0.9)
    else:
        # full bird, growing as it nears the moon
        s = 14 + 34 * (t - 0.5) * 2
        bird(bx, by, s, -0.55 + RNG.uniform(-0.15, 0.15),
             col[0], col[1], col[2], 0.95)

# speed streaks parallel to the flight
for _ in range(14):
    t = RNG.uniform(0.15, 0.95)
    bx, by = flock_point(t)
    bx += RNG.uniform(-90, 90)
    by += RNG.uniform(-70, 70)
    ln = RNG.uniform(28, 70)
    line(bx, by, bx + ln, by - ln * 0.45, 2, 255, 210, 130, 0.35)

# hero bird, largest, below-left of the moon, wings wide
bird(628, 292, 62, -0.5, 255, 222, 140, 1.0)
bird(628, 292, 62, -0.5, 255, 244, 200, 0.35)
disc(628, 292, 7, 255, 232, 160)
# its wake: three small trailing birds
bird(556, 330, 30, -0.5, 255, 214, 130, 0.95)
bird(502, 360, 21, -0.5, 250, 240, 220, 0.9)
bird(462, 386, 15, -0.5, 250, 240, 220, 0.85)

# ---------------------------------------------------------------- vignette
for cx, cy, rad in [(0, 0, 260), (1024, 0, 260), (0, 1024, 300),
                    (1024, 1024, 300)]:
    soft_disc(cx, cy, rad, 4, 8, 22, peak=0.5)

# ---------------------------------------------------------------- PNG out
def png_bytes():
    raw = bytearray()
    stride = W * 3
    for y in range(H):
        raw.append(0)  # filter: none
        raw += buf[y * stride:(y + 1) * stride]
    comp = zlib.compress(bytes(raw), 6)

    def chunk(kind, data):
        c = struct.pack(">I", len(data)) + kind + data
        return c + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", comp) + chunk(b"IEND", b""))


def main():
    out_dir = os.environ.get("MAKEFUN_OUTPUT_DIR", "/output")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "entry.png")
    data = png_bytes()
    with open(path, "wb") as f:
        f.write(data)
    print(f"wrote {path} {len(data)} bytes {W}x{H}")


if __name__ == "__main__":
    main()
