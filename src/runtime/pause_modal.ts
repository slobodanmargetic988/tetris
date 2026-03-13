const POINTER_EQUIVALENT_KEYS = new Set(['Enter', ' ', 'Space', 'Spacebar']);

function normalizeInputKey(rawKey) {
  if (typeof rawKey !== 'string') {
    return '';
  }

  if (rawKey === 'Space' || rawKey === 'Spacebar') {
    return ' ';
  }

  return rawKey;
}

function normalizeActionId(rawActionId) {
  if (typeof rawActionId !== 'string') {
    return '';
  }

  const trimmed = rawActionId.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.toLowerCase();
}

function readActionIdFromElement(element) {
  if (!element || typeof element !== 'object') {
    return '';
  }

  if (typeof element.actionId === 'string') {
    return element.actionId;
  }

  if (
    element.dataset &&
    typeof element.dataset === 'object' &&
    typeof element.dataset.pauseAction === 'string'
  ) {
    return element.dataset.pauseAction;
  }

  if (typeof element.getAttribute === 'function') {
    const fromAttribute = element.getAttribute('data-pause-action');
    if (typeof fromAttribute === 'string') {
      return fromAttribute;
    }
  }

  return '';
}

function isFocusableElementCandidate(element) {
  if (!element || typeof element !== 'object') {
    return false;
  }

  if (element.disabled === true || element.hidden === true) {
    return false;
  }

  return true;
}

function focusElement(element) {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

function sanitizeFocusableElements(rawElements) {
  if (!Array.isArray(rawElements)) {
    return [];
  }

  return rawElements
    .map((element) => {
      if (!isFocusableElementCandidate(element)) {
        return null;
      }

      const actionId = normalizeActionId(readActionIdFromElement(element));
      if (!actionId) {
        return null;
      }

      return { actionId, element };
    })
    .filter(Boolean);
}

function deepClone(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepClone(entry));
  }

  const cloned = {};
  Object.keys(value).forEach((key) => {
    cloned[key] = deepClone(value[key]);
  });
  return cloned;
}

function restoreSnapshot(targetState, snapshot) {
  const snapshotValue = snapshot && typeof snapshot === 'object' ? snapshot : {};

  Object.keys(targetState).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(snapshotValue, key)) {
      delete targetState[key];
    }
  });

  Object.keys(snapshotValue).forEach((key) => {
    targetState[key] = deepClone(snapshotValue[key]);
  });
}

function createPauseRuntimeController() {
  let paused = false;
  let runtimeSnapshot = null;

  return {
    pause(state) {
      if (!state || typeof state !== 'object' || paused) {
        return false;
      }

      runtimeSnapshot = deepClone(state);
      state.paused = true;
      paused = true;
      return true;
    },
    resume(state) {
      if (!state || typeof state !== 'object' || !paused) {
        return false;
      }

      restoreSnapshot(state, runtimeSnapshot);
      state.paused = false;
      runtimeSnapshot = null;
      paused = false;
      return true;
    },
    isPaused() {
      return paused;
    },
    getSnapshot() {
      return runtimeSnapshot ? deepClone(runtimeSnapshot) : null;
    }
  };
}

function createPauseModalController(options = {}) {
  const actionHandlers = {
    ...(options.actions || {})
  };

  if (typeof options.onResume === 'function') {
    actionHandlers.resume = options.onResume;
  }

  if (typeof options.onReset === 'function') {
    actionHandlers.reset = options.onReset;
  }

  const fallbackEscapeAction = normalizeActionId(options.escapeAction || 'resume');
  let active = false;
  let focusableElements = sanitizeFocusableElements(options.focusableElements);
  let focusedIndex = -1;
  let lastAction = null;

  function hasKnownAction(actionId) {
    if (!actionId) {
      return false;
    }

    if (typeof actionHandlers[actionId] === 'function') {
      return true;
    }

    if (typeof options.onAction === 'function') {
      return true;
    }

    return focusableElements.some((entry) => entry.actionId === actionId);
  }

  function focusByIndex(index) {
    if (focusableElements.length === 0) {
      focusedIndex = -1;
      return false;
    }

    const total = focusableElements.length;
    const normalizedIndex = ((index % total) + total) % total;
    focusedIndex = normalizedIndex;
    focusElement(focusableElements[focusedIndex].element);
    return true;
  }

  function indexForAction(actionId) {
    return focusableElements.findIndex((entry) => entry.actionId === actionId);
  }

  function getFocusedAction() {
    if (focusedIndex < 0 || focusedIndex >= focusableElements.length) {
      return '';
    }

    return focusableElements[focusedIndex].actionId;
  }

  function activateAction(actionId, source, event) {
    const normalizedActionId = normalizeActionId(actionId);
    if (!normalizedActionId) {
      return false;
    }

    const payload = {
      actionId: normalizedActionId,
      source,
      event
    };

    lastAction = payload;

    let handled = hasKnownAction(normalizedActionId);
    if (typeof options.onAction === 'function') {
      handled = options.onAction(payload) === true || handled;
    }

    if (typeof actionHandlers[normalizedActionId] === 'function') {
      actionHandlers[normalizedActionId](payload);
      handled = true;
    }

    return handled;
  }

  function trapFocus(event) {
    if (focusableElements.length === 0) {
      return false;
    }

    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (focusedIndex === -1) {
      return focusByIndex(event && event.shiftKey ? -1 : 0);
    }

    const direction = event && event.shiftKey ? -1 : 1;
    return focusByIndex(focusedIndex + direction);
  }

  return {
    open(config = {}) {
      if (Array.isArray(config.focusableElements)) {
        focusableElements = sanitizeFocusableElements(config.focusableElements);
      }

      active = true;

      if (focusableElements.length > 0) {
        const initialActionId = normalizeActionId(
          config.initialAction || options.initialAction
        );

        const initialIndex =
          initialActionId && indexForAction(initialActionId) !== -1
            ? indexForAction(initialActionId)
            : 0;

        focusByIndex(initialIndex);
      } else {
        focusedIndex = -1;
      }

      return true;
    },
    close() {
      active = false;
      focusedIndex = -1;
      return true;
    },
    isOpen() {
      return active;
    },
    setFocusableElements(elements) {
      focusableElements = sanitizeFocusableElements(elements);
      focusedIndex = focusableElements.length > 0 ? 0 : -1;
      if (focusedIndex !== -1) {
        focusByIndex(focusedIndex);
      }
      return focusableElements.length;
    },
    getFocusedAction,
    getFocusableActions() {
      return focusableElements.map((entry) => entry.actionId);
    },
    getLastAction() {
      return lastAction ? { ...lastAction } : null;
    },
    handlePointerAction(actionId, event) {
      if (!active) {
        return false;
      }

      const normalizedActionId = normalizeActionId(actionId);
      if (!normalizedActionId) {
        return false;
      }

      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      const index = indexForAction(normalizedActionId);
      if (index !== -1) {
        focusByIndex(index);
      }

      return activateAction(normalizedActionId, 'pointer', event);
    },
    handleKeydown(event) {
      if (!active) {
        return false;
      }

      const key = normalizeInputKey(event && event.key);
      if (key === 'Tab') {
        return trapFocus(event);
      }

      if (POINTER_EQUIVALENT_KEYS.has(key)) {
        const actionId = getFocusedAction();
        if (!actionId) {
          return false;
        }

        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        return activateAction(actionId, 'keyboard', event);
      }

      if (key === 'Escape' && fallbackEscapeAction) {
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        return activateAction(fallbackEscapeAction, 'keyboard', event);
      }

      return false;
    }
  };
}

module.exports = {
  createPauseModalController,
  createPauseRuntimeController,
  normalizeActionId
};
