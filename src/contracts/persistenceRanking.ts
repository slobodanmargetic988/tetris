export const PERSISTENCE_SCHEMA_VERSION = 1;

export type PersistedScoreEntry = {
  playerName: string;
  score: number;
  lines: number;
  achievedAt: string;
};

export type PersistedLeaderboardSchema = {
  schemaVersion: number;
  entries: PersistedScoreEntry[];
};

export type LoadedLeaderboard = {
  entries: PersistedScoreEntry[];
  corruptionRecovered: boolean;
};

export type RankedScoreEntry = PersistedScoreEntry & {
  rank: number;
};

export type ReplaySessionState = {
  runId: string;
  score: number;
  lines: number;
  level: number;
  board: number[][];
};

type LegacyScoreEntry = {
  playerName?: unknown;
  name?: unknown;
  score?: unknown;
  lines?: unknown;
  achievedAt?: unknown;
  timestamp?: unknown;
  date?: unknown;
};

const DEFAULT_BOARD_ROWS = 20;
const DEFAULT_BOARD_COLUMNS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : null;
}

function parseScoreEntry(value: unknown): PersistedScoreEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const legacy = value as LegacyScoreEntry;
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

  if (playerName === null || score === null || lines === null || achievedAt === null) {
    return null;
  }

  return {
    playerName,
    score,
    lines,
    achievedAt,
  };
}

function sanitizeEntries(value: unknown): { entries: PersistedScoreEntry[]; dropped: number; invalidContainer: boolean } {
  if (!Array.isArray(value)) {
    return { entries: [], dropped: 0, invalidContainer: true };
  }

  const entries: PersistedScoreEntry[] = [];

  for (const item of value) {
    const parsed = parseScoreEntry(item);
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

function compareEntriesForRanking(left: PersistedScoreEntry, right: PersistedScoreEntry): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.lines !== right.lines) {
    return right.lines - left.lines;
  }

  const achievedAtOrder = left.achievedAt.localeCompare(right.achievedAt);
  if (achievedAtOrder !== 0) {
    return achievedAtOrder;
  }

  const normalizedNameOrder = left.playerName.localeCompare(right.playerName, undefined, { sensitivity: "base" });
  if (normalizedNameOrder !== 0) {
    return normalizedNameOrder;
  }

  const exactNameOrder = left.playerName.localeCompare(right.playerName, undefined, { sensitivity: "variant" });
  if (exactNameOrder !== 0) {
    return exactNameOrder;
  }

  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function deriveBoardSize(previousBoard: number[][]): { rows: number; columns: number } {
  const rows = previousBoard.length > 0 ? previousBoard.length : DEFAULT_BOARD_ROWS;
  const firstRow = previousBoard[0];
  const columns = Array.isArray(firstRow) && firstRow.length > 0 ? firstRow.length : DEFAULT_BOARD_COLUMNS;
  return { rows, columns };
}

function createEmptyBoard(rows: number, columns: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));
}

export function saveLeaderboardSnapshot(entries: PersistedScoreEntry[]): string {
  const sanitized = sanitizeEntries(entries).entries;
  const payload: PersistedLeaderboardSchema = {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    entries: sanitized,
  };

  return JSON.stringify(payload);
}

export function loadLeaderboardSnapshot(raw: string | null): LoadedLeaderboard {
  if (raw === null) {
    return {
      entries: [],
      corruptionRecovered: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      entries: [],
      corruptionRecovered: true,
    };
  }

  if (Array.isArray(parsed)) {
    const legacy = sanitizeEntries(parsed);
    return {
      entries: legacy.entries,
      corruptionRecovered: true,
    };
  }

  if (!isRecord(parsed)) {
    return {
      entries: [],
      corruptionRecovered: true,
    };
  }

  const schemaVersion = parseNonNegativeInteger(parsed.schemaVersion);

  if (schemaVersion === PERSISTENCE_SCHEMA_VERSION) {
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

  return {
    entries: [],
    corruptionRecovered: true,
  };
}

export function rankEntriesDeterministically(entries: PersistedScoreEntry[]): RankedScoreEntry[] {
  const sanitized = sanitizeEntries(entries).entries;
  const sorted = [...sanitized].sort(compareEntriesForRanking);

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export function createReplayFreshState(previousRun: ReplaySessionState, nextRunId: string): ReplaySessionState {
  const { rows, columns } = deriveBoardSize(previousRun.board);

  return {
    runId: nextRunId,
    score: 0,
    lines: 0,
    level: 1,
    board: createEmptyBoard(rows, columns),
  };
}
