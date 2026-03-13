export const LOCAL_PERSISTENCE_SCHEMA_VERSION = 1;
export const LEADERBOARD_STORAGE_KEY = "tetris.leaderboard";

export type PersistedLeaderboardEntry = {
  playerName: string;
  score: number;
  lines: number;
  achievedAt: string;
};

export type VersionedLeaderboardPayload = {
  schemaVersion: number;
  entries: PersistedLeaderboardEntry[];
};

export type PersistenceLoadResult = {
  entries: PersistedLeaderboardEntry[];
  corruptionRecovered: boolean;
};

export type PersistenceSaveResult = {
  saved: boolean;
  entriesPersisted: number;
  payload: VersionedLeaderboardPayload;
};

export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type LeaderboardPersistenceAdapter = {
  loadLeaderboard(): PersistenceLoadResult;
  saveLeaderboard(entries: PersistedLeaderboardEntry[]): PersistenceSaveResult;
};

type LegacyLeaderboardEntry = {
  playerName?: unknown;
  name?: unknown;
  score?: unknown;
  lines?: unknown;
  achievedAt?: unknown;
  timestamp?: unknown;
  date?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : null;
}

function parseEntry(value: unknown): PersistedLeaderboardEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const legacy = value as LegacyLeaderboardEntry;
  const playerName = typeof legacy.playerName === "string" ? legacy.playerName : typeof legacy.name === "string" ? legacy.name : null;
  const score = parseNonNegativeInteger(legacy.score);
  const lines = parseNonNegativeInteger(legacy.lines);
  const achievedAt =
    typeof legacy.achievedAt === "string"
      ? legacy.achievedAt
      : typeof legacy.timestamp === "string"
        ? legacy.timestamp
        : typeof legacy.date === "string"
          ? legacy.date
          : null;

  if (playerName === null || achievedAt === null || score === null || lines === null) {
    return null;
  }

  return {
    playerName,
    score,
    lines,
    achievedAt,
  };
}

function sanitizeEntries(value: unknown): { entries: PersistedLeaderboardEntry[]; dropped: number; invalidContainer: boolean } {
  if (!Array.isArray(value)) {
    return { entries: [], dropped: 0, invalidContainer: true };
  }

  const entries: PersistedLeaderboardEntry[] = [];

  for (const item of value) {
    const parsed = parseEntry(item);
    if (parsed !== null) {
      entries.push(parsed);
    }
  }

  return {
    entries,
    dropped: value.length - entries.length,
    invalidContainer: false,
  };
}

export function loadLeaderboardFromStorage(storage: KeyValueStorage, key = LEADERBOARD_STORAGE_KEY): PersistenceLoadResult {
  let raw: string | null;

  try {
    raw = storage.getItem(key);
  } catch {
    return { entries: [], corruptionRecovered: true };
  }

  if (raw === null) {
    return { entries: [], corruptionRecovered: false };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], corruptionRecovered: true };
  }

  if (Array.isArray(parsed)) {
    const legacy = sanitizeEntries(parsed);
    return {
      entries: legacy.entries,
      corruptionRecovered: true,
    };
  }

  if (!isRecord(parsed)) {
    return { entries: [], corruptionRecovered: true };
  }

  const schemaVersion = parseNonNegativeInteger(parsed.schemaVersion);

  if (schemaVersion === LOCAL_PERSISTENCE_SCHEMA_VERSION) {
    const current = sanitizeEntries(parsed.entries);
    return {
      entries: current.entries,
      corruptionRecovered: current.invalidContainer || current.dropped > 0,
    };
  }

  if ("entries" in parsed) {
    const legacyWrapped = sanitizeEntries(parsed.entries);
    return {
      entries: legacyWrapped.entries,
      corruptionRecovered: true,
    };
  }

  return { entries: [], corruptionRecovered: true };
}

export function saveLeaderboardToStorage(
  storage: KeyValueStorage,
  entries: PersistedLeaderboardEntry[],
  key = LEADERBOARD_STORAGE_KEY,
): PersistenceSaveResult {
  const sanitized = sanitizeEntries(entries).entries;
  const payload: VersionedLeaderboardPayload = {
    schemaVersion: LOCAL_PERSISTENCE_SCHEMA_VERSION,
    entries: sanitized,
  };

  let saved = false;

  try {
    storage.setItem(key, JSON.stringify(payload));
    saved = true;
  } catch {
    saved = false;
  }

  return {
    saved,
    entriesPersisted: sanitized.length,
    payload,
  };
}

export function createLeaderboardPersistenceAdapter(
  storage: KeyValueStorage,
  key = LEADERBOARD_STORAGE_KEY,
): LeaderboardPersistenceAdapter {
  return {
    loadLeaderboard: () => loadLeaderboardFromStorage(storage, key),
    saveLeaderboard: (entries) => saveLeaderboardToStorage(storage, entries, key),
  };
}
