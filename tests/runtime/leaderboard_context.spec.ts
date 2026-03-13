import { describe, expect, it, vi } from "vitest";
import { createPostGameFlowController, type LeaderboardEntry } from "../../src/post_game_flow";

const buildLeaderboardEntries = (
  total: number,
  overrides: Partial<LeaderboardEntry> = {},
): LeaderboardEntry[] =>
  Array.from({ length: total }, (_, index) => {
    const rank = index + 1;
    return {
      id: `score-${rank}`,
      rank,
      playerName: `Player ${rank}`,
      score: 20_000 - rank * 100,
      lines: 40 - Math.min(rank, 30),
      level: 10 - Math.min(rank, 9),
      ...overrides,
    };
  });

describe("TASK-014 leaderboard context and replay CTA", () => {
  it("renders top ten and appends current-player global rank context when outside top ten", async () => {
    const flow = createPostGameFlowController({
      persistScore: vi.fn(async () => ({ id: "score-12", rank: 12 })),
    });

    const results = flow.onTopOut({
      score: 4200,
      lines: 28,
      level: 5,
    });
    expect(results.phase).toBe("results");
    expect(results.cta.canStartNewGame).toBe(true);

    flow.setPlayerName("Ada");
    await flow.submitScore();

    const entries = buildLeaderboardEntries(15);
    entries[11] = {
      ...entries[11],
      id: "score-12",
      playerName: "Ada",
      score: 4200,
      lines: 28,
      level: 5,
    };

    const leaderboard = flow.viewLeaderboard(entries);
    expect(leaderboard.phase).toBe("leaderboard");
    expect(leaderboard.cta.canStartNewGame).toBe(true);
    expect(leaderboard.leaderboard.topTen).toHaveLength(10);
    expect(leaderboard.leaderboard.topTen.map((entry) => entry.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(leaderboard.leaderboard.currentPlayerOutsideTopTen).toEqual({
      id: "score-12",
      rank: 12,
      playerName: "Ada",
      score: 4200,
      lines: 28,
      level: 5,
    });
  });

  it("resets to a fresh playing run when start-new-game is triggered from results or leaderboard", async () => {
    const persistScore = vi.fn(async () => ({ id: "score-18", rank: 18 }));
    const flowFromResults = createPostGameFlowController({ persistScore });

    flowFromResults.onTopOut({
      score: 1500,
      lines: 11,
      level: 3,
    });
    const restartedFromResults = flowFromResults.startNewGame("results");
    expect(restartedFromResults.phase).toBe("playing");
    expect(restartedFromResults.runId).toBe(2);
    expect(restartedFromResults.pendingTopOut).toBeNull();
    expect(restartedFromResults.playerName).toBe("");
    expect(restartedFromResults.cta.canStartNewGame).toBe(false);
    expect(restartedFromResults.leaderboard.topTen).toEqual([]);
    expect(restartedFromResults.leaderboard.currentPlayerOutsideTopTen).toBeNull();
    expect(restartedFromResults.submission).toEqual({
      attempts: 0,
      submitted: false,
      record: null,
    });

    const flowFromLeaderboard = createPostGameFlowController({ persistScore });
    flowFromLeaderboard.onTopOut({
      score: 3333,
      lines: 20,
      level: 6,
    });
    flowFromLeaderboard.setPlayerName("Nova");
    await flowFromLeaderboard.submitScore();
    flowFromLeaderboard.viewLeaderboard(buildLeaderboardEntries(20));

    const restartedFromLeaderboard = flowFromLeaderboard.startNewGame("leaderboard");
    expect(restartedFromLeaderboard.phase).toBe("playing");
    expect(restartedFromLeaderboard.runId).toBe(2);
    expect(restartedFromLeaderboard.pendingTopOut).toBeNull();
    expect(restartedFromLeaderboard.playerName).toBe("");
    expect(restartedFromLeaderboard.cta.canStartNewGame).toBe(false);
    expect(restartedFromLeaderboard.leaderboard.topTen).toEqual([]);
    expect(restartedFromLeaderboard.leaderboard.currentPlayerOutsideTopTen).toBeNull();
    expect(restartedFromLeaderboard.submission).toEqual({
      attempts: 0,
      submitted: false,
      record: null,
    });
  });
});
