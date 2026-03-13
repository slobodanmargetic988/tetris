Original prompt: Agent: optimus-fullstack-developer. Goal: Implement runtime bootstrap: package scripts, Vite entrypoint, and app mount wiring for TASK-007 with deterministic npm scripts and localhost runtime shell mount.

## 2026-03-13
- Added Vite lifecycle scripts (`dev`, `build`, `preview`) and deterministic test scripts (`test:unit`, `test:e2e`) plus a placeholder deterministic `lint` command in `package.json`.
- Added browser entrypoint `index.html` mounting `/src/main.ts`.
- Added `src/main.ts` runtime bootstrap that mounts HUD + 10x20 board, marks active piece cells, and exposes `window.render_game_to_text` and `window.advanceTime`.
- Added `src/styles.css` for a visible runtime shell layout on desktop and mobile widths.
- Verified scripts:
  - `npm run test:unit` passes (`tests/tdd/bootstrap_shell.spec.ts` green).
  - `npm run build` passes (Vite production build emits `dist/` bundle).
  - `npm run dev -- --host 127.0.0.1 --port 5173` starts and serves runtime shell at `http://127.0.0.1:5173/`.
  - `npm run lint` and `npm run test:e2e` both exit deterministically with code 0.
- Ran `develop-web-game` Playwright client and validated artifacts (`output/web-game/shot-0.png`, `state-0.json`) against first-frame shell + text-state expectations.
