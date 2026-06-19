---
name: plan-task
description: >-
  Use when asked to plan a task, break down a goal into steps, or add work to
  the TODO list. Triggers on: "plan this", "break this down", "add a task",
  "put this on the todo". Decomposes a goal and persists it to TODO.md — it does
  NOT execute the work (use execute-task for that).
version: 1.0.0
---

# Plan Task

Turn a goal into an ordered, executable task block and persist it to `TODO.md`.

## Inputs

- The goal to plan (a feature, fix, or chore described in plain language).

## Steps

1. **Clarify the goal.** If it's ambiguous or too large, restate it as one concrete outcome. Split
   genuinely separate goals into separate tasks.
2. **Decompose** into 3–7 ordered, actionable steps. Each step should be small enough to verify on
   its own and name the file(s) it touches where known.
3. **Set metadata:** a priority (`high` / `medium` / `low`) and any dependencies on other task IDs
   (e.g. `Depends on: T1`). Use `—` if none.
4. **Mark parallel-safe steps** with `[P]` — steps that don't depend on a sibling and could run at
   the same time.
5. **Write a "Done when" check** — the observable condition that proves the task is complete.
6. **Append to `TODO.md`** as a new block, using the next free `T<n>` ID, in this exact format:

```
## T<n> — <task title>
**Status:** Pending · **Priority:** <pri> · **Depends on:** <ids or —> · **Added:** <YYYY-MM-DD>

- [ ] <step 1>
- [ ] [P] <step that can run in parallel>
- [ ] <step n>

**Done when:** <observable completion check>
```

7. **Report** the new task ID and title back to the user. Do not start the work.

## Notes

- Plan only — never edit code here. Handing off to execution is `execute-task`'s job.
- Keep the format identical so `execute-task` can read it reliably.
