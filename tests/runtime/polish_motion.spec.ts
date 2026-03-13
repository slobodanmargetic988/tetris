import { describe, expect, it } from "vitest";
import {
  buildStateTransitionPlan,
  resolveFeedbackAnimation,
  resolveMotionProfile,
  type FeedbackAnimationKind,
  type RuntimeViewState
} from "../../src/runtime/polishMotion";

describe("TASK-017 runtime polish motion", () => {
  it("keeps visual continuity for playing/paused/gameOver/results transitions", () => {
    const motion = resolveMotionProfile({
      prefersReducedMotion: false,
      allowMotionEffects: true
    });

    const transitions: Array<[RuntimeViewState, RuntimeViewState]> = [
      ["playing", "paused"],
      ["paused", "playing"],
      ["playing", "gameOver"],
      ["gameOver", "results"]
    ];

    for (const [from, to] of transitions) {
      const plan = buildStateTransitionPlan({ from, to, motion });
      expect(plan.continuityAnchor).toBe("board");
      expect(plan.preserveBoardSnapshot).toBe(true);
      expect(plan.durationMs).toBeGreaterThan(0);
      expect(plan.steps).toHaveLength(3);
      const crossfadeStep = plan.steps[1];
      expect(crossfadeStep).toBeDefined();
      if (!crossfadeStep) {
        throw new Error("Expected crossfade step for active transition");
      }
      expect(crossfadeStep.incomingOpacity).toBeGreaterThan(0);
      expect(crossfadeStep.outgoingOpacity).toBeLessThan(1);
    }
  });

  it("keeps summary continuity between results and leaderboard", () => {
    const motion = resolveMotionProfile({
      prefersReducedMotion: false,
      allowMotionEffects: true
    });

    const toLeaderboard = buildStateTransitionPlan({
      from: "results",
      to: "leaderboard",
      motion
    });
    expect(toLeaderboard.continuityAnchor).toBe("summary");
    expect(toLeaderboard.preserveBoardSnapshot).toBe(false);
    expect(toLeaderboard.preserveScoreHud).toBe(true);

    const backToResults = buildStateTransitionPlan({
      from: "leaderboard",
      to: "results",
      motion
    });
    expect(backToResults.continuityAnchor).toBe("summary");
    expect(backToResults.durationMs).toBeGreaterThanOrEqual(160);
  });

  it("respects reduced-motion preferences while keeping critical feedback", () => {
    const fullMotion = resolveMotionProfile({
      prefersReducedMotion: false,
      allowMotionEffects: true
    });
    const reducedMotion = resolveMotionProfile({
      prefersReducedMotion: true,
      allowMotionEffects: true
    });

    const fullPlan = buildStateTransitionPlan({
      from: "playing",
      to: "paused",
      motion: fullMotion
    });
    const reducedPlan = buildStateTransitionPlan({
      from: "playing",
      to: "paused",
      motion: reducedMotion
    });

    expect(reducedPlan.durationMs).toBeLessThan(fullPlan.durationMs);
    expect(reducedPlan.steps.every((step) => step.boardScale === 1)).toBe(true);

    const fullLineClear = resolveFeedbackAnimation("lineClear", fullMotion);
    const reducedLineClear = resolveFeedbackAnimation("lineClear", reducedMotion);
    expect(fullLineClear.enabled).toBe(true);
    expect(reducedLineClear.enabled).toBe(false);

    const reducedPieceLock = resolveFeedbackAnimation("pieceLock", reducedMotion);
    expect(reducedPieceLock.enabled).toBe(true);
    expect(reducedPieceLock.durationMs).toBeLessThan(
      resolveFeedbackAnimation("pieceLock", fullMotion).durationMs
    );
    expect(reducedPieceLock.translateYPx).toBeLessThanOrEqual(3);
  });

  it("keeps feedback effects inside tasteful bounds", () => {
    const motion = resolveMotionProfile({
      prefersReducedMotion: false,
      allowMotionEffects: true
    });

    const kinds: FeedbackAnimationKind[] = [
      "lineClear",
      "pieceLock",
      "stateTransition",
      "buttonPress"
    ];

    for (const kind of kinds) {
      const animation = resolveFeedbackAnimation(kind, motion);
      expect(animation.enabled).toBe(true);
      expect(animation.translateYPx).toBeLessThanOrEqual(12);
      expect(animation.scaleDelta).toBeLessThanOrEqual(0.08);
      expect(animation.opacityPulse).toBeLessThanOrEqual(0.2);
    }
  });

  it("supports a full motion-off branch for players who disable effects", () => {
    const motionOff = resolveMotionProfile({
      prefersReducedMotion: false,
      allowMotionEffects: false
    });

    expect(motionOff.reducedMotion).toBe(true);
    expect(resolveFeedbackAnimation("pieceLock", motionOff).enabled).toBe(false);

    const transition = buildStateTransitionPlan({
      from: "results",
      to: "leaderboard",
      motion: motionOff
    });

    expect(transition.easing).toBe("linear");
    expect(transition.durationMs).toBeLessThan(180);
  });
});
