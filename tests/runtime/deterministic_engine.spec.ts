import { describe, expect, it } from "vitest";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  generateDeterministicBagQueue,
  isSpawnLegal,
  resolvePostLockProgress,
  type Board,
  type PieceKind,
} from "../../src/gameplay/rules";

const ALL_PIECES: PieceKind[] = ["I", "J", "L", "O", "S", "T", "Z"];

function emptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as const),
  );
}

describe("deterministic engine core", () => {
  it("maintains endless deterministic 7-bag supply", () => {
    const pieceCount = 35;
    const queueA = generateDeterministicBagQueue("runtime-seed", pieceCount);
    const queueB = generateDeterministicBagQueue("runtime-seed", pieceCount);
    const queueC = generateDeterministicBagQueue("other-seed", pieceCount);

    expect(queueA).toHaveLength(pieceCount);
    expect(queueA).toEqual(queueB);
    expect(queueA).not.toEqual(queueC);

    for (let start = 0; start < pieceCount; start += 7) {
      const bag = queueA.slice(start, start + 7);
      if (bag.length < 7) {
        break;
      }
      expect(new Set(bag)).toEqual(new Set(ALL_PIECES));
    }
  });

  it("enforces legal spawn transitions via bounds and collision checks", () => {
    const board = emptyBoard();

    expect(isSpawnLegal({ board, piece: "O", x: 4, y: 0 })).toBe(true);
    expect(isSpawnLegal({ board, piece: "I", x: 8, y: 0 })).toBe(false);
    expect(isSpawnLegal({ board, piece: "T", x: -1, y: 0 })).toBe(false);

    board[0][4] = 1;
    expect(isSpawnLegal({ board, piece: "T", x: 4, y: 0 })).toBe(false);
  });

  it("resolves lock progression deterministically and only top-outs on illegal next spawn", () => {
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1] = Array.from({ length: BOARD_WIDTH }, () => 1 as const);
    const originalBottom = [...board[BOARD_HEIGHT - 1]];

    const safeProgress = resolvePostLockProgress({
      board,
      totalLinesCleared: 10,
      spawnLegal: true,
    });

    expect(safeProgress.topOut).toBe(false);
    expect(safeProgress.totalLinesCleared).toBe(11);
    expect(safeProgress.board).toHaveLength(BOARD_HEIGHT);
    expect(safeProgress.board[0].every((cell) => cell === 0)).toBe(true);
    expect(board[BOARD_HEIGHT - 1]).toEqual(originalBottom);

    const blockedSpawnProgress = resolvePostLockProgress({
      board: emptyBoard(),
      totalLinesCleared: 10,
      spawnLegal: false,
    });

    expect(blockedSpawnProgress.topOut).toBe(true);
    expect(blockedSpawnProgress.totalLinesCleared).toBe(10);
  });
});
