import { describe, expect, it } from "vitest";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  getDropScore,
  getLevelFromLines,
  getLineClearScore,
  getLockDelayMsForLevel,
  resolvePostLockProgress,
  type Board,
} from "../../src/gameplay/rules";

function emptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as const),
  );
}

describe("runtime scoring progression rules", () => {
  it("processes line clears without mutating source board and updates score/level deterministically", () => {
    const board = emptyBoard();
    board[BOARD_HEIGHT - 1] = Array.from({ length: BOARD_WIDTH }, () => 1 as const);
    board[BOARD_HEIGHT - 2] = Array.from({ length: BOARD_WIDTH }, () => 1 as const);
    board[BOARD_HEIGHT - 3][0] = 1;

    const sourceSnapshot = board.map((row) => [...row]);

    const result = resolvePostLockProgress({
      board,
      totalLinesCleared: 9,
      spawnLegal: true,
      score: 1000,
      softDropCells: 3,
      hardDropCells: 4,
    });

    expect(result.clearedLines).toBe(2);
    expect(result.totalLinesCleared).toBe(11);
    expect(result.level).toBe(2);
    expect(result.lineClearScore).toBe(300);
    expect(result.dropScore).toBe(11);
    expect(result.score).toBe(1311);
    expect(result.lockDelayMs).toBe(480);
    expect(result.topOut).toBe(false);

    expect(result.board).toHaveLength(BOARD_HEIGHT);
    expect(result.board[0].every((cell) => cell === 0)).toBe(true);
    expect(result.board[1].every((cell) => cell === 0)).toBe(true);
    expect(result.board[BOARD_HEIGHT - 1][0]).toBe(1);

    expect(board).toEqual(sourceSnapshot);
  });

  it("derives level curve from total cleared lines in 10-line buckets", () => {
    expect(getLevelFromLines(0)).toBe(1);
    expect(getLevelFromLines(9)).toBe(1);
    expect(getLevelFromLines(10)).toBe(2);
    expect(getLevelFromLines(19)).toBe(2);
    expect(getLevelFromLines(20)).toBe(3);

    expect(getLevelFromLines(-100)).toBe(1);
    expect(getLevelFromLines(Number.NaN)).toBe(1);
  });

  it("applies lock-delay scaling per level with a deterministic floor", () => {
    expect(getLockDelayMsForLevel(1)).toBe(500);
    expect(getLockDelayMsForLevel(2)).toBe(480);
    expect(getLockDelayMsForLevel(10)).toBe(320);
    expect(getLockDelayMsForLevel(100)).toBe(120);

    expect(getLockDelayMsForLevel(0)).toBe(500);
    expect(getLockDelayMsForLevel(-7)).toBe(500);
  });

  it("scores line clears using level-scaled single/double/triple/tetris contract", () => {
    expect(getLineClearScore(0, 1)).toBe(0);
    expect(getLineClearScore(1, 1)).toBe(100);
    expect(getLineClearScore(2, 1)).toBe(300);
    expect(getLineClearScore(3, 1)).toBe(500);
    expect(getLineClearScore(4, 1)).toBe(800);

    expect(getLineClearScore(4, 3)).toBe(2400);
    expect(getLineClearScore(8, 3)).toBe(2400);
    expect(getLineClearScore(-1, 3)).toBe(0);
  });

  it("applies soft and hard drop scoring with stable per-cell weighting", () => {
    expect(getDropScore(5, 0)).toBe(5);
    expect(getDropScore(0, 5)).toBe(10);
    expect(getDropScore(7, 9)).toBe(25);

    expect(getDropScore(3.9, 2.1)).toBe(7);
    expect(getDropScore(-4, 3)).toBe(6);
    expect(getDropScore(Number.NaN, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
