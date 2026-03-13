import "./styles.css";

type Cell = { x: number; y: number };

type GameMode = "playing";

type GameState = {
  mode: GameMode;
  board: {
    width: number;
    height: number;
    coordinateSystem: string;
  };
  activePiece: {
    id: string;
    cells: Cell[];
  };
  hud: {
    score: number;
    lines: number;
    level: number;
  };
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 32;

const gameState: GameState = {
  mode: "playing",
  board: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    coordinateSystem: "origin=(0,0) at top-left, +x right, +y down",
  },
  activePiece: {
    id: "T",
    cells: [
      { x: 4, y: 0 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ],
  },
  hud: {
    score: 0,
    lines: 0,
    level: 1,
  },
};

function mountRuntimeShell(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("Missing #app mount element for runtime shell bootstrap.");
  }

  const boardPixelWidth = gameState.board.width * CELL_SIZE;
  const boardPixelHeight = gameState.board.height * CELL_SIZE;

  app.innerHTML = `
    <main class="runtime-shell" data-testid="runtime-shell" data-mode="${gameState.mode}">
      <section class="hud" data-testid="hud">
        <h1>Tetris</h1>
        <p data-testid="hud-mode">Mode: ${gameState.mode.toUpperCase()}</p>
        <p data-testid="hud-score">Score: ${gameState.hud.score}</p>
        <p data-testid="hud-lines">Lines: ${gameState.hud.lines}</p>
        <p data-testid="hud-level">Level: ${gameState.hud.level}</p>
      </section>
      <section
        class="board"
        data-testid="board"
        data-board-width="${gameState.board.width}"
        data-board-height="${gameState.board.height}"
      >
        <canvas
          class="board-canvas"
          data-testid="board-canvas"
          data-board-width="${gameState.board.width}"
          data-board-height="${gameState.board.height}"
          data-active-piece="${gameState.activePiece.cells.length > 0 ? "true" : "false"}"
          data-active-piece-id="${gameState.activePiece.id}"
          data-active-piece-cells="${gameState.activePiece.cells.length}"
          width="${boardPixelWidth}"
          height="${boardPixelHeight}"
          aria-label="Tetris playfield"
          role="img"
        ></canvas>
      </section>
    </main>
  `;

  const canvas = app.querySelector<HTMLCanvasElement>('[data-testid="board-canvas"]');
  if (!canvas) {
    throw new Error("Missing board canvas in runtime shell.");
  }

  renderBoardCanvas(canvas, gameState);
}

function renderBoardCanvas(canvas: HTMLCanvasElement, state: GameState): void {
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const boardPixelWidth = state.board.width * CELL_SIZE;
  const boardPixelHeight = state.board.height * CELL_SIZE;
  if (canvas.width !== boardPixelWidth) {
    canvas.width = boardPixelWidth;
  }
  if (canvas.height !== boardPixelHeight) {
    canvas.height = boardPixelHeight;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0d1324";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(102, 131, 197, 0.24)";
  context.lineWidth = 1;

  for (let x = 0; x <= state.board.width; x += 1) {
    const lineX = x * CELL_SIZE + 0.5;
    context.beginPath();
    context.moveTo(lineX, 0);
    context.lineTo(lineX, canvas.height);
    context.stroke();
  }

  for (let y = 0; y <= state.board.height; y += 1) {
    const lineY = y * CELL_SIZE + 0.5;
    context.beginPath();
    context.moveTo(0, lineY);
    context.lineTo(canvas.width, lineY);
    context.stroke();
  }

  context.fillStyle = "#42d7f2";
  context.strokeStyle = "#83f1ff";
  for (const cell of state.activePiece.cells) {
    const cellX = cell.x * CELL_SIZE + 1;
    const cellY = cell.y * CELL_SIZE + 1;
    const fillSize = CELL_SIZE - 2;

    context.fillRect(cellX, cellY, fillSize, fillSize);
    context.strokeRect(cellX + 0.5, cellY + 0.5, fillSize - 1, fillSize - 1);
  }
}

function renderGameToText(): string {
  return JSON.stringify(gameState);
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => string;
  }
}

window.render_game_to_text = renderGameToText;
window.advanceTime = () => renderGameToText();

mountRuntimeShell();
