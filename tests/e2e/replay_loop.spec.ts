import { describe, expect, it, vi } from "vitest";
import {
  createPostGameFlowController,
  type LeaderboardEntry,
  type ScoreSubmissionRecord,
  type TopOutSnapshot,
} from "../../src/post_game_flow";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | null = null;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return {
    promise,
    resolve: (value) => {
      resolve!(value);
    },
  };
}

function buildLeaderboard(
  submitted: ScoreSubmissionRecord,
  playerName: string,
  snapshot: TopOutSnapshot,
): LeaderboardEntry[] {
  const rows: LeaderboardEntry[] = Array.from({ length: 15 }, (_, index) => {
    const rank = index + 1;
    return {
      id: `score-${rank}`,
      rank,
      playerName: `Player ${rank}`,
      score: 20_000 - rank * 100,
      lines: 60 - rank,
      level: Math.max(1, 15 - rank),
    };
  });

  rows[submitted.rank - 1] = {
    id: submitted.id,
    rank: submitted.rank,
    playerName,
    score: snapshot.score,
    lines: snapshot.lines,
    level: snapshot.level,
  };

  return rows;
}

describe("TASK-025 replay loop hardening", () => {
  it("supports repeated top-out to results to leaderboard to new-game cycles with clean state", async () => {
    let submissionId = 0;
    const persistScore = vi.fn(async () => {
      submissionId += 1;
      return { id: `score-run-${submissionId}`, rank: 12 };
    });
    const flow = createPostGameFlowController({ persistScore });

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      const snapshot = {
        score: 1_000 + cycle * 500,
        lines: cycle * 8,
        level: cycle + 1,
      };
      const playerName = `Player${cycle}`;

      const results = flow.onTopOut(snapshot);
      expect(results.phase).toBe("results");
      expect(results.runId).toBe(cycle);
      expect(results.pendingTopOut).toEqual(snapshot);
      expect(results.playerName).toBe("");

      flow.setPlayerName(playerName);
      const submitted = await flow.submitScore();
      expect(submitted.submission.submitted).toBe(true);
      expect(submitted.submission.record).toEqual({
        id: `score-run-${cycle}`,
        rank: 12,
      });

      const leaderboard = flow.viewLeaderboard(
        buildLeaderboard(submitted.submission.record!, playerName, snapshot),
      );
      expect(leaderboard.phase).toBe("leaderboard");
      expect(leaderboard.leaderboard.topTen).toHaveLength(10);
      expect(leaderboard.leaderboard.currentPlayerOutsideTopTen).toEqual({
        id: `score-run-${cycle}`,
        rank: 12,
        playerName,
        score: snapshot.score,
        lines: snapshot.lines,
        level: snapshot.level,
      });

      const restarted = flow.startNewGame("leaderboard");
      expect(restarted.phase).toBe("playing");
      expect(restarted.runId).toBe(cycle + 1);
      expect(restarted.pendingTopOut).toBeNull();
      expect(restarted.playerName).toBe("");
      expect(restarted.leaderboard.topTen).toEqual([]);
      expect(restarted.leaderboard.currentPlayerOutsideTopTen).toBeNull();
      expect(restarted.submission).toEqual({
        attempts: 0,
        submitted: false,
        record: null,
      });
    }

    expect(persistScore).toHaveBeenCalledTimes(3);
  });

  it("isolates in-flight submissions so old-run completion cannot contaminate the next replay", async () => {
    const firstSubmission = createDeferred<ScoreSubmissionRecord>();
    const secondSubmission = createDeferred<ScoreSubmissionRecord>();
    const persistScore = vi
      .fn()
      .mockImplementationOnce(() => firstSubmission.promise)
      .mockImplementationOnce(() => secondSubmission.promise);
    const flow = createPostGameFlowController({ persistScore });

    flow.onTopOut({
      score: 4_200,
      lines: 28,
      level: 5,
    });
    flow.setPlayerName("Alpha");
    const runOneSubmit = flow.submitScore();

    flow.viewLeaderboard([]);
    flow.startNewGame("leaderboard");

    const secondRunResults = flow.onTopOut({
      score: 5_400,
      lines: 30,
      level: 6,
    });
    expect(secondRunResults.runId).toBe(2);

    flow.setPlayerName("Beta");
    const runTwoSubmit = flow.submitScore();

    expect(persistScore).toHaveBeenCalledTimes(2);

    firstSubmission.resolve({ id: "score-alpha", rank: 6 });
    await runOneSubmit;

    const stateAfterFirstCompletion = flow.getState();
    expect(stateAfterFirstCompletion.runId).toBe(2);
    expect(stateAfterFirstCompletion.submission.submitted).toBe(false);
    expect(stateAfterFirstCompletion.submission.record).toBeNull();

    secondSubmission.resolve({ id: "score-beta", rank: 4 });
    const completedRunTwo = await runTwoSubmit;
    expect(completedRunTwo.runId).toBe(2);
    expect(completedRunTwo.submission.submitted).toBe(true);
    expect(completedRunTwo.submission.record).toEqual({
      id: "score-beta",
      rank: 4,
    });
    expect(completedRunTwo.submission.attempts).toBe(1);
  });
});
