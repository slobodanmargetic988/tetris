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

export function saveLeaderboardSnapshot(_entries: PersistedScoreEntry[]): string {
  throw new Error("TASK-005 contract stub: saveLeaderboardSnapshot is not implemented");
}

export function loadLeaderboardSnapshot(_raw: string | null): LoadedLeaderboard {
  throw new Error("TASK-005 contract stub: loadLeaderboardSnapshot is not implemented");
}

export function rankEntriesDeterministically(_entries: PersistedScoreEntry[]): RankedScoreEntry[] {
  throw new Error("TASK-005 contract stub: rankEntriesDeterministically is not implemented");
}

export function createReplayFreshState(_previousRun: ReplaySessionState, _nextRunId: string): ReplaySessionState {
  throw new Error("TASK-005 contract stub: createReplayFreshState is not implemented");
}
