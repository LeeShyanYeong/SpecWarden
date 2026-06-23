import { expect } from '@playwright/test';
import { Given, When, Then } from '../dsl/fixtures';

// These reuse steps from other features where indicated:
//   - "the sign-in screen is open"          (user-authentication)
//   - "the app is open at the sign-in screen" (user-authentication)

// ----- Post-sign-in redirect (@component) -----

Given(/^the backend will accept the credentials$/, async ({ board }) => {
  // Pre-install board stubs so the board GET is stubbed before the post-login
  // redirect lands on /. Without this, the GET fires with the stub token, the
  // real server returns 401, and the auth interceptor redirects back to /signin.
  await board.prestub();
});

When(/^the user submits their username and password$/, async ({ auth }) => {
  await auth.submitSignIn();
});

Then(/^the board is shown$/, async ({ board }) => {
  await expect(board.canvas).toBeVisible();
});

Then(/^the sign-in screen is no longer visible$/, async ({ auth }) => {
  await expect(auth.signInScreen).toBeHidden();
});

// ----- Toolbar presence (@component) -----

Given(/^a signed-in user is on the board$/, async ({ board }) => {
  await board.openClean();
});

When(/^the board loads$/, async () => {
  // The board loaded as part of the Given — nothing further to do.
});

Then(/^a toolbar is visible containing a "([^"]+)" button and a "([^"]+)" button$/, async ({ page }, _first: string, _second: string) => {
  await expect(page.getByTestId('save')).toBeVisible();
  await expect(page.getByTestId('sign-out')).toBeVisible();
});

// ----- Save: success toast (@component) -----

Given(/^a signed-in user is on the board with notes$/, async ({ board }) => {
  await board.openWithLoadedNotes([{ text: 'Note A' }]);
});

Given(/^the backend will accept the save$/, async ({ board }) => {
  // The stub accepts saves by default — declarative no-op.
  void board;
});

When(/^the user clicks "([^"]+)"$/, async ({ board, page }, label: string) => {
  if (label === 'Save') {
    await board.clickSave();
  } else {
    await page.getByRole('button', { name: label }).click();
  }
});

Then(/^a "([^"]+)" notification appears$/, async ({ board }, text: string) => {
  await expect(board.savedToast).toContainText(text);
});

Then(/^the notification disappears automatically without user interaction$/, async ({ board }) => {
  await expect(board.savedToast).toBeHidden({ timeout: 5000 });
});

// ----- Save: clean/dirty state (@component) -----

Then(/^the "Save" button is disabled$/, async ({ page }) => {
  await expect(page.getByTestId('save')).toBeDisabled();
});

Then(/^the "Save" button is enabled$/, async ({ page }) => {
  await expect(page.getByTestId('save')).toBeEnabled();
});

When(/^the user makes a change to the board$/, async ({ board }) => {
  await board.makeChange();
});

// ----- Sign Out: no unsaved changes (@component) -----

Given(/^a signed-in user is on the board with no unsaved changes$/, async ({ board }) => {
  await board.openClean();
});

Then(/^the session ends without showing a confirmation dialog$/, async ({ auth, board }) => {
  await expect(board.unsavedDialog).toBeHidden();
  await expect(auth.signInScreen).toBeVisible();
});

// ----- Sign Out: unsaved changes → dialog (@component) -----

Given(/^a signed-in user is on the board with unsaved changes$/, async ({ board }) => {
  await board.openWithUnsavedChanges();
});

Then(/^a dialog is shown with the message "([^"]+)"$/, async ({ board }, message: string) => {
  await expect(board.unsavedDialog).toBeVisible();
  await expect(board.unsavedDialog).toContainText(message);
});

Then(/^the dialog offers the choices "([^"]+)", "([^"]+)", and "([^"]+)"$/, async ({ board }, a: string, b: string, c: string) => {
  await expect(board.unsavedDialog).toContainText(a);
  await expect(board.unsavedDialog).toContainText(b);
  await expect(board.unsavedDialog).toContainText(c);
});

// ----- Dialog choices (@component) -----

Given(/^the unsaved-changes dialog is open$/, async ({ board }) => {
  await board.openSignOutDialog();
});

When(/^the user chooses "([^"]+)"$/, async ({ board, page }, choice: string) => {
  if (choice === 'Save & Sign Out') {
    const put = page.waitForResponse(
      (r) => r.url().includes('/api/board') && r.request().method() === 'PUT',
    );
    await board.saveAndSignOutButton.click();
    await put;
  } else if (choice === 'Discard & Sign Out') {
    await board.discardAndSignOutButton.click();
  } else if (choice === 'Cancel') {
    await board.cancelSignOutButton.click();
  }
});

Then(/^the board is saved to the backend$/, async ({ board }) => {
  expect(board.saveCalls).toBeGreaterThan(0);
});

Then(/^the session ends$/, async ({ auth }) => {
  await expect(auth.signInScreen).toBeVisible();
});

Then(/^the session ends without saving the board$/, async ({ auth, board }) => {
  expect(board.saveCalls).toBe(0);
  await expect(auth.signInScreen).toBeVisible();
});

Then(/^the dialog is dismissed$/, async ({ board }) => {
  await expect(board.unsavedDialog).toBeHidden();
});

Then(/^the user remains on the board with an active session$/, async ({ board }) => {
  await expect(board.canvas).toBeVisible();
  await expect(board.unsavedDialog).toBeHidden();
});

// ----- Unload guard (@component) -----

When(/^the user tries to navigate away from the board$/, async ({ page }) => {
  // window.location.assign triggers a browser-level navigation, firing beforeunload.
  // The Board's @HostListener calls event.preventDefault() when dirty, which causes
  // Playwright to emit a beforeunload dialog event. registerDialogCapture() accepts
  // it (to let navigation proceed) and increments board.beforeunloadCount.
  await page.evaluate(() => window.location.assign('/signin'));
  // Allow time for the beforeunload event and the subsequent navigation to complete.
  await page.waitForTimeout(500);
});

Then(/^an unload warning is triggered before the navigation completes$/, async ({ board }) => {
  expect(board.beforeunloadCount).toBeGreaterThan(0);
});

// ----- Full-stack smoke (@e2e) -----

When(/^the user signs in with valid credentials$/, async ({ auth, request }) => {
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8080';
  await request.post(`${apiBase}/api/auth/register`, {
    data: { username: auth.username, password: auth.password },
  });
  await auth.submitSignIn(auth.username, auth.password);
});

Then(/^the board is shown with a toolbar visible$/, async ({ board, page }) => {
  await expect(board.canvas).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('save')).toBeVisible();
  await expect(page.getByTestId('sign-out')).toBeVisible();
});

When(/^the user adds a note and clicks "Save"$/, async ({ board }) => {
  await board.createSettledNote(200, 150, 'E2E note');
  await board.clickSave();
});

Then(/^a "([^"]+)" notification appears on the board$/, async ({ board }, text: string) => {
  await expect(board.savedToast).toContainText(text);
});
