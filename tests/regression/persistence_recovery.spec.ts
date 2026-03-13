import { describe, expect, it } from "vitest";

import {
  LEADERBOARD_STORAGE_KEY,
  LOCAL_PERSISTENCE_SCHEMA_VERSION,
  loadLeaderboardFromStorage,
  saveLeaderboardToStorage,
  type KeyValueStorage,
  type PersistedLeaderboardEntry,
} from "../../src/runtime/persistenceAdapter";

function createMemoryStorage(initial?: Record<string, string>): KeyValueStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial ?? {}));

  return {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

describe("TASK-027 persistence recovery regression", () => {
  it("keeps valid historical highscores when recovering malformed legacy payloads", () => {
    const expectedEntries: PersistedLeaderboardEntry[] = [
      { playerName: "ALICE", score: 2400, lines: 31, achievedAt: "2026-03-13T12:00:00.000Z" },
      { playerName: "BOB", score: 1800, lines: 24, achievedAt: "2026-03-13T12:01:00.000Z" },
    ];

    const storage = createMemoryStorage({
      [LEADERBOARD_STORAGE_KEY]: JSON.stringify([
        { name: "ALICE", score: 2400, lines: 31, date: "2026-03-13T12:00:00.000Z" },
        { name: "BROKEN_SCORE", score: "2400", lines: 31, date: "2026-03-13T12:00:30.000Z" },
        { playerName: "BOB", score: 1800, lines: 24, achievedAt: "2026-03-13T12:01:00.000Z" },
        { playerName: "BROKEN_DATE", score: 1000, lines: 12 },
      ]),
    });

    const recovered = loadLeaderboardFromStorage(storage);

    expect(recovered).toEqual({
      entries: expectedEntries,
      corruptionRecovered: true,
    });

    const backfillResult = saveLeaderboardToStorage(storage, recovered.entries);
    const backfilled = loadLeaderboardFromStorage(storage);

    expect(backfillResult.saved).toBe(true);
    expect(backfillResult.entriesPersisted).toBe(expectedEntries.length);
    expect(backfillResult.payload).toEqual({
      schemaVersion: LOCAL_PERSISTENCE_SCHEMA_VERSION,
      entries: expectedEntries,
    });
    expect(backfilled).toEqual({
      entries: expectedEntries,
      corruptionRecovered: false,
    });
  });

  it("keeps migration/backfill deterministic and idempotent across repeated runs", () => {
    const legacyWrapped = {
      schemaVersion: 0,
      entries: [
        { playerName: "CARA", score: 5000, lines: 56, achievedAt: "2026-03-13T09:00:00.000Z" },
        { name: "DAN", score: 4900, lines: 54, date: "2026-03-13T09:01:00.000Z" },
        { name: "BROKEN", score: 4800, lines: "50", date: "2026-03-13T09:02:00.000Z" },
      ],
    };
    const storage = createMemoryStorage({
      [LEADERBOARD_STORAGE_KEY]: JSON.stringify(legacyWrapped),
    });

    const firstLoad = loadLeaderboardFromStorage(storage);
    const firstBackfill = saveLeaderboardToStorage(storage, firstLoad.entries);
    const firstBackfillRaw = storage.dump()[LEADERBOARD_STORAGE_KEY];

    const secondLoad = loadLeaderboardFromStorage(storage);
    const secondBackfill = saveLeaderboardToStorage(storage, secondLoad.entries);
    const secondBackfillRaw = storage.dump()[LEADERBOARD_STORAGE_KEY];

    expect(firstLoad.corruptionRecovered).toBe(true);
    expect(firstLoad.entries).toEqual([
      { playerName: "CARA", score: 5000, lines: 56, achievedAt: "2026-03-13T09:00:00.000Z" },
      { playerName: "DAN", score: 4900, lines: 54, achievedAt: "2026-03-13T09:01:00.000Z" },
    ]);
    expect(firstBackfill.saved).toBe(true);

    expect(secondLoad).toEqual({
      entries: firstLoad.entries,
      corruptionRecovered: false,
    });
    expect(secondBackfill.saved).toBe(true);
    expect(secondBackfill.payload).toEqual(firstBackfill.payload);
    expect(secondBackfillRaw).toBe(firstBackfillRaw);
  });
});
