export type PostGamePhase = "playing" | "results" | "leaderboard";

export interface TopOutSnapshot {
  score: number;
  lines: number;
  level: number;
}

export interface ScoreSubmissionInput extends TopOutSnapshot {
  playerName: string;
}

export interface ScoreSubmissionRecord {
  id: string;
  rank: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  playerName: string;
  score: number;
  lines: number;
  level: number;
}

export interface PostGameFlowDeps {
  persistScore: (input: ScoreSubmissionInput) => Promise<ScoreSubmissionRecord>;
}

export interface LeaderboardViewState {
  topTen: LeaderboardEntry[];
  currentPlayerOutsideTopTen: LeaderboardEntry | null;
}

export interface PostGameCtaState {
  canStartNewGame: boolean;
}

export interface PostGameFlowState {
  phase: PostGamePhase;
  runId: number;
  pendingTopOut: TopOutSnapshot | null;
  playerName: string;
  leaderboard: LeaderboardViewState;
  cta: PostGameCtaState;
  submission: {
    attempts: number;
    record: ScoreSubmissionRecord | null;
    submitted: boolean;
  };
}

export interface PostGameFlowController {
  getState: () => PostGameFlowState;
  onTopOut: (snapshot: TopOutSnapshot) => PostGameFlowState;
  setPlayerName: (name: string) => PostGameFlowState;
  submitScore: () => Promise<PostGameFlowState>;
  viewLeaderboard: (entries?: LeaderboardEntry[]) => PostGameFlowState;
  startNewGame: (from: "results" | "leaderboard") => PostGameFlowState;
}

export function createPostGameFlowController(
  deps: PostGameFlowDeps,
): PostGameFlowController {
  const isValidPlayerName = (playerName: string): boolean =>
    /^[a-zA-Z0-9][a-zA-Z0-9 _'-]{0,23}$/.test(playerName);

  const resetSubmissionState = (): PostGameFlowState["submission"] => ({
    attempts: 0,
    record: null,
    submitted: false,
  });

  const resetLeaderboardState = (): LeaderboardViewState => ({
    topTen: [],
    currentPlayerOutsideTopTen: null,
  });

  const ctaForPhase = (phase: PostGamePhase): PostGameCtaState => ({
    canStartNewGame: phase === "results" || phase === "leaderboard",
  });

  const sortByRank = (entries: LeaderboardEntry[]): LeaderboardEntry[] =>
    [...entries].sort((left, right) => left.rank - right.rank);

  const findCurrentPlayerContext = (
    entriesByRank: LeaderboardEntry[],
    submittedRecord: ScoreSubmissionRecord | null,
    playerName: string,
    pendingTopOut: TopOutSnapshot | null,
    topTen: LeaderboardEntry[],
  ): LeaderboardEntry | null => {
    if (!submittedRecord || submittedRecord.rank <= 10) {
      return null;
    }

    const fromRows =
      entriesByRank.find((entry) => entry.id === submittedRecord.id) ??
      entriesByRank.find((entry) => entry.rank === submittedRecord.rank) ??
      null;

    const candidate =
      fromRows ??
      (pendingTopOut
        ? {
            id: submittedRecord.id,
            rank: submittedRecord.rank,
            playerName,
            score: pendingTopOut.score,
            lines: pendingTopOut.lines,
            level: pendingTopOut.level,
          }
        : null);

    if (!candidate) {
      return null;
    }

    if (
      topTen.some(
        (entry) => entry.rank === candidate.rank && entry.id === candidate.id,
      )
    ) {
      return null;
    }

    return candidate;
  };

  const deriveLeaderboardState = (
    entries: LeaderboardEntry[],
    submittedRecord: ScoreSubmissionRecord | null,
    playerName: string,
    pendingTopOut: TopOutSnapshot | null,
  ): LeaderboardViewState => {
    const entriesByRank = sortByRank(entries);
    const topTen = entriesByRank.slice(0, 10);

    return {
      topTen,
      currentPlayerOutsideTopTen: findCurrentPlayerContext(
        entriesByRank,
        submittedRecord,
        playerName,
        pendingTopOut,
        topTen,
      ),
    };
  };

  let state: PostGameFlowState = {
    phase: "playing",
    runId: 1,
    pendingTopOut: null,
    playerName: "",
    leaderboard: resetLeaderboardState(),
    cta: ctaForPhase("playing"),
    submission: resetSubmissionState(),
  };
  let submissionInFlight:
    | {
        runId: number;
        pendingTopOut: TopOutSnapshot;
        promise: Promise<PostGameFlowState>;
      }
    | null = null;

  return {
    getState: () => state,
    onTopOut: (snapshot) => {
      submissionInFlight = null;
      state = {
        ...state,
        phase: "results",
        pendingTopOut: snapshot,
        playerName: "",
        leaderboard: resetLeaderboardState(),
        cta: ctaForPhase("results"),
        submission: resetSubmissionState(),
      };
      return state;
    },
    setPlayerName: (name) => {
      state = {
        ...state,
        playerName: name.trim(),
      };
      return state;
    },
    submitScore: async () => {
      if (!state.pendingTopOut) {
        throw new Error("No finished run to submit");
      }

      if (state.submission.submitted) {
        throw new Error("Score already submitted for this run");
      }

      const playerName = state.playerName.trim();
      if (!isValidPlayerName(playerName)) {
        throw new Error("Enter a valid player name before submitting");
      }

      const runId = state.runId;
      const pendingTopOut = state.pendingTopOut;

      if (submissionInFlight && submissionInFlight.runId === runId) {
        return submissionInFlight.promise;
      }

      if (submissionInFlight && submissionInFlight.runId !== runId) {
        submissionInFlight = null;
      }

      state = {
        ...state,
        playerName,
      };

      const inFlight = {
        runId,
        pendingTopOut,
        promise: (async () => {
          const record = await deps.persistScore({
            playerName,
            score: pendingTopOut.score,
            lines: pendingTopOut.lines,
            level: pendingTopOut.level,
          });

          if (
            state.runId !== runId ||
            state.pendingTopOut !== pendingTopOut ||
            state.phase === "playing"
          ) {
            return state;
          }

          state = {
            ...state,
            submission: {
              attempts: state.submission.attempts + 1,
              submitted: true,
              record,
            },
          };

          return state;
        })(),
      };
      submissionInFlight = inFlight;

      try {
        return await inFlight.promise;
      } finally {
        if (submissionInFlight === inFlight) {
          submissionInFlight = null;
        }
      }
    },
    viewLeaderboard: (entries) => {
      state = {
        ...state,
        phase: "leaderboard",
        leaderboard: deriveLeaderboardState(
          entries ?? state.leaderboard.topTen,
          state.submission.record,
          state.playerName,
          state.pendingTopOut,
        ),
        cta: ctaForPhase("leaderboard"),
      };
      return state;
    },
    startNewGame: (_from) => {
      submissionInFlight = null;
      state = {
        ...state,
        phase: "playing",
        runId: state.runId + 1,
        pendingTopOut: null,
        playerName: "",
        leaderboard: resetLeaderboardState(),
        cta: ctaForPhase("playing"),
        submission: resetSubmissionState(),
      };
      return state;
    },
  };
}
