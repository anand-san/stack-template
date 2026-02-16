Here’s the exact flow, end-to-end, with your current Ralph implementation.

1. You run start command
   bun run ralph:start -- --plan docs/ideation/PLAN.md --tasks docs/ideation/tasks.json --retry 1
2. CLI args are parsed
   From scripts/ralph/config.ts:12:

- defaults are loaded
- optional flags applied (--max-phases, --max-tasks, --model, --sandbox, --dry-run, etc.)
- --retry 1 means max 2 attempts per task (initial + 1 retry)

3. Preflight checks happen
   From scripts/ralph/run.ts:487:

- verifies you are in a git repo
- loads tasks.json and validates schema (scripts/ralph/validate.ts:28)
- if not --allow-dirty, requires clean working tree

4. Ralph creates a run branch and run state
   From scripts/ralph/run.ts:521 and scripts/ralph/state.ts:24:

- creates branch: ralph/<timestamp>
- creates runtime paths under docs/ralph/runs/
- writes state file: docs/ralph/runs/<run-id>.state.json
- initial statuses:
  - phase: pending / completed
  - task: pending / passed (if task already marked done)

5. Ralph enters phase loop
   From scripts/ralph/run.ts:402:

- processes phases in order from tasks.json
- marks current phase in_progress

6. Ralph enters task loop inside that phase
   For each not-yet-passed task:

- marks task running
- increments attempt counter
- generates per-attempt paths:
  - log: docs/ralph/runs/<run-id>/logs/<phase>/<task>.attempt-N.log
  - codex message: docs/ralph/runs/<run-id>/messages/<phase>/<task>.attempt-N.md

7. Ralph builds a strict prompt for exactly one task
   From scripts/ralph/prompt.ts:

- includes phase + task details
- says “implement only this task”
- includes retry failure context on later attempts

8. Ralph runs Codex non-interactively
   From scripts/ralph/run.ts:107:

- runs codex exec --full-auto ... -o <message-file> -
- captures stdout/stderr/exit code
- appends all of it to attempt log

9. Ralph checks if code actually changed
   From scripts/ralph/git.ts:102:

- reads git status --porcelain
- if no changed files: task attempt fails (no_changes) and retries if allowed

10. Ralph runs quality gates (unless --skip-quality-gates)
    From scripts/ralph/run.ts:156:

- bun run format
- bun run lint
- cd frontend && bun run check-types
- cd server && bun run check-types
- bun run test
  Each step is logged. If any fails, attempt fails and retry starts.

11. On successful gates, Ralph commits the task
    From scripts/ralph/run.ts:309:

- git add -A
- git commit -m "feat(ralph): <task-id> <title>"
- stores commit hash in state
- marks task passed

12. Retry behavior
    If attempt fails:

- Ralph retries until attempts exhausted (retry + 1 total)
- each retry includes last failure context in prompt

13. If retries are exhausted
    From scripts/ralph/run.ts:455 and scripts/ralph/run.ts:341:

- marks task blocked
- marks phase blocked
- marks run blocked
- writes handoff: docs/ralph/runs/<run-id>/HANDOFF.md
- stops immediately (no next task)

14. If all tasks in phase pass

- phase marked completed
- moves to next phase

15. If all phases pass

- run marked completed
- prints final status and state file path

16. Resume flow
    bun run ralph:resume -- --state docs/ralph/runs/<run-id>.state.json --allow-dirty

- reloads state
- checks out saved branch if needed
- continues from remaining tasks
