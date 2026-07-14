const DESKTOP_WIDTH = 320;
const DESKTOP_HEIGHT = 180;
const MOBILE_WIDTH = 195;
const MOBILE_HEIGHT = 350;
const MOBILE_COMPACT_HEIGHT = 325;

export function getViewportLayout(viewportWidth, viewportHeight, hasFinePointer) {
  if (viewportWidth >= 700 || (hasFinePointer && viewportWidth >= 600)) {
    const availableScale = Math.floor(Math.min(
      (viewportWidth - 48) / DESKTOP_WIDTH,
      (viewportHeight - 40) / DESKTOP_HEIGHT
    ));
    const scale = Math.max(1, Math.min(3, availableScale));
    return {
      mode: 'desktop',
      logicalWidth: DESKTOP_WIDTH,
      logicalHeight: DESKTOP_HEIGHT,
      scale,
      displayWidth: DESKTOP_WIDTH * scale,
      displayHeight: DESKTOP_HEIGHT * scale,
      groundY: 150
    };
  }

  const compact = viewportHeight / viewportWidth < 1.72;
  const logicalHeight = compact ? MOBILE_COMPACT_HEIGHT : MOBILE_HEIGHT;
  const scale = Math.min(viewportWidth / MOBILE_WIDTH, viewportHeight / logicalHeight);
  return {
    mode: 'mobile',
    ...(compact ? { variant: 'mobileCompact' } : {}),
    logicalWidth: MOBILE_WIDTH,
    logicalHeight,
    scale,
    displayWidth: MOBILE_WIDTH * scale,
    displayHeight: logicalHeight * scale,
    groundY: compact ? 269 : 294
  };
}

export function mapPointerToGame(clientX, clientY, rect, layout) {
  return {
    x: (clientX - rect.left) * layout.logicalWidth / rect.width,
    y: (clientY - rect.top) * layout.logicalHeight / rect.height
  };
}
