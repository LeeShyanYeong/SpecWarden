import { test as base, createBdd } from 'playwright-bdd';
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { AuthDriver } from './auth-driver';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:8080';

type StubNote = { id?: string; text: string; x?: number; y?: number; z?: number };

/**
 * Protocol driver for the sticky-note board. Steps speak this DSL, never raw
 * Playwright. For @component it answers the backend boundary locally (page.route);
 * for @e2e it leaves calls to hit the real backend and resets it to a known state.
 */
class BoardDriver {
  current: Locator | null = null;
  /** Confirm/prompt dialogs fired — used to assert on CanDeactivate guard prompts. */
  readonly dialogs: string[] = [];
  /** Number of beforeunload dialogs fired — used to assert on browser-level unload warnings. */
  beforeunloadCount = 0;

  private saved: StubNote[] = [];
  private rejectSave = false;
  private rejectUnauthenticated = false;
  private seq = 0;

  // Load-state controls (@component): hold the load GET to stay "loading", or fail it.
  private holdLoadFlag = false;
  private failLoadFlag = false;

  constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
    private readonly stubbed: boolean,
  ) {}

  // ----- backend setup -----

  setSavedBoard(notes: StubNote[]): void {
    this.saved = notes.map((n, i) => ({ id: `s${i}`, x: 10, y: 10, z: i + 1, ...n }));
  }

  failNextSave(): void {
    this.rejectSave = true;
  }

  /** Make the next stubbed save respond 401 (an expired/rejected session). */
  rejectSaveAsUnauthenticated(): void {
    this.rejectUnauthenticated = true;
  }

  /** Hold the load GET pending so the board stays in its (pre-first-load) loading state. */
  holdLoad(): void {
    this.holdLoadFlag = true;
  }

  /** Make the load GET fail (server down at startup) so the retry banner shows. */
  failLoad(): void {
    this.failLoadFlag = true;
  }

  /** Let a subsequent load GET succeed again — used before clicking Retry. */
  succeedLoad(): void {
    this.failLoadFlag = false;
  }

  async open(): Promise<void> {
    this.registerDialogCapture();
    if (this.stubbed) {
      await this.installBoardStub();
    }
    await this.seedSession();
    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
  }

  // ----- signed-in board variants (private-user-boards) -----

  /** @component: stub the owner's saved board and seed a session (no navigation yet). */
  async signedInWithSavedBoard(notes: StubNote[]): Promise<void> {
    this.setSavedBoard(notes);
    this.registerDialogCapture();
    await this.installBoardStub();
    await this.seedSession();
  }

  /** @component: signed in, on the board, with one unsaved note in progress. */
  async signedInEditingBoard(): Promise<void> {
    await this.signedInWithSavedBoard([]);
    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
    await this.createSettledNote(200, 150, 'Draft note');
  }

  /** @e2e: a real new account saves a note, then signs out. */
  async signUpSaveNoteAndSignOut(text: string): Promise<void> {
    this.registerDialogCapture();
    await this.seedSession();
    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
    await this.createSettledNote(180, 140, text);
    await this.clickSave();
    await this.page.evaluate(() => localStorage.removeItem('auth_token'));
    await this.page.goto('/signin');
  }

  /** @e2e: a different real new account opens its (empty) board. */
  async signUpAndOpenBoard(): Promise<void> {
    await this.seedSession();
    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
  }

  async navigateToBoard(): Promise<void> {
    await this.page.goto('/');
  }

  async expectEmptyBoard(): Promise<void> {
    await expect(this.canvas).toBeVisible();
    await expect(this.notes).toHaveCount(0);
  }

  private registerDialogCapture(): void {
    this.page.on('dialog', (d) => {
      if (d.type() === 'beforeunload') {
        // Count browser-level unload warnings separately; accept so navigation
        // (reload, tab-close simulation, location.assign) can proceed.
        this.beforeunloadCount++;
        void d.accept();
      } else {
        // Confirm/prompt dialogs (e.g. window.confirm from CanDeactivate guard)
        // are captured and dismissed so navigation is blocked — proving the guard fired.
        this.dialogs.push(d.message());
        void d.dismiss();
      }
    });
  }

  private async installBoardStub(): Promise<void> {
    // Stub logout so @component scenarios don't need a live auth backend.
    await this.page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ json: {} });
    });
    await this.page.route('**/api/board', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        if (this.failLoadFlag) {
          await route.fulfill({ status: 500, json: { error: 'load failed' } });
          return;
        }
        if (this.holdLoadFlag) {
          // Never fulfilled within the test: the board stays in its loading state.
          await new Promise<void>(() => {});
          return;
        }
        await route.fulfill({ json: { notes: this.saved } });
      } else if (req.method() === 'PUT') {
        this._saveCalls++;
        if (this.rejectUnauthenticated) {
          await route.fulfill({ status: 401, json: { error: 'authentication required' } });
        } else if (this.rejectSave) {
          await route.fulfill({ status: 400, json: { errors: ['rejected'] } });
        } else {
          this.saved = req.postDataJSON()?.notes ?? [];
          await route.fulfill({ json: { notes: this.saved } });
        }
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Seed a session so the guarded board route is reachable. @component seeds a
   * fake token (the board backend is stubbed); @e2e registers a real, unique
   * account against the live backend (a new account starts with an empty board).
   */
  private async seedSession(): Promise<void> {
    if (this.stubbed) {
      await this.page.goto('/signin');
      await this.page.evaluate(() => localStorage.setItem('auth_token', 'stub-token'));
      return;
    }
    const username = `board_${this.seq++}_${Math.floor(Math.random() * 1e6)}`;
    const res = await this.request.post(`${API_BASE}/api/auth/register`, {
      data: { username, password: 'correct-horse' },
    });
    const token = (await res.json()).token as string;
    await this.page.goto('/signin');
    await this.page.evaluate((t) => localStorage.setItem('auth_token', t), token);
  }

  // ----- locators -----

  get canvas(): Locator {
    return this.page.getByTestId('canvas');
  }

  get notes(): Locator {
    return this.page.getByTestId('note');
  }

  get error(): Locator {
    return this.page.getByTestId('error');
  }

  get loadBanner(): Locator {
    return this.page.getByTestId('load-error');
  }

  get retryButton(): Locator {
    return this.page.getByTestId('retry-load');
  }

  get emptyState(): Locator {
    return this.page.getByTestId('empty-board');
  }

  noteByText(text: string): Locator {
    return this.page.locator(`[data-testid="note"][data-text="${text}"]`);
  }

  // ----- actions -----

  async createNoteAt(x: number, y: number): Promise<void> {
    await this.canvas.dblclick({ position: { x, y } });
    this.current = this.notes.last();
  }

  /** Create a note, optionally name it, and leave edit mode (a settled note). */
  async createSettledNote(x: number, y: number, text?: string): Promise<void> {
    await this.createNoteAt(x, y);
    if (text !== undefined) {
      await this.typeInCurrent(text);
    }
    await this.exitEdit();
    this.current = text !== undefined ? this.noteByText(text) : this.notes.last();
  }

  async typeInCurrent(text: string): Promise<void> {
    await this.current!.locator('textarea').fill(text);
  }

  async typeMoreInCurrent(text: string): Promise<void> {
    await this.current!.locator('textarea').pressSequentially(text);
  }

  async doubleClickCurrent(): Promise<void> {
    await this.current!.dblclick();
  }

  async deleteCurrent(): Promise<void> {
    await this.current!.getByLabel('Delete note').click();
  }

  async exitEdit(): Promise<void> {
    // Leaving edit mode relies on the note's (blur) -> endEdit signal flushing a
    // (zoneless) change-detection pass that removes the textarea. A single synthetic
    // blur occasionally doesn't settle that pass (a pre-existing race, independent of
    // styling), so re-dispatch blur until the textarea is actually gone.
    const textarea = this.page.locator('textarea');
    await expect(async () => {
      if (await textarea.count()) {
        await textarea.first().dispatchEvent('blur');
      }
      expect(await textarea.count()).toBe(0);
    }).toPass({ timeout: 7000, intervals: [50, 100, 200, 400, 800] });
  }

  async dragLocatorBy(locator: Locator, dx: number, dy: number): Promise<void> {
    const box = await locator.boundingBox();
    if (!box) throw new Error('note has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await locator.dispatchEvent('pointerdown', {
      pointerId: 1, clientX: cx, clientY: cy, buttons: 1, bubbles: true, cancelable: true,
    });
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const px = cx + (dx * i) / steps;
      const py = cy + (dy * i) / steps;
      await locator.dispatchEvent('pointermove', {
        pointerId: 1, clientX: px, clientY: py, buttons: 1, bubbles: true,
      });
    }
    await locator.dispatchEvent('pointerup', { pointerId: 1, bubbles: true });
  }

  async dragCurrentTo(x: number, y: number): Promise<void> {
    const curX = Number(await this.current!.getAttribute('data-x'));
    const curY = Number(await this.current!.getAttribute('data-y'));
    await this.dragLocatorBy(this.current!, x - curX, y - curY);
  }

  async dragNoteByText(text: string, dx: number, dy: number): Promise<void> {
    await this.dragLocatorBy(this.noteByText(text), dx, dy);
  }

  async clickSave(): Promise<void> {
    const put = this.page.waitForResponse(
      (r) => r.url().includes('/api/board') && r.request().method() === 'PUT',
    );
    await this.page.getByTestId('save').click();
    await put;
  }

  /** @component: edit a note by double-clicking it (which raises it to the front).
   * Dispatch the event directly so an overlapping note can't intercept the pointer
   * (mirrors how dragLocatorBy synthesises pointer events). */
  async editNoteByText(text: string): Promise<void> {
    await this.noteByText(text).dispatchEvent('dblclick');
  }

  /** @component: make an unsaved change so the board becomes dirty. */
  async makeChange(): Promise<void> {
    await this.createSettledNote(200, 150, 'Change');
  }

  /** @component: open the board when the load is configured to fail; assert the banner. */
  async openWithFailedLoad(): Promise<void> {
    this.failLoad();
    await this.open();
    await expect(this.loadBanner).toBeVisible();
  }

  /** @component: click Retry and wait for the re-attempted load GET to complete. */
  async clickRetry(): Promise<void> {
    const get = this.page.waitForResponse(
      (r) => r.url().includes('/api/board') && r.request().method() === 'GET',
    );
    await this.retryButton.click();
    await get;
  }

  // ----- toolbar UX (board-toolbar-ux) -----

  /** @component: open clean board (load sets isDirty=false). */
  async openClean(): Promise<void> {
    await this.open();
  }

  /** @component: open board with pre-loaded stub notes (isDirty=false after load). */
  async openWithLoadedNotes(notes: StubNote[]): Promise<void> {
    this.setSavedBoard(notes);
    this.registerDialogCapture();
    await this.installBoardStub();
    await this.seedSession();
    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
  }

  /** @component: open board then create an unsaved note (isDirty=true). */
  async openWithUnsavedChanges(): Promise<void> {
    await this.open();
    await this.createSettledNote(200, 150, 'Dirty note');
  }

  /**
   * @component: install stubs without navigating — call this BEFORE a sign-in
   * redirect lands on the board so the board GET is stubbed before it fires.
   */
  async prestub(): Promise<void> {
    if (!this.stubbed) return;
    this.registerDialogCapture();
    await this.installBoardStub();
  }

  /** @component: click Sign Out to reveal the unsaved-changes dialog. Assumes the board is already open with unsaved changes. */
  async openSignOutDialog(): Promise<void> {
    await this.signOutButton.click();
    await expect(this.unsavedDialog).toBeVisible();
  }

  // ----- toolbar locators -----

  get signOutButton(): import('@playwright/test').Locator {
    return this.page.getByTestId('sign-out');
  }

  get savedToast(): import('@playwright/test').Locator {
    return this.page.getByTestId('saved-toast');
  }

  get unsavedDialog(): import('@playwright/test').Locator {
    return this.page.getByTestId('unsaved-dialog');
  }

  get saveAndSignOutButton(): import('@playwright/test').Locator {
    return this.page.getByTestId('save-and-sign-out');
  }

  get discardAndSignOutButton(): import('@playwright/test').Locator {
    return this.page.getByTestId('discard-and-sign-out');
  }

  get cancelSignOutButton(): import('@playwright/test').Locator {
    return this.page.getByTestId('cancel-sign-out');
  }

  /** Number of PUT /api/board calls intercepted in @component mode. */
  get saveCalls(): number {
    return this._saveCalls;
  }

  private _saveCalls = 0;

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.canvas).toBeVisible();
  }
}

export const test = base.extend<{ board: BoardDriver; auth: AuthDriver }>({
  board: async ({ page, request, $tags }, use) => {
    // @component answers the backend locally; @e2e hits the real backend.
    const stubbed = $tags.includes('@component');
    await use(new BoardDriver(page, request, stubbed));
  },
  auth: async ({ page, request, $tags }, use) => {
    const stubbed = $tags.includes('@component');
    await use(new AuthDriver(page, request, stubbed));
  },
});

export const { Given, When, Then } = createBdd(test);
