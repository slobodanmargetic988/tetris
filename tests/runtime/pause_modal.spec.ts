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

describe('pause modal runtime behavior', () => {
  test('traps focus and enforces one handled action per open cycle', () => {
    const focusLog = [];
    const actionLog = [];
    const resumeButton = createFocusableAction('resume', focusLog);
    const resetButton = createFocusableAction('reset', focusLog);
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
      focusableElements: [resumeButton, resetButton],
      initialAction: 'resume'
    });

    expect(modal.getFocusedAction()).toBe('resume');
    expect(focusLog).toEqual(['resume']);

    const tabForward = createKeyEvent('Tab');
    expect(modal.handleKeydown(tabForward)).toBe(true);
    expect(tabForward.prevented).toBe(true);
    expect(modal.getFocusedAction()).toBe('reset');

    const tabBackward = createKeyEvent('Tab', true);
    expect(modal.handleKeydown(tabBackward)).toBe(true);
    expect(tabBackward.prevented).toBe(true);
    expect(modal.getFocusedAction()).toBe('resume');

    const enterEvent = createKeyEvent('Enter');
    expect(modal.handleKeydown(enterEvent)).toBe(true);
    expect(enterEvent.prevented).toBe(true);

    expect(modal.handlePointerAction('resume')).toBe(false);

    const spaceEvent = createKeyEvent(' ');
    expect(modal.handleKeydown(spaceEvent)).toBe(false);
    expect(spaceEvent.prevented).toBe(true);

    modal.close();
    modal.open({
      focusableElements: [resumeButton, resetButton],
      initialAction: 'resume'
    });
    expect(modal.handlePointerAction('resume')).toBe(true);
    expect(actionLog).toEqual([
      { actionId: 'resume', source: 'keyboard', event: enterEvent },
      { actionId: 'resume', source: 'pointer', event: undefined }
    ]);
  });

  test('paused runtime blocks gameplay mutations and resumes exact pre-pause state', () => {
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
    const stateBeforePause = JSON.parse(JSON.stringify(runtimeState));

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
        timestamp: 120
      })
    ).toBe(false);

    runtimeState.x = 42;
    runtimeState.board[0][1] = 9;
    runtimeState.score = 0;

    expect(pauseRuntime.resume(runtimeState)).toBe(true);
    expect(runtimeState.paused).toBe(false);
    expect(runtimeState).toEqual(stateBeforePause);
  });
});
