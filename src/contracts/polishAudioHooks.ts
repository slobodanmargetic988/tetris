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
}

export interface AudioControlState {
  enabled: boolean;
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
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

export function resolveMotionSettings(_: MotionPreferenceInput): MotionSettings {
  throw new Error("TASK-006: resolveMotionSettings is not implemented yet");
}

export function createAudioControlState(_: AudioControlInit): AudioControlState {
  throw new Error("TASK-006: createAudioControlState is not implemented yet");
}

export function installRenderHook(
  _: RenderHookTarget,
  __: RenderHookApi
): void {
  throw new Error("TASK-006: installRenderHook is not implemented yet");
}
