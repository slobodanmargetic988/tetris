const KEYBOARD_ACTIONS = {
  move_left: ['ArrowLeft'],
  move_right: ['ArrowRight'],
  soft_drop: ['ArrowDown'],
  rotate_cw: ['ArrowUp']
};

const ACTION_FOR_KEY = Object.entries(KEYBOARD_ACTIONS).reduce(
  (map, [action, keys]) => {
    keys.forEach((key) => {
      map[key] = action;
    });
    return map;
  },
  {}
);

function applyGameplayInput(state, key) {
  const action = ACTION_FOR_KEY[key];
  if (!action) {
    return false;
  }

  if (action === 'move_left') {
    state.x -= 1;
    return true;
  }

  if (action === 'move_right') {
    state.x += 1;
    return true;
  }

  if (action === 'soft_drop') {
    state.y += 1;
    return true;
  }

  if (action === 'rotate_cw') {
    state.rotation += 1;
    return true;
  }

  return false;
}

module.exports = {
  ACTION_FOR_KEY,
  KEYBOARD_ACTIONS,
  applyGameplayInput
};
