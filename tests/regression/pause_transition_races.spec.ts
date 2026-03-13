const {
  createPauseModalController,
  createPauseRuntimeController
} = require('../../src/runtime/pause_modal.ts');
const { createKeyboardController } = require('../../src/input/input_contract.ts');

function createFocusableAction(actionId, focusLog) {
  return {
    dataset: { pauseAction: actionId },
    focus() {
      focusLog.push(actionId);
    }
  };
}

function createKeyEvent(key, shiftKey = false) {
  return {
    key,
    shiftKey,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    }
  };
}

describe('regression: pause transition race hardening', () => {
  test('deduplicates burst activation to one handled action per modal open', () => {
    const focusLog = [];
    const actionLog = [];
    const modal = createPauseModalController({
      actions: {
        resume(payload) {
          actionLog.push(payload);
        },
        reset(payload) {
          actionLog.push(payload);
        }
      }
    });

    modal.open({
      focusableElements: [
        createFocusableAction('resume', focusLog),
        createFocusableAction('reset', focusLog)
      ],
      initialAction: 'resume'
    });

    const enterEvent = createKeyEvent('Enter');
    expect(modal.handleKeydown(enterEvent)).toBe(true);
    expect(enterEvent.prevented).toBe(true);
    expect(modal.handlePointerAction('resume')).toBe(false);
    expect(modal.handleKeydown(createKeyEvent(' '))).toBe(false);

    expect(actionLog).toEqual([
      { actionId: 'resume', source: 'keyboard', event: enterEvent }
    ]);
    expect(focusLog).toEqual(['resume', 'resume']);

    expect(modal.close()).toBe(true);
    modal.open({
      focusableElements: [
        createFocusableAction('resume', focusLog),
        createFocusableAction('reset', focusLog)
      ],
      initialAction: 'reset'
    });

    expect(modal.handlePointerAction('reset')).toBe(true);
    expect(modal.handleKeydown(createKeyEvent('Enter'))).toBe(false);
    expect(actionLog[actionLog.length - 1].actionId).toBe('reset');
  });

  test('does not drop a valid action after ignored burst noise', () => {
    const actionLog = [];
    const modal = createPauseModalController({
      actions: {
        resume(payload) {
          actionLog.push(payload);
        }
      }
    });

    modal.open({
      focusableElements: [createFocusableAction('resume', [])],
      initialAction: 'resume'
    });

    expect(modal.handlePointerAction('bogus-action')).toBe(false);
    expect(modal.handlePointerAction('resume')).toBe(true);
    expect(actionLog).toEqual([
      { actionId: 'resume', source: 'pointer', event: undefined }
    ]);
  });

  test('pause, resume, and reset keep deterministic state and block paused mutations', () => {
    const pauseRuntime = createPauseRuntimeController();
    const keyboard = createKeyboardController({
      burstGuardMs: 0,
      repeatGuardMs: 0
    });
    const runtimeState = {
      paused: false,
      x: 5,
      y: 8,
      rotation: 2,
      score: 1000,
      board: [
        [0, 1, 0],
        [1, 1, 0]
      ]
    };
    const snapshotBeforePause = JSON.parse(JSON.stringify(runtimeState));

    expect(pauseRuntime.pause(runtimeState)).toBe(true);
    expect(runtimeState.paused).toBe(true);
    expect(
      keyboard.handleKeyDown(runtimeState, {
        code: 'ArrowLeft',
        timestamp: 100
      })
    ).toBe(false);
    expect(
      keyboard.handleKeyDown(runtimeState, {
        code: 'ArrowDown',
        timestamp: 110
      })
    ).toBe(false);

    runtimeState.x = 42;
    runtimeState.board[0][1] = 9;
    runtimeState.score = 0;

    expect(pauseRuntime.resume(runtimeState)).toBe(true);
    expect(runtimeState.paused).toBe(false);
    expect(runtimeState).toEqual(snapshotBeforePause);

    expect(pauseRuntime.pause(runtimeState)).toBe(true);
    const resetState = {
      paused: true,
      x: 3,
      y: 0,
      rotation: 0,
      score: 0,
      board: [[0, 0, 0]]
    };

    runtimeState.y = 99;
    runtimeState.board[0][0] = 7;
    expect(pauseRuntime.reset(runtimeState, resetState)).toBe(true);
    expect(runtimeState).toEqual({
      paused: false,
      x: 3,
      y: 0,
      rotation: 0,
      score: 0,
      board: [[0, 0, 0]]
    });
    expect(pauseRuntime.isPaused()).toBe(false);
    expect(pauseRuntime.getSnapshot()).toBe(null);
    expect(pauseRuntime.resume(runtimeState)).toBe(false);
  });
});
