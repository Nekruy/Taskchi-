/**
 * gen-favicon.js
 * Generates app/favicon.ico (16×16 + 32×32 multi-size ICO)
 * and public/apple-touch-icon.png (180×180)
 * using only Node.js built-in modules.
 *
 * Green #14A800  →  R:0x14  G:0xA8  B:0x00
 * Rounded-rect badge with a tiny isometric prism rendered pixel-by-pixel.
 *
 * Run: node scripts/gen-favicon.js
 */

"use strict";
const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

/* ── CRC32 (needed for PNG chunks) ──────────────────────────────── */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ── PNG builder ─────────────────────────────────────────────────── */
function makePNGChunk(type, data) {
  const tb  = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([tb, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, tb, data, crcBuf]);
}

/**
 * Build an RGBA PNG buffer from a flat Uint8Array of [r,g,b,a, r,g,b,a, ...]
 * (top-left origin, row-major)
 */
function buildPNG(width, height, rgbaPixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width,  0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 6; // color type: RGBA
  // compression=0, filter=0, interlace=0 already 0
  const ihdr = makePNGChunk("IHDR", ihdrData);

  // IDAT — filter byte 0 (None) before each row
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = rowStart + 1 + x * 4;
      raw[dst]     = rgbaPixels[src];     // R
      raw[dst + 1] = rgbaPixels[src + 1]; // G
      raw[dst + 2] = rgbaPixels[src + 2]; // B
      raw[dst + 3] = rgbaPixels[src + 3]; // A
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idat = makePNGChunk("IDAT", compressed);

  const iend = makePNGChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

/* ── ICO builder ─────────────────────────────────────────────────── */
/**
 * Build an ICO buffer containing one or more BGRA images.
 * images: [{ width, height, rgbaPixels }]
 */
function buildICO(images) {
  const entries = [];
  for (const { width, height, rgbaPixels } of images) {
    // BITMAPINFOHEADER (40 bytes)
    const bih = Buffer.alloc(40);
    bih.writeUInt32LE(40,         0);  // biSize
    bih.writeInt32LE(width,       4);  // biWidth
    bih.writeInt32LE(height * 2,  8);  // biHeight (2x for ICO: XOR + AND masks)
    bih.writeUInt16LE(1,         12);  // biPlanes
    bih.writeUInt16LE(32,        14);  // biBitCount (BGRA)
    // biCompression, biSizeImage, etc. → 0

    // Pixel data: BGRA bottom-to-top
    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y); // flip vertically
      for (let x = 0; x < width; x++) {
        const src = (srcRow * width + x) * 4;
        const dst = (y * width + x) * 4;
        pixels[dst]     = rgbaPixels[src + 2]; // B
        pixels[dst + 1] = rgbaPixels[src + 1]; // G
        pixels[dst + 2] = rgbaPixels[src];     // R
        pixels[dst + 3] = rgbaPixels[src + 3]; // A
      }
    }

    // AND mask: all zeros (fully opaque), rows padded to 4 bytes
    const andRowBytes = Math.ceil(width / 32) * 4;
    const andMask = Buffer.alloc(height * andRowBytes, 0);

    entries.push({ width, height, data: Buffer.concat([bih, pixels, andMask]) });
  }

  // ICO header
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0,              0); // Reserved
  icoHeader.writeUInt16LE(1,              2); // Type: ICO
  icoHeader.writeUInt16LE(entries.length, 4); // Count

  const dirSize = entries.length * 16;
  let offset = 6 + dirSize;

  const dirEntries = entries.map(({ width, height, data }) => {
    const de = Buffer.alloc(16);
    de[0] = width  > 255 ? 0 : width;
    de[1] = height > 255 ? 0 : height;
    de[2] = 0;  // bColorCount (0 = ≥256 colors)
    de[3] = 0;  // Reserved
    de.writeUInt16LE(1,           4); // wPlanes
    de.writeUInt16LE(32,          6); // wBitCount
    de.writeUInt32LE(data.length, 8); // dwBytesInRes
    de.writeUInt32LE(offset,     12); // dwImageOffset
    offset += data.length;
    return de;
  });

  return Buffer.concat([icoHeader, ...dirEntries, ...entries.map(e => e.data)]);
}

/* ── Pixel renderer ─────────────────────────────────────────────── */

/** Fill with solid color, applying rounded corners via alpha. */
function fillRounded(pixels, w, h, r, g, b, cornerRadius) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const alpha = insideRounded(x, y, w, h, cornerRadius) ? 255 : 0;
      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = alpha;
    }
  }
}

function insideRounded(x, y, w, h, r) {
  const cx = x < r ? r : x > w - 1 - r ? w - 1 - r : x;
  const cy = y < r ? r : y > h - 1 - r ? h - 1 - r : y;
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
}

/** Draw a filled (anti-aliased) circle onto RGBA pixel array. */
function drawCircle(pixels, w, cx, cy, radius, r, g, b, alpha = 255) {
  const r2 = radius * radius;
  const x0 = Math.floor(cx - radius - 1);
  const x1 = Math.ceil(cx  + radius + 1);
  const y0 = Math.floor(cy - radius - 1);
  const y1 = Math.ceil(cy  + radius + 1);
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dist2 = (px - cx) ** 2 + (py - cy) ** 2;
      const coverage = Math.max(0, Math.min(1, (radius + 0.5 - Math.sqrt(dist2))));
      if (coverage <= 0) continue;
      blendPixel(pixels, w, px, py, r, g, b, Math.round(alpha * coverage));
    }
  }
}

/** Draw an anti-aliased line. */
function drawLine(pixels, w, h, x0, y0, x1, y1, r, g, b, alpha, thickness = 1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    // Splat a small disc at each point for thickness
    for (let dy2 = -thickness; dy2 <= thickness; dy2++) {
      for (let dx2 = -thickness; dx2 <= thickness; dx2++) {
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist > thickness) continue;
        const cov = Math.max(0, thickness - dist) / thickness;
        blendPixel(pixels, w, Math.round(px + dx2), Math.round(py + dy2),
                   r, g, b, Math.round(alpha * cov));
      }
    }
  }
}

/** Alpha-blend pixel at (x,y). */
function blendPixel(pixels, w, x, y, r, g, b, alpha) {
  if (x < 0 || y < 0 || x >= w) return;
  const h = pixels.length / (w * 4);
  if (y < 0 || y >= h) return;
  const i = (y * w + x) * 4;
  if (pixels[i + 3] === 0) {
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = alpha;
  } else {
    const a1 = alpha / 255, a0 = pixels[i+3] / 255;
    const aOut = a1 + a0 * (1 - a1);
    pixels[i]   = (r * a1 + pixels[i]   * a0 * (1 - a1)) / aOut;
    pixels[i+1] = (g * a1 + pixels[i+1] * a0 * (1 - a1)) / aOut;
    pixels[i+2] = (b * a1 + pixels[i+2] * a0 * (1 - a1)) / aOut;
    pixels[i+3] = aOut * 255;
  }
}

/** Fill a polygon defined by points [[x,y], ...]. */
function fillPolygon(pixels, w, h, points, r, g, b, alpha = 255) {
  // Simple scanline fill
  const ys = points.map(p => p[1]);
  const yMin = Math.floor(Math.min(...ys));
  const yMax = Math.ceil(Math.max(...ys));
  for (let y = yMin; y <= yMax; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length; k += 2) {
      const xStart = Math.floor(xs[k]);
      const xEnd   = Math.ceil(xs[k + 1]);
      for (let x = xStart; x <= xEnd; x++) {
        blendPixel(pixels, w, x, y, r, g, b, alpha);
      }
    }
  }
}

/* ── Draw the isometric logo icon ─────────────────────────────────
   Based on the SVG:
   viewBox 32×32, green #14A800 rounded-rect badge
   Isometric prism: top, left, right faces  (white at 95 / 60 / 80%)
   Centre dot green, corner dots white
   Lines: white at 70 / 60 / 60%
── */
function renderIcon(size) {
  const scale = size / 32;
  const pixels = new Uint8Array(size * size * 4);

  // 1. Green rounded background
  const corner = Math.round(8 * scale);
  fillRounded(pixels, size, size, 0x14, 0xA8, 0x00, corner);

  // Scale helper
  const s = v => v * scale;

  // 2. Top face: M16,4  L24,9  L16,14  L8,9
  fillPolygon(pixels, size, size,
    [[s(16),s(4)], [s(24),s(9)], [s(16),s(14)], [s(8),s(9)]],
    255, 255, 255, Math.round(255 * 0.95));

  // 3. Left face: M8,9  L16,14  L16,20  L8,15
  fillPolygon(pixels, size, size,
    [[s(8),s(9)], [s(16),s(14)], [s(16),s(20)], [s(8),s(15)]],
    255, 255, 255, Math.round(255 * 0.60));

  // 4. Right face: M24,9  L16,14  L16,20  L24,15
  fillPolygon(pixels, size, size,
    [[s(24),s(9)], [s(16),s(14)], [s(16),s(20)], [s(24),s(15)]],
    255, 255, 255, Math.round(255 * 0.80));

  // 5. Centre dot — green (erases white)
  drawCircle(pixels, size, s(16), s(14), s(2.5), 0x14, 0xA8, 0x00);

  // 6. Corner dots — white
  drawCircle(pixels, size, s(16), s(4),  s(1.8), 255, 255, 255);
  drawCircle(pixels, size, s(8),  s(9),  s(1.5), 255, 255, 255, Math.round(255 * 0.90));
  drawCircle(pixels, size, s(24), s(9),  s(1.5), 255, 255, 255, Math.round(255 * 0.90));

  // 7. Lines
  const lw = Math.max(0.8, scale * 0.8);
  drawLine(pixels, size, size, s(16),s(14), s(16),s(4),  255,255,255, Math.round(255*0.70), lw);
  drawLine(pixels, size, size, s(16),s(14), s(8), s(9),  255,255,255, Math.round(255*0.60), lw);
  drawLine(pixels, size, size, s(16),s(14), s(24),s(9),  255,255,255, Math.round(255*0.60), lw);

  return pixels;
}

/* ── Main ───────────────────────────────────────────────────────── */
const root = path.join(__dirname, "..");

// 1. favicon.ico (16×16 + 32×32 multi-size)
const ico16 = renderIcon(16);
const ico32 = renderIcon(32);
const icoBuffer = buildICO([
  { width: 16, height: 16, rgbaPixels: ico16 },
  { width: 32, height: 32, rgbaPixels: ico32 },
]);
const icoPath = path.join(root, "app", "favicon.ico");
fs.writeFileSync(icoPath, icoBuffer);
console.log(`✓  app/favicon.ico  (${icoBuffer.length} bytes, 16×16 + 32×32)`);

// 2. apple-touch-icon.png (180×180)
const png180px = renderIcon(180);
const pngBuffer = buildPNG(180, 180, png180px);
const pngPath = path.join(root, "public", "apple-touch-icon.png");
fs.writeFileSync(pngPath, pngBuffer);
console.log(`✓  public/apple-touch-icon.png  (${pngBuffer.length} bytes, 180×180)`);

console.log("Done.");
