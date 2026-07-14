import { advanceState, createGameState, shoot } from './core.mjs';
import { createLaunchCoordinator } from './launch-coordinator.mjs';
import { getDogPopupY } from './sprite-layout.mjs';
import { getViewportLayout, mapPointerToGame } from './viewport-layout.mjs';

const assetUrl = path => new URL(path, import.meta.url).href;
const IMAGE_PATHS = {
  left: './assets/pixel/duck-left.png',
  right: './assets/pixel/duck-right.png',
  shot: './assets/pixel/duck-shot.png',
  dead: './assets/pixel/duck-dead.png',
  dogHit: './assets/pixel/dog-hit.png',
  dogLaugh: './assets/pixel/dog-laugh.png',
  sceneDesktop: './assets/pixel/scene-desktop.png',
  foregroundDesktop: './assets/pixel/foreground-desktop.png',
  sceneMobile: './assets/pixel/scene-mobile.png',
  foregroundMobile: './assets/pixel/foreground-mobile.png',
  sceneMobileCompact: './assets/pixel/scene-mobile-compact.png',
  foregroundMobileCompact: './assets/pixel/foreground-mobile-compact.png'
};
const AUDIO_PATHS = {
  shot: './assets/sounds/shot.mp3',
  release: './assets/sounds/release.mp3',
  laugh: './assets/sounds/laugh.mp3',
  thud: './assets/sounds/thud.mp3',
  flap: './assets/sounds/flap.mp3'
};

const launches = createLaunchCoordinator();

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${path}`));
    image.src = assetUrl(path);
  });
}

async function loadImages() {
  const entries = await Promise.all(Object.entries(IMAGE_PATHS).map(async ([key, path]) => [key, await loadImage(path)]));
  return Object.fromEntries(entries);
}

function createOverlay() {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = assetUrl('./game.css');
  style.dataset.duckhuntStyle = '';

  const overlay = document.createElement('section');
  overlay.id = 'duckhunt-game';
  overlay.setAttribute('role', 'application');
  overlay.setAttribute('aria-label', 'Duck Hunt game. Aim with the pointer and shoot. Press Escape to exit.');
  overlay.innerHTML = `
    <div class="duckhunt-window">
      <header class="duckhunt-chrome">
        <span>duckhunt.exe</span>
        <div class="duckhunt-controls">
          <button type="button" data-mute aria-label="Mute sound">sound: on</button>
          <button type="button" data-exit aria-label="Exit Duck Hunt">esc</button>
        </div>
      </header>
      <div class="duckhunt-stage">
        <img class="duckhunt-scene" data-scene alt="">
        <canvas aria-label="Duck Hunt playfield"></canvas>
        <img class="duckhunt-foreground" data-foreground alt="">
        <div class="duckhunt-hud" aria-hidden="true">
          <div class="duckhunt-score"><span>SCORE <strong data-score>000000</strong></span><span>STREAK <strong data-streak>0</strong></span><span>LV <strong data-level>1</strong></span></div>
          <div class="duckhunt-ammo">SHOT <strong data-ammo>● ● ●</strong></div>
          <div class="duckhunt-status" data-status></div>
        </div>
        <svg class="duckhunt-crosshair" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="10"></circle>
          <path d="M20 1v10M20 29v10M1 20h10M29 20h10"></path>
        </svg>
      </div>
    </div>`;

  document.head.appendChild(style);
  document.body.appendChild(overlay);
  return { overlay, style };
}

function makeAudio() {
  return Object.fromEntries(Object.entries(AUDIO_PATHS).map(([key, path]) => {
    const audio = new Audio(assetUrl(path));
    audio.preload = 'auto';
    audio.loop = key === 'flap';
    audio.volume = key === 'shot' ? 0.42 : key === 'flap' ? 0.2 : 0.5;
    return [key, audio];
  }));
}

function drawFrame(ctx, image, sourceX, sourceWidth, x, y, shadow = false) {
  const drawX = Math.round(x);
  const drawY = Math.round(y);
  if (shadow) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.filter = 'brightness(0) blur(.7px)';
    ctx.drawImage(image, sourceX, 0, sourceWidth, image.height, drawX + 3, drawY + 3, sourceWidth, image.height);
    ctx.restore();
  }
  ctx.drawImage(image, sourceX, 0, sourceWidth, image.height, drawX, drawY, sourceWidth, image.height);
}

function drawDuck(ctx, state, images, animationTime) {
  const { duck } = state;
  if (state.phase === 'shot') {
    drawFrame(ctx, images.shot, 0, 31, duck.x + 1, duck.y + 2, true);
    return;
  }
  if (state.phase === 'falling') {
    const frame = Math.floor(animationTime * 8) % 2;
    drawFrame(ctx, images.dead, frame * 19, 19, duck.x + 7, duck.y + 1, true);
    return;
  }
  const image = duck.direction < 0 ? images.left : images.right;
  const frame = Math.floor(animationTime * 9) % 4;
  drawFrame(ctx, image, frame * 34, 34, duck.x, duck.y, true);
}

function drawDog(ctx, state, images, width, groundY) {
  if (state.phase !== 'dog-hit' && state.phase !== 'dog-laugh') return;
  const image = state.phase === 'dog-hit' ? images.dogHit : images.dogLaugh;
  const frame = state.phase === 'dog-hit' ? 0 : Math.floor(state.phaseElapsed * 7) % 2;
  const rise = Math.min(1, state.phaseElapsed / 0.35);
  const fall = state.phaseElapsed > 1.08 ? Math.max(0, 1 - (state.phaseElapsed - 1.08) / 0.42) : 1;
  const visible = Math.sin(Math.min(rise, fall) * Math.PI / 2);
  drawFrame(ctx, image, frame * 56, 56, width * 0.5 - 28, getDogPopupY(groundY, 39, visible));
}

async function bootGame(launch) {
  const { overlay, style } = createOverlay();
  const windowNode = overlay.querySelector('.duckhunt-window');
  const stage = overlay.querySelector('.duckhunt-stage');
  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const sceneNode = overlay.querySelector('[data-scene]');
  const foregroundNode = overlay.querySelector('[data-foreground]');
  const crosshair = overlay.querySelector('.duckhunt-crosshair');
  const scoreNode = overlay.querySelector('[data-score]');
  const streakNode = overlay.querySelector('[data-streak]');
  const levelNode = overlay.querySelector('[data-level]');
  const ammoNode = overlay.querySelector('[data-ammo]');
  const statusNode = overlay.querySelector('[data-status]');
  const muteButton = overlay.querySelector('[data-mute]');
  const exitButton = overlay.querySelector('[data-exit]');
  const audio = makeAudio();
  let images;
  let state;
  let bounds;
  let layout;
  let frameId = null;
  let lastTime = performance.now();
  let muted = false;
  let statusTimer = null;
  let destroyed = false;

  const play = name => {
    if (muted || !audio[name]) return;
    const sound = audio[name];
    sound.currentTime = 0;
    sound.play().catch(() => {});
  };

  const syncFlightSound = () => {
    const sound = audio.flap;
    if (muted || state?.phase !== 'flying' || document.hidden) {
      sound.pause();
      return;
    }
    if (sound.paused) sound.play().catch(() => {});
  };

  const showStatus = text => {
    statusNode.textContent = text;
    statusNode.classList.add('visible');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => statusNode.classList.remove('visible'), 620);
  };

  const updateSceneImages = () => {
    if (!images || !layout) return;
    const compact = layout.variant === 'mobileCompact';
    const scene = layout.mode === 'desktop' ? images.sceneDesktop : compact ? images.sceneMobileCompact : images.sceneMobile;
    const foreground = layout.mode === 'desktop'
      ? images.foregroundDesktop
      : compact ? images.foregroundMobileCompact : images.foregroundMobile;
    sceneNode.src = scene.src;
    foregroundNode.src = foreground.src;
  };

  const resize = () => {
    const next = getViewportLayout(innerWidth, innerHeight, matchMedia('(pointer:fine)').matches);
    const changedWorld = !layout || next.logicalWidth !== layout.logicalWidth || next.logicalHeight !== layout.logicalHeight;
    layout = next;
    bounds = { width: layout.logicalWidth, height: layout.logicalHeight, groundY: layout.groundY };
    overlay.dataset.mode = layout.mode;
    windowNode.style.setProperty('--dh-stage-width', `${layout.displayWidth}px`);
    windowNode.style.setProperty('--dh-stage-height', `${layout.displayHeight}px`);
    canvas.width = layout.logicalWidth;
    canvas.height = layout.logicalHeight;
    ctx.imageSmoothingEnabled = false;
    if (!state || changedWorld) {
      const previous = state;
      state = createGameState(bounds);
      if (previous) {
        state.score = previous.score;
        state.streak = previous.streak;
        state.level = previous.level;
        state.ducksHit = previous.ducksHit;
      }
    }
    updateSceneImages();
  };

  const updateHud = () => {
    scoreNode.textContent = String(state.score).padStart(6, '0');
    streakNode.textContent = String(state.streak);
    levelNode.textContent = String(state.level);
    ammoNode.textContent = `${'● '.repeat(state.shots)}${'○ '.repeat(3 - state.shots)}`.trim();
    overlay.dataset.phase = state.phase;
    overlay.dataset.score = String(state.score);
    overlay.dataset.level = String(state.level);
    overlay.dataset.shots = String(state.shots);
  };

  const render = time => {
    if (destroyed) return;
    const dt = Math.min(0.04, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    const event = advanceState(state, dt, bounds);
    if (event === 'escape') showStatus('fly away');
    if (event === 'dog-hit') play('thud');
    if (event === 'dog-laugh') play('laugh');
    if (event === 'new-round') play('release');
    syncFlightSound();

    ctx.clearRect(0, 0, bounds.width, bounds.height);
    if (state.phase !== 'dog-hit' && state.phase !== 'dog-laugh') drawDuck(ctx, state, images, time / 1000);
    drawDog(ctx, state, images, bounds.width, bounds.groundY);
    updateHud();
    frameId = requestAnimationFrame(render);
  };

  const stop = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frameId);
    clearTimeout(statusTimer);
    removeEventListener('resize', resize);
    removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);
    for (const sound of Object.values(audio)) {
      sound.pause();
      sound.src = '';
    }
    overlay.remove();
    style.remove();
    launch.cancel();
    if (matchMedia('(pointer:fine)').matches) document.getElementById('cmd')?.focus();
  };

  const toggleMute = () => {
    muted = !muted;
    muteButton.textContent = muted ? 'sound: off' : 'sound: on';
    muteButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    syncFlightSound();
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') stop();
    if (event.key.toLowerCase() === 'm') toggleMute();
  };

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = null;
      syncFlightSound();
      return;
    }
    if (frameId === null && !destroyed) {
      lastTime = performance.now();
      frameId = requestAnimationFrame(render);
      syncFlightSound();
    }
  };

  const updateCrosshair = event => {
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    crosshair.style.transform = `translate3d(${x - 20}px, ${y - 20}px, 0)`;
    crosshair.classList.add('visible');
  };

  const pointerEvent = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';
  stage.addEventListener(pointerEvent, updateCrosshair);
  stage.addEventListener('pointerleave', () => crosshair.classList.remove('visible'));
  stage.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') crosshair.classList.remove('visible');
  });
  stage.addEventListener('pointercancel', () => crosshair.classList.remove('visible'));
  stage.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    updateCrosshair(event);
    if (state.phase !== 'flying') return;
    play('shot');
    const point = mapPointerToGame(event.clientX, event.clientY, stage.getBoundingClientRect(), layout);
    const result = shoot(state, point.x, point.y);
    if (result.event === 'hit' && state.ducksHit % 5 === 0) showStatus(`level ${state.level} · +100`);
    else if (result.event === 'hit') showStatus('hit · +100');
    else if (result.event === 'escape') showStatus('out of shots');
  });
  overlay.addEventListener('click', event => event.stopPropagation());
  muteButton.addEventListener('click', event => { event.stopPropagation(); toggleMute(); });
  exitButton.addEventListener('click', event => { event.stopPropagation(); stop(); });
  addEventListener('resize', resize);
  addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibility);

  try {
    resize();
    images = await loadImages();
    if (destroyed || launch.isCancelled()) return { stop };
    updateSceneImages();
    const game = { stop, overlay };
    play('release');
    syncFlightSound();
    lastTime = performance.now();
    frameId = requestAnimationFrame(render);
    return game;
  } catch (error) {
    if (destroyed || launch.isCancelled()) return { stop };
    stop();
    throw error;
  }
}

export function startDuckHunt() {
  return launches.start(bootGame);
}