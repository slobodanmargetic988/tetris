export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type PieceKind = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export type Cell = 0 | 1;
export type Board = Cell[][];

export interface SpawnCheckInput {
  board: Board;
  piece: PieceKind;
  x: number;
  y: number;
}

export interface ProgressState {
  board: Board;
  totalLinesCleared: number;
  spawnLegal: boolean;
}

export interface ProgressResult {
  board: Board;
  totalLinesCleared: number;
  topOut: boolean;
}

export function isSpawnLegal(_input: SpawnCheckInput): boolean {
  throw new Error("TODO[TASK-002]: implement spawn legality checks");
}

export function generateDeterministicBagQueue(
  _seed: string,
  _pieceCount: number,
): PieceKind[] {
  throw new Error("TODO[TASK-002]: implement deterministic 7-bag queue generation");
}

export function resolvePostLockProgress(_state: ProgressState): ProgressResult {
  throw new Error("TODO[TASK-002]: implement top-out and line-clear progression");
}
