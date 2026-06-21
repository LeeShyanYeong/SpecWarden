import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

/**
 * Protocol driver for authentication. Steps speak this DSL, never raw Playwright.
 * For @component it answers the auth backend boundary locally (page.route); for
 * @e2e it leaves calls to hit the real backend and uses a unique account so reruns
 * never collide on the persistent store.
 */
export class AuthDriver {
  /** How many register requests the stubbed backend saw (0 proves none was sent). */
  registerCalls = 0;

  // Unique, policy-valid credentials for @e2e (lowercase letters/digits/underscore).
  readonly username = `e2e_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  readonly password = 'correct-horse';

  private rejectLogin = false;

  constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
    private readonly stubbed: boolean,
  ) {}

  // ----- backend boundary (stubbed for @component only) -----

  failLogin(): void {
    this.rejectLogin = true;
  }

  private async installStubs(): Promise<void> {
    if (!this.stubbed) {
      return;
    }
    await this.page.route('**/api/auth/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (url.endsWith('/login') && method === 'POST') {
        await (this.rejectLogin
          ? route.fulfill({ status: 401, json: { error: 'invalid username or password' } })
          : route.fulfill({ json: { token: 'stub-token', username: 'stub' } }));
      } else if (url.endsWith('/register') && method === 'POST') {
        this.registerCalls++;
        await route.fulfill({ json: { token: 'stub-token', username: 'stub' } });
      } else if (url.endsWith('/logout')) {
        await route.fulfill({ json: {} });
      } else if (url.endsWith('/me')) {
        await route.fulfill({ json: { username: 'stub' } });
      } else {
        await route.continue();
      }
    });
    // Stub the board so @component scenarios that land on '/' after auth can render.
    await this.page.route('**/api/board', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { notes: [] } });
      } else {
        await route.continue();
      }
    });
  }

  // ----- navigation / state -----

  /** Signed-out start: fresh context already has no token. */
  async startSignedOut(): Promise<void> {
    await this.installStubs();
  }

  /** Signed-in start: seed the bearer token (stubbed lane) then land on /account. */
  async startSignedIn(): Promise<void> {
    await this.installStubs();
    if (this.stubbed) {
      // Seed the token ONCE (not via addInitScript, which would re-run on every
      // navigation and resurrect the token that sign-out clears).
      await this.page.goto('/signin');
      await this.page.evaluate(() => localStorage.setItem('auth_token', 'stub-token'));
    }
    await this.page.goto('/account');
    await expect(this.accountScreen).toBeVisible();
  }

  async openSignIn(): Promise<void> {
    await this.installStubs();
    await this.page.goto('/signin');
    await expect(this.signInScreen).toBeVisible();
  }

  async openSignUp(): Promise<void> {
    await this.installStubs();
    await this.page.goto('/signup');
    await expect(this.signUpScreen).toBeVisible();
  }

  /** Navigate to /signin without reinstalling stubs (stubs already in place). */
  async gotoSignIn(): Promise<void> {
    await this.page.goto('/signin');
  }

  /** Navigate to /signup without reinstalling stubs (stubs already in place). */
  async gotoSignUp(): Promise<void> {
    await this.page.goto('/signup');
  }

  async gotoProtectedPage(): Promise<void> {
    await this.page.goto('/account');
  }

  // ----- form actions -----

  async submitSignIn(username = 'someone', password = 'whatever8'): Promise<void> {
    await this.fillCredentials(username, password);
    await this.page.getByTestId('sign-in-submit').click();
  }

  async submitSignUp(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.page.getByTestId('sign-up-submit').click();
  }

  async signOut(): Promise<void> {
    await this.page.getByTestId('sign-out').click();
  }

  // ----- @e2e flows (real backend) -----

  async registerNewAccount(): Promise<void> {
    await this.page.goto('/signup');
    await expect(this.signUpScreen).toBeVisible();
    await this.submitSignUp(this.username, this.password);
    // sign-up now lands on the board ('/'); assertion is in the step definition
  }

  async signInWithSameCredentials(): Promise<void> {
    await this.submitSignIn(this.username, this.password);
    // sign-in lands on the board ('/'); assertion is in the step definition
  }

  private async fillCredentials(username: string, password: string): Promise<void> {
    await this.page.getByTestId('username').fill(username);
    await this.page.getByTestId('password').fill(password);
  }

  // ----- locators -----

  get signInScreen(): Locator {
    return this.page.getByTestId('sign-in-screen');
  }

  get signUpScreen(): Locator {
    return this.page.getByTestId('sign-up-screen');
  }

  get accountScreen(): Locator {
    return this.page.getByTestId('account-screen');
  }

  get error(): Locator {
    return this.page.getByTestId('auth-error');
  }

  get boardScreen(): Locator {
    return this.page.getByTestId('canvas');
  }
}
