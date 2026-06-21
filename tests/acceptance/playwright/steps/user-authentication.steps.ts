import { expect } from '@playwright/test';
import { Given, When, Then } from '../dsl/fixtures';

// ----- The login wall: protected page redirects to sign-in (@component) -----

Given(/^no user is signed in$/, async ({ auth }) => {
  await auth.startSignedOut();
});

When(/^the user navigates to a protected page$/, async ({ auth }) => {
  await auth.gotoProtectedPage();
});

Then(/^the sign-in screen is shown$/, async ({ auth }) => {
  await expect(auth.signInScreen).toBeVisible();
});

// ----- Failed sign-in shows the generic error (@component) -----

Given(/^the sign-in screen is open$/, async ({ auth }) => {
  await auth.openSignIn();
});

Given(/^the backend will reject the credentials$/, async ({ auth }) => {
  auth.failLogin();
});

When(/^the user submits a username and password$/, async ({ auth }) => {
  await auth.submitSignIn();
});

Then(/^the message "([^"]+)" is shown$/, async ({ auth }, message) => {
  await expect(auth.error).toContainText(message);
});

Then(/^the user remains on the sign-in screen$/, async ({ auth }) => {
  await expect(auth.signInScreen).toBeVisible();
});

// ----- Client-side password-length guard at sign-up (@component) -----

Given(/^the sign-up screen is open$/, async ({ auth }) => {
  await auth.openSignUp();
});

When(/^the user enters a 7-character password and submits$/, async ({ auth }) => {
  await auth.submitSignUp('newcomer', 'pass123'); // 7 characters
});

Then(/^a validation error about password length is shown$/, async ({ auth }) => {
  await expect(auth.error).toBeVisible();
});

Then(/^no registration request is sent$/, async ({ auth }) => {
  expect(auth.registerCalls).toBe(0);
});

// ----- Sign out returns to the sign-in screen (@component) -----

Given(/^a user is signed in$/, async ({ auth }) => {
  await auth.startSignedIn();
});

When(/^the user signs out$/, async ({ auth }) => {
  await auth.signOut();
});

Then(/^reaching a protected page again requires signing in$/, async ({ auth }) => {
  await auth.gotoProtectedPage();
  await expect(auth.signInScreen).toBeVisible();
});

// ----- Real auth round trip (@e2e) -----

Given(/^the app is open at the sign-in screen$/, async ({ auth }) => {
  await auth.openSignIn();
});

When(/^the user registers a new account and is signed in$/, async ({ auth }) => {
  await auth.registerNewAccount();
});

When(/^the user signs in again with the same credentials$/, async ({ auth }) => {
  await auth.signInWithSameCredentials();
});

Then(/^the user is signed in and reaches the app$/, async ({ auth }) => {
  await expect(auth.accountScreen).toBeVisible();
});
