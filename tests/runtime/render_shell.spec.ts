// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd());

async function importMainEntry() {
  const mainEntryPath = resolve(repoRoot, "src/main.ts");
  expect(existsSync(mainEntryPath), "Expected src/main.ts runtime entrypoint to exist.").toBe(true);
  await import(`${pathToFileURL(mainEntryPath).href}?seed=${Date.now()}`);
}

describe("runtime render shell", () => {
  it("renders non-debug 10x20 playfield canvas and HUD placeholders", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await importMainEntry();

    const boardCanvas = document.querySelector<HTMLCanvasElement>('[data-testid="board-canvas"]');
    const hud = document.querySelector('[data-testid="hud"]');

    expect(boardCanvas, "Expected a board canvas to render in the runtime shell.").not.toBeNull();
    expect(boardCanvas?.dataset.boardWidth).toBe("10");
    expect(boardCanvas?.dataset.boardHeight).toBe("20");
    expect(hud, "Expected HUD scaffold section to render.").not.toBeNull();
    expect(document.querySelector('[data-testid="hud-score"]')?.textContent).toContain("Score: 0");
    expect(document.querySelector('[data-testid="hud-lines"]')?.textContent).toContain("Lines: 0");
    expect(document.querySelector('[data-testid="hud-level"]')?.textContent).toContain("Level: 1");
    expect(document.querySelectorAll('.cell').length, "Expected non-debug canvas shell without div grid cells.").toBe(0);
  });

  it("spawns and marks an active piece immediately in playing state", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await importMainEntry();

    const shell = document.querySelector('[data-testid="runtime-shell"]');
    const boardCanvas = document.querySelector<HTMLCanvasElement>('[data-testid="board-canvas"]');

    expect(shell?.getAttribute("data-mode")).toBe("playing");
    expect(boardCanvas?.dataset.activePiece).toBe("true");
    expect(Number(boardCanvas?.dataset.activePieceCells)).toBeGreaterThan(0);

    const renderFn = (
      window as Window & { render_game_to_text?: () => string }
    ).render_game_to_text;

    expect(typeof renderFn).toBe("function");
    const payload = JSON.parse(renderFn!());
    expect(payload?.mode).toBe("playing");
    expect(payload?.activePiece?.id).toBeTruthy();
    expect(payload?.activePiece?.cells?.length).toBeGreaterThan(0);
  });
});
