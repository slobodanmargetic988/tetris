import { describe, expect, it } from "vitest";

import {
  PERSISTENCE_SCHEMA_VERSION,
  createReplayFreshState,
  loadLeaderboardSnapshot,
  rankEntriesDeterministically,
  saveLeaderboardSnapshot,
  type PersistedScoreEntry,
  type ReplaySessionState,
} from "../../src/contracts/persistenceRanking";

describe("TASK-005 persistence schema + deterministic ranking + corruption recovery", () => {
  it("saves/loads leaderboard entries using a versioned schema contract", () => {
    const entries: PersistedScoreEntry[] = [
      { playerName: "ALICE", score: 1200, lines: 18, achievedAt: "2026-03-13T12:00:00.000Z" },
      { playerName: "BOB", score: 950, lines: 12, achievedAt: "2026-03-13T12:01:00.000Z" },
    ];

    const raw = saveLeaderboardSnapshot(entries);
    const parsed = JSON.parse(raw);

    expect(parsed).toEqual({
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      entries,
    });

    expect(loadLeaderboardSnapshot(raw)).toEqual({
      entries,
      corruptionRecovered: false,
    });
  });

  it("ranks entries deterministically across permutations using stable tie-break rules", () => {
    const sameScoreDifferentTieBreaks: PersistedScoreEntry[] = [
      { playerName: "zoe", score: 2000, lines: 25, achievedAt: "2026-03-13T10:02:00.000Z" },
      { playerName: "ALICE", score: 2000, lines: 27, achievedAt: "2026-03-13T10:01:00.000Z" },
      { playerName: "bob", score: 2000, lines: 27, achievedAt: "2026-03-13T10:01:00.000Z" },
      { playerName: "MIKE", score: 1500, lines: 20, achievedAt: "2026-03-13T10:05:00.000Z" },
    ];

    const permutationA = sameScoreDifferentTieBreaks;
    const permutationB = [
      sameScoreDifferentTieBreaks[3],
      sameScoreDifferentTieBreaks[0],
      sameScoreDifferentTieBreaks[2],
      sameScoreDifferentTieBreaks[1],
    ];

    const rankedA = rankEntriesDeterministically(permutationA);
    const rankedB = rankEntriesDeterministically(permutationB);

    const orderedNames = rankedA.map((entry) => entry.playerName);

    expect(orderedNames).toEqual(["ALICE", "bob", "zoe", "MIKE"]);
    expect(rankedA.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(rankedB.map((entry) => entry.playerName)).toEqual(orderedNames);
    expect(rankedB.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
  });

  it("falls back to empty leaderboard when persistence payload is corrupted", () => {
    const result = loadLeaderboardSnapshot("{\"schemaVersion\":1,\"entries\":[");

    expect(result).toEqual({
      entries: [],
      corruptionRecovered: true,
    });
  });

  it("replay always starts from a fresh run state without stale counters or occupied board", () => {
    const previousRun: ReplaySessionState = {
      runId: "run-001",
      score: 8200,
      lines: 103,
      level: 11,
      board: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => 1)),
    };

    const replay = createReplayFreshState(previousRun, "run-002");

    expect(replay.runId).toBe("run-002");
    expect(replay.score).toBe(0);
    expect(replay.lines).toBe(0);
    expect(replay.level).toBe(1);
    expect(replay.board).toHaveLength(20);
    expect(replay.board.every((row) => row.length === 10)).toBe(true);
    expect(replay.board.every((row) => row.every((cell) => cell === 0))).toBe(true);
  });
});
