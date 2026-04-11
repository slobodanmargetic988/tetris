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
