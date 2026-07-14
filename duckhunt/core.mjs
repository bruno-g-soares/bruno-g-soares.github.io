const DUCK_WIDTH = 34;
const DUCK_HEIGHT = 33;

function createDuck(width, height, random, level = 1) {
  const direction = random() < 0.5 ? -1 : 1;
  const speedMultiplier = Math.min(1.8, 1 + (level - 1) * 0.12);
  return {
    x: width * 0.5 - DUCK_WIDTH * 0.5,
    y: height * 0.45 - DUCK_HEIGHT * 0.5,
    width: DUCK_WIDTH,
    height: DUCK_HEIGHT,
    vx: 95 * speedMultiplier * direction,
    vy: -48 * speedMultiplier,
    direction
  };
}

export function createGameState({ width, height, random = Math.random }) {
  return {
    phase: 'flying',
    score: 0,
    streak: 0,
    level: 1,
    ducksHit: 0,
    shots: 3,
    elapsed: 0,
    phaseElapsed: 0,
    duck: createDuck(width, height, random, 1)
  };
}

export function shoot(state, x, y) {
  if (state.phase !== 'flying' || state.shots <= 0) return { event: 'ignored' };
  state.shots -= 1;
  const duck = state.duck;
  const hit = x >= duck.x && x <= duck.x + duck.width &&
    y >= duck.y && y <= duck.y + duck.height;
  if (!hit) {
    if (state.shots === 0) {
      state.phase = 'escaping';
      state.phaseElapsed = 0;
      state.streak = 0;
      return { event: 'escape' };
    }
    return { event: 'miss' };
  }
  state.phase = 'shot';
  state.phaseElapsed = 0;
  state.score += 100;
  state.streak += 1;
  state.ducksHit += 1;
  state.level = 1 + Math.floor(state.ducksHit / 5);
  return { event: 'hit' };
}

export function advanceState(state, dt, bounds, random = Math.random) {
  state.phaseElapsed += dt;

  const startNextRound = () => {
    state.phase = 'flying';
    state.phaseElapsed = 0;
    state.elapsed = 0;
    state.shots = 3;
    state.duck = createDuck(bounds.width, bounds.height, random, state.level);
    return 'new-round';
  };

  if (state.phase === 'shot') {
    if (state.phaseElapsed < 0.28) return null;
    state.phase = 'falling';
    state.phaseElapsed = 0;
    return 'fall';
  }

  if (state.phase === 'falling') {
    state.duck.y += 180 * dt;
    if (state.duck.y < bounds.groundY - state.duck.height) return null;
    state.duck.y = bounds.groundY - state.duck.height;
    state.phase = 'dog-hit';
    state.phaseElapsed = 0;
    return 'dog-hit';
  }

  if (state.phase === 'dog-hit' || state.phase === 'dog-laugh') {
    if (state.phaseElapsed < 1.5) return null;
    return startNextRound();
  }

  if (state.phase === 'escaping') {
    state.duck.y -= 165 * dt;
    if (state.duck.y + state.duck.height > 0) return null;
    state.phase = 'dog-laugh';
    state.phaseElapsed = 0;
    return 'dog-laugh';
  }

  if (state.phase !== 'flying') return null;
  state.elapsed += dt;
  if (state.elapsed >= 6.5) {
    state.phase = 'escaping';
    state.phaseElapsed = 0;
    state.streak = 0;
    return 'escape';
  }
  const duck = state.duck;
  duck.x += duck.vx * dt;
  duck.y += duck.vy * dt;
  const maxX = bounds.width - duck.width;
  const minY = 14;
  const maxY = bounds.groundY - duck.height - 14;
  if (duck.x < 0 || duck.x > maxX) {
    duck.x = Math.max(0, Math.min(maxX, duck.x));
    duck.vx *= -1;
    duck.direction = duck.vx < 0 ? -1 : 1;
  }
  if (duck.y < minY || duck.y > maxY) {
    duck.y = Math.max(minY, Math.min(maxY, duck.y));
    duck.vy *= -1;
  }
  return null;
}
