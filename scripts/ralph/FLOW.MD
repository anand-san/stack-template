Here is the current Ralph flow, end-to-end, based on `scripts/ralph`.

1. Start command
   `bun run ralph:start -- --plan docs/ideation/PLAN.md --tasks docs/ideation/tasks.json --retry 1`

2. Parse CLI options
   From `scripts/ralph/config.ts`:

- loads defaults
- applies flags (`--max-phases`, `--max-tasks`, `--model`, `--sandbox`, `--dry-run`, etc.)
- `--retry 1` means up to 2 attempts per task

3. Preflight
   From `scripts/ralph/run.ts`:

- verifies git repository
- loads and validates `tasks.json`
- dry-run prints tasks and exits
- if not `--allow-dirty`, requires clean working tree

4. Start state initialization
   From `scripts/ralph/run.ts` + `scripts/ralph/state.ts`:

- requires current branch to be `main`
- creates run artifacts under `docs/ralph/runs/<run-id>/`
- writes `docs/ralph/runs/<run-id>.state.json`
- initializes phase/task runtime statuses from tasks doc

5. Resume initialization
   `bun run ralph:resume -- --state docs/ralph/runs/<run-id>.state.json --allow-dirty`

- loads saved state
- reloads tasks doc from saved `tasksPath`
- requires current branch to equal saved `state.branch`

6. Phase/task execution loop
   From `scripts/ralph/orchestration/run-executor.ts`:

- processes phases in order
- skips completed phases/tasks
- marks current phase `in_progress`
- executes each task with retry logic

7. Task attempt loop
   From `scripts/ralph/orchestration/task-runner.ts`:

- marks task running
- tracks attempt number and verifier cycles
- writes per-step artifacts:
  - logs: `docs/ralph/runs/<run-id>/logs/<phase>/<task>.attempt-N.step-XX.<agent>.log`
  - messages: `docs/ralph/runs/<run-id>/messages/<phase>/<task>.attempt-N.step-XX.<agent>.md`

8. Agent sequence

- starts with `implementer`
- after successful mutating step, runs `verifier`
- verifier returns strict JSON status:
  - `DONE`: task passes
  - `REFACTOR`: runs `refactor`
  - `ISSUES`: runs `bug_fixer`
- verifier loop is capped at 5 cycles per attempt

9. Mutating step checks

- runs `codex exec`
- updates state with latest artifact paths and codex exit code
- requires repository changes
- runs quality gates unless `--skip-quality-gates`:
  - `bun run format`
  - `bun run lint`
  - `cd frontend && bun run check-types`
  - `cd server && bun run check-types`
  - `bun run test`

10. Commit generation

- stages changes (`git add -A`)
- asks Codex to generate strict JSON conventional commit message
- validates message shape and subject restrictions
- commits and stores resulting commit hash in state

11. Retry and block behavior

- failures retry until attempts exhausted
- on exhausted retries:
  - task -> `blocked`
  - phase -> `blocked`
  - run -> `blocked`
  - writes `docs/ralph/runs/<run-id>/HANDOFF.md`
  - stops immediately

12. Completion behavior

- completed phases are marked `completed`
- when all phases complete, run status becomes `completed`
- final guard fails if run is not blocked and working tree is dirty
- prints final status + state file (and handoff path if blocked)
