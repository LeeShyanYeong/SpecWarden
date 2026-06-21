# Story: Board Toolbar UX

**Status:** Draft · **Author:** Lee Shyan Yeong · **Created:** 2026-06-21

## Narrative

As a signed-in user, I want to land directly on my sticky-note board after signing in and have a toolbar with Save and Sign Out actions, so that I can manage my notes without hunting for controls or losing unsaved work.

## Context

Currently, a successful sign-in redirects to `/account`, a page that only offers sign-out. Users must then navigate manually to the board. There is also no Save action on the board itself, so users have no way to persist their notes explicitly — and no warning when they are about to lose unsaved changes. This story makes the post-login destination correct and adds the minimal set of session/persistence controls to the board.

## Rules (acceptance criteria)

- After a successful sign-in, the user is redirected automatically to the board (not the account page).
- A toolbar is visible on the board for every signed-in user, regardless of role.
- The toolbar contains a **Save** button and a **Sign Out** button (layout / design TBD).
- Clicking **Save** persists all current notes to the backend. On success, a brief "Saved!" toast notification appears and then disappears automatically.
- Clicking **Sign Out** when there are unsaved changes shows a confirmation: *"You have unsaved changes. Save before leaving?"* with options to Save & Sign Out, Discard & Sign Out, or Cancel.
- Clicking **Sign Out** when there are no unsaved changes ends the session immediately (no confirmation needed).
- Closing the browser tab or navigating away with unsaved changes triggers a browser-level unload warning (or equivalent in-app guard).

## Out of scope

- Auto-save / periodic background save.
- Per-note granular save (each sticky saved independently).
- Admin-specific or role-specific toolbar variants.
- Displaying the user's name or avatar in the toolbar.
- Toolbar items beyond Save and Sign Out.

## Open questions

- Where should the user land after signing out — back to the sign-in page, or a landing/home page?
- Should the Save button reflect a "dirty" state (e.g. disabled or greyed when nothing has changed since the last save)?
