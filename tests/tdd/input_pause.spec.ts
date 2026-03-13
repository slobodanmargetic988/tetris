const {
  ACTION_FOR_KEY,
  KEYBOARD_ACTIONS,
  applyGameplayInput
} = require('../../src/input/input_contract.ts');

describe('input contract', () => {
  test('maps Arrow and WASD controls to identical core gameplay actions', () => {
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

  test('ignores gameplay mutation inputs while runtime is paused', () => {
    const initialState = {
      paused: true,
      x: 5,
      y: 8,
      rotation: 2
    };

    const mutationKeys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
      'ArrowUp',
      'KeyA',
      'KeyD',
      'KeyS',
      'KeyW'
    ];

    const stateAfterInputs = { ...initialState };

    mutationKeys.forEach((key) => {
      applyGameplayInput(stateAfterInputs, key);
    });

    expect(stateAfterInputs).toEqual(initialState);
  });
});
