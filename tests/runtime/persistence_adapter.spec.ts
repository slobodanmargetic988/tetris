import { describe, expect, it } from "vitest";

import {
  LEADERBOARD_STORAGE_KEY,
  LOCAL_PERSISTENCE_SCHEMA_VERSION,
  createLeaderboardPersistenceAdapter,
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

describe("TASK-015 persistence adapter", () => {
  it("writes and reads versioned payloads with validated leaderboard entries", () => {
    const storage = createMemoryStorage();
    const entries: PersistedLeaderboardEntry[] = [
      { playerName: "ALICE", score: 2400, lines: 31, achievedAt: "2026-03-13T12:00:00.000Z" },
      { playerName: "BOB", score: 1800, lines: 24, achievedAt: "2026-03-13T12:01:00.000Z" },
    ];

    const saveResult = saveLeaderboardToStorage(storage, entries);
    const raw = storage.dump()[LEADERBOARD_STORAGE_KEY];
    const parsed = JSON.parse(raw);
    const loaded = loadLeaderboardFromStorage(storage);

    expect(saveResult.saved).toBe(true);
    expect(parsed).toEqual({
      schemaVersion: LOCAL_PERSISTENCE_SCHEMA_VERSION,
      entries,
    });
    expect(loaded).toEqual({
      entries,
      corruptionRecovered: false,
    });
  });

  it("recovers safely from malformed legacy entries and keeps valid ones", () => {
    const legacyRaw = JSON.stringify([
      { name: "ALICE", score: 1000, lines: 10, date: "2026-03-13T10:00:00.000Z" },
      { name: "BROKEN", score: "1000", lines: 10, date: "2026-03-13T10:01:00.000Z" },
      { playerName: "BOB", score: 900, lines: 8, achievedAt: "2026-03-13T10:02:00.000Z" },
      { playerName: "NO_DATE", score: 500, lines: 5 },
    ]);
    const storage = createMemoryStorage({
      [LEADERBOARD_STORAGE_KEY]: legacyRaw,
    });

    const loaded = loadLeaderboardFromStorage(storage);

    expect(loaded).toEqual({
      entries: [
        { playerName: "ALICE", score: 1000, lines: 10, achievedAt: "2026-03-13T10:00:00.000Z" },
        { playerName: "BOB", score: 900, lines: 8, achievedAt: "2026-03-13T10:02:00.000Z" },
      ],
      corruptionRecovered: true,
    });
  });

  it("never throws at startup when payload is missing, corrupt, or storage read fails", () => {
    const missingStorage = createMemoryStorage();
    const corruptStorage = createMemoryStorage({
      [LEADERBOARD_STORAGE_KEY]: "{\"schemaVersion\":1,\"entries\":[",
    });
    const throwingStorage: KeyValueStorage = {
      getItem() {
        throw new Error("storage unavailable");
      },
      setItem() {
        throw new Error("storage unavailable");
      },
    };

    expect(() => loadLeaderboardFromStorage(missingStorage)).not.toThrow();
    expect(loadLeaderboardFromStorage(missingStorage)).toEqual({
      entries: [],
      corruptionRecovered: false,
    });

    expect(() => loadLeaderboardFromStorage(corruptStorage)).not.toThrow();
    expect(loadLeaderboardFromStorage(corruptStorage)).toEqual({
      entries: [],
      corruptionRecovered: true,
    });

    expect(() => loadLeaderboardFromStorage(throwingStorage)).not.toThrow();
    expect(loadLeaderboardFromStorage(throwingStorage)).toEqual({
      entries: [],
      corruptionRecovered: true,
    });
  });

  it("provides an adapter wrapper for runtime callers", () => {
    const storage = createMemoryStorage();
    const adapter = createLeaderboardPersistenceAdapter(storage);
    const entries: PersistedLeaderboardEntry[] = [
      { playerName: "CHRIS", score: 700, lines: 7, achievedAt: "2026-03-13T09:00:00.000Z" },
    ];

    adapter.saveLeaderboard(entries);

    expect(adapter.loadLeaderboard()).toEqual({
      entries,
      corruptionRecovered: false,
    });
  });
});
