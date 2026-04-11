# Golden Tetris Prompt Chain

Use this chain as the baseline sequence for model runs that start from the `Golden Tetris` seed.

1. Read `Context.md`, restate the mission, and list the two initial repo files exactly.
2. Describe the smallest credible version `1.0` preview that would already count as playable.
3. Bootstrap the project with a lightweight browser toolchain and a deterministic game loop.
4. Implement falling tetromino gameplay, HUD, pause, game over, and restart.
5. Add a deterministic text-inspection hook and basic verification steps.
6. Review the preview critically, note what still feels weak, and propose the next refinement prompt.
7. Append the concrete changes to `ACTIONS_TAKEN_HISTORY.md` in human-readable order.

The goal is to preserve a reproducible chain of asks that can later become a specialized scratch-build coding agent workflow.
