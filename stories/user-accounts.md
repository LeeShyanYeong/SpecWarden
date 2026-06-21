# Story: User accounts — private per-user sticky-note boards

**Status:** Draft · **Author:** LeeShyanYeong · **Created:** 2026-06-20

## Narrative

As a person who keeps a sticky-note board, I want to register and sign in with a
username and password, so that my notes are private to me and separated from
everyone else's instead of living on one board the whole world shares.

## Context

This is the **accounts** slice that the persistence story
([stories/sticky-notes.md](sticky-notes.md)) explicitly foreshadowed. That slice
deliberately ran **one shared global board** with no sign-in as a stepping stone,
but built an *account-ready* data model so an owner could be attached later
without rework. This story cashes that in.

After this story, sign-in is **required** to use the app: there is no anonymous
or global board any more. Each user has **exactly one private board** that only
they can see and edit. The previously shared global board is **retired and its
notes discarded** — it was always a throwaway stepping stone. Authentication is a
**self-managed username + password** (no email, no third-party sign-in), sign-up
is **self-serve with no verification**, and a session ends after a period of
**inactivity** or when the user **signs out**.

Per the answers gathered, **shared / collaborative boards are a future story** —
this story's single private board is the stepping stone to it, so board ownership
must be modelled to gain sharing later without reworking the schema.

## Rules (acceptance criteria)

Accounts & sign-up:

- A visitor can **self-register** by choosing a **username** and a **password**;
  on success the account exists and the user is **signed in**. No email is
  captured and there is **no verification step**.
- **Usernames are unique.** Registering a username that already exists is
  **rejected** with an error and **no account is created**.
- A username must be **non-empty**, and a password must meet a **minimum length**;
  a violation is rejected at sign-up with an error and no account is created.

Sign-in, session & sign-out:

- A registered user **signs in** with their username and password and reaches
  **their own** board.
- A **failed sign-in** (unknown username *or* wrong password) is rejected with a
  single **generic "invalid username or password"** message that does **not**
  reveal which was wrong; **no session is started**.
- A signed-in user can **explicitly sign out**; afterwards no board is accessible
  until they sign in again.
- A session **ends automatically after a period of inactivity**; once expired the
  user must sign in again to continue.
- The app **requires a signed-in session** to view or edit any board — there is
  **no anonymous or global board**.

Per-user board isolation:

- Each user has **exactly one private board**, visible and editable **only** when
  signed in as that user.
- A user **never sees or can modify another user's notes**, and one user's save
  **never affects** another user's board.
- A **newly registered user starts with an empty board**.
- The previously shared **global board is retired**; its notes are **discarded**,
  not migrated onto any account.
- All existing board behaviour — create / edit / drag / delete, the **500-character**
  cap, stacking order, and the **explicit save / load-on-open** persistence
  contract — continues to work **unchanged**, but now **scoped to the signed-in
  user's own board** rather than a shared one.

## Out of scope

- **Email** capture, email **verification**, and **password reset** / "forgot
  password" recovery (this slice stores no email).
- **Shared / collaborative boards**, board sharing, and **multiple boards per
  user** — the single private board is the stepping stone to a later sharing story.
- **Third-party / social sign-in** (Google, Microsoft), SSO, and **multi-factor
  auth**.
- **Roles, permissions, or admin users**; account management such as **change
  password, rename, or delete account**.
- **Migrating** the old global board's notes onto an account (they are discarded).
- **Remember-me / persistent sessions** that survive browser restarts (sessions
  are inactivity-bounded).
- **Real-time collaboration**, conflict detection, or merge — persistence stays
  **last-write-wins**, now per user.
- Account **lockout / brute-force rate-limiting** beyond returning the generic
  error (flagged as a security open question below).

## Constraints / quality attributes

- **Credentials stored securely.** Passwords are **hashed (and salted)**, never
  stored or returned in **plaintext**, and credentials are never exposed by the
  API.
- **Authorization enforced server-side.** Board save / load endpoints require an
  **authenticated session** and operate **only on the caller's own board**; a
  request for another user's board is **refused**, not silently served.
- **No user enumeration at sign-in.** The generic sign-in error must not reveal
  whether a username exists. (Sign-up unavoidably reveals "username taken" — see
  open questions.)
- **Share-ready data model.** Model board **ownership** so a future shared /
  collaborative board can attach without reworking the note/board schema (today:
  one private board per owner).

## Open questions

- **Inactivity-timeout duration** — no specific value agreed (15 / 30 / 60 min?).
- **Minimum password length** — exact number not fixed (8?); complexity rules were
  deliberately excluded.
- **Username constraints** — case sensitivity (is `Lee` the same as `lee`?),
  allowed characters, and min/max length are not yet fixed.
- **Session timeout mid-edit** — what the user sees when the session expires while
  editing (redirect to sign-in, a message), and whether **unsaved local board
  changes are lost** (the existing "unsaved changes are discarded" rule suggests
  yes — confirm).
- **Sign-out / timeout and unsaved work** — does signing out attempt to save the
  board, or simply drop unsaved local edits? (Assumed: explicit-save semantics
  carry over, so unsaved edits are discarded.)
- **Sign-up enumeration** — "username taken" necessarily reveals existence; is any
  **rate-limiting** on sign-up wanted to mitigate harvesting, given the generic
  sign-in message?
- **Brute-force protection** — is any **account lockout / rate-limiting** on
  repeated failed sign-ins required, or explicitly deferred?
- **Signed-in affordances** — is the current username shown in the UI, and is
  there a visible session indicator?
- **Concurrent sessions** — may the same account be signed in from two browsers at
  once, or is there a restriction?

## Size hint

Looks like **one feature** — a single vertical slice (self-serve sign-up, sign-in
with generic failure, inactivity session + explicit sign-out, and per-user board
isolation with the global board retired). It is cohesive and independently
shippable: you cannot ship registration without sign-in, and per-user isolation
is the whole point. → Recommend **`spec-task`** next.

It is on the larger side, though; if speccing makes it feel like more than one
slice, split with **`brainstorm-task`** along the natural seam — *authentication*
(register / sign-in / session) versus *board ownership* (private per-user board +
scoped save/load).
