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
  readonly dialogs: string[] = [];

  private saved: StubNote[] = [];
  private rejectSave = false;
  private rejectUnauthenticated = false;
  private seq = 0;

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
      this.dialogs.push(d.message());
      void d.dismiss();
    });
  }

  private async installBoardStub(): Promise<void> {
    await this.page.route('**/api/board', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({ json: { notes: this.saved } });
      } else if (req.method() === 'PUT') {
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
    // focus() then blur() ensures the blur event fires even if the textarea was
    // never natively focused (Angular doesn't auto-focus newly created textareas).
    await this.page.evaluate(() => {
      const ta = document.querySelector('textarea') as HTMLTextAreaElement | null;
      if (ta) { ta.focus(); ta.blur(); }
    });
    await expect(this.page.locator('textarea')).toHaveCount(0);
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
