// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd());

function readPackageJson() {
  const packageJsonPath = resolve(repoRoot, "package.json");
  expect(
    existsSync(packageJsonPath),
    "Expected package.json to exist for Vite bootstrap shell contract.",
  ).toBe(true);
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
}

async function importMainEntry() {
  const mainEntryPath = resolve(repoRoot, "src/main.ts");
  expect(
    existsSync(mainEntryPath),
    "Expected src/main.ts to bootstrap the Vite app into #app.",
  ).toBe(true);
  await import(`${pathToFileURL(mainEntryPath).href}?seed=${Date.now()}`);
}

describe("bootstrap shell contract (red)", () => {
  it("defines Vite shell scripts for local bootstrap lifecycle", () => {
    const packageJson = readPackageJson();
    expect(
      packageJson.scripts?.dev,
      "Missing `npm run dev` Vite bootstrap script.",
    ).toBe("vite");
    expect(
      packageJson.scripts?.build,
      "Missing `npm run build` Vite production bundle script.",
    ).toBe("vite build");
    expect(
      packageJson.scripts?.preview,
      "Missing `npm run preview` Vite preview shell script.",
    ).toBe("vite preview");
  });

  it("mounts a first visible frame with board, HUD, and active spawned piece", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await importMainEntry();

    const board = document.querySelector('[data-testid="board"]');
    const hud = document.querySelector('[data-testid="hud"]');
    const activePiece = document.querySelector('[data-active-piece="true"]');

    expect(board, "Expected the first frame to render the game board.").not.toBeNull();
    expect(hud, "Expected the first frame to render the HUD.").not.toBeNull();
    expect(
      activePiece,
      "Expected the first frame to include a spawned active piece marker.",
    ).not.toBeNull();
  });

  it("projects first-frame board and HUD state through window.render_game_to_text", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await importMainEntry();

    const renderFn = (
      window as Window & { render_game_to_text?: () => string }
    ).render_game_to_text;

    expect(
      typeof renderFn,
      "Expected window.render_game_to_text to be installed during bootstrap.",
    ).toBe("function");

    const payload = JSON.parse(renderFn!());
    expect(payload?.board?.width, "Expected board width of 10 in first frame state.").toBe(10);
    expect(payload?.board?.height, "Expected board height of 20 in first frame state.").toBe(20);
    expect(
      payload?.activePiece?.cells?.length,
      "Expected at least one active piece cell in first frame state.",
    ).toBeGreaterThan(0);
    expect(payload?.hud?.score, "Expected HUD score to start at zero.").toBe(0);
    expect(payload?.hud?.lines, "Expected HUD lines to start at zero.").toBe(0);
    expect(payload?.hud?.level, "Expected HUD level to start at one.").toBe(1);
  });
});
