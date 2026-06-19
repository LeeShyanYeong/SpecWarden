---
name: execute-task
description: >-
  Use when asked to execute, work on, or do tasks from the TODO list. Triggers
  on: "do the next todo", "execute T2", "work through the todo", "start on that
  task". Reads a task from TODO.md, does the work, and checks it off. Plan tasks
  first with plan-task.
version: 1.0.0
---

# Execute Task

Pick a task from `TODO.md`, carry out its steps, and mark progress as you go.

## Inputs

- A task ID to run (e.g. `T2`). If none given, pick the **first `Pending` task whose dependencies
  are all `Done`**.

## Steps

1. **Read `TODO.md`** and locate the target task block. If its `Depends on` tasks are not yet
   `Done`, stop and tell the user which dependency is blocking.
2. **Claim it:** set the task's `Status` to `In progress`.
3. **Do the steps in order.** Steps marked `[P]` may be done together. After finishing each step,
   tick its checkbox (`- [ ]` → `- [x]`) in `TODO.md` so progress survives an interruption.
4. **Run checks** from `AGENTS.md` (lint, test) before considering the task complete.
5. **Verify the "Done when" condition.** If it does not hold, leave `Status: In progress`, note
   what's left, and report — do not mark it Done.
6. **Finish:** when every step is `[x]` and the check passes, set `Status` to `Done`.
7. **Report** what was changed (files touched, tests run) and the task's final status.

## Notes

- Only work on the requested/selected task — don't silently start others.
- Keep `TODO.md` the source of truth: update status and checkboxes there, not just in chat.
- If a step turns out to need new, unplanned work, add it via `plan-task` rather than expanding
  scope here.
