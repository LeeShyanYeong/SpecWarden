import { expect } from '@playwright/test';
import { Given, When, Then } from '../dsl/fixtures';

// These reuse existing steps from other features (same page, shared fixtures):
//   - "no user is signed in" / "the sign-in screen is shown"  (user-authentication)
//   - 'notes "X" and "Y" are shown on the board'              (sticky-notes)

// ----- The login wall on the board (@component) -----

When(/^the user opens the board$/, async ({ board }) => {
  await board.navigateToBoard();
});

Given(/^a signed-in user whose saved board contains "([^"]+)" and "([^"]+)"$/, async ({ board }, a, b) => {
  await board.signedInWithSavedBoard([{ text: a }, { text: b }]);
});

Given(/^a signed-in user with no saved board$/, async ({ board }) => {
  await board.signedInWithSavedBoard([]);
});

Then(/^the board is shown with no notes$/, async ({ board }) => {
  await board.expectEmptyBoard();
});

// ----- Expired/rejected save sends the user back to sign-in (@component) -----

Given(/^a signed-in user editing the board$/, async ({ board }) => {
  await board.signedInEditingBoard();
});

Given(/^the backend will reject the save as unauthenticated$/, async ({ board }) => {
  board.rejectSaveAsUnauthenticated();
});

When(/^the user saves$/, async ({ board }) => {
  await board.clickSave();
});

Then(/^no warning about the discarded changes is shown$/, async ({ board }) => {
  expect(board.dialogs).toHaveLength(0);
});

// ----- Two real users stay isolated (@e2e) -----

Given(/^a user signs up, saves a note "([^"]+)", and signs out$/, async ({ board }, text) => {
  await board.signUpSaveNoteAndSignOut(text);
});

When(/^a different user signs up and opens the board$/, async ({ board }) => {
  await board.signUpAndOpenBoard();
});

Then(/^the board is empty$/, async ({ board }) => {
  await board.expectEmptyBoard();
});

Then(/^the note "([^"]+)" is not shown$/, async ({ board }, text) => {
  await expect(board.noteByText(text)).toHaveCount(0);
});
