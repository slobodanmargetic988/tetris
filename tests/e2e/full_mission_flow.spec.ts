import { expect, test } from "@playwright/test";

interface TransitionSnapshot {
  from: string;
  to: string;
  durationMs: number;
  reducedMotion: boolean;
  atMs: number;
}

interface MissionSnapshot {
  mode: string;
  board: {
    width: number;
    height: number;
    coordinateSystem: string;
  };
  activePiece: {
    id: string;
    x: number;
    y: number;
  };
  score: number;
  lines: number;
  level: number;
  reducedMotion: boolean;
  transitionMs: number;
  transitions: TransitionSnapshot[];
  pendingTransition: null | {
    to: string;
    remainingMs: number;
  };
  submissions: number;
  playerRank: number | null;
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => string;
    __missionHarness: {
      forceTopOut: () => void;
      getState: () => MissionSnapshot;
      getTransitions: () => TransitionSnapshot[];
    };
  }
}

function buildMissionHarnessHtml(): string {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tetris Mission Harness</title>
    <style>
      :root {
        --transition-ms: 260ms;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: linear-gradient(160deg, #1f2b4d, #101726);
        color: #f3f6ff;
      }
      #app {
        max-width: 980px;
        margin: 0 auto;
        min-height: 100vh;
        padding: 24px;
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 20px;
      }
      #board-shell {
        border: 2px solid #79a9ff;
        border-radius: 12px;
        padding: 16px;
        background: rgba(5, 10, 18, 0.8);
      }
      #board {
        height: 440px;
        border: 1px solid #4e75c9;
        border-radius: 8px;
        display: grid;
        place-content: center;
        text-align: center;
        font-size: 20px;
        background:
          linear-gradient(0deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px) 0 0 / 100% 22px,
          linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px) 0 0 / 32px 100%;
        transition: transform var(--transition-ms) linear, opacity var(--transition-ms) linear;
      }
      #sidebar {
        border-radius: 12px;
        padding: 16px;
        background: rgba(5, 10, 18, 0.7);
        border: 1px solid #33508d;
      }
      .controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      button {
        border: 0;
        border-radius: 8px;
        background: #5f9bff;
        color: #02132f;
        font-weight: 700;
        padding: 8px 12px;
        cursor: pointer;
      }
      button:disabled {
        background: #6f7890;
        color: #cad1df;
        cursor: not-allowed;
      }
      .screen {
        margin-top: 14px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px;
        transition: opacity var(--transition-ms) linear, transform var(--transition-ms) linear;
      }
      #pause-modal[hidden],
      #results-screen[hidden],
      #leaderboard-screen[hidden] {
        display: none;
      }
      #validation-msg {
        min-height: 20px;
      }
      #top10 {
        padding-left: 20px;
      }
      @media (prefers-reduced-motion: reduce) {
        :root {
          --transition-ms: 80ms;
        }
      }
    </style>
  </head>
  <body>
    <main id="app">
      <section id="board-shell" aria-label="Game board shell">
        <h1>Tetris2 Full Mission Harness</h1>
        <p id="phase-readout">Phase: <strong id="phase-label">playing</strong></p>
        <div id="board" aria-label="Tetris board">
          <div id="board-state">Active piece #1 at x=4 y=0</div>
        </div>
      </section>
      <aside id="sidebar">
        <p>Score: <strong id="score">0</strong></p>
        <p>Lines: <strong id="lines">0</strong></p>
        <p>Level: <strong id="level">1</strong></p>
        <div class="controls">
          <button id="pause-btn" type="button">Pause</button>
          <button id="force-topout-btn" type="button">Force Top-Out</button>
        </div>
        <section class="screen" id="pause-modal" aria-label="Pause modal" hidden>
          <h2>Paused</h2>
          <p>Press Escape to resume or use buttons below.</p>
          <div class="controls">
            <button id="resume-btn" type="button">Resume</button>
            <button id="reset-btn" type="button">Reset Run</button>
          </div>
        </section>
        <section class="screen" id="results-screen" aria-label="Results screen" hidden>
          <h2>Results</h2>
          <label for="name-input">Name</label>
          <input id="name-input" type="text" maxlength="12" />
          <p id="validation-msg"></p>
          <button id="submit-score-btn" type="button" disabled>Submit Score</button>
        </section>
        <section class="screen" id="leaderboard-screen" aria-label="Leaderboard screen" hidden>
          <h2>Leaderboard Top 10</h2>
          <ol id="top10"></ol>
          <p id="player-rank"></p>
          <button id="new-game-btn" type="button">New Game</button>
        </section>
      </aside>
    </main>
    <script>
      (() => {
        const SEED = [
          { id: "seed-1", name: "ALF", score: 5000 },
          { id: "seed-2", name: "BEE", score: 4500 },
          { id: "seed-3", name: "CHI", score: 4000 },
          { id: "seed-4", name: "DAX", score: 3500 },
          { id: "seed-5", name: "EON", score: 3000 },
          { id: "seed-6", name: "FOX", score: 2600 },
          { id: "seed-7", name: "GEO", score: 2200 },
          { id: "seed-8", name: "HEX", score: 1900 },
          { id: "seed-9", name: "ION", score: 1650 },
          { id: "seed-10", name: "JAY", score: 1400 }
        ];

        const els = {
          root: document.documentElement,
          phaseLabel: document.getElementById("phase-label"),
          boardState: document.getElementById("board-state"),
          score: document.getElementById("score"),
          lines: document.getElementById("lines"),
          level: document.getElementById("level"),
          pauseButton: document.getElementById("pause-btn"),
          topOutButton: document.getElementById("force-topout-btn"),
          pauseModal: document.getElementById("pause-modal"),
          resumeButton: document.getElementById("resume-btn"),
          resetButton: document.getElementById("reset-btn"),
          resultsScreen: document.getElementById("results-screen"),
          nameInput: document.getElementById("name-input"),
          validation: document.getElementById("validation-msg"),
          submitButton: document.getElementById("submit-score-btn"),
          leaderboardScreen: document.getElementById("leaderboard-screen"),
          top10: document.getElementById("top10"),
          playerRank: document.getElementById("player-rank"),
          newGameButton: document.getElementById("new-game-btn")
        };

        const state = {
          phase: "playing",
          score: 0,
          lines: 0,
          level: 1,
          elapsedMs: 0,
          pieceSpawnCount: 1,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          transitionHistory: [],
          pendingTransition: null,
          submissions: 0,
          playerName: "",
          playerRank: null,
          leaderboardTopTen: SEED.slice(),
          playerEntry: null
        };

        function transitionMs() {
          return state.reducedMotion ? 80 : 260;
        }

        function setPhase(next) {
          if (state.phase === next) {
            return;
          }
          state.transitionHistory.push({
            from: state.phase,
            to: next,
            durationMs: transitionMs(),
            reducedMotion: state.reducedMotion,
            atMs: state.elapsedMs
          });
          state.phase = next;
        }

        function sortLeaderboard(entries) {
          return entries
            .slice()
            .sort((left, right) => {
              if (right.score !== left.score) {
                return right.score - left.score;
              }
              return left.name.localeCompare(right.name);
            });
        }

        function resetRun() {
          state.score = 0;
          state.lines = 0;
          state.level = 1;
          state.elapsedMs = 0;
          state.pieceSpawnCount = 1;
          state.pendingTransition = null;
          state.submissions = 0;
          state.playerName = "";
          state.playerRank = null;
          state.playerEntry = null;
          state.leaderboardTopTen = SEED.slice();
          setPhase("playing");
        }

        function validateName(name) {
          return /^[A-Za-z0-9 _-]{3,12}$/.test(name);
        }

        function recalculateLeaderboard() {
          const merged = state.playerEntry ? [...SEED, state.playerEntry] : [...SEED];
          const ordered = sortLeaderboard(merged);
          state.leaderboardTopTen = ordered.slice(0, 10);
          if (state.playerEntry) {
            const index = ordered.findIndex((entry) => entry.id === state.playerEntry.id);
            state.playerRank = index === -1 ? null : index + 1;
          } else {
            state.playerRank = null;
          }
        }

        function topOut() {
          if (state.phase !== "playing") {
            return;
          }
          setPhase("gameOver");
          state.pendingTransition = {
            to: "results",
            remainingMs: transitionMs()
          };
        }

        function submitScore() {
          if (state.phase !== "results" || state.submissions > 0) {
            return;
          }
          const cleanName = els.nameInput.value.trim();
          if (!validateName(cleanName)) {
            return;
          }

          state.submissions += 1;
          state.playerName = cleanName;
          state.playerEntry = {
            id: "player-entry",
            name: cleanName,
            score: state.score
          };
          recalculateLeaderboard();
          setPhase("leaderboard");
        }

        function step(frameMs) {
          state.elapsedMs += frameMs;

          if (state.phase === "playing") {
            state.score += 30;
            if (state.elapsedMs % 400 === 0) {
              state.lines += 1;
            }
            state.level = 1 + Math.floor(state.lines / 10);
          }

          if (state.pendingTransition) {
            state.pendingTransition.remainingMs -= frameMs;
            if (state.pendingTransition.remainingMs <= 0) {
              const next = state.pendingTransition.to;
              state.pendingTransition = null;
              setPhase(next);
            }
          }
        }

        function advanceTime(ms) {
          const boundedMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
          const frameMs = 100;
          const steps = Math.max(1, Math.ceil(boundedMs / frameMs));
          for (let index = 0; index < steps; index += 1) {
            step(frameMs);
          }
          render();
          return window.render_game_to_text();
        }

        function render() {
          els.root.style.setProperty("--transition-ms", transitionMs() + "ms");
          els.root.dataset.transitionMs = String(transitionMs());
          els.phaseLabel.textContent = state.phase;
          els.score.textContent = String(state.score);
          els.lines.textContent = String(state.lines);
          els.level.textContent = String(state.level);

          const pieceY = Math.min(19, Math.floor((state.elapsedMs / 100) % 20));
          els.boardState.textContent =
            "Active piece #" + state.pieceSpawnCount + " at x=4 y=" + pieceY;

          els.pauseModal.hidden = state.phase !== "paused";
          els.resultsScreen.hidden = state.phase !== "results";
          els.leaderboardScreen.hidden = state.phase !== "leaderboard";

          els.pauseButton.disabled = state.phase !== "playing";
          els.topOutButton.disabled = state.phase !== "playing";

          const candidateName = els.nameInput.value.trim();
          const validName = validateName(candidateName);
          if (state.phase === "results") {
            if (!candidateName) {
              els.validation.textContent = "Enter a name with 3-12 characters.";
            } else if (!validName) {
              els.validation.textContent =
                "Name must be 3-12 chars using letters, numbers, spaces, '-' or '_'.";
            } else {
              els.validation.textContent = "Name looks valid. Submit when ready.";
            }
          } else {
            els.validation.textContent = "";
          }

          els.submitButton.disabled =
            state.phase !== "results" || !validName || state.submissions > 0;

          els.top10.innerHTML = "";
          state.leaderboardTopTen.forEach((entry, index) => {
            const row = document.createElement("li");
            row.textContent = (index + 1) + ". " + entry.name + " - " + entry.score;
            els.top10.appendChild(row);
          });

          if (state.phase === "leaderboard" && state.playerRank !== null) {
            if (state.playerRank > 10) {
              els.playerRank.textContent =
                "Global rank: #" + state.playerRank + " (" + state.playerName + ")";
            } else {
              els.playerRank.textContent =
                "Global rank: #" + state.playerRank + " (" + state.playerName + ") inside Top 10";
            }
          } else {
            els.playerRank.textContent = "";
          }
        }

        els.pauseButton.addEventListener("click", () => {
          if (state.phase === "playing") {
            setPhase("paused");
            render();
          }
        });

        els.resumeButton.addEventListener("click", () => {
          if (state.phase === "paused") {
            setPhase("playing");
            render();
          }
        });

        els.resetButton.addEventListener("click", () => {
          resetRun();
          render();
        });

        els.topOutButton.addEventListener("click", () => {
          topOut();
          render();
        });

        els.nameInput.addEventListener("input", () => {
          render();
        });

        els.submitButton.addEventListener("click", () => {
          submitScore();
          render();
        });

        els.newGameButton.addEventListener("click", () => {
          resetRun();
          render();
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            if (state.phase === "playing") {
              setPhase("paused");
            } else if (state.phase === "paused") {
              setPhase("playing");
            }
            render();
            return;
          }

          if (event.key.toLowerCase() === "p") {
            if (state.phase === "playing") {
              setPhase("paused");
            } else if (state.phase === "paused") {
              setPhase("playing");
            }
            render();
            return;
          }

          if (event.key.toLowerCase() === "t") {
            topOut();
            render();
          }
        });

        window.render_game_to_text = () =>
          JSON.stringify({
            mode: state.phase,
            board: {
              width: 10,
              height: 20,
              coordinateSystem: "origin top-left (0,0), x increases right, y increases down"
            },
            activePiece: {
              id: "piece-" + state.pieceSpawnCount,
              x: 4,
              y: Math.min(19, Math.floor((state.elapsedMs / 100) % 20))
            },
            score: state.score,
            lines: state.lines,
            level: state.level,
            reducedMotion: state.reducedMotion,
            transitionMs: transitionMs(),
            transitions: state.transitionHistory.slice(-8),
            pendingTransition: state.pendingTransition
              ? {
                  to: state.pendingTransition.to,
                  remainingMs: state.pendingTransition.remainingMs
                }
              : null,
            submissions: state.submissions,
            playerRank: state.playerRank
          });

        window.advanceTime = advanceTime;
        window.__missionHarness = {
          forceTopOut: () => {
            topOut();
            render();
          },
          getState: () => JSON.parse(window.render_game_to_text()),
          getTransitions: () => state.transitionHistory.slice()
        };

        render();
      })();
    </script>
  </body>
</html>
`;
}

async function getSnapshot(page: Parameters<typeof test>[0]["page"]): Promise<MissionSnapshot> {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

test("full mission lifecycle is deterministic and replay-safe", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setContent(buildMissionHarnessHtml());

  const initial = await getSnapshot(page);
  expect(initial.mode).toBe("playing");
  expect(initial.activePiece.id).toBe("piece-1");
  expect(initial.board.coordinateSystem).toContain("origin top-left");

  await page.evaluate(() => window.advanceTime(300));
  const progressed = await getSnapshot(page);
  expect(progressed.score).toBeGreaterThan(initial.score);

  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-modal")).toBeVisible();
  await expect(page.locator("#phase-label")).toHaveText("paused");
  await page.screenshot({
    path: testInfo.outputPath("mission-paused.png"),
    fullPage: true
  });

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.locator("#phase-label")).toHaveText("playing");

  await page.getByRole("button", { name: "Force Top-Out" }).click();
  await expect(page.locator("#phase-label")).toHaveText("gameOver");

  await page.evaluate(() => window.advanceTime(500));
  await expect(page.locator("#phase-label")).toHaveText("results");
  await page.screenshot({
    path: testInfo.outputPath("mission-results.png"),
    fullPage: true
  });

  const submitButton = page.locator("#submit-score-btn");
  await expect(submitButton).toBeDisabled();
  await page.locator("#name-input").fill("x");
  await expect(page.locator("#validation-msg")).toContainText("3-12");
  await expect(submitButton).toBeDisabled();

  await page.locator("#name-input").fill("ACE Pilot");
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await expect(page.locator("#phase-label")).toHaveText("leaderboard");

  const afterSubmit = await getSnapshot(page);
  expect(afterSubmit.submissions).toBe(1);
  expect(afterSubmit.playerRank).toBe(11);
  await expect(page.locator("#top10 li")).toHaveCount(10);
  await expect(page.locator("#player-rank")).toContainText("Global rank: #11");

  await page.screenshot({
    path: testInfo.outputPath("mission-leaderboard.png"),
    fullPage: true
  });

  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.locator("#phase-label")).toHaveText("playing");

  const replayStart = await getSnapshot(page);
  expect(replayStart.score).toBe(0);
  expect(replayStart.submissions).toBe(0);

  await page.evaluate(() => window.advanceTime(200));
  const replayProgressed = await getSnapshot(page);
  expect(replayProgressed.score).toBeGreaterThan(0);
});

test("reduced motion keeps transitions short and preserves automation hooks", async ({
  page
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(buildMissionHarnessHtml());

  const initial = await getSnapshot(page);
  expect(initial.reducedMotion).toBe(true);
  expect(initial.transitionMs).toBe(80);

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__missionHarness.forceTopOut());
  await page.evaluate(() => window.advanceTime(500));
  await expect(page.locator("#phase-label")).toHaveText("results");

  await page.locator("#name-input").fill("MOTIONSAFE");
  await page.getByRole("button", { name: "Submit Score" }).click();
  await expect(page.locator("#phase-label")).toHaveText("leaderboard");

  const transitions = await page.evaluate(() => window.__missionHarness.getTransitions());
  expect(transitions.length).toBeGreaterThanOrEqual(4);
  for (const transition of transitions) {
    expect(transition.reducedMotion).toBe(true);
    expect(transition.durationMs).toBeLessThanOrEqual(120);
  }

  await expect(page.locator("html")).toHaveAttribute("data-transition-ms", "80");
  await page.screenshot({
    path: testInfo.outputPath("mission-reduced-motion.png"),
    fullPage: true
  });
});
