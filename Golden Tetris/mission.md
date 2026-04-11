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
