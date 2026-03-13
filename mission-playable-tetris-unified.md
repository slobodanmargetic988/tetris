# Mission: Build a Complete, Human-Ready Tetris2

Build `Tetris2` into a fully playable, polished, browser-based single-player Tetris game that a non-technical human can open on localhost and play end-to-end without confusion, dead ends, or debug-only controls.

The game must feel like real Tetris from first spawn to game over, then cleanly continue through name entry, score submission, leaderboard review, and replay.

## What Tetris Is (Product Definition)

Tetris is a real-time puzzle game where a sequence of tetrominoes falls into a **10x20** playfield.  
The player moves and rotates each falling piece to complete horizontal lines.  
Completed lines clear, score increases, and difficulty rises over time via gravity progression.  
The run ends on **top-out** (no legal spawn / spawn collision).  
A complete product includes clear visuals, responsive controls, readable pacing, reliable pause behavior, and a repeatable game-over-to-replay loop.

## Required Player Experience

The shipped game must let a player:

1. Open localhost and immediately see a real visual game board (not debug text) with active falling pieces.
2. Play using Arrow keys and WASD with reliable parity.
3. Use soft drop, hard drop, movement, and rotation with responsive feedback.
4. Pause into a clear modal and resume/reset with both keyboard and pointer controls.
5. Reach legitimate game-over through top-out (not a synthetic finish shortcut).
6. Enter and validate a name, submit score once, and see leaderboard results.
7. View Top 10 plus personal global-rank context when outside Top 10.
8. Start a new run from results/leaderboard and replay repeatedly without stale state.

## Functional + Technical Commitments

- Preserve deterministic gameplay behavior and testability.
- Use endless deterministic piece supply (7-bag or equivalent deterministic endless queue).
- Keep speed curve human-readable at early and mid levels (not frantic at start).
- Maintain local persistence with corruption-safe loading and stable ranking rules.
- Provide polished, understandable state transitions and immediate interaction feedback.
- Include browser-level verification as release evidence, not only module-level tests.
- Reintroduce/maintain deterministic automation hooks (including `window.render_game_to_text`).

## Polish + Audio Commitments

- Deliver polished board/HUD presentation with clear tetromino readability.
- Add tasteful feedback animations/effects that do not harm precision.
- Add legal-safe audio (music + SFX) if feasible, with:
  - master volume,
  - music volume,
  - sfx volume,
  - mute toggle,
  - graceful fallback when assets fail or autoplay is blocked.
- Record audio asset license metadata when audio ships.

## Guardrails

- This is not an arcade-perfect pro-tuning project; it is a robust, fun, standards-aligned baseline.
- No multiplayer, backend services, auth, monetization, or matchmaking in this mission.
- “Done” requires verified human-playable runtime behavior, not simulated harness-only completion.

## Mission Completion Criteria

Mission is complete only when all are true:

1. Gameplay is visibly and continuously playable in-browser from start to top-out.
2. Controls, pause flow, and transitions are intuitive and reliable.
3. Results/leaderboard/replay loop works repeatedly with persistent highscores.
4. No debug-only controls are required for normal completion (`Tick`/manual finish paths removed or dev-gated).
5. Automated browser evidence and tests prove lifecycle integrity, pacing sanity, and regression safety.
