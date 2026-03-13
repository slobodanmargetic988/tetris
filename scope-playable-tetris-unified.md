# Scope: Playable Tetris2 Unified Delivery (Max 50 Tasks)

This scope supersedes prior phase/completion scopes and preserves all required outcomes.  
Task count is capped at **46** to stay below the requested 50-task maximum.

## Non-Negotiable Outcome

Ship a production-like browser Tetris experience with:
- real-time visible gameplay,
- readable pacing,
- complete run lifecycle (start -> play -> pause/resume/reset -> top-out -> results -> leaderboard -> replay),
- deterministic behavior and strong browser-level verification.

## Task List (46 Total)

### A) Gameplay Rules and Lifecycle (12 tasks)

1. Enforce standard 10x20 board behavior in live runtime.
2. Ensure run starts in active `playing` state with valid active piece spawn.
3. Implement/verify endless deterministic piece generation (7-bag or deterministic equivalent).
4. Keep next-piece preview continuously populated while run is active.
5. Remove or dev-gate manual `Finish Run` from normal player flow.
6. End runs only on legitimate top-out (spawn collision / no legal spawn).
7. Auto-transition from top-out to results screen without manual intervention.
8. Prevent stalled `running` states with no active/next piece.
9. Implement/verify lock delay behavior consistent with readable play.
10. Verify soft drop behavior and scoring impact are stable.
11. Verify hard drop behavior and instant lock behavior are stable.
12. Validate line clear processing and level/score progression integrity.

### B) Speed, Feel, and Input Responsiveness (8 tasks)

13. Rebalance gravity to be at least 50% slower than known too-fast baseline at early levels.
14. Implement a gradual level curve with no abrupt punitive speed cliff.
15. Tune pacing so an average player can meaningfully play for multiple minutes (~200 pieces target guidance).
16. Guarantee Arrow keys and WASD parity for all core actions.
17. Ensure movement/rotation responsiveness under key repeat and burst input.
18. Prevent gameplay state mutation from gameplay keys while paused.
19. Eliminate dropped/double activations during state transitions.
20. Document final control map and pause behavior in repo docs.

### C) Rendering and UX Polish (8 tasks)

21. Replace debug-style board output with polished visual playfield rendering.
22. Render active piece, placed stack, ghost/landing aid (if present), and next preview clearly.
23. Render synchronized HUD: score, lines, level, phase/status.
24. Add clear visual state transitions (playing, paused, game over, results, leaderboard).
25. Add targeted feedback animation/effects (line clear, lock, transition) that do not reduce control precision.
26. Ensure buttons provide immediate visible interaction feedback.
27. Ensure layout and readability are strong on common desktop resolutions.
28. Respect reduced-motion preference where practical.

### D) Pause, Results, Leaderboard, Replay (8 tasks)

29. Implement pause as a clear modal overlay anchored to viewport context.
30. Trap focus inside pause modal while paused.
31. Ensure pause modal actions work with mouse and keyboard (`Enter`/`Space`).
32. Define and implement explicit `Esc` behavior (resume or documented alternative) consistently.
33. Preserve exact run state on resume.
34. Implement reset-from-pause to cleanly start a new run without persistence loss.
35. Enforce name-entry validation before score submission.
36. Prevent duplicate score submissions from repeated click/enter events.

### E) Leaderboard + Persistence Robustness (5 tasks)

37. Persist highscores locally as source of truth with deterministic ordering/ranking.
38. Render leaderboard Top 10 reliably.
39. If current player is outside Top 10, render explicit player row with global rank context.
40. Handle malformed/legacy local storage safely without breaking gameplay startup.
41. Verify replay loop from results and leaderboard works repeatedly with fresh state each run.

### F) Audio (Requested Feature) (3 tasks)

42. Add legal-safe music and SFX set (or explicitly defer with documented safe fallback).
43. Provide audio controls: master volume, music volume, sfx volume, mute toggle.
44. Handle autoplay restrictions and asset-load failures gracefully without blocking gameplay.

### G) Testability, Automation, and Evidence (2 tasks)

45. Reintroduce/maintain deterministic automation hooks (`window.render_game_to_text` and deterministic stepping hook).
46. Add/update browser-level E2E coverage for full flow: visible falling gameplay, pause/resume/reset, top-out to results, validated submit, leaderboard context, and replay.

## Explicit Out of Scope

- Multiplayer or networking.
- Backend/global leaderboard services.
- User accounts/authentication.
- Monetization/ads/matchmaking.
- Mobile app packaging.

## Definition of Done

Scope is done only when:

1. A non-technical user can complete the full loop without confusion or debug controls.
2. Gameplay is readable, responsive, and stable for repeated sessions.
3. Persistence, ranking, and replay loop are reliable.
4. Audio is either legally integrated with controls or explicitly deferred with documented fallback.
5. Browser E2E evidence plus core tests confirm behavior end-to-end.
