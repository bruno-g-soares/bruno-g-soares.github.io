import test from 'node:test';
import assert from 'node:assert/strict';

import { getDogPopupY } from './sprite-layout.mjs';

test('fully raised dog keeps its bottom edge buried in dense grass', () => {
  const groundY = 150;
  const height = 39;
  const y = getDogPopupY(groundY, height, 1);

  assert.equal(y + height, groundY + 12);
});

test('hidden dog starts entirely below the grass line', () => {
  assert.equal(getDogPopupY(150, 39, 0), 162);
});
