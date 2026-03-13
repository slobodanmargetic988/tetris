const {
  ACTION_FOR_KEY,
  KEYBOARD_ACTIONS,
  applyGameplayInput,
  createKeyboardController
} = require('../../src/input/input_contract.ts');

describe('runtime keyboard controller', () => {
  test('maps Arrow and WASD controls to identical runtime actions', () => {
    const requiredParityCases = [
      ['move_left', 'ArrowLeft', 'KeyA'],
      ['move_right', 'ArrowRight', 'KeyD'],
      ['soft_drop', 'ArrowDown', 'KeyS'],
      ['rotate_cw', 'ArrowUp', 'KeyW']
    ];

    requiredParityCases.forEach(([action, arrowKey, wasdKey]) => {
      expect(ACTION_FOR_KEY[arrowKey]).toBe(action);
      expect(ACTION_FOR_KEY[wasdKey]).toBe(action);
      expect(KEYBOARD_ACTIONS[action].includes(arrowKey)).toBe(true);
      expect(KEYBOARD_ACTIONS[action].includes(wasdKey)).toBe(true);
    });
  });

  test('prevents gameplay state mutation while paused', () => {
    const initialState = {
      paused: true,
      x: 5,
      y: 8,
      rotation: 2
    };

    const stateAfterInputs = { ...initialState };

    ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'KeyA', 'KeyD', 'KeyS', 'KeyW'].forEach((key) => {
      applyGameplayInput(stateAfterInputs, key);
    });

    expect(stateAfterInputs).toEqual(initialState);
  });

  test('guards burst/repeat input without dropping valid directional changes', () => {
    const state = {
      paused: false,
      x: 5,
      y: 10,
      rotation: 0
    };

    const keyboard = createKeyboardController({
      burstGuardMs: 20,
      repeatGuardMs: 75
    });

    expect(keyboard.handleKeyDown(state, { code: 'ArrowLeft', timestamp: 1000 })).toBe(true);
    expect(state.x).toBe(4);

    expect(keyboard.handleKeyDown(state, { code: 'ArrowLeft', timestamp: 1001 })).toBe(false);
    expect(state.x).toBe(4);

    expect(
      keyboard.handleKeyDown(state, {
        code: 'ArrowLeft',
        repeat: true,
        timestamp: 1030
      })
    ).toBe(false);
    expect(state.x).toBe(4);

    expect(
      keyboard.handleKeyDown(state, {
        code: 'ArrowLeft',
        repeat: true,
        timestamp: 1080
      })
    ).toBe(true);
    expect(state.x).toBe(3);

    keyboard.handleKeyUp({ code: 'ArrowLeft', timestamp: 1090 });

    expect(
      keyboard.handleKeyDown(state, {
        code: 'KeyD',
        timestamp: 1095
      })
    ).toBe(true);
    expect(state.x).toBe(4);

    keyboard.handleKeyUp({ code: 'KeyD', timestamp: 1110 });
    expect(keyboard.handleKeyDown(state, { key: 'a', timestamp: 1135 })).toBe(true);
    expect(state.x).toBe(3);
  });
});
