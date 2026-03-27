# AGENTS.md (Tetris)

## Canary Playground
- This repository is a canary testing playground for OP/BP orchestration.
- Assume this repo is for workflow validation, reliability experiments, and telemetry checks.
- Do not treat this repo as a production template without explicit confirmation.
- Keep artifacts and run history useful for debugging autonomous build behavior.

## OP-Build Alignment (Mandatory)
- Earth root policy lives in `/Users/slobodan/projects/Earth/AGENTS.md`.
- Canonical `op-build` usage lives in `/Users/slobodan/projects/Earth/OP_BUILD_ECOSYSTEM_GUIDE.md`.
- Treat `op-build` as the default way to exercise this canary repo unless the user explicitly asks for another workflow.
- If you make a commit during an `op-build` task, push it immediately after the commit.

## Repo-Specific OP-Build Role Guidance
- `planner`: use this repo to validate orchestration behavior, reliability, and evidence quality rather than to invent product strategy.
- `architect`: keep canary scaffolding simple and easy to reset so failures isolate orchestration issues quickly.
- `implementer`: prefer small experiments that reveal OP/BP behavior clearly over polished but ambiguous changes.
- `tester`: capture runnable proof, artifacts, and failure notes that help diagnose orchestration regressions.
- `reviewer`: flag conclusions that over-generalize from canary behavior into Earth-wide product decisions.
- `documenter`: add durable canary lessons here when they would help future validation runs.
