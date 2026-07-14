import test from 'node:test';
import assert from 'node:assert/strict';

import { advanceState, createGameState, shoot } from './core.mjs';

const BOUNDS = { width: 320, height: 180, groundY: 150 };
const createState = () => createGameState({ width: 320, height: 180, random: () => 0.5 });

test('createGameState starts a flying round with three shots', () => {
  const state = createState();

  assert.equal(state.phase, 'flying');
  assert.equal(state.score, 0);
  assert.equal(state.streak, 0);
  assert.equal(state.shots, 3);
  assert.equal(state.duck.direction, 1);
  assert.equal(state.duck.width, 34);
  assert.equal(state.duck.height, 33);
});

test('shooting the duck awards points and starts its hit animation', () => {
  const state = createState();
  const x = state.duck.x + state.duck.width / 2;
  const y = state.duck.y + state.duck.height / 2;

  const result = shoot(state, x, y);

  assert.equal(result.event, 'hit');
  assert.equal(state.phase, 'shot');
  assert.equal(state.score, 100);
  assert.equal(state.streak, 1);
  assert.equal(state.shots, 2);
});

test('every fifth successful duck advances the level', () => {
  const state = createState();
  state.ducksHit = 4;

  shoot(state, state.duck.x + 10, state.duck.y + 10);

  assert.equal(state.ducksHit, 5);
  assert.equal(state.level, 2);
});

test('new ducks fly twelve percent faster per level', () => {
  const state = createState();
  state.level = 2;
  state.phase = 'dog-hit';

  advanceState(state, 1.6, BOUNDS, () => 0.5);

  assert.equal(Math.abs(state.duck.vx), 106.4);
  assert.ok(Math.abs(state.duck.vy + 53.76) < 1e-9);
});

test('using the last shot without a hit makes the duck escape and resets the streak', () => {
  const state = createState();
  state.streak = 4;

  assert.equal(shoot(state, 0, 0).event, 'miss');
  assert.equal(shoot(state, 0, 0).event, 'miss');
  const result = shoot(state, 0, 0);

  assert.equal(result.event, 'escape');
  assert.equal(state.phase, 'escaping');
  assert.equal(state.shots, 0);
  assert.equal(state.streak, 0);
});

test('duck escapes when its original six-and-a-half-second flight window expires', () => {
  const state = createState();
  state.streak = 3;

  const event = advanceState(state, 6.5, BOUNDS);

  assert.equal(event, 'escape');
  assert.equal(state.phase, 'escaping');
  assert.equal(state.streak, 0);
  assert.equal(state.shots, 3);
});

test('advanceState moves a flying duck and reflects it at the playfield edge', () => {
  const state = createState();
  state.duck.x = 300;
  state.duck.vx = 95;

  const event = advanceState(state, 1, BOUNDS);

  assert.equal(event, null);
  assert.ok(state.duck.x <= 286);
  assert.ok(state.duck.vx < 0);
  assert.equal(state.duck.direction, -1);
});

test('flying duck stays above the dense foreground grass', () => {
  const state = createState();
  state.duck.y = 110;
  state.duck.vy = 20;

  advanceState(state, 1, BOUNDS);

  assert.equal(state.duck.y, 103);
  assert.ok(state.duck.vy < 0);
});

test('a hit duck falls, shows the dog, then starts another round without losing score', () => {
  const state = createState();
  shoot(state, state.duck.x + 20, state.duck.y + 20);

  assert.equal(advanceState(state, 0.3, BOUNDS), 'fall');
  assert.equal(state.phase, 'falling');

  state.duck.y = 100;
  assert.equal(advanceState(state, 0.2, BOUNDS), 'dog-hit');
  assert.equal(state.phase, 'dog-hit');

  assert.equal(advanceState(state, 1.6, BOUNDS, () => 0.5), 'new-round');
  assert.equal(state.phase, 'flying');
  assert.equal(state.shots, 3);
  assert.equal(state.score, 100);
  assert.equal(state.streak, 1);
});

test('an escaped duck leaves upward, shows the laughing dog, then starts a fresh round', () => {
  const state = createState();
  shoot(state, 0, 0);
  shoot(state, 0, 0);
  shoot(state, 0, 0);
  state.duck.y = -40;

  assert.equal(advanceState(state, 0.1, BOUNDS), 'dog-laugh');
  assert.equal(state.phase, 'dog-laugh');

  assert.equal(advanceState(state, 1.6, BOUNDS, () => 0.5), 'new-round');
  assert.equal(state.phase, 'flying');
  assert.equal(state.shots, 3);
  assert.equal(state.streak, 0);
});
