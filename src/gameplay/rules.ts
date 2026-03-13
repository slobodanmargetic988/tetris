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
  score?: number;
  softDropCells?: number;
  hardDropCells?: number;
}

export interface ProgressResult {
  board: Board;
  totalLinesCleared: number;
  topOut: boolean;
  clearedLines: number;
  level: number;
  score: number;
  lineClearScore: number;
  dropScore: number;
  lockDelayMs: number;
}

const PIECE_SEQUENCE: PieceKind[] = ["I", "J", "L", "O", "S", "T", "Z"];
const LINE_CLEAR_BASE_SCORES: Readonly<Record<number, number>> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export const LINES_PER_LEVEL = 10;
export const SOFT_DROP_POINTS_PER_CELL = 1;
export const HARD_DROP_POINTS_PER_CELL = 2;
export const LOCK_DELAY_BASE_MS = 500;
export const LOCK_DELAY_STEP_MS = 20;
export const LOCK_DELAY_MIN_MS = 120;

const SPAWN_FOOTPRINTS: Record<PieceKind, ReadonlyArray<readonly [number, number]>> = {
  I: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  J: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  L: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  O: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  T: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  Z: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
};

function makeEmptyRow(): Cell[] {
  return Array.from({ length: BOARD_WIDTH }, () => 0 as const);
}

function coerceBoardState(board: Board): Board {
  return Array.from({ length: BOARD_HEIGHT }, (_, y) =>
    Array.from({ length: BOARD_WIDTH }, (_, x) => (board?.[y]?.[x] === 1 ? 1 : 0)),
  );
}

function clearCompletedLines(board: Board): { board: Board; clearedLines: number } {
  const remainingRows: Cell[][] = [];
  let clearedLines = 0;

  for (const row of board) {
    if (row.every((cell) => cell === 1)) {
      clearedLines += 1;
      continue;
    }
    remainingRows.push([...row]);
  }

  while (remainingRows.length < BOARD_HEIGHT) {
    remainingRows.unshift(makeEmptyRow());
  }

  return {
    board: remainingRows,
    clearedLines,
  };
}

function normalizeNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function seededHash(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function isSpawnLegal(input: SpawnCheckInput): boolean {
  const board = coerceBoardState(input.board);
  const footprint = SPAWN_FOOTPRINTS[input.piece];

  for (const [dx, dy] of footprint) {
    const cellX = input.x + dx;
    const cellY = input.y + dy;

    if (cellX < 0 || cellX >= BOARD_WIDTH || cellY < 0 || cellY >= BOARD_HEIGHT) {
      return false;
    }

    if (board[cellY][cellX] === 1) {
      return false;
    }
  }

  return true;
}

export function generateDeterministicBagQueue(
  seed: string,
  pieceCount: number,
): PieceKind[] {
  const normalizedCount = normalizeNonNegativeInt(pieceCount);
  if (normalizedCount === 0) {
    return [];
  }

  const hash = seededHash(String(seed));
  const random = mulberry32(hash());
  const queue: PieceKind[] = [];

  while (queue.length < normalizedCount) {
    const bag = [...PIECE_SEQUENCE];

    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = bag[i];
      bag[i] = bag[j];
      bag[j] = tmp;
    }

    for (const piece of bag) {
      queue.push(piece);
      if (queue.length === normalizedCount) {
        break;
      }
    }
  }

  return queue;
}

export function getLevelFromLines(totalLinesCleared: number): number {
  const normalizedLines = normalizeNonNegativeInt(totalLinesCleared);
  return Math.floor(normalizedLines / LINES_PER_LEVEL) + 1;
}

export function getLockDelayMsForLevel(level: number): number {
  const normalizedLevel = Math.max(1, normalizeNonNegativeInt(level));
  const scaledDelay = LOCK_DELAY_BASE_MS - (normalizedLevel - 1) * LOCK_DELAY_STEP_MS;
  return Math.max(LOCK_DELAY_MIN_MS, scaledDelay);
}

export function getLineClearScore(linesCleared: number, level: number): number {
  const normalizedLines = Math.min(4, normalizeNonNegativeInt(linesCleared));
  const normalizedLevel = Math.max(1, normalizeNonNegativeInt(level));
  const baseScore = LINE_CLEAR_BASE_SCORES[normalizedLines] ?? 0;
  return baseScore * normalizedLevel;
}

export function getDropScore(softDropCells: number, hardDropCells: number): number {
  const normalizedSoftDropCells = normalizeNonNegativeInt(softDropCells);
  const normalizedHardDropCells = normalizeNonNegativeInt(hardDropCells);

  return (
    normalizedSoftDropCells * SOFT_DROP_POINTS_PER_CELL +
    normalizedHardDropCells * HARD_DROP_POINTS_PER_CELL
  );
}

export function resolvePostLockProgress(state: ProgressState): ProgressResult {
  const board = coerceBoardState(state.board);
  const { board: postClearBoard, clearedLines } = clearCompletedLines(board);
  const normalizedLines = normalizeNonNegativeInt(state.totalLinesCleared);
  const normalizedScore = normalizeNonNegativeInt(state.score ?? 0);
  const previousLevel = getLevelFromLines(normalizedLines);
  const lineClearScore = getLineClearScore(clearedLines, previousLevel);
  const dropScore = getDropScore(state.softDropCells ?? 0, state.hardDropCells ?? 0);
  const totalLinesCleared = normalizedLines + clearedLines;
  const level = getLevelFromLines(totalLinesCleared);
  const lockDelayMs = getLockDelayMsForLevel(level);
  const score = normalizedScore + lineClearScore + dropScore;

  return {
    board: postClearBoard,
    totalLinesCleared,
    topOut: !state.spawnLegal,
    clearedLines,
    level,
    score,
    lineClearScore,
    dropScore,
    lockDelayMs,
  };
}
