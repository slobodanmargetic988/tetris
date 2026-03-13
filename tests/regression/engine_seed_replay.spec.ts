import { describe, expect, it } from "vitest";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  generateDeterministicBagQueue,
  resolvePostLockProgress,
  type Board,
  type PieceKind,
} from "../../src/gameplay/rules";

function emptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => 0 as const),
  );
}

function makeHighPressureBoard(): Board {
  const board = emptyBoard();

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    const gapX = (y * 3 + 1) % BOARD_WIDTH;
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      board[y][x] = x === gapX ? 0 : 1;
    }
  }

  return board;
}

describe("regression: deterministic replay seed hardening", () => {
  it("keeps seed output stable across repeated interleaved run permutations", () => {
    const seedMatrix = [
      { seed: "TASK-021-seed-alpha", pieceCount: 7 },
      { seed: "TASK-021-seed-alpha", pieceCount: 28 },
      { seed: "TASK-021-seed-beta", pieceCount: 35 },
      { seed: "TASK-021-seed-gamma", pieceCount: 53 },
      { seed: "TASK-021-seed-delta", pieceCount: 99 },
    ];
    const baseline = seedMatrix.map(({ seed, pieceCount }) =>
      generateDeterministicBagQueue(seed, pieceCount),
    );

    const permutations = [
      [4, 3, 2, 1, 0],
      [2, 0, 4, 1, 3],
      [1, 3, 0, 4, 2],
      [0, 1, 2, 3, 4],
      [3, 4, 1, 2, 0],
    ];

    for (const order of permutations) {
      for (const index of order) {
        const { seed, pieceCount } = seedMatrix[index];
        const replay = generateDeterministicBagQueue(seed, pieceCount);
        expect(replay).toEqual(baseline[index]);
      }
    }
  });

  it("preserves full 7-piece uniqueness per complete bag in long replay queues", () => {
    const allPieces: PieceKind[] = ["I", "J", "L", "O", "S", "T", "Z"];
    const queue = generateDeterministicBagQueue("TASK-021-long-seed", 140);

    expect(queue).toHaveLength(140);

    for (let start = 0; start <= queue.length - 7; start += 7) {
      const bag = queue.slice(start, start + 7);
      expect(new Set(bag)).toEqual(new Set(allPieces));
    }
  });
});

describe("regression: top-out boundary under high stack pressure", () => {
  it("does not top-out when post-lock spawn remains legal even near board saturation", () => {
    const board = makeHighPressureBoard();
    const boardSnapshot = board.map((row) => [...row]);

    const result = resolvePostLockProgress({
      board,
      totalLinesCleared: 87,
      spawnLegal: true,
      score: 9000,
    });

    expect(result.topOut).toBe(false);
    expect(result.clearedLines).toBe(0);
    expect(result.totalLinesCleared).toBe(87);
    expect(result.board).toHaveLength(BOARD_HEIGHT);
    expect(result.board[0]).toHaveLength(BOARD_WIDTH);
    expect(board).toEqual(boardSnapshot);
  });

  it("top-outs exactly at the spawn boundary under the same high-pressure board", () => {
    const board = makeHighPressureBoard();

    const result = resolvePostLockProgress({
      board,
      totalLinesCleared: 87,
      spawnLegal: false,
      score: 9000,
    });

    expect(result.topOut).toBe(true);
    expect(result.clearedLines).toBe(0);
    expect(result.totalLinesCleared).toBe(87);
    expect(result.board).toHaveLength(BOARD_HEIGHT);
    expect(result.board[0]).toHaveLength(BOARD_WIDTH);
  });
});
