# Design: Sticky-note board

**Status:** Draft · **Author:** Lee Shyan Yeong · **Created:** 2026-06-22 · **Story:** stories/sticky-notes.md

> Companion story for the frame: stories/board-toolbar-ux.md (Save / Sign Out behaviour).
> This brief captures **appearance and states only** for the whole board screen — the canvas,
> the notes, the empty/loading states, and the *look* of the toolbar frame. **Behaviour** (what
> Save/Sign Out/the dialog/the unload guard *do*) stays in those two stories; the **executable
> contract** stays in `specs/sticky-notes.feature` and `specs/board-toolbar-ux.feature`. No
> Gherkin, no code, no raw hex/px masquerading as a contract.

## Layout & hierarchy

One screen: a **fixed toolbar** pinned to the top, full width, with a **freeform canvas**
filling everything beneath it. The canvas is the focus; the toolbar is a thin frame.

- **Toolbar (top, fixed).** Left-aligned **Save** (the screen's single primary action, accent),
  then **Sign Out** (secondary). Transient feedback — the "Saved!" toast and the save-error
  message — surfaces inline in the toolbar's trailing region so it never covers notes. The
  toolbar stays in view no matter how many notes exist (it does not scroll away — see
  `board-toolbar-ux.feature` `@nfr`).
- **Canvas (below, freeform).** A neutral surface carrying a faint **dot-grid** that signals a
  freeform, position-anything board. Notes live at absolute positions the user chose and stack
  by z-order; the most-recently-dragged/edited note sits in front.
- **Reading order:** toolbar (Save → Sign Out → live feedback) → canvas → notes in creation order.
- **Primary action:** **Save.**

```
┌──────────────────────────────────────────────────────────┐
│ [ Save ]•   [ Sign Out ]            Saved! / ⚠ error      │  toolbar (fixed)
├──────────────────────────────────────────────────────────┤
│ ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│ ·  ┌────────────┐  ·  ·  ·  ·  ·  ┌────────────┐  ·  ·   │
│ ·  │ note text  │  ·  ·  ·  ·  ·  │ note text ×│  ·  ·   │  warm-yellow
│ ·  │          ×│  ·  ·  ·  ·  ·  └────────────┘  ·  ·   │  paper notes on
│ ·  └────────────┘  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │  a dotted neutral
│ ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │  surface
└──────────────────────────────────────────────────────────┘
```

## Elements

- **Toolbar** — the fixed frame for board-level actions and feedback; *look* defined here,
  *behaviour* in `board-toolbar-ux.md`.
- **Save button** — primary action; persists the whole board (serves the story's *explicit save*
  rule). Reflects clean vs. dirty (decision below).
- **Sign Out button** — secondary action; ends the session.
- **"Saved!" toast** — transient success confirmation after a successful save.
- **Save-error message** — surfaces the story's *Save failure is surfaced* rule when a save fails.
- **Load-failure banner + Retry** — covers the story's open question on a failed *load on open*:
  the board could not be fetched at startup.
- **Canvas** — the freeform surface notes live on; the `(dblclick)`-empty-area-creates-a-note
  target (story: *create by double-clicking an empty area*).
- **Empty-board state** — what the canvas shows when it has loaded with zero notes (resolves the
  story's *empty-board state* open question).
- **Sticky note** — one note; carries plain text (≤500 chars), an absolute position, and a
  z-order. Created, edited, dragged, deleted, raised per the story's board-interaction rules.
- **Note body** — the read mode: the note's text (or nothing, for an intentionally-empty note).
- **Note editor** — the edit mode: a textarea opened on double-click, capped at 500 chars.
- **Note delete (×)** — the per-note control that removes it immediately, no confirmation.
- **Unsaved-changes dialog** — modal shown on Sign Out with unsaved changes; *look* here,
  *flow* in `board-toolbar-ux.md`.

## States

### Canvas (board data states)
- **Loading (pre-first-load)** — a quiet, blank canvas. No notes, **no empty-state flash**, no
  spinner; the toolbar is already present. This is the brief instant before the load resolves.
- **Empty (loaded, zero notes)** — the empty-board state (below), centered on the canvas.
- **Populated** — one or more notes at their saved positions and stacking order.
- **Load-failed** — the canvas stays blank and a **load-failure banner** appears at the top of
  the board (below the toolbar) reading that the board couldn't be loaded, with a **Retry**
  action. Distinct from the *save*-error message, which is a toolbar-inline alert.

### Empty-board state
- **Default** — centered in the canvas: a muted, decorative icon; a headline ("Your board is
  empty"); and a hint line ("Double-click anywhere to add your first note"). Quiet, low-contrast,
  non-blocking — it must not look like an error and must not intercept the double-click that
  creates the first note. No button (creation stays double-click only, per the story).

### Sticky note
- **Empty (no text)** — a valid, kept note rendered as a blank paper card (story: *a note may be
  empty and is kept as-is*). Visually a real note, not a placeholder — distinct from the dashed
  empty-board hint.
- **Populated** — shows its wrapped plain text; long text wraps/breaks within the fixed note size.
- **Default (resting)** — paper surface, soft resting elevation, `grab` cursor.
- **Hover** — a subtle lift (slightly raised elevation) and the delete control becomes clearly
  visible, signalling the note is interactive/grabbable.
- **Focus (keyboard)** — a clearly visible focus ring (focus-ring token) around the note so a
  keyboard user can tell which note is targeted. *(Keyboard create/drag itself is an open gap —
  see Open questions.)*
- **Dragging (active/grabbing)** — raised to the front (top z), `grabbing` cursor, elevation
  grows (a "picked-up" feel) for the duration of the drag; returns to resting on drop.
- **Editing** — the body is replaced by the note editor (textarea); the note is raised to the
  front on entering edit (story: *editing raises it to the front*); drag is suppressed while
  editing.
- **Near cap / at cap** — as text approaches 500 chars an optional subtle counter may show
  remaining characters; at 500, further typed/pasted input is visibly inert (nothing more
  appears). Exact threshold/counter is an Open question.

### Note editor (textarea)
- **Active** — focused, caret visible, transparent over the note paper so it reads as "the note,
  editable." Inherits the note's type.
- **At cap** — input stops accepting characters at 500; no error styling, the text simply stops
  growing.

### Note delete (×)
- **Hidden/quiet (note at rest)** — present but visually recessive so it doesn't clutter a
  populated board.
- **Visible (note hover/focus)** — clearly affordant.
- **Hover/focus (the control itself)** — emphasised, with a focus ring for keyboard reach;
  carries danger intent on hover to signal it removes the note.

### Save button
**Decision: Save is dirty-aware** (resolves the open question in both the story and
`board-toolbar-ux.md`).
- **Clean (no unsaved changes)** — quiet/disabled: the accent recedes, signalling "nothing to
  save." A click in this state is a no-op affordance.
- **Dirty (unsaved changes)** — active accent primary, with a small "unsaved" cue (a dot) so the
  user knows changes are pending. Maps to `BoardStore.isDirty()`.
- **Hover / focus** — standard accent hover emphasis and a visible focus ring.
- **In-progress (saving)** — a brief busy/disabled appearance while the save is in flight, to
  prevent double-submit. *(Requires a pending signal the store doesn't expose yet — see Open
  questions.)*

### Sign Out button
- **Default / hover / focus** — secondary (non-accent) styling with the same hover and focus-ring
  treatment as Save, one step down in emphasis.

### "Saved!" toast
- **Hidden** — absent by default.
- **Shown** — appears after a successful save, reads "Saved!", then auto-dismisses with no user
  action (story-companion `board-toolbar-ux.feature`). Uses success/positive intent, not accent.

### Save-error message
- **Hidden / Shown** — inline in the toolbar with danger intent, stating the board was not saved;
  the local board stays unchanged on screen (story: *Save failure is surfaced*). Persists until
  the next save attempt rather than auto-dismissing.

### Unsaved-changes dialog
- **Closed** — absent.
- **Open** — a modal centered over a dimmed scrim, with the message and three actions
  (Save & Sign Out / Discard & Sign Out / Cancel). Elevated above the board; the board behind is
  inert. Appearance only — the three-way flow is owned by `board-toolbar-ux.md`.

## Feedback & motion

- **Note hover** — a quick, subtle elevation lift; fast and reversible, never bouncy.
- **Note pick-up / drag** — on grab, the note jumps to the front and its shadow grows (a
  "lifted" feel); it tracks the pointer 1:1 and settles back to resting elevation on drop.
- **"Saved!" toast** — fades/slides in, lingers a few seconds, then fades out on its own. Brief
  and unobtrusive; never blocks interaction. (Exact duration is a guarded value — pinned by the
  spec, not here.)
- **Save-error** — appears without animation fuss (it's an alert) and stays until the next save.
- **Load-failure banner** — slides down from under the toolbar; stays until Retry resolves it.
- **Unsaved-changes dialog** — modal: a scrim fades in, the dialog scales/fades in, focus is
  **trapped** inside it, Escape/Cancel dismisses. The board cannot be interacted with behind it.
- **Empty-board state** — static; no looping animation. It may fade in once the load resolves to
  empty (so it doesn't flash during the quiet pre-load).
- **Focus rings** — appear on keyboard navigation; the lift/hover affordances are pointer-driven.

## Design-system intent (tokens)

**The project has no token system yet** — `src/frontend/src/styles.css` is empty and the current
notes hardcode `#fff8b0`. This brief is the forward seam: define a token layer in the global
stylesheet (or theme) so these roles are named once and a future design-token guard can pin them.
Name the **roles**; the exact values are decided at spec/implementation and guarded there.

- **Surface — canvas** — the neutral board background that the dot-grid sits on.
- **Surface — dot-grid** — the faint repeating dot pattern that marks the freeform canvas.
- **Surface — note** — the warm-yellow paper fill (today's `#fff8b0`, to be tokenized; note
  *colour as a feature* stays out of scope — this is the single canonical note surface).
- **Border — note** — the note's edge against the canvas.
- **Ink — primary / muted** — note and toolbar text; a muted ink for the empty-state hint and
  the recessive delete control.
- **Accent (primary action)** — the Save button fill and its on-accent text/icon colour.
- **Success** — the "Saved!" toast.
- **Danger** — the save-error message, the load-failure banner, and the delete (×) hover intent.
- **Focus ring** — a single shared focus-indicator role used by every interactive element
  (notes, buttons, delete control, dialog controls).
- **Spacing scale** — `space-xs … space-lg` for toolbar padding, note padding, and the gaps the
  layout uses (replacing today's ad-hoc `1rem` / `8px`).
- **Type scale** — note body, empty-state headline vs. hint, toolbar/button labels.
- **Radius** — note corner radius and button radius.
- **Elevation scale** — note resting / hover / dragging shadows, the dialog, and the toolbar's
  bottom separation. A small ramp (rest → hover → lifted) drives the drag feel.
- **Motion** — shared duration + easing roles for the hover lift, toast in/out, and dialog
  enter/exit.

## Accessibility & responsive

- **Focus order:** Save → Sign Out → (live regions: toast `status`, error `alert`) → canvas →
  notes in DOM/creation order, each note then its delete control. When the unsaved-changes
  dialog or the load-failure banner is present, focus moves to it; the dialog **traps** focus
  until dismissed.
- **Roles / semantics:**
  - Toolbar → a top `banner`/toolbar region holding the actions.
  - Save / Sign Out → `button`s with their visible text as accessible name; Save communicates its
    disabled (clean) state to assistive tech.
  - Canvas → `main` (already), the board region.
  - Empty-board state → decorative icon is `aria-hidden`; the headline + hint are plain readable
    text (not an alert).
  - Sticky note → an interactive element with an accessible name from its text (an empty note
    needs a fallback name, e.g. "Empty note"); the editor (textarea) is labelled while editing.
  - Delete (×) → `button` with `aria-label="Delete note"` (already present).
  - "Saved!" toast → `role="status"` (already); save-error → `role="alert"` (already);
    load-failure banner → `role="alert"` with a labelled **Retry** button.
  - Dialog → `role="dialog"` `aria-modal="true"` (already), named by its message.
- **Contrast:** note ink on the warm-yellow surface, on-accent text on the Save accent, the
  danger text, and the muted empty-state hint must each meet WCAG AA. The muted delete control
  must still reach AA in its visible (hover/focus) state.
- **Breakpoints / reflow:** the freeform canvas is pointer-first and inherently desktop-leaning.
  - **Wide:** as drawn — fixed toolbar, dot-grid canvas, absolutely-positioned notes.
  - **Narrow / touch:** the toolbar stays fixed and its controls remain reachable (wrapping or
    condensing rather than scrolling away); notes keep their absolute coordinates (no reflow into
    a list — that would change the freeform model); pointer events already cover touch drag. The
    empty-state text scales down but stays centered and legible.

## Out of scope

- **Toolbar/session behaviour** — the redirect, the three-way dialog flow, and the unload guard
  are owned by `board-toolbar-ux.md`; only their *appearance* is captured here.
- **Note colour, size, or rich formatting** — single canonical note surface; colour/size change
  is out of scope per the story.
- **Dark mode / theming** — not addressed in this slice (the token layer would make it possible
  later).
- **Kanban / grouping / drag-to-column visuals** — the freeform canvas is the only layout here.
- **Exact token values and golden screenshots** — these are the runner-guarded contract
  (`specs/` and any future `@visual` / design-token lane), not this planning brief.
- **Any Gherkin or test wording** — `spec-task` owns specification by example.

## Open questions

- **Keyboard-only create & drag.** Creation is double-click and drag is pointer-based, so a
  keyboard-only user currently cannot add or reposition a note. We give notes a focus ring and a
  keyboard-reachable delete, but a full keyboard path (create at a default spot, arrow-key nudge)
  is unspecified — confirm whether this slice must close that gap or log it for a later a11y story.
- **Save "in-progress" state.** The dirty-aware Save implies a busy/disabled look while saving,
  but `BoardStore` exposes no pending signal today — confirm whether to add one (so the state is
  real) or drop the in-progress state for now.
- **Max-length feedback (carried from the story).** Should a character counter show as text nears
  500, and at what threshold? The cap is enforced either way; this is purely the visual cue.
- **Empty note's accessible name.** An intentionally-empty note has no text to name it — confirm
  the fallback ("Empty note"?) so it isn't an unlabeled interactive element.
- **Load-failure Retry vs. banner persistence.** Confirm the banner stays until a successful
  retry (assumed) and whether a repeated failure restates the same banner or escalates.
