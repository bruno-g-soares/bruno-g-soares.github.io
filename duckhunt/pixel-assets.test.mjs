import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

const EXPECTED = {
  'duck-left.png': [136, 33],
  'duck-right.png': [136, 33],
  'duck-shot.png': [31, 29],
  'duck-dead.png': [38, 31],
  'dog-hit.png': [56, 39],
  'dog-laugh.png': [112, 39],
  'scene-desktop.png': [320, 180],
  'foreground-desktop.png': [320, 180],
  'scene-mobile.png': [195, 350],
  'foreground-mobile.png': [195, 350],
  'scene-mobile-compact.png': [195, 325],
  'foreground-mobile-compact.png': [195, 325]
};

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodeRgba(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert.equal(buffer[24], 8, 'assets must use 8-bit channels');
  assert.equal(buffer[25], 6, 'assets must be RGBA');
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString();
    if (type === 'IDAT') chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const packed = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[source++];
    for (let x = 0; x < stride; x += 1) {
      const raw = packed[source++];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const prediction = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : paeth(left, up, upperLeft);
      pixels[y * stride + x] = (raw + prediction) & 255;
    }
  }
  return { width, height, pixels };
}

test('pixel assets use exact dimensions and binary transparency', async () => {
  for (const [name, dimensions] of Object.entries(EXPECTED)) {
    const image = decodeRgba(await readFile(new URL(`./assets/pixel/${name}`, import.meta.url)));
    assert.deepEqual([image.width, image.height], dimensions, name);
    for (let index = 3; index < image.pixels.length; index += 4) {
      assert.ok(image.pixels[index] === 0 || image.pixels[index] === 255, `${name} has a softened alpha edge`);
    }
  }
});

test('small bush preserves the original two-tone foliage palette', async () => {
  const image = decodeRgba(await readFile(new URL('./assets/pixel/scene-desktop.png', import.meta.url)));
  let brightPixels = 0;
  let shadedPixels = 0;
  for (let y = 108; y < 132; y += 1) {
    for (let x = 180; x < 224; x += 1) {
      const index = (y * image.width + x) * 4;
      if (image.pixels[index] === 153 && image.pixels[index + 1] === 154 && image.pixels[index + 2] === 149) brightPixels += 1;
      if (image.pixels[index] === 24 && image.pixels[index + 1] === 26 && image.pixels[index + 2] === 24) shadedPixels += 1;
    }
  }
  assert.ok(brightPixels > 20, 'bush must retain its bright foliage mass');
  assert.ok(shadedPixels > 20, 'bush shadow must remain distinct from the sky');
});

test('scenery sits just behind the foreground grass', async () => {
  for (const [name, placements] of [
    ['scene-desktop.png', [
      ['tree', 0, 100, 0, 7, 26],
      ['bush', 175, 230, 100, 193, 116]
    ]],
    ['scene-mobile.png', [
      ['tree', 0, 100, 100, 5, 170],
      ['bush', 120, 190, 220, 154, 255]
    ]],
    ['scene-mobile-compact.png', [
      ['tree', 0, 100, 100, 5, 145],
      ['bush', 120, 190, 220, 154, 230]
    ]]
  ]) {
    const image = decodeRgba(await readFile(new URL(`./assets/pixel/${name}`, import.meta.url)));
    const sky = image.pixels.subarray(0, 4);

    for (const [label, xStart, xEnd, yStart, expectedLeft, expectedTop] of placements) {
      let left = image.width;
      let top = image.height;
      for (let y = yStart; y < expectedTop + 15; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const index = (y * image.width + x) * 4;
          if (!image.pixels.subarray(index, index + 4).equals(sky)) {
            left = Math.min(left, x);
            top = Math.min(top, y);
          }
        }
      }
      assert.equal(left, expectedLeft, `${name} ${label} horizontal placement`);
      assert.equal(top, expectedTop, `${name} ${label} vertical placement`);
    }
  }
});
