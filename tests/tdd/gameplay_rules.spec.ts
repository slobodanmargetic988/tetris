import { describe, expect, it } from "vitest";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  generateDeterministicBagQueue,
  isSpawnLegal,
  resolvePostLockProgress,
  type Board,
} from "../../src/gameplay/rules";

function emptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as const),
  );
}

describe("gameplay deterministic rules", () => {
  it("locks board dimensions to 10x20 and rejects out-of-bounds spawn", () => {
    expect(BOARD_WIDTH).toBe(10);
    expect(BOARD_HEIGHT).toBe(20);

    const board = emptyBoard();

    expect(
      isSpawnLegal({
        board,
        piece: "O",
        x: 4,
        y: 0,
      }),
    ).toBe(true);

    expect(
      isSpawnLegal({
        board,
        piece: "O",
        x: -1,
        y: 0,
      }),
    ).toBe(false);

    expect(
      isSpawnLegal({
        board,
        piece: "I",
        x: 8,
        y: 0,
      }),
    ).toBe(false);
  });

  it("rejects spawn when occupied cells block the spawn footprint", () => {
    const board = emptyBoard();
    board[0][4] = 1;

    expect(
      isSpawnLegal({
        board,
        piece: "T",
        x: 4,
        y: 0,
      }),
    ).toBe(false);
  });

  it("generates deterministic 7-bag queues from seed", () => {
    const first = generateDeterministicBagQueue("seed-alpha", 14);
    const second = generateDeterministicBagQueue("seed-alpha", 14);
    const differentSeed = generateDeterministicBagQueue("seed-beta", 14);

    expect(first).toEqual(second);
    expect(first).not.toEqual(differentSeed);

    expect(new Set(first.slice(0, 7))).toEqual(new Set(["I", "J", "L", "O", "S", "T", "Z"]));
    expect(new Set(first.slice(7, 14))).toEqual(new Set(["I", "J", "L", "O", "S", "T", "Z"]));
  });

  it("advances line-clear totals and keeps board height invariant after lock", () => {
    const board = emptyBoard();
    board[19] = Array.from({ length: BOARD_WIDTH }, () => 1 as const);

    const result = resolvePostLockProgress({
      board,
      totalLinesCleared: 3,
      spawnLegal: true,
    });

    expect(result.topOut).toBe(false);
    expect(result.totalLinesCleared).toBe(4);
    expect(result.board).toHaveLength(BOARD_HEIGHT);
    expect(result.board[0].every((cell) => cell === 0)).toBe(true);
  });

  it("flags top-out when post-lock spawn is illegal", () => {
    const board = emptyBoard();

    const result = resolvePostLockProgress({
      board,
      totalLinesCleared: 0,
      spawnLegal: false,
    });

    expect(result.topOut).toBe(true);
    expect(result.totalLinesCleared).toBe(0);
  });
});
