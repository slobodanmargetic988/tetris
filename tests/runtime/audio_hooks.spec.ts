import { describe, expect, it } from "vitest";
import {
  buildAudioMixSnapshot,
  createAudioControlState,
  installRenderHook,
  patchAudioControlState,
  type RenderHookTarget
} from "../../src/contracts/polishAudioHooks";

describe("TASK-018 runtime audio controls and render hook", () => {
  it("keeps gameplay unblocked when autoplay and asset loading fail", () => {
    const state = createAudioControlState({
      hasAudioContext: true,
      autoplayAllowed: false,
      assetsLoaded: false,
      assetFailureReason: "music asset failed to decode"
    });

    expect(state.enabled).toBe(false);
    expect(state.gameplayBlocked).toBe(false);
    expect(state.fallbackReason).toContain("autoplay");
    expect(state.fallbackReason).toContain("music asset failed to decode");
  });

  it("applies master/music/sfx/mute controls even while playback fallback is active", () => {
    const initial = createAudioControlState({
      hasAudioContext: true,
      autoplayAllowed: false
    });

    const patched = patchAudioControlState(initial, {
      masterVolume: 0.5,
      musicVolume: 0.2,
      sfxVolume: 0.9,
      muted: true
    });

    expect(patched.masterVolume).toBe(0.5);
    expect(patched.musicVolume).toBe(0.2);
    expect(patched.sfxVolume).toBe(0.9);
    expect(patched.muted).toBe(true);

    const mix = buildAudioMixSnapshot(patched);
    expect(mix.playbackEnabled).toBe(false);
    expect(mix.masterGain).toBe(0);
    expect(mix.musicGain).toBe(0);
    expect(mix.sfxGain).toBe(0);
  });

  it("restores deterministic render_game_to_text output", () => {
    const hookTarget: RenderHookTarget = {};
    installRenderHook(hookTarget, {
      score: 1600.4,
      lines: 12.2,
      level: 4.49,
      boardText: "..........\r\n..XX......\r\n..XX......"
    });

    expect(typeof hookTarget.render_game_to_text).toBe("function");

    const first = hookTarget.render_game_to_text?.();
    const second = hookTarget.render_game_to_text?.();

    expect(first).toBe(second);
    expect(first).toBe(
      [
        "SCORE:1600",
        "LINES:12",
        "LEVEL:4",
        "BOARD:",
        "..........",
        "..XX......",
        "..XX......"
      ].join("\\n")
    );
  });
});
