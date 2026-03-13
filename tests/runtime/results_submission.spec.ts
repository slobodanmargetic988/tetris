import { describe, expect, it, vi } from "vitest";
import { createPostGameFlowController } from "../../src/post_game_flow";

describe("TASK-013 results submission flow", () => {
  it("auto-transitions top-out to results and requires a valid non-empty name", async () => {
    const persistScore = vi.fn(async () => ({ id: "score-1", rank: 4 }));
    const flow = createPostGameFlowController({ persistScore });

    const stateAfterTopOut = flow.onTopOut({
      score: 4200,
      lines: 28,
      level: 5,
    });

    expect(stateAfterTopOut.phase).toBe("results");
    expect(stateAfterTopOut.pendingTopOut).toEqual({
      score: 4200,
      lines: 28,
      level: 5,
    });

    flow.setPlayerName(" ");
    await expect(flow.submitScore()).rejects.toThrow("valid player name");

    flow.setPlayerName("!bad!");
    await expect(flow.submitScore()).rejects.toThrow("valid player name");
    expect(persistScore).toHaveBeenCalledTimes(0);

    flow.setPlayerName("Ada");
    await flow.submitScore();
    expect(persistScore).toHaveBeenCalledTimes(1);
  });

  it("deduplicates repeated submit triggers to a single persisted score", async () => {
    let resolvePersist: ((value: { id: string; rank: number }) => void) | null =
      null;
    const persistScore = vi.fn(
      () =>
        new Promise<{ id: string; rank: number }>((resolve) => {
          resolvePersist = resolve;
        }),
    );
    const flow = createPostGameFlowController({ persistScore });

    flow.onTopOut({
      score: 9001,
      lines: 40,
      level: 9,
    });
    flow.setPlayerName("Nova");

    const submitViaEnter = flow.submitScore();
    const submitViaClick = flow.submitScore();

    expect(persistScore).toHaveBeenCalledTimes(1);
    resolvePersist!({ id: "score-2", rank: 1 });

    const [enterResult, clickResult] = await Promise.all([
      submitViaEnter,
      submitViaClick,
    ]);

    expect(enterResult.submission.submitted).toBe(true);
    expect(clickResult.submission.submitted).toBe(true);
    expect(enterResult.submission.record).toEqual({ id: "score-2", rank: 1 });
    expect(persistScore).toHaveBeenCalledTimes(1);
  });
});
