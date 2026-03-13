import { describe, expect, it } from "vitest";
import {
  createAudioControlState,
  installRenderHook,
  resolveMotionSettings,
  type RenderHookTarget
} from "../../src/contracts/polishAudioHooks";

describe("TASK-006 polish motion/audio/render hooks contracts", () => {
  it("defaults to reduced-motion when the OS preference requests it", () => {
    const settings = resolveMotionSettings({
      prefersReducedMotion: true,
      playerMotionEnabled: true
    });

    expect(settings.reducedMotion).toBe(true);
    expect(settings.allowFeedbackAnimation("lineClear")).toBe(false);
    expect(settings.allowFeedbackAnimation("pieceLock")).toBe(true);
  });

  it("keeps critical feedback rendering inside allowed boundaries", () => {
    const settings = resolveMotionSettings({
      prefersReducedMotion: true,
      playerMotionEnabled: false
    });

    expect(settings.allowFeedbackAnimation("pieceLock")).toBe(true);
    expect(settings.allowFeedbackAnimation("gameTransition")).toBe(false);
  });

  it("falls back cleanly when audio context or autoplay is unavailable", () => {
    const noContext = createAudioControlState({
      hasAudioContext: false,
      autoplayAllowed: true
    });
    expect(noContext.enabled).toBe(false);
    expect(noContext.fallbackReason).toContain("AudioContext");

    const blockedAutoplay = createAudioControlState({
      hasAudioContext: true,
      autoplayAllowed: false
    });
    expect(blockedAutoplay.enabled).toBe(false);
    expect(blockedAutoplay.fallbackReason).toContain("autoplay");
  });

  it("installs window.render_game_to_text and returns deterministic HUD text", () => {
    const hookTarget: RenderHookTarget = {};
    installRenderHook(hookTarget, {
      score: 1200,
      lines: 9,
      level: 3,
      boardText: "..........\\n..XX......\\n..XX......"
    });

    expect(typeof hookTarget.render_game_to_text).toBe("function");
    expect(hookTarget.render_game_to_text?.()).toBe(
      [
        "SCORE:1200",
        "LINES:9",
        "LEVEL:3",
        "BOARD:",
        "..........",
        "..XX......",
        "..XX......"
      ].join("\\n")
    );
  });
});
