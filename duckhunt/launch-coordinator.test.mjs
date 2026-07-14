import test from 'node:test';
import assert from 'node:assert/strict';

import { createLaunchCoordinator } from './launch-coordinator.mjs';

test('a cancelled load cannot clear or replace a newer launch', async () => {
  const coordinator = createLaunchCoordinator();
  let cancelFirst;
  let resolveFirst;
  let thirdFactoryCalls = 0;

  const first = coordinator.start(control => {
    cancelFirst = control.cancel;
    return new Promise(resolve => { resolveFirst = resolve; });
  });

  cancelFirst();
  const secondGame = { name: 'second' };
  const second = coordinator.start(async () => secondGame);
  assert.equal(await second, secondGame);

  resolveFirst({ name: 'first' });
  await first;

  const active = await coordinator.start(async () => {
    thirdFactoryCalls += 1;
    return { name: 'third' };
  });

  assert.equal(active, secondGame);
  assert.equal(thirdFactoryCalls, 0);
});
