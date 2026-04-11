# Tetris3

`Tetris3` is the first `Golden Tetris` scratch-build benchmark run.

## What This Repo Represents

- Branch: `golden-tetris/tetris3-run-1`
- Benchmark seed: `Golden Tetris/mission.md` and `Golden Tetris/scope.md`
- Prompt packet: `Context.md`
- Improvement log: `ACTIONS_TAKEN_HISTORY.md`
- Prompt sequence: `PROMPT_CHAIN.md`

## Naming Convention For Later Runs

- First model run: `Earth/Tetris3` on branch `golden-tetris/tetris3-run-1`
- Second model run: `Earth/Tetris4` on branch `golden-tetris/tetris4-run-2`
- Third model run: `Earth/Tetris5` on branch `golden-tetris/tetris5-run-3`

Keep each run isolated in its own clone and branch so no later model overrides an earlier benchmark result.

## Run Locally

```bash
npm install
npm run dev
```

Open the local Vite URL and play.

## Production-Style Preview

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

## Deterministic Hooks

The preview exposes:

- `window.render_game_to_text()`
- `window.advanceTime(ms)`

These are meant to help future model runs inspect or step the game deterministically.
