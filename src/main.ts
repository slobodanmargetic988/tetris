import "./styles.css";

type PieceKey = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
type CellValue = PieceKey | "";
type GamePhase = "playing" | "paused" | "game-over";
type Position = [number, number];

type ActivePiece = {
  key: PieceKey;
  rotation: number;
  x: number;
  y: number;
};

type GameState = {
  phase: GamePhase;
  board: CellValue[][];
  active: ActivePiece;
  nextQueue: PieceKey[];
  score: number;
  lines: number;
  level: number;
  pieceCount: number;
  status: string;
  seed: number;
  bestScore: number;
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const PREVIEW_GRID_SIZE = 4;
const QUEUE_TARGET = 5;
const START_SEED = 20260412;

const COLORS: Record<PieceKey, string> = {
  I: "linear-gradient(145deg, #74f5ff 0%, #1bb2d6 100%)",
  J: "linear-gradient(145deg, #8fa1ff 0%, #3953e6 100%)",
  L: "linear-gradient(145deg, #ffc36f 0%, #ef7e2d 100%)",
  O: "linear-gradient(145deg, #fff08c 0%, #d9b319 100%)",
  S: "linear-gradient(145deg, #8cffbb 0%, #25a75d 100%)",
  T: "linear-gradient(145deg, #d39dff 0%, #7b3ee7 100%)",
  Z: "linear-gradient(145deg, #ff9ea0 0%, #d43f49 100%)",
};

const SHAPES: Record<PieceKey, Position[][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
};

const PIECE_ORDER: PieceKey[] = ["I", "J", "L", "O", "S", "T", "Z"];
const LINE_CLEAR_SCORE = [0, 100, 300, 500, 800];

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app mount element.");
}

const bestScoreKey = "golden-tetris-best-score";
const savedBestScore = Number(window.localStorage.getItem(bestScoreKey) ?? "0");

let rngState = START_SEED;
let bag: PieceKey[] = [];
let accumulatedMs = 0;
let lastFrameTime = performance.now();

const state: GameState = {
  phase: "playing",
  board: createEmptyBoard(),
  active: { key: "T", rotation: 0, x: 3, y: 0 },
  nextQueue: [],
  score: 0,
  lines: 0,
  level: 1,
  pieceCount: 0,
  status: "Run live. Arrow keys or WASD move the stack. Space hard-drops.",
  seed: START_SEED,
  bestScore: Number.isFinite(savedBestScore) ? savedBestScore : 0,
};

function nowIso(): string {
  return new Date().toISOString();
}

function createEmptyBoard(): CellValue[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<CellValue>(BOARD_WIDTH).fill(""));
}

function createRng(): number {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let value = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function refillBagIfNeeded(): void {
  while (state.nextQueue.length < QUEUE_TARGET) {
    if (bag.length === 0) {
      bag = [...PIECE_ORDER];
      for (let index = bag.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(createRng() * (index + 1));
        [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
      }
    }
    const next = bag.shift();
    if (!next) {
      throw new Error("Bag refill failed.");
    }
    state.nextQueue.push(next);
  }
}

function nextPieceKey(): PieceKey {
  refillBagIfNeeded();
  const key = state.nextQueue.shift();
  if (!key) {
    throw new Error("Missing next piece.");
  }
  refillBagIfNeeded();
  return key;
}

function pieceCells(piece: ActivePiece, rotation = piece.rotation, x = piece.x, y = piece.y): Position[] {
  return SHAPES[piece.key][rotation].map(([cellX, cellY]) => [cellX + x, cellY + y]);
}

function canPlace(piece: ActivePiece, rotation = piece.rotation, x = piece.x, y = piece.y): boolean {
  return pieceCells(piece, rotation, x, y).every(([cellX, cellY]) => {
    if (cellX < 0 || cellX >= BOARD_WIDTH) {
      return false;
    }
    if (cellY < 0 || cellY >= BOARD_HEIGHT) {
      return false;
    }
    return state.board[cellY][cellX] === "";
  });
}

function spawnPiece(): void {
  const key = nextPieceKey();
  const nextActive: ActivePiece = {
    key,
    rotation: 0,
    x: 3,
    y: 0,
  };
  state.active = nextActive;
  if (!canPlace(nextActive)) {
    state.phase = "game-over";
    state.status = "Top-out. Restart to run it back.";
    state.bestScore = Math.max(state.bestScore, state.score);
    window.localStorage.setItem(bestScoreKey, String(state.bestScore));
  }
}

function resetGame(): void {
  rngState = START_SEED;
  bag = [];
  accumulatedMs = 0;
  state.phase = "playing";
  state.board = createEmptyBoard();
  state.nextQueue = [];
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.pieceCount = 0;
  state.status = "Fresh run started. Stay smooth through the stack.";
  refillBagIfNeeded();
  spawnPiece();
  render();
}

function gravityMs(): number {
  return Math.max(110, 900 - (state.level - 1) * 55);
}

function mergePiece(): void {
  for (const [x, y] of pieceCells(state.active)) {
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      state.board[y][x] = state.active.key;
    }
  }
}

function clearLines(): void {
  const remainingRows = state.board.filter((row) => row.some((cell) => cell === ""));
  const cleared = BOARD_HEIGHT - remainingRows.length;
  if (cleared === 0) {
    return;
  }

  const freshRows = Array.from({ length: cleared }, () => Array<CellValue>(BOARD_WIDTH).fill(""));
  state.board = [...freshRows, ...remainingRows];
  state.lines += cleared;
  state.level = 1 + Math.floor(state.lines / 10);
  state.score += LINE_CLEAR_SCORE[cleared] * state.level;
  state.status = `${nowIso()} Cleared ${cleared} line${cleared === 1 ? "" : "s"} cleanly.`;
}

function lockPiece(): void {
  mergePiece();
  clearLines();
  state.pieceCount += 1;
  state.bestScore = Math.max(state.bestScore, state.score);
  window.localStorage.setItem(bestScoreKey, String(state.bestScore));
  spawnPiece();
}

function move(deltaX: number): void {
  if (state.phase !== "playing") {
    return;
  }
  const nextX = state.active.x + deltaX;
  if (canPlace(state.active, state.active.rotation, nextX, state.active.y)) {
    state.active.x = nextX;
    state.status = `${nowIso()} Shifted ${deltaX < 0 ? "left" : "right"}.`;
    render();
  }
}

function rotate(): void {
  if (state.phase !== "playing") {
    return;
  }
  const nextRotation = (state.active.rotation + 1) % 4;
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (canPlace(state.active, nextRotation, state.active.x + kick, state.active.y)) {
      state.active.rotation = nextRotation;
      state.active.x += kick;
      state.status = `${nowIso()} Rotated ${state.active.key} with kick ${kick}.`;
      render();
      return;
    }
  }
}

function stepDown(scoring = false): boolean {
  if (state.phase !== "playing") {
    return false;
  }
  const nextY = state.active.y + 1;
  if (canPlace(state.active, state.active.rotation, state.active.x, nextY)) {
    state.active.y = nextY;
    if (scoring) {
      state.score += 1;
      state.bestScore = Math.max(state.bestScore, state.score);
    }
    return true;
  }
  lockPiece();
  return false;
}

function hardDrop(): void {
  if (state.phase !== "playing") {
    return;
  }
  let distance = 0;
  while (canPlace(state.active, state.active.rotation, state.active.x, state.active.y + 1)) {
    state.active.y += 1;
    distance += 1;
  }
  state.score += distance * 2;
  state.status = `${nowIso()} Hard drop locked ${distance} rows.`;
  lockPiece();
  render();
}

function togglePause(): void {
  if (state.phase === "game-over") {
    return;
  }
  state.phase = state.phase === "paused" ? "playing" : "paused";
  state.status =
    state.phase === "paused"
      ? `${nowIso()} Run paused.`
      : `${nowIso()} Run resumed.`;
  render();
}

function advanceSimulation(deltaMs: number): void {
  if (state.phase !== "playing") {
    return;
  }
  accumulatedMs += deltaMs;
  while (accumulatedMs >= gravityMs()) {
    accumulatedMs -= gravityMs();
    const moved = stepDown(false);
    if (!moved) {
      break;
    }
  }
}

function ghostCells(): Position[] {
  let ghostY = state.active.y;
  while (canPlace(state.active, state.active.rotation, state.active.x, ghostY + 1)) {
    ghostY += 1;
  }
  return pieceCells(state.active, state.active.rotation, state.active.x, ghostY);
}

function boardWithActivePiece(): CellValue[][] {
  const board = state.board.map((row) => [...row]);
  for (const [x, y] of pieceCells(state.active)) {
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      board[y][x] = state.active.key;
    }
  }
  return board;
}

function renderBoardMarkup(): string {
  const activeBoard = boardWithActivePiece();
  const ghost = new Set(ghostCells().map(([x, y]) => `${x}:${y}`));
  return activeBoard
    .flatMap((row, y) =>
      row.map((cell, x) => {
        const ghostClass = cell === "" && ghost.has(`${x}:${y}`) ? " board-cell--ghost" : "";
        const fill = cell ? ` style="--piece-fill:${COLORS[cell]}"` : "";
        const pieceClass = cell ? " board-cell--filled" : "";
        return `<div class="board-cell${pieceClass}${ghostClass}"${fill}></div>`;
      }),
    )
    .join("");
}

function renderPreviewMarkup(): string {
  const nextKey = state.nextQueue[0] ?? "T";
  const previewCells = new Set(SHAPES[nextKey][0].map(([x, y]) => `${x}:${y}`));
  const cells: string[] = [];
  for (let y = 0; y < PREVIEW_GRID_SIZE; y += 1) {
    for (let x = 0; x < PREVIEW_GRID_SIZE; x += 1) {
      const filled = previewCells.has(`${x}:${y}`);
      const pieceClass = filled ? " preview-cell--filled" : "";
      const fill = filled ? ` style="--piece-fill:${COLORS[nextKey]}"` : "";
      cells.push(`<div class="preview-cell${pieceClass}"${fill}></div>`);
    }
  }
  return cells.join("");
}

function mountShell(): void {
  app.innerHTML = `
    <main class="shell">
      <section class="hero-panel">
        <p class="eyebrow">Golden Tetris Benchmark</p>
        <h1>Scratch-built Tetris, version 1.0 preview.</h1>
        <p class="lede">
          The first run starts from only a mission and a scope file. This preview is the
          first playable proof that the benchmark can turn that tiny seed into a real game.
        </p>
        <div class="controls-card">
          <p><strong>Move:</strong> Arrow keys or A / D</p>
          <p><strong>Rotate:</strong> Arrow Up or W</p>
          <p><strong>Soft drop:</strong> Arrow Down or S</p>
          <p><strong>Hard drop:</strong> Space</p>
          <p><strong>Pause:</strong> Escape or P</p>
        </div>
      </section>
      <section class="game-panel">
        <div class="hud-strip">
          <div class="metric">
            <span class="metric__label">Score</span>
            <strong id="scoreValue">0</strong>
          </div>
          <div class="metric">
            <span class="metric__label">Lines</span>
            <strong id="linesValue">0</strong>
          </div>
          <div class="metric">
            <span class="metric__label">Level</span>
            <strong id="levelValue">1</strong>
          </div>
          <div class="metric">
            <span class="metric__label">Best</span>
            <strong id="bestScoreValue">0</strong>
          </div>
        </div>
        <div class="stage">
          <div class="board-wrap">
            <div class="board" id="board"></div>
            <div class="overlay hidden" id="overlay">
              <div class="overlay__card">
                <p class="overlay__eyebrow" id="overlayEyebrow">Paused</p>
                <h2 id="overlayTitle">Hold steady.</h2>
                <p id="overlayBody">Resume when you are ready.</p>
                <div class="overlay__actions">
                  <button id="overlayPrimaryButton" type="button">Resume</button>
                  <button id="overlaySecondaryButton" type="button">Restart</button>
                </div>
              </div>
            </div>
          </div>
          <aside class="sidebar">
            <section class="next-panel">
              <p class="sidebar__label">Next Piece</p>
              <div class="preview-grid" id="previewGrid"></div>
            </section>
            <section class="status-panel">
              <p class="sidebar__label">Run Status</p>
              <p class="status-copy" id="statusCopy"></p>
            </section>
            <div class="button-row">
              <button id="pauseButton" type="button">Pause</button>
              <button id="restartButton" type="button">Restart</button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  `;

  document.querySelector<HTMLButtonElement>("#pauseButton")?.addEventListener("click", () => {
    togglePause();
  });
  document.querySelector<HTMLButtonElement>("#restartButton")?.addEventListener("click", () => {
    resetGame();
  });
  document
    .querySelector<HTMLButtonElement>("#overlayPrimaryButton")
    ?.addEventListener("click", () => {
      if (state.phase === "game-over") {
        resetGame();
        return;
      }
      togglePause();
    });
  document
    .querySelector<HTMLButtonElement>("#overlaySecondaryButton")
    ?.addEventListener("click", () => {
      resetGame();
    });
}

function render(): void {
  const board = document.querySelector<HTMLDivElement>("#board");
  const previewGrid = document.querySelector<HTMLDivElement>("#previewGrid");
  const scoreValue = document.querySelector<HTMLElement>("#scoreValue");
  const linesValue = document.querySelector<HTMLElement>("#linesValue");
  const levelValue = document.querySelector<HTMLElement>("#levelValue");
  const bestScoreValue = document.querySelector<HTMLElement>("#bestScoreValue");
  const statusCopy = document.querySelector<HTMLElement>("#statusCopy");
  const pauseButton = document.querySelector<HTMLButtonElement>("#pauseButton");
  const overlay = document.querySelector<HTMLDivElement>("#overlay");
  const overlayEyebrow = document.querySelector<HTMLElement>("#overlayEyebrow");
  const overlayTitle = document.querySelector<HTMLElement>("#overlayTitle");
  const overlayBody = document.querySelector<HTMLElement>("#overlayBody");
  const overlayPrimaryButton = document.querySelector<HTMLButtonElement>("#overlayPrimaryButton");

  if (!board || !previewGrid || !scoreValue || !linesValue || !levelValue || !bestScoreValue || !statusCopy) {
    throw new Error("Runtime shell references are missing.");
  }

  board.innerHTML = renderBoardMarkup();
  previewGrid.innerHTML = renderPreviewMarkup();
  scoreValue.textContent = String(state.score);
  linesValue.textContent = String(state.lines);
  levelValue.textContent = String(state.level);
  bestScoreValue.textContent = String(state.bestScore);
  statusCopy.textContent = state.status;

  if (pauseButton) {
    pauseButton.textContent = state.phase === "paused" ? "Resume" : "Pause";
  }

  if (overlay && overlayEyebrow && overlayTitle && overlayBody && overlayPrimaryButton) {
    overlay.classList.toggle("hidden", state.phase === "playing");
    if (state.phase === "paused") {
      overlayEyebrow.textContent = "Paused";
      overlayTitle.textContent = "Hold steady.";
      overlayBody.textContent = "Resume the run or restart from a clean stack.";
      overlayPrimaryButton.textContent = "Resume";
    } else if (state.phase === "game-over") {
      overlayEyebrow.textContent = "Game Over";
      overlayTitle.textContent = "The stack hit the ceiling.";
      overlayBody.textContent = `Final score ${state.score}. Start a fresh run and chase a cleaner board.`;
      overlayPrimaryButton.textContent = "Play Again";
    }
  }
}

function stateSnapshot(): string {
  return JSON.stringify(
    {
      phase: state.phase,
      score: state.score,
      lines: state.lines,
      level: state.level,
      bestScore: state.bestScore,
      pieceCount: state.pieceCount,
      active: state.active,
      nextQueue: state.nextQueue.slice(0, 3),
      board: boardWithActivePiece().map((row) => row.map((cell) => (cell === "" ? "." : cell)).join("")),
    },
    null,
    2,
  );
}

function advanceTime(ms: number): string {
  advanceSimulation(ms);
  render();
  return stateSnapshot();
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => string;
  }
}

window.render_game_to_text = stateSnapshot;
window.advanceTime = advanceTime;

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (event.key === "Escape" || event.key.toLowerCase() === "p") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (state.phase === "game-over" && event.key === "Enter") {
    resetGame();
    return;
  }

  if (state.phase !== "playing") {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      event.preventDefault();
      move(-1);
      break;
    case "ArrowRight":
    case "d":
    case "D":
      event.preventDefault();
      move(1);
      break;
    case "ArrowUp":
    case "w":
    case "W":
      event.preventDefault();
      rotate();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      event.preventDefault();
      if (stepDown(true)) {
        state.status = `${nowIso()} Soft drop engaged.`;
        render();
      } else {
        render();
      }
      break;
    case " ":
      event.preventDefault();
      hardDrop();
      break;
  }
});

function frame(time: number): void {
  const delta = time - lastFrameTime;
  lastFrameTime = time;
  advanceSimulation(delta);
  render();
  window.requestAnimationFrame(frame);
}

mountShell();
resetGame();
window.requestAnimationFrame((time) => {
  lastFrameTime = time;
  window.requestAnimationFrame(frame);
});
