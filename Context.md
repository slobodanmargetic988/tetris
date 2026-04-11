# Golden Tetris Context Packet

This file is the operator-facing context packet that should be pasted into the agent system prompt for a `Golden Tetris` run.

## Initial Repo State

The initial project seed contains exactly these project files:

1. `Golden Tetris/mission.md`
2. `Golden Tetris/scope.md`

## File: `Golden Tetris/mission.md`

```md
# Mission: Golden Tetris Version 1.0

Build a browser-based single-player Tetris game from scratch starting from a repository seed that initially contains only this mission file and its matching scope file.

The first successful run must produce a playable preview that a human can open locally and enjoy immediately. The benchmark is not satisfied by a static mock or a half-game shell. The preview must already feel like real Tetris:

1. A visible 10x20 playfield.
2. Falling tetrominoes with continuous game progression.
3. Responsive keyboard controls with Arrow keys and WASD parity.
4. Score, lines, level, and next-piece HUD.
5. Pause and resume without corrupting the run.
6. Legitimate top-out game over.
7. Clear restart path into a fresh run.

The benchmark is also meant to capture how an AI builder improves a project over time. Every run should leave behind:

- a working game build,
- a readable action history of what changed,
- a prompt chain that explains the sequence of asks used to improve the project,
- and enough repo context for a later model to continue the work without guessing.

The first milestone is a strong version `1.0` preview, not a final perfect product. It should already be clean, fun, understandable, and easy to extend.
```

## File: `Golden Tetris/scope.md`

```md
# Scope: Golden Tetris Scratch-Build Benchmark

This benchmark measures whether an AI agent can take a tiny project seed and turn it into a real playable game while documenting the improvement path clearly.

## Initial Seed Rule

The initial project seed must be treated as only these two project files:

- `Golden Tetris/mission.md`
- `Golden Tetris/scope.md`

Any other files, including `Context.md`, action history, or prompt-chain notes, are benchmark support artifacts and not part of the bare project seed.

## Version 1.0 Preview Requirements

The first preview should include:

1. Local browser runtime using a modern lightweight toolchain.
2. Real-time falling blocks and deterministic board updates.
3. Playable input for move left, move right, rotate, soft drop, hard drop, and pause.
4. Scoreboard with score, lines, level, and game state.
5. Restart flow after game over.
6. Clean visual presentation with strong contrast and readable cells.
7. A deterministic inspection hook such as `window.render_game_to_text`.
8. A presentable `ACTIONS_TAKEN_HISTORY.md` page that records the improvement steps.
9. A `PROMPT_CHAIN.md` document that captures the chain of AI prompts or working phases used to build and refine the project.

## Evidence Expectations

For each model run, aim to leave:

- a pushed branch,
- a local preview that builds successfully,
- a concise history of actions taken,
- and a record of what still needs improvement next.

## Out of Scope For Version 1.0

- Multiplayer
- Online leaderboards
- Mobile packaging
- Accounts or backend services
- Audio licensing work beyond simple documented placeholders

## Success Condition

The run is successful when the branch produces a working preview that already feels like a real game, and the repo history plus benchmark docs make the improvement path easy to understand and reproduce.
```
