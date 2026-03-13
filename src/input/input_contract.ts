const KEYBOARD_ACTIONS = {
  move_left: ['ArrowLeft', 'KeyA'],
  move_right: ['ArrowRight', 'KeyD'],
  soft_drop: ['ArrowDown', 'KeyS'],
  rotate_cw: ['ArrowUp', 'KeyW']
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

const DEFAULT_REPEAT_GUARD_MS = 75;
const DEFAULT_BURST_GUARD_MS = 20;

const NORMALIZED_KEY_ALIASES = {
  arrowleft: 'ArrowLeft',
  left: 'ArrowLeft',
  arrowright: 'ArrowRight',
  right: 'ArrowRight',
  arrowdown: 'ArrowDown',
  down: 'ArrowDown',
  arrowup: 'ArrowUp',
  up: 'ArrowUp',
  a: 'KeyA',
  d: 'KeyD',
  s: 'KeyS',
  w: 'KeyW'
};

function normalizeKey(rawKey) {
  if (typeof rawKey !== 'string') {
    return '';
  }

  const trimmed = rawKey.trim();
  if (!trimmed) {
    return '';
  }

  if (ACTION_FOR_KEY[trimmed]) {
    return trimmed;
  }

  const alias = NORMALIZED_KEY_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }

  return trimmed;
}

function normalizeGameplayInput(keyOrEvent) {
  if (typeof keyOrEvent === 'string') {
    return {
      key: normalizeKey(keyOrEvent),
      repeat: false,
      type: 'keydown',
      timestamp: undefined
    };
  }

  if (!keyOrEvent || typeof keyOrEvent !== 'object') {
    return {
      key: '',
      repeat: false,
      type: 'keydown',
      timestamp: undefined
    };
  }

  const keyCandidate =
    typeof keyOrEvent.code === 'string' && keyOrEvent.code
      ? keyOrEvent.code
      : keyOrEvent.key;

  const timestamp = Number.isFinite(keyOrEvent.timestamp)
    ? keyOrEvent.timestamp
    : Number.isFinite(keyOrEvent.timeStamp)
      ? keyOrEvent.timeStamp
      : undefined;

  return {
    key: normalizeKey(keyCandidate),
    repeat: keyOrEvent.repeat === true,
    type: keyOrEvent.type === 'keyup' ? 'keyup' : 'keydown',
    timestamp
  };
}

function resolveEventTimestamp(input) {
  if (input && Number.isFinite(input.timestamp)) {
    return input.timestamp;
  }

  return Date.now();
}

function applyGameplayAction(state, action) {
  if (!action || !state || typeof state !== 'object') {
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

function createInputGuard(options = {}) {
  return {
    repeatGuardMs: Number.isFinite(options.repeatGuardMs)
      ? Math.max(0, options.repeatGuardMs)
      : DEFAULT_REPEAT_GUARD_MS,
    burstGuardMs: Number.isFinite(options.burstGuardMs)
      ? Math.max(0, options.burstGuardMs)
      : DEFAULT_BURST_GUARD_MS,
    pressedKeys: new Set(),
    lastRepeatAtByKey: Object.create(null),
    lastActionAtByName: Object.create(null)
  };
}

function resetInputGuard(inputGuard) {
  if (!inputGuard) {
    return;
  }

  inputGuard.pressedKeys.clear();
  inputGuard.lastRepeatAtByKey = Object.create(null);
  inputGuard.lastActionAtByName = Object.create(null);
}

function releaseInputKey(inputGuard, key) {
  if (!inputGuard || !key) {
    return;
  }

  inputGuard.pressedKeys.delete(key);
  delete inputGuard.lastRepeatAtByKey[key];
}

function shouldAcceptGameplayInput(inputGuard, input, action) {
  if (!inputGuard) {
    return true;
  }

  if (input.type === 'keyup') {
    releaseInputKey(inputGuard, input.key);
    return false;
  }

  const timestamp = resolveEventTimestamp(input);
  const previousActionTimestamp = inputGuard.lastActionAtByName[action];

  if (input.repeat) {
    const previousRepeatTimestamp = inputGuard.lastRepeatAtByKey[input.key];
    const repeatBaselineTimestamp =
      typeof previousRepeatTimestamp === 'number'
        ? previousRepeatTimestamp
        : previousActionTimestamp;

    if (
      typeof repeatBaselineTimestamp === 'number' &&
      timestamp - repeatBaselineTimestamp < inputGuard.repeatGuardMs
    ) {
      return false;
    }

    inputGuard.lastRepeatAtByKey[input.key] = timestamp;
  } else {
    if (inputGuard.pressedKeys.has(input.key)) {
      return false;
    }

    inputGuard.pressedKeys.add(input.key);
  }

  if (
    typeof previousActionTimestamp === 'number' &&
    timestamp - previousActionTimestamp < inputGuard.burstGuardMs
  ) {
    return false;
  }

  inputGuard.lastActionAtByName[action] = timestamp;
  return true;
}

function applyGameplayInput(state, keyOrEvent, inputGuard) {
  const input = normalizeGameplayInput(keyOrEvent);
  if (input.type === 'keyup') {
    releaseInputKey(inputGuard, input.key);
    return false;
  }

  const action = ACTION_FOR_KEY[input.key];
  if (!action) {
    return false;
  }

  if (state && state.paused === true) {
    return false;
  }

  if (!shouldAcceptGameplayInput(inputGuard, input, action)) {
    return false;
  }

  return applyGameplayAction(state, action);
}

function createKeyboardController(options = {}) {
  const inputGuard = createInputGuard(options);

  return {
    applyInput(state, keyOrEvent) {
      return applyGameplayInput(state, keyOrEvent, inputGuard);
    },
    handleKeyDown(state, keyOrEvent) {
      if (typeof keyOrEvent === 'string') {
        return applyGameplayInput(
          state,
          { code: keyOrEvent, type: 'keydown' },
          inputGuard
        );
      }

      return applyGameplayInput(
        state,
        { ...keyOrEvent, type: 'keydown' },
        inputGuard
      );
    },
    handleKeyUp(keyOrEvent) {
      if (typeof keyOrEvent === 'string') {
        releaseInputKey(inputGuard, normalizeKey(keyOrEvent));
        return false;
      }

      const normalized = normalizeGameplayInput({
        ...keyOrEvent,
        type: 'keyup'
      });
      releaseInputKey(inputGuard, normalized.key);
      return false;
    },
    resetGuards() {
      resetInputGuard(inputGuard);
    },
    getInputGuard() {
      return inputGuard;
    }
  };
}

module.exports = {
  ACTION_FOR_KEY,
  KEYBOARD_ACTIONS,
  DEFAULT_BURST_GUARD_MS,
  DEFAULT_REPEAT_GUARD_MS,
  createInputGuard,
  createKeyboardController,
  normalizeGameplayInput,
  resetInputGuard,
  applyGameplayInput
};
