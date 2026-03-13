import "./styles.css";

type Cell = { x: number; y: number };

type FrameState = {
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

const firstFrame: FrameState = {
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

const activeCellLookup = new Set(firstFrame.activePiece.cells.map((cell) => `${cell.x},${cell.y}`));

function buildBoardMarkup(): string {
  const cells: string[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const isActive = activeCellLookup.has(`${x},${y}`);
      cells.push(
        `<div class="cell${isActive ? " cell--active" : ""}" data-x="${x}" data-y="${y}"${isActive ? ' data-active-piece="true"' : ""}></div>`,
      );
    }
  }
  return cells.join("");
}

function mountRuntimeShell(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("Missing #app mount element for runtime shell bootstrap.");
  }

  app.innerHTML = `
    <main class="runtime-shell" data-testid="runtime-shell">
      <section class="hud" data-testid="hud">
        <h1>Tetris</h1>
        <p>Score: ${firstFrame.hud.score}</p>
        <p>Lines: ${firstFrame.hud.lines}</p>
        <p>Level: ${firstFrame.hud.level}</p>
      </section>
      <section
        class="board"
        data-testid="board"
        data-board-width="${firstFrame.board.width}"
        data-board-height="${firstFrame.board.height}"
      >
        ${buildBoardMarkup()}
      </section>
    </main>
  `;
}

function renderGameToText(): string {
  return JSON.stringify(firstFrame);
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
