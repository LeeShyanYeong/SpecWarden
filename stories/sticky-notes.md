# Story: Sticky notes on a freeform board with server persistence

**Status:** Draft · **Author:** LeeShyanYeong · **Created:** 2026-06-20

## Narrative

As a person capturing and arranging quick notes, I want to save the sticky-note
board to the server and have it load again when I open the app, so that notes
survive page reloads and are available whenever and wherever I open the app —
instead of vanishing each session.

## Context

This is the sticky-note app's first persisted slice. The board is still a
**freeform canvas** — notes live at positions the user chooses, the intended
foundation for later kanban-style grouping — but it is no longer session-only:
the board is now stored on the server.

Because there are **no accounts yet**, the server holds **one shared global
board**: everyone who opens the app loads and edits the same notes. That is a
deliberate stepping stone — per-user private boards arrive with the later
*accounts* story — and it means the data model must be ready to gain an owner
later without rework. Saving is **explicit** (a Save action), not automatic.

## Rules (acceptance criteria)

Board interaction (unchanged from the basic slice):

- There are no accounts or sign-in; everyone shares **one global board** with no
  per-user separation.
- The user creates a note by **double-clicking an empty area of the canvas**; the
  note appears at the click point, empty and ready for text.
- The user **edits** a note's text by **double-clicking** it.
- A note holds **plain text only**, capped at **500 characters**; once 500 is
  reached, further typed or pasted input is **blocked** so text never exceeds the
  cap.
- A note may be **empty** and is kept as-is.
- The user **deletes** a note via a delete (×) control on the note; deletion is
  **immediate**, with no confirmation.
- The board is a **freeform canvas**: the user can **drag** any note to a new
  position.
- Dragging or editing a note **raises it to the front** of any overlapping notes.
- Multiple notes can exist on the board at once.

Persistence (new):

- **Load on open.** When the app opens, it loads the **last saved** board from the
  server and renders every saved note with its text and position. A fresh visit
  shows the saved board, not an empty one.
- **Explicit save.** A **Save** action persists the **entire current board**
  (every note's text, position, and stacking order) to the server, replacing the
  previously saved board.
- **Persistence is observable.** After a successful Save, reloading the page — or
  opening the app on another browser or device — shows exactly the saved board.
- **Saving an empty board** persists an empty board; a later load then shows no
  notes.
- **Save failure is surfaced.** If a Save cannot complete on the server, the user
  is shown an **error** stating the board was not saved; the local board stays
  on screen, unchanged. (No automatic retry or offline sync.)
- **Unsaved changes are not persisted.** Edits made after the last successful Save
  are local only; reloading or closing the page **discards** them — with **no
  indicator and no warning**. Only the last saved state survives.
- **Last-write-wins.** A Save overwrites the server's stored board in full. If
  another client saved in between, those changes are overwritten without warning;
  there is no conflict detection or merge.

## Out of scope

- User **accounts**, sign-in, or per-user private boards (the next planned
  evolution — this story's global board is the stepping stone to it).
- **Access control / privacy:** with no accounts, the global board is reachable by
  anyone who can open the app; saved notes are treated as non-private for now.
- **Real-time collaboration** / live multi-client sync; **conflict detection or
  merge** (last-write-wins only).
- **Autosave** (saving is explicit), **offline mode**, save **retry**, or
  background sync.
- **Per-note / granular** saving — Save persists the whole board at once.
- **Versioning or history** of the board; undo/redo; delete confirmation.
- Changing note **colour** or **size**, rich text / formatting, images,
  attachments.
- Kanban columns, tags, search, filtering, ordering; any **limit on the number**
  of notes.

## Constraints / quality attributes

- **No auth ⇒ public board.** Because there is one global board and no accounts,
  anything saved is visible and editable by anyone who can reach the app. This is
  accepted for this slice; the *accounts* story is what makes boards private.
- **Account-ready data model.** Model the stored board so a per-user **owner** can
  be attached later without reworking the note/board schema (today there is a
  single implicit global board).
- **Server-backed.** Persistence runs through the ASP.NET Core backend over a REST
  contract plus a store; this slice therefore introduces a real API surface the
  session-only slice did not have.

## Open questions

- **Save success feedback** — should a successful Save show a confirmation (e.g. a
  "Saved" toast), or stay silent? (Failure is surfaced; success feedback is not
  pinned.)
- **Load failure** — what the user sees if the **load** on open fails (server
  down at startup): error + empty board, a retry, a banner? (Only *save* failure
  was decided.)
- **Empty-board state** — what the canvas shows when there are no notes (e.g. a
  hint to create the first one), including before the first load completes.
- **Save/load latency target** — no measurable number agreed, so no performance
  requirement is asserted yet.
- **Paste at the cap** — when a paste would push text past 500, is it trimmed to
  fit or rejected whole? (Carried over; rule is only "never exceeds 500".)
- **Max-length feedback** — whether a character counter is shown (input is blocked
  either way).
