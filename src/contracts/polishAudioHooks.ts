export type MotionFeedbackKind = "lineClear" | "pieceLock" | "gameTransition";

export interface MotionPreferenceInput {
  prefersReducedMotion: boolean;
  playerMotionEnabled: boolean;
}

export interface MotionSettings {
  reducedMotion: boolean;
  allowFeedbackAnimation: (kind: MotionFeedbackKind) => boolean;
}

export interface AudioControlInit {
  hasAudioContext: boolean;
  autoplayAllowed: boolean;
  assetsLoaded?: boolean;
  assetFailureReason?: string | null;
}

export interface AudioControlState {
  enabled: boolean;
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  fallbackReason: string | null;
  gameplayBlocked: false;
}

export interface AudioControlPatch {
  muted?: boolean;
  masterVolume?: number;
  musicVolume?: number;
  sfxVolume?: number;
}

export interface AudioMixSnapshot {
  playbackEnabled: boolean;
  masterGain: number;
  musicGain: number;
  sfxGain: number;
  fallbackReason: string | null;
}

export interface RenderHookApi {
  score: number;
  lines: number;
  level: number;
  boardText: string;
}

export interface RenderHookTarget {
  render_game_to_text?: () => string;
}

const MIN_VOLUME = 0;
const MAX_VOLUME = 1;
const DEFAULT_MASTER_VOLUME = 1;
const DEFAULT_MUSIC_VOLUME = 0.7;
const DEFAULT_SFX_VOLUME = 0.8;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_VOLUME;
  }

  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, value));
}

function resolvePatchedVolume(current: number, patch?: number): number {
  if (patch === undefined) {
    return clampVolume(current);
  }

  return clampVolume(patch);
}

function normalizeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}

function normalizeBoardText(boardText: string): string {
  return boardText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n");
}

export function resolveMotionSettings(input: MotionPreferenceInput): MotionSettings {
  const reducedMotion =
    input.prefersReducedMotion || input.playerMotionEnabled === false;

  return {
    reducedMotion,
    allowFeedbackAnimation: (kind: MotionFeedbackKind): boolean => {
      if (kind === "pieceLock") {
        return true;
      }

      return !reducedMotion;
    }
  };
}

export function createAudioControlState(input: AudioControlInit): AudioControlState {
  const fallbackReasons: string[] = [];

  if (!input.hasAudioContext) {
    fallbackReasons.push("AudioContext unavailable");
  }

  if (!input.autoplayAllowed) {
    fallbackReasons.push("autoplay blocked");
  }

  if (input.assetsLoaded === false) {
    fallbackReasons.push(
      input.assetFailureReason && input.assetFailureReason.trim().length > 0
        ? input.assetFailureReason
        : "audio assets unavailable"
    );
  }

  const enabled = fallbackReasons.length === 0;

  return {
    enabled,
    muted: false,
    masterVolume: DEFAULT_MASTER_VOLUME,
    musicVolume: DEFAULT_MUSIC_VOLUME,
    sfxVolume: DEFAULT_SFX_VOLUME,
    fallbackReason: enabled ? null : fallbackReasons.join("; "),
    gameplayBlocked: false
  };
}

export function patchAudioControlState(
  current: AudioControlState,
  patch: AudioControlPatch
): AudioControlState {
  return {
    ...current,
    muted: patch.muted ?? current.muted,
    masterVolume: resolvePatchedVolume(current.masterVolume, patch.masterVolume),
    musicVolume: resolvePatchedVolume(current.musicVolume, patch.musicVolume),
    sfxVolume: resolvePatchedVolume(current.sfxVolume, patch.sfxVolume)
  };
}

export function buildAudioMixSnapshot(state: AudioControlState): AudioMixSnapshot {
  const playbackEnabled = state.enabled && !state.muted;
  const masterGain = playbackEnabled ? clampVolume(state.masterVolume) : 0;
  const musicGain = Number((masterGain * clampVolume(state.musicVolume)).toFixed(4));
  const sfxGain = Number((masterGain * clampVolume(state.sfxVolume)).toFixed(4));

  return {
    playbackEnabled,
    masterGain,
    musicGain,
    sfxGain,
    fallbackReason: state.fallbackReason
  };
}

export function installRenderHook(
  target: RenderHookTarget,
  api: RenderHookApi
): void {
  const score = normalizeInteger(api.score);
  const lines = normalizeInteger(api.lines);
  const level = normalizeInteger(api.level);
  const boardRows = normalizeBoardText(api.boardText).split("\n");

  target.render_game_to_text = (): string =>
    ["SCORE:" + score, "LINES:" + lines, "LEVEL:" + level, "BOARD:", ...boardRows].join(
      "\\n"
    );
}
