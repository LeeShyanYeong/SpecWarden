# Status: Draft | Story: user-accounts | Source: stories/user-accounts.md | Author: LeeShyanYeong | Created: 2026-06-20
#
# Carved out of "User accounts — private per-user sticky-note boards"; sibling: private-user-boards.
#
# Decided values (from spec-task brainstorm):
#   - Minimum password length: 8 (8 accepted, 7 rejected); no complexity rules.
#   - Username: case-INSENSITIVE, 3–30 chars, [a-z0-9_-] only ("Lee" == "lee").
#   - Inactivity timeout: 30 minutes (idle, sliding window).
#   - Failed sign-in returns one generic "invalid username or password" (no user enumeration).
#
# Out of scope (this feature is authentication only):
#   - Per-user BOARD isolation, owner-scoped save/load, and retiring the shared global
#     board — that is the sibling feature, specs/private-user-boards.feature.
#   - What a session timeout does to unsaved board edits — also private-user-boards.
#   - Password reset / "forgot password", email capture or verification (no email stored).
#   - Account management: change password, rename, delete account.
#   - Third-party / social sign-in (Google, Microsoft), SSO, multi-factor auth.
#   - Account lockout / brute-force rate-limiting beyond the generic error (deferred).
#   - Concurrent-session limits (same account in two browsers is not restricted here).
#   - Remember-me / sessions that survive a browser restart (sessions are inactivity-bounded).
#
# Open questions:
#   - Session transport (HTTP-only cookie vs bearer token) is left to implementation;
#     scenarios speak of a "session credential" declaratively so either satisfies them.
#   - Exact copy of the generic error is asserted as containing "invalid username or
#     password"; final wording TBD.
#   - Inactivity window assumed SLIDING (idle = no requests for 30 min); confirm vs a
#     fixed absolute lifetime.
#   - Whether the signed-in username is shown in the UI (a signed-in affordance) — not
#     specified here.
#   - Sign-up still reveals "username taken" by necessity; any rate-limit to slow
#     harvesting is deferred (see out of scope).
#
# Architecture decisions: none — the only ADR (ADR-001, Podman runtime) is infrastructure
# and does not constrain this feature's behaviour.

Feature: User authentication
  As a visitor to the sticky-note app
  I want to register and sign in with a username and password, with a session that ends on inactivity or sign-out
  So that I have a private identity the app can recognise and protect

  # One vertical slice. @api owns the auth REST contract (register / sign-in / session
  # / sign-out); @component owns the client-side auth UX with the backend stubbed; one
  # @e2e smoke proves a real registration survives a sign-out and sign-in round trip.

  # ----- Registration: the REST contract (@api) -----

  @api
  Scenario: Registering with a new username creates an account and signs the user in
    When a visitor registers with username "ada" and password "correct-horse"
    Then the registration succeeds
    And the response contains a session credential

  @api
  Scenario: A password of exactly 8 characters is accepted
    When a visitor registers with username "cleo" and an 8-character password
    Then the registration succeeds

  @api @failure
  Scenario: A password shorter than 8 characters is rejected at sign-up
    When a visitor registers with username "bob" and a 7-character password
    Then the registration is rejected with a validation error
    And no account is created

  @api @failure
  Scenario: Registering a username that already exists is rejected, case-insensitively
    Given an account exists with username "ada"
    When a visitor registers with username "ADA" and password "another-password"
    Then the registration is rejected with a validation error
    And no second account is created

  @api @failure
  Scenario Outline: A username outside the allowed format is rejected at sign-up
    When a visitor registers with username "<username>" and password "valid-password"
    Then the registration is rejected with a validation error

    Examples:
      | username                          | why               |
      | ab                                | shorter than 3    |
      | this-username-is-far-too-long-abc | longer than 30    |
      | bad@name                          | illegal character |

  # ----- Sign-in & session: the REST contract (@api) -----

  @api
  Scenario: A registered user can sign in and receive a session credential
    Given an account exists with username "ada" and password "correct-horse"
    When a user signs in with username "ada" and password "correct-horse"
    Then the sign-in succeeds
    And the response contains a session credential

  @api
  Scenario: Sign-in matches the username case-insensitively
    Given an account exists with username "Ada" and password "correct-horse"
    When a user signs in with username "ada" and password "correct-horse"
    Then the sign-in succeeds

  @api @failure
  Scenario: Signing in with the wrong password is rejected with a generic error
    Given an account exists with username "ada" and password "correct-horse"
    When a user signs in with username "ada" and password "wrong-password"
    Then the sign-in is rejected with the message "invalid username or password"
    And no session credential is issued

  @api @failure
  Scenario: Signing in with an unknown username returns the same generic error
    Given no account exists with username "nobody"
    When a user signs in with username "nobody" and password "any-password"
    Then the sign-in is rejected with the message "invalid username or password"
    And no session credential is issued

  @api
  Scenario: A request carrying a valid session credential is authorised
    Given a user is signed in
    When an authenticated request is made with the session credential
    Then the request is authorised

  @api @failure
  Scenario: A request without a session credential is rejected
    When a request is made without any session credential
    Then the request is rejected as unauthenticated

  @api
  Scenario: Signing out invalidates the session credential
    Given a user is signed in
    When the user signs out
    And a request is made with the same session credential
    Then the request is rejected as unauthenticated

  # ----- Auth UX, backend stubbed (@component) -----

  @component
  Scenario: Visiting a protected page without a session redirects to sign-in
    Given no user is signed in
    When the user navigates to a protected page
    Then the sign-in screen is shown

  @component @failure
  Scenario: A failed sign-in shows the generic error and keeps the user on the screen
    Given the sign-in screen is open
    And the backend will reject the credentials
    When the user submits a username and password
    Then the message "invalid username or password" is shown
    And the user remains on the sign-in screen

  @component @failure
  Scenario: Sign-up rejects a password shorter than 8 characters before submitting
    Given the sign-up screen is open
    When the user enters a 7-character password and submits
    Then a validation error about password length is shown
    And no registration request is sent

  @component
  Scenario: Signing out returns the user to the sign-in screen
    Given a user is signed in
    When the user signs out
    Then the sign-in screen is shown
    And reaching a protected page again requires signing in

  # ----- Real auth end to end (@e2e) -----

  @e2e
  Scenario: A newly registered user can sign out and sign back in
    Given the app is open at the sign-in screen
    When the user registers a new account and is signed in
    And the user signs out
    And the user signs in again with the same credentials
    Then the user is signed in and reaches the app

  # ----- Non-functional: session & credential security (@nfr) -----

  # EARS: When a signed-in session has been idle for 30 minutes, the system shall reject
  # further requests until the user signs in again.
  @nfr @security
  Scenario: A session expires after 30 minutes of inactivity
    Given a user is signed in
    And the session has been idle for 30 minutes
    When a request is made with the session credential
    Then the request is rejected as unauthenticated
    And the user must sign in again to continue

  # EARS: When a client registers or signs in, the system shall never include the
  # submitted password in any response.
  @nfr @security
  Scenario: Authentication responses never echo the password back
    When a visitor registers with username "ada" and password "correct-horse"
    Then the response does not contain the password "correct-horse"
