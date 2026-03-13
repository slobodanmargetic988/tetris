import { describe, expect, it } from "vitest";

import {
  createReplayFreshState,
  loadLeaderboardSnapshot,
  rankEntriesDeterministically,
  saveLeaderboardSnapshot,
  type PersistedScoreEntry,
  type ReplaySessionState,
} from "../../src/contracts/persistenceRanking";

describe("TASK-016 deterministic ranking + replay reset boundaries", () => {
  it("projects deterministic ranking order with stable tie-break rules across permutations", () => {
    const entries: PersistedScoreEntry[] = [
      { playerName: "zoe", score: 2000, lines: 25, achievedAt: "2026-03-13T10:02:00.000Z" },
      { playerName: "ALICE", score: 2000, lines: 27, achievedAt: "2026-03-13T10:01:00.000Z" },
      { playerName: "bob", score: 2000, lines: 27, achievedAt: "2026-03-13T10:01:00.000Z" },
      { playerName: "MIKE", score: 1500, lines: 20, achievedAt: "2026-03-13T10:05:00.000Z" },
    ];

    const permutationA = entries;
    const permutationB = [entries[3], entries[0], entries[2], entries[1]];

    const rankedA = rankEntriesDeterministically(permutationA);
    const rankedB = rankEntriesDeterministically(permutationB);

    expect(rankedA.map((entry) => entry.playerName)).toEqual(["ALICE", "bob", "zoe", "MIKE"]);
    expect(rankedA.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(rankedB).toEqual(rankedA);
  });

  it("resets volatile run state for replay while leaderboard persistence remains unchanged", () => {
    const persistedEntries: PersistedScoreEntry[] = [
      { playerName: "ALICE", score: 2400, lines: 31, achievedAt: "2026-03-13T12:00:00.000Z" },
      { playerName: "BOB", score: 1800, lines: 24, achievedAt: "2026-03-13T12:01:00.000Z" },
    ];
    const previousRun: ReplaySessionState = {
      runId: "run-001",
      score: 8200,
      lines: 103,
      level: 11,
      board: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => 1)),
    };

    const rawBeforeReplay = saveLeaderboardSnapshot(persistedEntries);
    const replay = createReplayFreshState(previousRun, "run-002");
    const loadedAfterReplay = loadLeaderboardSnapshot(rawBeforeReplay);

    expect(replay).toEqual({
      runId: "run-002",
      score: 0,
      lines: 0,
      level: 1,
      board: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => 0)),
    });
    expect(loadedAfterReplay).toEqual({
      entries: persistedEntries,
      corruptionRecovered: false,
    });
    expect(previousRun).toEqual({
      runId: "run-001",
      score: 8200,
      lines: 103,
      level: 11,
      board: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => 1)),
    });
  });
});
