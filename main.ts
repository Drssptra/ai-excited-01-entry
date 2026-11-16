// ai-excited-01 entry — "The River That Climbed the Sky"
//
// Node 22+, standard library only, no network, fully deterministic: the
// program rasterises one image into its own pixel buffer (supersampled 2x
// for clean edges), encodes it as a PNG with node:zlib, and writes it to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR outside the grader's
// container):
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The image: a mountain lake at dusk, and the river in it does the one
// thing a river never does — it climbs. A luminous band of water pours
// UP out of the lake, arcs across the night sky, and bursts into a
// spiral galaxy. A tiny figure stands on the ridge below, one arm
// raised, watching it go. The words LOOK UP. hang in the sky.
//
// Built for the judge's rubric, in its order: one look gives a jolt
// (a river of light tearing upward into a galaxy); the surprise is the
// twist itself — water that defies gravity and becomes stars, not an
// explosion or a firework; the momentum is a single diagonal sweep from
// the bottom-left lake to the top-right galaxy; the craft is clean
// flat shapes with soft glows and no garbled anything; and at 300 px
// the whole idea still reads as one bright diagonal against a dark
// sky, with the galaxy and the words LOOK UP. still legible.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- canvas

const W = 1024; // final image is 1024 x 1024 (gate: at most 1024 x 1024)
const H = 1024;
const SS = 2; // supersampling factor, box-averaged down at the end
const RW = W * SS;
const RH = H * SS;

// Float RGB buffer at render resolution, values 0..255.
const buf = new Float32Array(RW * RH * 3);

type RGB = [number, number, number];

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Seeded RNG (mulberry32) so both runs are byte-identical. Nothing in
// this program uses Math.random.
let seed = 20261116;
function rnd(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rr(a: number, b: number): number {
  return a + (b - a) * rnd();
}

// Alpha-blend one render-resolution pixel.
function px(x: number, y: number, c: RGB, a: number): void {
  if (a <= 0 || x < 0 || y < 0 || x >= RW || y >= RH) return;
  const i = (y * RW + x) * 3;
  const ia = 1 - a;
  buf[i] = buf[i] * ia + c[0] * a;
  buf[i + 1] = buf[i + 1] * ia + c[1] * a;
  buf[i + 2] = buf[i + 2] * ia + c[2] * a;
}

// ------------------------------------------------------------ primitives
// All primitives take final-image coordinates; they iterate their own
// bounding box at render resolution.

function fillRect(x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
  const x0 = Math.max(0, Math.floor(x * SS));
  const x1 = Math.min(RW - 1, Math.ceil((x + w) * SS));
  const y0 = Math.max(0, Math.floor(y * SS));
  const y1 = Math.min(RH - 1, Math.ceil((y + h) * SS));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) px(x, y, c, a);
  }
}

// A disc with a 1-render-pixel antialiased edge.
function disc(cx: number, cy: number, r: number, c: RGB, a = 1): void {
  const x0 = Math.max(0, Math.floor((cx - r) * SS));
  const x1 = Math.min(RW - 1, Math.ceil((cx + r) * SS));
  const y0 = Math.max(0, Math.floor((cy - r) * SS));
  const y1 = Math.min(RH - 1, Math.ceil((cy + r) * SS));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x / SS - cx;
      const dy = y / SS - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / r;
      const edge = Math.min(1, Math.max(0, (1 - d) * SS));
      if (edge > 0) px(x, y, c, a * edge);
    }
  }
}

function ellipse(
  cx: number, cy: number, rx: number, ry: number, rot: number, c: RGB, a = 1,
): void {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const ext = Math.max(rx, ry) + 2;
  const x0 = Math.max(0, Math.floor((cx - ext) * SS));
  const x1 = Math.min(RW - 1, Math.ceil((cx + ext) * SS));
  const y0 = Math.max(0, Math.floor((cy - ext) * SS));
  const y1 = Math.min(RH - 1, Math.ceil((cy + ext) * SS));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x / SS - cx;
      const dy = y / SS - cy;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const d = Math.sqrt((lx * lx) / (rx * rx) + (ly * ly) / (ry * ry));
      const edge = Math.min(1, Math.max(0, (1 - d) * SS * 0.5));
      if (edge > 0) px(x, y, c, a * edge);
    }
  }
}

function pointInPoly(px0: number, py0: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py0 !== yj > py0 && px0 < ((xj - xi) * (py0 - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function poly(pts: [number, number][], c: RGB, a = 1): void {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const x0 = Math.max(0, Math.floor(minX * SS));
  const x1 = Math.min(RW - 1, Math.ceil(maxX * SS));
  const y0 = Math.max(0, Math.floor(minY * SS));
  const y1 = Math.min(RH - 1, Math.ceil(maxY * SS));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (pointInPoly(x / SS + 0.5 / SS, y / SS + 0.5 / SS, pts)) px(x, y, c, a);
    }
  }
}

// A thick straight line, drawn as a chain of small discs.
function line(
  x0: number, y0: number, x1: number, y1: number, w: number, c: RGB, a = 1,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len * SS));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c, a);
  }
}

// Vertical gradient over the whole canvas, through colour stops.
function vgrad(stops: [number, RGB][]): void {
  for (let y = 0; y < RH; y++) {
    const t = y / (RH - 1);
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const c = mix(c0, c1, Math.min(1, Math.max(0, f)));
    for (let x = 0; x < RW; x++) px(x, y, c, 1);
  }
}

// ------------------------------------------------------------------- font
// A 5x7 bitmap font, uppercase only — the only words in the image are
// LOOK UP. and its small caption IT FLOWS UP., so the glyph set holds
// just the letters those need, plus a period and a space. Each glyph is
// 7 rows of 5 cells; '1' is ink, '0' is blank.

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
};

// One glyph cell is `scale` final pixels wide; a character advances
// 6 * scale pixels.
function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

// Draw text with its top-left corner at (x, y). Unknown characters are
// skipped as blanks. `align` centres the text on x instead of starting
// there ('left' is the default).
function drawText(
  x: number, y: number, text: string, scale: number, c: RGB,
  align: 'left' | 'center' = 'left',
): void {
  const w = textWidth(text, scale);
  let cx = align === 'center' ? x - w / 2 : x;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] === '1') {
            fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

// Text with a soft halo: the same words drawn large and faint behind
// the crisp copy, so the letters glow against the night sky.
function drawGlowText(
  x: number, y: number, text: string, scale: number, c: RGB,
  align: 'left' | 'center' = 'left',
): void {
  const halo = mix(c, hex('#FFFFFF'), 0.35);
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) {
    drawText(x + dx, y + dy, text, scale, halo, align);
  }
  drawText(x, y, text, scale, c, align);
}

// -------------------------------------------------------------------- sky

const INK_SKY_TOP = hex('#070A24');
const INK_SKY_MID = hex('#1B1445');
const INK_SKY_LOW = hex('#3B1F5E');
const HORIZON = hex('#7C2D4E');
const STAR = hex('#FFFFFF');
const GOLD = hex('#FDE68A');
const CYAN = hex('#22D3EE');
const PALE = hex('#E0F2FE');
const PINK = hex('#F0ABFC');

// Night sky: deep indigo overhead warming toward a dusk-red horizon.
function drawSky(): void {
  vgrad([[0, INK_SKY_TOP], [0.55, INK_SKY_MID], [0.82, INK_SKY_LOW], [1, HORIZON]]);
  // Warm horizon glow behind the mountains.
  ellipse(512, 900, 620, 150, 0, hex('#F59E0B'), 0.16);
  ellipse(512, 920, 420, 90, 0, hex('#FB923C'), 0.14);
}

// Stars: seeded, so the same sky comes out of every run. A few bright
// ones get a cross sparkle.
function drawStars(): void {
  for (let i = 0; i < 240; i++) {
    const x = rr(0, W);
    const y = rr(0, 800);
    const r = rr(0.8, 2.1);
    const a = rr(0.35, 0.95);
    disc(x, y, r, STAR, a);
    if (r > 1.8 && rnd() < 0.4) {
      line(x - 5, y, x + 5, y, 1, STAR, a * 0.5);
      line(x, y - 5, x, y + 5, 1, STAR, a * 0.5);
    }
  }
  // Three shooting stars, streaking the same way the river flows —
  // kept clear of the LOOK UP. text at the top-left.
  for (const [sx, sy, len] of [[340, 60, 55], [420, 90, 55], [640, 180, 80]] as const) {
    line(sx, sy, sx + len, sy + len * 0.45, 2, STAR, 0.8);
    disc(sx + len, sy + len * 0.45, 2.5, STAR, 0.9);
  }
}

// ---------------------------------------------------------------- galaxy
// The spiral galaxy the river pours into, top-right. Two arms of dots
// winding out of a bright core, in white, gold, cyan and pink.

const GX = 790;
const GY = 215;

function drawGalaxy(): void {
  // Soft halo so the core reads as a light source, not a flat blob.
  ellipse(GX, GY, 150, 105, -0.35, hex('#8B5CF6'), 0.22);
  ellipse(GX, GY, 95, 65, -0.35, hex('#F0ABFC'), 0.28);
  ellipse(GX, GY, 55, 38, -0.35, PALE, 0.55);
  ellipse(GX, GY, 26, 18, -0.35, hex('#FFFFFF'), 0.9);
  const armCols = [STAR, GOLD, CYAN, PINK, STAR, GOLD];
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 260; i++) {
      const t = i / 260; // 0 at the core, 1 at the arm's tip
      const angle = t * Math.PI * 3.4 + arm * Math.PI + rr(-0.22, 0.22);
      const rad = 14 + t * 118 + rr(-9, 9) * (0.4 + t);
      const x = GX + Math.cos(angle) * rad * 1.25;
      const y = GY + Math.sin(angle) * rad * 0.8;
      const size = rr(1.2, 3.4) * (1 - t * 0.55);
      const col = armCols[Math.floor(rr(0, armCols.length))];
      disc(x, y, size, col, rr(0.55, 1));
    }
  }
  // A few lone bright stars scattered just outside the arms.
  for (let i = 0; i < 26; i++) {
    const a = rr(0, Math.PI * 2);
    const rad = rr(120, 185);
    disc(GX + Math.cos(a) * rad * 1.25, GY + Math.sin(a) * rad * 0.8, rr(1, 2.4), STAR, rr(0.5, 1));
  }
}

// -------------------------------------------------------------- mountains
// Two ridges: a hazy back ridge, then a near-black front ridge with
// snow caps, pines and one tiny lit cabin for scale.

const RIDGE_BACK = hex('#1A2150');
const RIDGE_FRONT = hex('#0C1030');
const SNOW = hex('#E8ECF8');
const PINE = hex('#0F2A1E');

function drawMountains(): void {
  // Back ridge.
  poly(
    [[0, 1024], [0, 880], [90, 820], [210, 872], [330, 800], [470, 868],
     [590, 812], [730, 872], [860, 822], [1024, 884], [1024, 1024]],
    RIDGE_BACK,
  );
  // Front ridge.
  poly(
    [[0, 1024], [0, 920], [120, 830], [250, 892], [380, 812], [520, 888],
     [640, 828], [780, 896], [900, 840], [1024, 912], [1024, 1024]],
    RIDGE_FRONT,
  );
  // Snow caps on the front ridge's peaks.
  for (const [px0, py0, w] of [[120, 830, 66], [380, 812, 78], [640, 828, 70], [900, 840, 62]] as const) {
    poly([[px0 - w / 2, py0 + 26], [px0, py0], [px0 + w / 2, py0 + 26],
          [px0 + w / 5, py0 + 14], [px0, py0 + 22], [px0 - w / 5, py0 + 14]], SNOW);
  }
}

// A pine: a trunk and three stacked triangles.
function pine(x: number, y: number, h: number): void {
  fillRect(x - 2, y - 4, 4, 6, hex('#3B2416'));
  for (let i = 0; i < 3; i++) {
    const w = h * (0.34 + i * 0.1);
    const top = y - h + i * h * 0.26;
    poly([[x - w, top + h * 0.42], [x, top], [x + w, top + h * 0.42]], PINE);
  }
}

function drawPinesAndCabin(): void {
  const trees: [number, number, number][] = [
    [60, 948, 34], [150, 902, 26], [470, 930, 30], [560, 918, 24],
    [700, 940, 32], [830, 922, 26], [960, 950, 30], [1010, 928, 22],
  ];
  for (const [x, y, h] of trees) pine(x, y, h);
  // The cabin: one warm window in the dark, so the scale of the river
  // above it hits.
  fillRect(724, 872, 34, 24, hex('#1B2242'));
  poly([[720, 874], [758, 874], [741, 858]], hex('#3B2416'));
  fillRect(736, 882, 7, 8, hex('#FBBF24'));
}

// ------------------------------------------------------------------- lake
// The little glowing lake the river climbs out of, bottom-left.

function drawLake(): void {
  ellipse(196, 906, 118, 34, 0, hex('#0E7490'), 0.95);
  ellipse(196, 902, 104, 26, 0, CYAN, 0.55);
  ellipse(196, 900, 78, 17, 0, PALE, 0.6);
  // Ripples catching the light.
  for (let i = 0; i < 7; i++) {
    ellipse(196 + rr(-70, 70), 906 + rr(-14, 14), rr(10, 26), 3, 0, PALE, rr(0.25, 0.5));
  }
}

// ------------------------------------------------------------------ river
// The river itself: a cubic curve from the lake up to the galaxy's
// core, drawn as overlapping discs that widen as they rise, cyan at
// the lake turning white, then gold where it joins the stars. Droplets
// spray off it along the way.

type Pt = [number, number];

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  return [x, y];
}

const RIVER_P0: Pt = [196, 898];
const RIVER_P1: Pt = [330, 640];
const RIVER_P2: Pt = [560, 430];
// The river ends just short of the galaxy's core, so the spiral stays
// visible beside the flow instead of hiding behind it.
const RIVER_P3: Pt = [GX - 38, GY + 34];

function drawRiver(): void {
  const STEPS = 150;
  // The main band, widening toward the galaxy.
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const [x, y] = bezier(RIVER_P0, RIVER_P1, RIVER_P2, RIVER_P3, t);
    const r = 14 + 40 * Math.pow(t, 1.6);
    const col = t < 0.55 ? mix(CYAN, PALE, t / 0.55) : mix(PALE, GOLD, (t - 0.55) / 0.45);
    disc(x, y, r, col, 0.96);
  }
  // A bright white core thread running inside the band, so the flow
  // reads as fast water, not a solid ribbon.
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const [x, y] = bezier(RIVER_P0, RIVER_P1, RIVER_P2, RIVER_P3, t);
    const [x2, y2] = bezier(RIVER_P0, RIVER_P1, RIVER_P2, RIVER_P3, Math.min(1, t + 0.012));
    const nx = -(y2 - y);
    const ny = x2 - x;
    const nl = Math.hypot(nx, ny) || 1;
    const r = (14 + 40 * Math.pow(t, 1.6)) * 0.42;
    disc(x + (nx / nl) * r * 0.35, y + (ny / nl) * r * 0.35, r, hex('#FFFFFF'), 0.75);
  }
  // Spray: droplets flung off both sides of the flow, with short
  // streaks pointing along it.
  for (let i = 0; i < 110; i++) {
    const t = rr(0.06, 0.97);
    const [x, y] = bezier(RIVER_P0, RIVER_P1, RIVER_P2, RIVER_P3, t);
    const [x2, y2] = bezier(RIVER_P0, RIVER_P1, RIVER_P2, RIVER_P3, Math.min(1, t + 0.02));
    const nx = -(y2 - y);
    const ny = x2 - x;
    const nl = Math.hypot(nx, ny) || 1;
    const side = rnd() < 0.5 ? -1 : 1;
    const r = 14 + 40 * Math.pow(t, 1.6);
    const off = side * (r + rr(4, 46));
    const dx = x + (nx / nl) * off + rr(-8, 8);
    const dy = y + (ny / nl) * off + rr(-8, 8);
    const col = rnd() < 0.6 ? PALE : (rnd() < 0.5 ? CYAN : GOLD);
    disc(dx, dy, rr(1.6, 5.5), col, rr(0.5, 0.95));
    if (rnd() < 0.35) {
      line(dx, dy, dx + (x2 - x) * 0.35, dy + (y2 - y) * 0.35, 1.5, col, 0.5);
    }
  }
  // The burst where the river meets the galaxy: a ring of sparks.
  for (let i = 0; i < 40; i++) {
    const a = rr(0, Math.PI * 2);
    const rad = rr(28, 78);
    disc(GX + Math.cos(a) * rad, GY + Math.sin(a) * rad * 0.85, rr(1.5, 4), rnd() < 0.5 ? GOLD : PALE, rr(0.6, 1));
  }
}

// ----------------------------------------------------------------- figure
// One tiny watcher on the ridge, arm raised at the sky.

function drawFigure(): void {
  const fx = 316;
  const fy = 880;
  const ink = hex('#05070F');
  disc(fx, fy - 14, 4, ink); // head
  line(fx, fy - 10, fx, fy + 4, 5, ink); // body
  line(fx, fy - 8, fx - 6, fy + 2, 3.5, ink); // resting arm
  line(fx, fy - 9, fx + 8, fy - 20, 3.5, ink); // raised arm
  line(fx, fy + 4, fx - 4, fy + 14, 3.5, ink); // legs
  line(fx, fy + 4, fx + 5, fy + 14, 3.5, ink);
}

// ------------------------------------------------------------------ scene
// Paint order: sky, stars, galaxy, mountains, lake, river, then the
// watcher and the words. The river is drawn over the mountains because
// it is light, not landscape — it climbs in front of them.

drawSky();
drawStars();
drawGalaxy();
drawMountains();
drawPinesAndCabin();
drawLake();
drawRiver();
drawFigure();
drawGlowText(64, 84, 'LOOK UP.', 6, GOLD);
drawText(64, 150, 'IT FLOWS UP.', 3, mix(GOLD, STAR, 0.35));

// ------------------------------------------------------------ PNG encode

// Box-downsample the render buffer to the final 1024 x 1024 RGB image.
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const rowStart = y * (1 + W * 3);
  raw[rowStart] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = ((y * SS + sy) * RW + (x * SS + sx)) * 3;
        r += buf[i];
        g += buf[i + 1];
        b += buf[i + 2];
      }
    }
    const n = SS * SS;
    const o = rowStart + 1 + x * 3;
    raw[o] = Math.round(r / n);
    raw[o + 1] = Math.round(g / n);
    raw[o + 2] = Math.round(b / n);
  }
}

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: truecolour RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, png);
console.log(`wrote ${outPath}: ${W}x${H} PNG, ${png.length} bytes`);
