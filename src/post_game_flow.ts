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

export interface PostGameFlowDeps {
  persistScore: (input: ScoreSubmissionInput) => Promise<ScoreSubmissionRecord>;
}

export interface PostGameFlowState {
  phase: PostGamePhase;
  runId: number;
  pendingTopOut: TopOutSnapshot | null;
  playerName: string;
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
  viewLeaderboard: () => PostGameFlowState;
  startNewGame: (from: "results" | "leaderboard") => PostGameFlowState;
}

export function createPostGameFlowController(
  deps: PostGameFlowDeps,
): PostGameFlowController {
  let state: PostGameFlowState = {
    phase: "playing",
    runId: 1,
    pendingTopOut: null,
    playerName: "",
    submission: {
      attempts: 0,
      record: null,
      submitted: false,
    },
  };

  return {
    getState: () => state,
    onTopOut: (snapshot) => {
      state = {
        ...state,
        phase: "results",
        pendingTopOut: snapshot,
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

      const record = await deps.persistScore({
        playerName: state.playerName,
        score: state.pendingTopOut.score,
        lines: state.pendingTopOut.lines,
        level: state.pendingTopOut.level,
      });

      state = {
        ...state,
        submission: {
          attempts: state.submission.attempts + 1,
          submitted: true,
          record,
        },
      };

      return state;
    },
    viewLeaderboard: () => {
      state = {
        ...state,
        phase: "leaderboard",
      };
      return state;
    },
    startNewGame: (_from) => {
      state = {
        ...state,
        phase: "playing",
        runId: state.runId + 1,
      };
      return state;
    },
  };
}
