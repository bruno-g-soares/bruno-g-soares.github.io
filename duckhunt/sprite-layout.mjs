const DOG_BURY_DEPTH = 12;

export function getDogPopupY(groundY, height, visibility) {
  return groundY + DOG_BURY_DEPTH - height * visibility;
}
