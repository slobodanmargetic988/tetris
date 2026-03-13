export type RuntimeViewState =
  | "playing"
  | "paused"
  | "gameOver"
  | "results"
  | "leaderboard";

export type FeedbackAnimationKind =
  | "lineClear"
  | "pieceLock"
  | "stateTransition"
  | "buttonPress";

export interface MotionPreferenceInput {
  prefersReducedMotion: boolean;
  allowMotionEffects: boolean;
}

export interface MotionProfile {
  reducedMotion: boolean;
  transitionDurationScale: number;
  feedbackDurationScale: number;
  allowFeedback: (kind: FeedbackAnimationKind) => boolean;
}

export interface TransitionRequest {
  from: RuntimeViewState;
  to: RuntimeViewState;
  motion: MotionProfile;
}

export interface TransitionStep {
  name: "holdOutgoing" | "crossfade" | "settleIncoming";
  durationMs: number;
  outgoingOpacity: number;
  incomingOpacity: number;
  boardScale: number;
  overlayOpacity: number;
}

export interface StateTransitionPlan {
  from: RuntimeViewState;
  to: RuntimeViewState;
  continuityAnchor: "board" | "summary";
  preserveBoardSnapshot: boolean;
  preserveScoreHud: boolean;
  easing: "easeOutCubic" | "linear";
  durationMs: number;
  steps: [TransitionStep, TransitionStep, TransitionStep] | [];
}

export interface FeedbackAnimationSpec {
  kind: FeedbackAnimationKind;
  enabled: boolean;
  durationMs: number;
  translateYPx: number;
  scaleDelta: number;
  opacityPulse: number;
  easing: "easeOutCubic" | "linear";
}

interface FeedbackBaseSpec {
  durationMs: number;
  translateYPx: number;
  scaleDelta: number;
  opacityPulse: number;
}

const DECORATIVE_FEEDBACK: ReadonlySet<FeedbackAnimationKind> = new Set([
  "lineClear",
  "stateTransition"
]);

const MAX_TRANSLATE_Y_PX = 12;
const MAX_SCALE_DELTA = 0.08;
const MAX_OPACITY_PULSE = 0.2;

const FEEDBACK_BASE: Record<FeedbackAnimationKind, FeedbackBaseSpec> = {
  lineClear: {
    durationMs: 220,
    translateYPx: 10,
    scaleDelta: 0.05,
    opacityPulse: 0.18
  },
  pieceLock: {
    durationMs: 120,
    translateYPx: 4,
    scaleDelta: 0.02,
    opacityPulse: 0.12
  },
  stateTransition: {
    durationMs: 260,
    translateYPx: 8,
    scaleDelta: 0.03,
    opacityPulse: 0.16
  },
  buttonPress: {
    durationMs: 90,
    translateYPx: 2,
    scaleDelta: 0.015,
    opacityPulse: 0.1
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveMotionProfile(
  input: MotionPreferenceInput
): MotionProfile {
  const reducedMotion =
    input.prefersReducedMotion || input.allowMotionEffects === false;

  return {
    reducedMotion,
    transitionDurationScale: reducedMotion ? 0.4 : 1,
    feedbackDurationScale: reducedMotion ? 0.5 : 1,
    allowFeedback: (kind: FeedbackAnimationKind): boolean => {
      if (!input.allowMotionEffects) {
        return false;
      }

      if (reducedMotion && DECORATIVE_FEEDBACK.has(kind)) {
        return false;
      }

      return true;
    }
  };
}

function computeBaseTransitionDuration(
  from: RuntimeViewState,
  to: RuntimeViewState
): number {
  if (from === "gameOver" && to === "results") {
    return 320;
  }

  const summaryStates: ReadonlySet<RuntimeViewState> = new Set([
    "results",
    "leaderboard"
  ]);

  if (summaryStates.has(from) && summaryStates.has(to)) {
    return 180;
  }

  const gameplayStates: ReadonlySet<RuntimeViewState> = new Set([
    "playing",
    "paused",
    "gameOver"
  ]);

  if (gameplayStates.has(from) || gameplayStates.has(to)) {
    return 240;
  }

  return 220;
}

function deriveContinuityAnchor(
  from: RuntimeViewState,
  to: RuntimeViewState
): "board" | "summary" {
  const summaryStates: ReadonlySet<RuntimeViewState> = new Set([
    "results",
    "leaderboard"
  ]);

  if (summaryStates.has(from) && summaryStates.has(to)) {
    return "summary";
  }

  return "board";
}

export function buildStateTransitionPlan(
  request: TransitionRequest
): StateTransitionPlan {
  const { from, to, motion } = request;

  if (from === to) {
    return {
      from,
      to,
      continuityAnchor: deriveContinuityAnchor(from, to),
      preserveBoardSnapshot: from !== "results" && from !== "leaderboard",
      preserveScoreHud: true,
      easing: motion.reducedMotion ? "linear" : "easeOutCubic",
      durationMs: 0,
      steps: []
    };
  }

  const continuityAnchor = deriveContinuityAnchor(from, to);
  const preserveBoardSnapshot = continuityAnchor === "board";
  const preserveScoreHud = true;

  const durationMs = Math.round(
    computeBaseTransitionDuration(from, to) * motion.transitionDurationScale
  );
  const constrainedDuration = clamp(durationMs, 80, 360);

  const holdDuration = Math.round(constrainedDuration * 0.25);
  const crossfadeDuration = Math.round(constrainedDuration * 0.55);
  const settleDuration =
    constrainedDuration - holdDuration - crossfadeDuration;

  const boardScaleMin = motion.reducedMotion
    ? 1
    : continuityAnchor === "board"
      ? 0.97
      : 0.99;

  const overlayPeakOpacity = motion.reducedMotion
    ? 0.2
    : to === "paused"
      ? 0.44
      : to === "gameOver"
        ? 0.5
        : to === "results"
          ? 0.34
          : to === "leaderboard"
            ? 0.28
            : 0.22;

  const steps: [TransitionStep, TransitionStep, TransitionStep] = [
    {
      name: "holdOutgoing",
      durationMs: holdDuration,
      outgoingOpacity: 1,
      incomingOpacity: 0,
      boardScale: 1,
      overlayOpacity: 0
    },
    {
      name: "crossfade",
      durationMs: crossfadeDuration,
      outgoingOpacity: 0.4,
      incomingOpacity: 0.6,
      boardScale: boardScaleMin,
      overlayOpacity: overlayPeakOpacity
    },
    {
      name: "settleIncoming",
      durationMs: settleDuration,
      outgoingOpacity: 0,
      incomingOpacity: 1,
      boardScale: 1,
      overlayOpacity: overlayPeakOpacity * 0.5
    }
  ];

  return {
    from,
    to,
    continuityAnchor,
    preserveBoardSnapshot,
    preserveScoreHud,
    easing: motion.reducedMotion ? "linear" : "easeOutCubic",
    durationMs: constrainedDuration,
    steps
  };
}

export function resolveFeedbackAnimation(
  kind: FeedbackAnimationKind,
  motion: MotionProfile
): FeedbackAnimationSpec {
  const enabled = motion.allowFeedback(kind);

  if (!enabled) {
    return {
      kind,
      enabled: false,
      durationMs: 0,
      translateYPx: 0,
      scaleDelta: 0,
      opacityPulse: 0,
      easing: "linear"
    };
  }

  const baseSpec = FEEDBACK_BASE[kind];
  const durationMs = clamp(
    Math.round(baseSpec.durationMs * motion.feedbackDurationScale),
    60,
    baseSpec.durationMs
  );

  const reducedTranslate = motion.reducedMotion
    ? Math.min(baseSpec.translateYPx, 3)
    : baseSpec.translateYPx;
  const reducedScale = motion.reducedMotion
    ? Math.min(baseSpec.scaleDelta, 0.015)
    : baseSpec.scaleDelta;
  const reducedOpacity = motion.reducedMotion
    ? Math.min(baseSpec.opacityPulse, 0.08)
    : baseSpec.opacityPulse;

  return {
    kind,
    enabled: true,
    durationMs,
    translateYPx: clamp(reducedTranslate, 0, MAX_TRANSLATE_Y_PX),
    scaleDelta: clamp(reducedScale, 0, MAX_SCALE_DELTA),
    opacityPulse: clamp(reducedOpacity, 0, MAX_OPACITY_PULSE),
    easing: motion.reducedMotion ? "linear" : "easeOutCubic"
  };
}
