---
name: design-task
description: >-
  Use when capturing how a UI-bearing feature should look and behave visually —
  layout, component states, and design-system intent — before speccing. Triggers
  on: "design this screen", "what should this look like", "capture the UI design",
  "wireframe this", "define the states". Persists design/<name>.md (layout, states,
  tokens, a11y intent) — it does NOT write Gherkin (use spec-task) or code (use
  atdd-task), and is not runner-guarded.
version: 1.0.0
---

# Design Task

Turn a UI-bearing need into a **design brief** captured as `design/<name>.md`: the layout and
visual hierarchy, the inventory of UI elements, every **state** each can be in, the design-system
(token) intent, and the accessibility intent. This is the **visual peer of a user story** — a
**planning artifact**, not runner-guarded, not Gherkin, no code. It is the seed `spec-task` reads to
write the `@component` (and, where present, `@visual`) scenarios that *are* the contract.

This stage sits between intent and specification, and only for features that have a view:
`user-story-task` → **`design-task`** (UI-bearing features only) → `spec-task` → implementation
(`atdd-task` / `tdd-task`). Backend-only or contract-only (`@api`) features skip it. Capture *what
it looks like and what states it has*; leave *what it does* to the story and the testable examples
to `spec-task`.

## Boundary — three things this does NOT do (do not duplicate the SSOT)

This brief captures **appearance and states only**. Keep three lines bright:

- **Not behaviour.** The story (`stories/<name>.md`) owns *what happens and why*. Do not restate its
  acceptance criteria here — reference them. Capture only how that behaviour *looks* and what
  *visual states* it passes through.
- **Not Gherkin.** **Specification by example is `spec-task`'s exclusive job.** Do not write
  `@tags`, `Given/When/Then`, or concrete scenarios here — that would create a second, drifting copy
  of the truth. Hand `spec-task` enough that it can write unambiguous `@component`/`@visual`
  scenarios without guessing.
- **Not the guarded value.** Where a guard will later pin an exact value (a golden screenshot, a
  token), name the *intent* ("uses the `space-md` gap", "the primary-action color") — not a raw hex
  or pixel count masquerading as a contract. The contract lives in the runner-guarded artifacts, not
  here.

## Inputs

- A UI-bearing need, given **either** as inline text **or** as a path to a story file
  (`stories/<name>.md` from `user-story-task`). Optionally a reference image, an ASCII/textual
  wireframe, or a design-tool link to anchor the look.

## Steps

**Guiding principle: interrogate the look, don't decorate.** Do not write the brief from a first
"make it clean and modern." Grill the visual intent — ask pointed questions in focused rounds,
challenge every vague adjective ("nice", "intuitive", "modern"), and force out the *specific* state,
breakpoint, or token. Never invent a value to move on; if unknown, log it as an open question. Only
persist (step 7) once the answers would let `spec-task` write a `@component` scenario without
guessing.

1. **Anchor on the story.** Read the source story (or restate the inline need) and list the UI
   elements its acceptance criteria imply — the nouns the user sees and acts on (e.g. *toolbar,
   Save button, toast, confirmation dialog*). This inventory is the spine of the brief. Do not
   re-derive the behaviour; just name what must appear on screen for it.
2. **Lay out the view.** For each screen/region: what sits where, the reading order, and the single
   **primary action**. A rough ASCII wireframe is worth a paragraph — include one. Capture the
   structural intent (e.g. "toolbar fixed to the top, full width; notes scroll beneath it"), not
   pixel coordinates.
3. **Enumerate the states — this is the core value.** For each element, list every state it can be
   in and what the user sees in each. Push until the set is exhaustive:
   - **Data states** — empty, loading, populated, partial, error/failed.
   - **Interaction states** — default, hover, focus (keyboard), active/pressed, disabled.
   - **Domain states** — anything the story implies (e.g. a Save button that is *clean* vs *dirty*;
     a dialog that is *open* vs *dismissed*). Resolve, or log, the "should X reflect a dirty state?"
     kind of open question the story left dangling — that question is *this* skill's to answer.
4. **Pin the feedback and motion intent.** For transient or interactive elements, capture the
   *visual* feel: how a toast enters/exits and roughly how long it lingers, whether a dialog is
   modal and traps focus, what an in-progress action looks like. Describe the experience; leave the
   exact, testable timing/assertion to `spec-task`.
5. **Name the design-system intent (tokens), not raw values.** State the look by token role where
   one exists — color roles (primary / surface / danger), spacing scale, type scale, radius,
   elevation. If the project has no token system yet, say so and capture the *roles* you need; this
   is the forward seam to a future design-token guard. Avoid raw hex/`px` unless it is a deliberate,
   noted exception.
6. **Capture accessibility & responsive intent.** Focus order and keyboard path, the semantic role
   of each element (e.g. the toolbar is a `nav`, the dialog has an accessible name), contrast
   expectations, and how the layout reflows across the breakpoints that matter. These feed the
   a11y/role assertions `spec-task` can route to the component lane.
7. **Capture gaps**, then **persist** to `design/<name>.md` (`lowercase-kebab-case` filename),
   creating `design/` if needed, in this exact format:

```markdown
# Design: <title>

**Status:** Draft · **Author:** <name> · **Created:** <YYYY-MM-DD> · **Story:** stories/<name>.md

## Layout & hierarchy

<where things sit, reading order, the primary action — with a rough ASCII wireframe>

## Elements

- **<element>** — <its purpose on screen and the story criterion it serves>

## States

### <element>
- **<state>** — <what the user sees>

## Feedback & motion

- **<element>** — <enter/exit/timing/modality intent, described not measured>

## Design-system intent (tokens)

- **<role>** — <token name or, if none yet, the role this needs>

## Accessibility & responsive

- **Focus order:** <…>
- **Roles / semantics:** <element → role>
- **Breakpoints:** <how the layout reflows>

## Out of scope

- <visual concern this brief deliberately does not cover>

## Open questions

- <unresolved look/state question or assumption to confirm>
```

8. **Report** the brief path and a one-line summary, then recommend `spec-task` next so the look and
   its states become level-tagged scenarios. Do not spec or implement here.

## Notes

- Design intent only — no Gherkin (`spec-task`'s job), no code (`atdd-task`'s job).
- **Interrogate the look, don't decorate.** A first "make it modern" is a starting point, not a
  brief. Grill it (step 3 especially) until every element's states are enumerated — a thin brief
  just pushes "layout / design TBD" downstream into the spec.
- **Not runner-guarded.** The SSOT stays the `.feature` files under `specs/` (and any future
  golden-image / design-token guards); this file lives under `design/` as planning input, the
  visual peer of `stories/`. Never let this brief harden into the test of record — `spec-task` owns
  the executable contract. A design doc nobody runs is exactly the wish-that-rots SpecWarden exists
  to kill; its job is to *feed* a guard, not to *be* one.
- `spec-task` reads `design/<name>.md` alongside the story: the states become `@component`
  scenarios, the layout/role intent becomes role/a11y assertions, and (where a `@visual` lane
  exists) the approved look becomes the golden-image scenario.
- One brief per UI-bearing feature under `design/`, mirroring one story under `stories/` and one
  feature under `specs/`. Skip the file entirely for `@api`-only features that have no view.
