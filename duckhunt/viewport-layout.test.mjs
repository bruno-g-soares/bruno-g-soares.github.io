import test from 'node:test';
import assert from 'node:assert/strict';

import { getViewportLayout, mapPointerToGame } from './viewport-layout.mjs';

test('large fine-pointer viewports use a three-times desktop pixel window', () => {
  assert.deepEqual(getViewportLayout(1440, 900, true), {
    mode: 'desktop',
    logicalWidth: 320,
    logicalHeight: 180,
    scale: 3,
    displayWidth: 960,
    displayHeight: 540,
    groundY: 150
  });
});

test('smaller desktop viewports fall back to an exact two-times scale', () => {
  assert.equal(getViewportLayout(800, 600, true).scale, 2);
  assert.equal(getViewportLayout(800, 600, true).displayWidth, 640);
});

test('wide viewports use the desktop window even when pointer capability is unavailable', () => {
  assert.equal(getViewportLayout(1280, 639, false).mode, 'desktop');
  assert.equal(getViewportLayout(1280, 639, false).scale, 3);
});

test('390 by 700 touch viewport uses the portrait scene at exact two-times scale', () => {
  assert.deepEqual(getViewportLayout(390, 700, false), {
    mode: 'mobile',
    logicalWidth: 195,
    logicalHeight: 350,
    scale: 2,
    displayWidth: 390,
    displayHeight: 700,
    groundY: 294
  });
});

test('short mobile browser viewport uses a compact scene without side letterboxing', () => {
  const layout = getViewportLayout(393, 655, false);

  assert.equal(layout.mode, 'mobile');
  assert.equal(layout.variant, 'mobileCompact');
  assert.equal(layout.logicalWidth, 195);
  assert.equal(layout.logicalHeight, 325);
  assert.equal(layout.displayWidth, 393);
  assert.equal(layout.displayHeight, 655);
});

test('other touch viewports fit the portrait scene without cropping', () => {
  const layout = getViewportLayout(360, 640, false);
  assert.equal(layout.mode, 'mobile');
  assert.ok(layout.displayWidth <= 360);
  assert.ok(layout.displayHeight <= 640);
  assert.equal(layout.displayHeight, 640);
});

test('pointer coordinates map from the displayed stage to logical pixels', () => {
  const point = mapPointerToGame(
    580,
    320,
    { left: 100, top: 50, width: 960, height: 540 },
    { logicalWidth: 320, logicalHeight: 180 }
  );
  assert.deepEqual(point, { x: 160, y: 90 });
});
