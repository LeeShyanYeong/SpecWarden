# Status: Draft | Story: board-toolbar-ux | Source: stories/board-toolbar-ux.md | Author: Lee Shyan Yeong | Created: 2026-06-21
#
# This feature owns the UX layer added by the board toolbar story:
#   - Post-sign-in redirect to the board (replacing the /account landing)
#   - The toolbar itself (Save + Sign Out buttons) visible on the board
#   - "Saved!" toast on successful save
#   - Unsaved-changes confirmation dialog (three choices) when signing out
#   - Browser unload guard when navigating away with unsaved changes
#
# What this spec deliberately does NOT re-specify (already covered):
#   - Save / load REST contract and auth-scoped board access → specs/private-user-boards.feature
#   - Sign-out session invalidation mechanics → specs/user-authentication.feature
#   - Board note interactions (create / edit / drag / delete) → specs/sticky-notes.feature
#
# Out of scope:
#   - Auto-save or periodic background save.
#   - Per-note granular save (saving individual sticky notes independently).
#   - Displaying the signed-in username or avatar in the toolbar.
#   - Admin-specific or role-specific toolbar variants.
#   - Toolbar items beyond Save and Sign Out.
#
# Open questions:
#   - Where does the user land after signing out — the sign-in screen or a separate landing page?
#     (Assumed sign-in screen, consistent with user-authentication.feature; confirm.)
#   - Should the Save button reflect a dirty/clean state (e.g. greyed out when no changes)?
#     (Not specified; deferred to a later UX polish story.)
#   - What should the user see if the save request returns a server error (e.g. HTTP 500)?
#     (Not specified; deferred — the unauthenticated-save redirect is already in private-user-boards.)
#
# Architecture decisions: none — both ADRs (ADR-001 container runtime, ADR-002 single
# deployable unit) are infrastructure decisions that do not constrain this feature's behaviour.

Feature: Board toolbar UX
  As a signed-in user
  I want to land directly on my sticky-note board after signing in and have a toolbar with Save and Sign Out actions
  So that I can manage my notes without hunting for controls or losing unsaved work

  # One vertical slice. @component owns all the toolbar UX (redirect, toolbar presence,
  # toast, dialog, unload guard) with the backend stubbed. @e2e is one thin full-stack
  # smoke confirming sign-in → board → save → toast with the real backend.

  # ----- Post-sign-in redirect -----

  @component
  Scenario: Signing in takes the user to the board, not the account page
    Given the sign-in screen is open
    And the backend will accept the credentials
    When the user submits their username and password
    Then the board is shown
    And the sign-in screen is no longer visible

  # ----- Toolbar presence -----

  @component
  Scenario: The board toolbar is visible for every signed-in user
    Given a signed-in user is on the board
    When the board loads
    Then a toolbar is visible containing a "Save" button and a "Sign Out" button

  # ----- Save: success toast -----

  @component
  Scenario: Saving the board shows a transient success notification
    Given a signed-in user is on the board with notes
    And the backend will accept the save
    When the user clicks "Save"
    Then a "Saved!" notification appears
    And the notification disappears automatically without user interaction

  # ----- Sign Out: no unsaved changes -----

  @component
  Scenario: Signing out with no unsaved changes ends the session immediately
    Given a signed-in user is on the board with no unsaved changes
    When the user clicks "Sign Out"
    Then the session ends without showing a confirmation dialog

  # ----- Sign Out: unsaved changes → confirmation dialog -----

  @component
  Scenario: Signing out with unsaved changes shows a confirmation dialog
    Given a signed-in user is on the board with unsaved changes
    When the user clicks "Sign Out"
    Then a dialog is shown with the message "You have unsaved changes. Save before leaving?"
    And the dialog offers the choices "Save & Sign Out", "Discard & Sign Out", and "Cancel"

  @component
  Scenario: Choosing "Save & Sign Out" saves the board then ends the session
    Given a signed-in user is on the board with unsaved changes
    And the unsaved-changes dialog is open
    When the user chooses "Save & Sign Out"
    Then the board is saved to the backend
    And the session ends

  @component
  Scenario: Choosing "Discard & Sign Out" ends the session without saving
    Given a signed-in user is on the board with unsaved changes
    And the unsaved-changes dialog is open
    When the user chooses "Discard & Sign Out"
    Then the session ends without saving the board

  @component
  Scenario: Choosing "Cancel" closes the dialog and keeps the user on the board
    Given a signed-in user is on the board with unsaved changes
    And the unsaved-changes dialog is open
    When the user chooses "Cancel"
    Then the dialog is dismissed
    And the user remains on the board with an active session

  # ----- Unload guard -----

  @component
  Scenario: Navigating away from the board with unsaved changes triggers an unload warning
    Given a signed-in user is on the board with unsaved changes
    When the user tries to navigate away from the board
    Then an unload warning is triggered before the navigation completes

  # ----- Full-stack smoke (@e2e) -----

  @e2e
  Scenario: Signing in lands on the board and saving notes confirms with a toast
    Given the app is open at the sign-in screen
    When the user signs in with valid credentials
    Then the board is shown with a toolbar visible
    When the user adds a note and clicks "Save"
    Then a "Saved!" notification appears on the board

  # ----- Non-functional -----

  # EARS: When the board displays notes, the system shall keep the toolbar always
  # visible without the user having to scroll.
  @nfr @usability
  Scenario: The toolbar remains in view regardless of how many notes are on the board
    Given a signed-in user is on the board with enough notes to fill the viewport
    When the user views the board without scrolling
    Then the toolbar is visible in its fixed position above or beside the notes
