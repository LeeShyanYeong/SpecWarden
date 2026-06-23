import { expect } from '@playwright/test';
import { Given, When, Then } from '../dsl/fixtures';

// ----- Persistence / load / save (@component + @e2e) -----

Given(/^the server has a saved board with notes "([^"]+)" and "([^"]+)"$/, async ({ board }, a, b) => {
  board.setSavedBoard([{ text: a }, { text: b }]);
});

When(/^the user opens the app$/, async ({ board }) => {
  await board.open();
});

Then(/^notes "([^"]+)" and "([^"]+)" are shown on the board$/, async ({ board }, a, b) => {
  await expect(board.noteByText(a)).toBeVisible();
  await expect(board.noteByText(b)).toBeVisible();
});

Given(/^the saved board contains a note "([^"]+)"$/, async ({ board }, text) => {
  board.setSavedBoard([{ text }]);
  await board.open();
});

Given(/^the user has added a note "([^"]+)" without saving$/, async ({ board }, text) => {
  await board.createSettledNote(220, 200, text);
});

When(/^the user reloads the page$/, async ({ board }) => {
  await board.reload();
});

Then(/^the board shows only "([^"]+)"$/, async ({ board }, text) => {
  await expect(board.notes).toHaveCount(1);
  await expect(board.noteByText(text)).toBeVisible();
});

Then(/^no warning was shown about the discarded change$/, async ({ board }) => {
  expect(board.dialogs).toHaveLength(0);
});

Given(/^the user has a board with notes and the server will reject the save$/, async ({ board }) => {
  // Create the note locally so the board is dirty (Save is enabled only when dirty).
  board.setSavedBoard([]);
  await board.open();
  await board.createSettledNote(220, 200, 'Note');
  board.failNextSave();
});

When(/^the user clicks Save$/, async ({ board }) => {
  await board.clickSave();
});

Then(/^an error message states the board was not saved$/, async ({ board }) => {
  await expect(board.error).toBeVisible();
});

Then(/^the local board remains on screen unchanged$/, async ({ board }) => {
  await expect(board.notes).toHaveCount(1);
  await expect(board.noteByText('Note')).toBeVisible();
});

// ----- Create / edit / drag / delete (@component) -----

Given(/^the sticky-note board is open with no notes$/, async ({ board }) => {
  board.setSavedBoard([]);
  await board.open();
});

When(/^the user double-clicks an empty area of the canvas at position \((\d+), (\d+)\)$/, async ({ board }, x, y) => {
  await board.createNoteAt(Number(x), Number(y));
});

Then(/^a new note appears at position \((\d+), (\d+)\)$/, async ({ board }, x, y) => {
  await expect(board.notes).toHaveCount(1);
  await expect(board.notes.first()).toHaveAttribute('data-x', String(x));
  await expect(board.notes.first()).toHaveAttribute('data-y', String(y));
});

Then(/^the note is empty and ready for text entry$/, async ({ board }) => {
  const textarea = board.notes.first().locator('textarea');
  await expect(textarea).toBeVisible();
  await expect(textarea).toHaveValue('');
});

Given(/^a note exists on the board$/, async ({ board }) => {
  board.setSavedBoard([]);
  await board.open();
  await board.createSettledNote(150, 150);
});

When(/^the user double-clicks the note$/, async ({ board }) => {
  await board.doubleClickCurrent();
});

When(/^types "([^"]+)"$/, async ({ board }, text) => {
  await board.typeInCurrent(text);
});

Then(/^the note shows "([^"]+)"$/, async ({ board }, text) => {
  await expect(board.notes.first()).toHaveAttribute('data-text', text);
});

Given(/^a note exists at position \((\d+), (\d+)\)$/, async ({ board }, x, y) => {
  // Seed via stub so the note is never in editing mode — interactive dblclick at
  // the same (x, y) position triggers a second startEdit via the note's own
  // dblclick handler, leaving editing() true when the drag fires.
  board.setSavedBoard([{ text: 'drag-note', x: Number(x), y: Number(y) }]);
  await board.open();
  board.current = board.noteByText('drag-note');
});

When(/^the user drags the note to position \((\d+), (\d+)\)$/, async ({ board }, x, y) => {
  await board.dragCurrentTo(Number(x), Number(y));
});

Then(/^the note is shown at position \((\d+), (\d+)\)$/, async ({ board }, x, y) => {
  await expect(board.notes.first()).toHaveAttribute('data-x', String(x));
  await expect(board.notes.first()).toHaveAttribute('data-y', String(y));
});

When(/^the user clicks the note's delete button$/, async ({ board }) => {
  await board.deleteCurrent();
});

Then(/^the note is removed from the board immediately$/, async ({ board }) => {
  await expect(board.notes).toHaveCount(0);
});

Then(/^no confirmation is requested$/, async ({ board }) => {
  expect(board.dialogs).toHaveLength(0);
});

Given(/^the user creates a note by double-clicking the canvas$/, async ({ board }) => {
  board.setSavedBoard([]);
  await board.open();
  await board.createNoteAt(160, 160);
});

When(/^the user leaves the note without entering any text$/, async ({ board }) => {
  await board.exitEdit();
});

Then(/^the empty note remains on the board$/, async ({ board }) => {
  await expect(board.notes).toHaveCount(1);
  await expect(board.notes.first()).toHaveAttribute('data-text', '');
});

When(/^the user creates three notes at different positions$/, async ({ board }) => {
  await board.createSettledNote(50, 50);
  await board.createSettledNote(220, 120);
  await board.createSettledNote(380, 220);
});

Then(/^all three notes are visible on the board$/, async ({ board }) => {
  await expect(board.notes).toHaveCount(3);
});

// ----- Z-order (@component) -----

Given(/^two notes overlap, with note "([^"]+)" rendered in front of note "([^"]+)"$/, async ({ board }, front, back) => {
  // Use saved board to seed both notes with distinct z values so the overlap
  // setup doesn't require clicking inside an existing note.
  board.setSavedBoard([
    { text: back, x: 100, y: 100, z: 1 },
    { text: front, x: 120, y: 120, z: 2 },
  ]);
  await board.open();
});

When(/^the user drags note "([^"]+)"$/, async ({ board }, name) => {
  await board.dragNoteByText(name, 15, 15);
});

Then(/^note "([^"]+)" is rendered in front of note "([^"]+)"$/, async ({ board }, a, b) => {
  const za = Number(await board.noteByText(a).getAttribute('data-z'));
  const zb = Number(await board.noteByText(b).getAttribute('data-z'));
  expect(za).toBeGreaterThan(zb);
});

// ----- 500-character cap (@component) -----

Given(/^a note is open for editing$/, async ({ board }) => {
  board.setSavedBoard([]);
  await board.open();
  await board.createNoteAt(150, 150);
});

When(/^the user enters (\d+) characters of text$/, async ({ board }, n) => {
  await board.typeInCurrent('a'.repeat(Number(n)));
});

Then(/^all (\d+) characters are shown in the note$/, async ({ board }, n) => {
  const text = await board.notes.first().getAttribute('data-text');
  expect(text?.length).toBe(Number(n));
});

Given(/^a note already contains (\d+) characters$/, async ({ board }, n) => {
  board.setSavedBoard([]);
  await board.open();
  await board.createNoteAt(150, 150);
  await board.typeInCurrent('a'.repeat(Number(n)));
});

When(/^the user attempts to type or paste further characters$/, async ({ board }) => {
  await board.typeMoreInCurrent('bbbbb');
});

Then(/^the further input is rejected$/, async ({ board }) => {
  const value = await board.notes.first().locator('textarea').inputValue();
  expect(value.length).toBe(500);
});

Then(/^the note's text remains exactly (\d+) characters$/, async ({ board }, n) => {
  const text = await board.notes.first().getAttribute('data-text');
  expect(text?.length).toBe(Number(n));
});

// ----- Empty-note accessible name (@component) -----

Then(/^the empty note exposes the accessible name "([^"]+)"$/, async ({ board }, name: string) => {
  await expect(board.notes.first()).toHaveAttribute('aria-label', name);
});

// ----- Editing raises a note to the front (@component) -----

When(/^the user double-clicks note "([^"]+)" to edit it$/, async ({ board }, name: string) => {
  await board.editNoteByText(name);
});

// ----- Board data states: empty, loading, load failure (@component) -----

Given(/^the server has a saved board with no notes$/, async ({ board }) => {
  board.setSavedBoard([]);
});

Then(/^the board shows the message "([^"]+)"$/, async ({ board }, message: string) => {
  await expect(board.emptyState).toContainText(message);
});

Then(/^a hint invites the user to double-click anywhere to add the first note$/, async ({ board }) => {
  await expect(board.emptyState).toContainText(/double-click/i);
});

Given(/^the saved board has not yet finished loading$/, async ({ board }) => {
  board.holdLoad();
});

Then(/^no notes are shown on the board$/, async ({ board }) => {
  await expect(board.notes).toHaveCount(0);
});

Then(/^the empty-board hint is not shown$/, async ({ board }) => {
  await expect(board.emptyState).toHaveCount(0);
});

Given(/^loading the saved board will fail$/, async ({ board }) => {
  board.failLoad();
});

Then(/^a banner states the board could not be loaded$/, async ({ board }) => {
  await expect(board.loadBanner).toContainText(/could not be loaded/i);
});

Then(/^the banner offers a Retry action$/, async ({ board }) => {
  await expect(board.retryButton).toBeVisible();
});

Then(/^the canvas remains blank$/, async ({ board }) => {
  await expect(board.notes).toHaveCount(0);
});

Given(/^the saved board contains notes "([^"]+)" and "([^"]+)"$/, async ({ board }, a: string, b: string) => {
  board.setSavedBoard([{ text: a }, { text: b }]);
});

Given(/^the first load failed and the retry banner is shown$/, async ({ board }) => {
  await board.openWithFailedLoad();
});

When(/^the user clicks Retry and the load succeeds$/, async ({ board }) => {
  board.succeedLoad();
  await board.clickRetry();
});

Then(/^the load-failure banner is no longer shown$/, async ({ board }) => {
  await expect(board.loadBanner).toBeHidden();
});

// ----- Full-stack smoke (@e2e) -----

Given(/^the sticky-note board is open in the running app$/, async ({ board }) => {
  await board.open();
});

When(/^the user creates a note "([^"]+)" and clicks Save$/, async ({ board }, text) => {
  await board.createNoteAt(180, 140);
  await board.typeInCurrent(text);
  await board.exitEdit();
  await board.clickSave();
});

When(/^reloads the page$/, async ({ board }) => {
  await board.reload();
});

Then(/^the note "([^"]+)" is still shown on the board$/, async ({ board }, text) => {
  await expect(board.noteByText(text)).toBeVisible();
});
