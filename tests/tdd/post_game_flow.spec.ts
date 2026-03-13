import { describe, expect, it, vi } from "vitest";
import { createPostGameFlowController } from "../../src/post_game_flow";

describe("TASK-004 post-game flow contract (red)", () => {
  it("transitions top-out to results and allows exactly one validated score submission", async () => {
    const persistScore = vi.fn(async () => ({ id: "score-1", rank: 7 }));
    const flow = createPostGameFlowController({ persistScore });

    const resultsState = flow.onTopOut({
      score: 4200,
      lines: 28,
      level: 5,
    });

    expect(resultsState.phase).toBe("results");
    expect(resultsState.pendingTopOut).toEqual({
      score: 4200,
      lines: 28,
      level: 5,
    });

    flow.setPlayerName(" ");
    await expect(flow.submitScore()).rejects.toThrow("valid player name");
    expect(persistScore).toHaveBeenCalledTimes(0);

    flow.setPlayerName("Ada");
    const submitted = await flow.submitScore();

    expect(submitted.submission.submitted).toBe(true);
    expect(submitted.submission.record).toEqual({ id: "score-1", rank: 7 });
    expect(persistScore).toHaveBeenCalledTimes(1);
    expect(persistScore).toHaveBeenCalledWith({
      playerName: "Ada",
      score: 4200,
      lines: 28,
      level: 5,
    });

    await expect(flow.submitScore()).rejects.toThrow("already submitted");
    expect(persistScore).toHaveBeenCalledTimes(1);
  });

  it("supports start-new-game directly from results with clean run state", () => {
    const flow = createPostGameFlowController({
      persistScore: vi.fn(async () => ({ id: "unused", rank: 0 })),
    });

    flow.onTopOut({
      score: 1500,
      lines: 11,
      level: 3,
    });

    const next = flow.startNewGame("results");
    expect(next.phase).toBe("playing");
    expect(next.runId).toBe(2);
    expect(next.pendingTopOut).toBeNull();
    expect(next.playerName).toBe("");
    expect(next.submission).toEqual({
      attempts: 0,
      submitted: false,
      record: null,
    });
  });

  it("supports start-new-game from leaderboard and clears post-game remnants", async () => {
    const flow = createPostGameFlowController({
      persistScore: vi.fn(async () => ({ id: "score-2", rank: 10 })),
    });

    flow.onTopOut({
      score: 999,
      lines: 9,
      level: 2,
    });
    flow.setPlayerName("Nova");
    await flow.submitScore();
    const leaderboard = flow.viewLeaderboard();
    expect(leaderboard.phase).toBe("leaderboard");

    const restarted = flow.startNewGame("leaderboard");
    expect(restarted.phase).toBe("playing");
    expect(restarted.pendingTopOut).toBeNull();
    expect(restarted.playerName).toBe("");
    expect(restarted.submission).toEqual({
      attempts: 0,
      submitted: false,
      record: null,
    });
  });
});
