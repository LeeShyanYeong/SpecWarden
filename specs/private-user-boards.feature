# Status: Draft | Story: user-accounts | Source: stories/user-accounts.md | Author: LeeShyanYeong | Created: 2026-06-20
#
# Carved out of "User accounts — private per-user sticky-note boards"; sibling: user-authentication.
#
# Decisions (from spec-task brainstorm):
#   - The board (/) is now behind the login wall: a signed-out visitor is sent to
#     the sign-in screen; a signed-in user lands on THEIR board.
#   - /api/board now requires the bearer session from user-authentication and is
#     scoped to the caller's own board — isolation is structural (a caller can only
#     ever address their own board). A new user starts with an empty board.
#   - The shared global board is retired: no anonymous access to any board.
#   - Persistence stays explicit and last-write-wins, now per user. When a save/load
#     is rejected as unauthenticated (session expired or signed out), the app
#     redirects to sign-in and unsaved local edits are discarded (no autosave).
#   - The existing sticky-notes board-interaction scenarios are KEPT but updated to
#     sign in first (see Out of scope) — this feature does not re-specify them.
#
# Out of scope:
#   - Board-interaction UX itself (create / edit / drag / delete / 500-char cap /
#     stacking) — stays in specs/sticky-notes.feature, updated to sign in first.
#   - The auth mechanics (register / sign-in / session / sign-out) — owned by
#     specs/user-authentication.feature; this feature consumes them.
#   - Multiple boards per user, shared / collaborative boards, or board sharing —
#     the single private board is the stepping stone to a later sharing story.
#   - Real-time collaboration, conflict detection or merge — still last-write-wins.
#   - Autosave, offline mode, save retry, background sync — saving stays explicit.
#   - Migrating the old global board's notes onto an account — they are discarded.
#
# Open questions:
#   - Landing route after sign-in: assumed the board (/) is the signed-in home; the
#     /account page from the auth slice may be kept or folded in — to confirm.
#   - Whether any message is shown before the redirect on an expired save (assumed a
#     silent redirect, matching the existing "no warning on discarded edits" rule).
#   - Same user signed in from two browsers both saving: assumed last-write-wins on
#     that user's board (as the global board was, now per user).
#   - Empty-board state: whether a first-note hint is shown (carried over from
#     sticky-notes; input/display either way).
#
# Architecture decisions: none — the only ADR (ADR-001, Podman runtime) is
# infrastructure and does not constrain this feature's behaviour.

Feature: Private user boards
  As a signed-in user
  I want my own private sticky-note board that only I can see and edit
  So that my notes are separated from everyone else's

  # One vertical slice. @api owns the owner-scoped board contract (auth required,
  # isolated per user); @component owns the login wall and loading the owner's board
  # with the backend stubbed; one @e2e smoke proves two real users stay isolated.

  # ----- Owner-scoped board: the REST contract (@api) -----

  @api
  Scenario: A signed-in user's saved board loads back for them
    Given a signed-in user
    When the user saves a board with note "Groceries"
    Then the save is accepted
    And loading the board for that user returns note "Groceries"

  @api
  Scenario: Each user has their own isolated board
    Given two signed-in users, "ann" and "bob"
    When "ann" saves a board with note "Ann's note"
    And "bob" saves a board with note "Bob's note"
    Then loading the board for "ann" returns only "Ann's note"
    And loading the board for "bob" returns only "Bob's note"

  @api
  Scenario: A newly registered user starts with an empty board
    Given a signed-in user who has not saved anything
    When the user loads the board
    Then the board comes back empty

  @api @failure
  Scenario: Loading the board without a session is refused
    When the board is loaded without a session credential
    Then the board request is rejected as unauthenticated
    And no board is returned

  @api @failure
  Scenario: Saving the board without a session is refused
    When a board is saved without a session credential
    Then the board request is rejected as unauthenticated

  @api @failure
  Scenario: A board request with an invalid session is refused
    When the board is loaded with an invalid session credential
    Then the board request is rejected as unauthenticated

  # ----- The login wall + owner's board on open, backend stubbed (@component) -----

  @component
  Scenario: Opening the board while signed out redirects to sign-in
    Given no user is signed in
    When the user opens the board
    Then the sign-in screen is shown

  @component
  Scenario: A signed-in user sees their own saved board
    Given a signed-in user whose saved board contains "Milk" and "Eggs"
    When the user opens the board
    Then notes "Milk" and "Eggs" are shown on the board

  @component
  Scenario: A signed-in user with no saved board sees an empty board
    Given a signed-in user with no saved board
    When the user opens the board
    Then the board is shown with no notes

  @component @failure
  Scenario: A save rejected as unauthenticated sends the user back to sign-in
    Given a signed-in user editing the board
    And the backend will reject the save as unauthenticated
    When the user saves
    Then the sign-in screen is shown
    And no warning about the discarded changes is shown

  # ----- Two real users stay isolated end to end (@e2e) -----

  @e2e
  Scenario: A second user does not see the first user's notes
    Given a user signs up, saves a note "Ann's secret", and signs out
    When a different user signs up and opens the board
    Then the board is empty
    And the note "Ann's secret" is not shown

  # ----- Non-functional: board access control (@nfr) -----

  # EARS: When the board is requested without a valid session, the system shall
  # reject it (HTTP 401) and neither return nor modify any user's board.
  @nfr @security
  Scenario: The board is never served to an unauthenticated caller
    Given a user has a saved board
    When the board is requested without a session credential
    Then the response is HTTP 401
    And no notes are returned
