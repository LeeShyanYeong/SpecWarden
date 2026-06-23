# Status: Draft | Author: LeeShyanYeong | Created: 2026-06-20
#
# Source story: stories/sticky-notes.md
# Design brief: design/sticky-notes.md (visual peer — empty / loading / load-failure
#   states + the empty-note accessible name asserted below)
#
# Level routing for this slice:
#   Persistence makes this full-stack, so unlike the earlier session-only slice it
#   DOES have a REST contract. The save/load contract is exercised at @api
#   (Reqnroll); client-side board UX and the load/save wiring (backend stubbed) at
#   @component; and one @e2e smoke proves notes truly survive a reload against the
#   real server. The board is a single SHARED GLOBAL board — no accounts yet, so
#   there is no per-user separation and no auth on the endpoints.
#
# Out of scope:
#   - Accounts, sign-in, or per-user private boards (the next planned story).
#   - Access control / privacy — the global board is reachable by anyone with the
#     app URL; saved notes are treated as non-private for now.
#   - Real-time collaboration / live multi-client sync; conflict detection or merge
#     (last-write-wins only).
#   - Autosave, offline mode, save retry, or background sync (saving is explicit).
#   - Per-note / granular saving — Save persists the whole board at once.
#   - Versioning / board history; undo/redo; delete confirmation.
#   - Changing note colour or size, rich text / formatting, images, attachments.
#   - Kanban columns, tags, search, filtering, ordering; any limit on note count.
#
# Resolved since drafting (by design/sticky-notes.md):
#   - Empty-board state: a loaded, note-less board shows a "Your board is empty" headline
#     and a hint to double-click to add the first note; during the first load nothing is
#     shown (no empty-state flash). See the board-data-state scenarios below.
#   - Load failure on open: the canvas stays blank and a banner with a Retry action is
#     shown; Retry re-attempts the load. (Previously only SAVE failure was decided.)
#   - Save success feedback: a "Saved!" toast — owned by specs/board-toolbar-ux.feature.
#
# Open questions:
#   - Save/load latency: no measurable target agreed, so no @nfr is asserted.
#   - Paste at the cap: trim-to-fit vs reject-whole when a paste would exceed 500
#     (only "never exceeds 500" is fixed).
#   - Max-length feedback: whether a character counter is shown as text nears 500, and at
#     what threshold (input is blocked either way; not asserted this pass).
#   - Keyboard-only create & drag: creation is double-click and drag is pointer-based, so a
#     keyboard-only user cannot yet add or reposition a note — deferred to a later a11y story.

Feature: Sticky notes on a freeform board with server persistence
  As a person capturing and arranging quick notes
  I want to save the board to the server and have it load again when I open the app
  So that notes survive reloads and are available wherever I open the app

  # One vertical slice, now full-stack. @api owns the save/load REST contract;
  # @component owns client-side board UX with the backend stubbed; one @e2e smoke
  # proves real persistence across a reload.

  # ----- Persistence: the REST save/load contract (@api) -----

  @api
  Scenario: A saved board can be loaded back
    When a client saves a board with note "A" at position (10, 10) and note "B" at position (50, 60)
    Then the save succeeds
    And loading the board returns note "A" at position (10, 10) and note "B" at position (50, 60)

  @api
  Scenario: Loading before anything has been saved returns an empty board
    Given no board has been saved
    When a client loads the board
    Then the response is an empty board

  @api
  Scenario: Saving replaces the previously saved board entirely (last-write-wins)
    Given a board with notes "A" and "B" has been saved
    When a client saves a board containing only note "C"
    Then loading the board returns only note "C"

  @api
  Scenario: Saving an empty board clears the stored notes
    Given a board with notes has been saved
    When a client saves a board with no notes
    Then loading the board returns an empty board

  @api @failure
  Scenario: The server rejects a note longer than 500 characters
    When a client saves a board containing a note of 501 characters
    Then the save is rejected with a validation error
    And the previously stored board is unchanged

  # ----- Persistence: client wiring and the reload seam (@component) -----

  @component
  Scenario: Opening the app renders the saved board
    Given the server has a saved board with notes "Milk" and "Eggs"
    When the user opens the app
    Then notes "Milk" and "Eggs" are shown on the board

  @component
  Scenario: Reloading without saving discards unsaved changes with no warning
    Given the saved board contains a note "Milk"
    And the user has added a note "Eggs" without saving
    When the user reloads the page
    Then the board shows only "Milk"
    And no warning was shown about the discarded change

  @component @failure
  Scenario: A failed save shows an error and keeps the local board
    Given the user has a board with notes and the server will reject the save
    When the user clicks Save
    Then an error message states the board was not saved
    And the local board remains on screen unchanged

  # ----- Real persistence end to end (@e2e) -----

  @e2e
  Scenario: Saved notes survive a page reload
    Given the sticky-note board is open in the running app
    When the user creates a note "Buy milk" and clicks Save
    And reloads the page
    Then the note "Buy milk" is still shown on the board

  # ----- Board interaction UX, backend stubbed (@component) -----

  @component
  Scenario: Double-clicking the canvas creates an empty note at that point
    Given the sticky-note board is open with no notes
    When the user double-clicks an empty area of the canvas at position (120, 80)
    Then a new note appears at position (120, 80)
    And the note is empty and ready for text entry

  @component
  Scenario: Double-clicking a note edits its text
    Given a note exists on the board
    When the user double-clicks the note
    And types "Call the dentist"
    Then the note shows "Call the dentist"

  @component
  Scenario: Dragging a note repositions it
    Given a note exists at position (100, 100)
    When the user drags the note to position (400, 250)
    Then the note is shown at position (400, 250)

  @component
  Scenario: A newly created note can be dragged without editing it first
    Given the sticky-note board is open with no notes
    When the user double-clicks an empty area of the canvas at position (120, 80)
    And the user drags the note to position (300, 200)
    Then the note is shown at position (300, 200)

  @component
  Scenario: Deleting a note removes it immediately without confirmation
    Given a note exists on the board
    When the user clicks the note's delete button
    Then the note is removed from the board immediately
    And no confirmation is requested

  @component
  Scenario: An empty note is kept on the board
    Given the user creates a note by double-clicking the canvas
    When the user leaves the note without entering any text
    Then the empty note remains on the board

  @component
  Scenario: An empty note still has an accessible name
    Given the user creates a note by double-clicking the canvas
    And the user leaves the note without entering any text
    Then the empty note exposes the accessible name "Empty note"

  @component
  Scenario: Multiple notes coexist on the board
    Given the sticky-note board is open with no notes
    When the user creates three notes at different positions
    Then all three notes are visible on the board

  @component
  Scenario: Dragging a note raises it above overlapping notes
    Given two notes overlap, with note "B" rendered in front of note "A"
    When the user drags note "A"
    Then note "A" is rendered in front of note "B"

  @component
  Scenario: Editing a note raises it above overlapping notes
    Given two notes overlap, with note "B" rendered in front of note "A"
    When the user double-clicks note "A" to edit it
    Then note "A" is rendered in front of note "B"

  @component
  Scenario: A note accepts up to 500 characters
    Given a note is open for editing
    When the user enters 500 characters of text
    Then all 500 characters are shown in the note

  @component @failure
  Scenario: Input that would exceed 500 characters is blocked
    Given a note already contains 500 characters
    When the user attempts to type or paste further characters
    Then the further input is rejected
    And the note's text remains exactly 500 characters

  # ----- Board data states: loading, empty, load failure (@component) -----

  @component
  Scenario: An empty board shows a hint to create the first note
    Given the server has a saved board with no notes
    When the user opens the app
    Then the board shows the message "Your board is empty"
    And a hint invites the user to double-click anywhere to add the first note

  @component
  Scenario: The empty-board hint is not shown while the board is still loading
    Given the saved board has not yet finished loading
    When the user opens the app
    Then no notes are shown on the board
    And the empty-board hint is not shown

  @component @failure
  Scenario: A board that fails to load shows a retry banner over a blank canvas
    Given loading the saved board will fail
    When the user opens the app
    Then a banner states the board could not be loaded
    And the banner offers a Retry action
    And the canvas remains blank

  @component
  Scenario: Retrying after a failed load renders the saved board
    Given the saved board contains notes "Milk" and "Eggs"
    And the first load failed and the retry banner is shown
    When the user clicks Retry and the load succeeds
    Then notes "Milk" and "Eggs" are shown on the board
    And the load-failure banner is no longer shown
