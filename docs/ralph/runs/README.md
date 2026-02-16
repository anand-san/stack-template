# Ralph Run Artifacts

This directory stores runtime outputs for overnight Ralph runs.

- `<run-id>.state.json`: machine-readable execution state for resume.
- `<run-id>/logs/`: per-task command logs.
- `<run-id>/messages/`: final messages emitted by `codex exec`.
- `<run-id>/HANDOFF.md`: generated only when a task blocks a phase.

Start a run:

```bash
bun run ralph:start -- --plan docs/ideation/PLAN.md --tasks docs/ideation/tasks.json --retry 1
```

Resume a run:

```bash
bun run ralph:resume -- --state docs/ralph/runs/<run-id>.state.json --allow-dirty
```
