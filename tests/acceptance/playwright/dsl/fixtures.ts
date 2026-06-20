import { test as base, createBdd } from 'playwright-bdd';
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

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

  async open(): Promise<void> {
    this.page.on('dialog', (d) => {
      this.dialogs.push(d.message());
      void d.dismiss();
    });

    if (this.stubbed) {
      await this.page.route('**/api/board', async (route) => {
        const req = route.request();
        if (req.method() === 'GET') {
          await route.fulfill({ json: { notes: this.saved } });
        } else if (req.method() === 'PUT') {
          if (this.rejectSave) {
            await route.fulfill({ status: 400, json: { errors: ['rejected'] } });
          } else {
            this.saved = req.postDataJSON()?.notes ?? [];
            await route.fulfill({ json: { notes: this.saved } });
          }
        } else {
          await route.continue();
        }
      });
    } else {
      // @e2e: start from a known empty board on the real backend.
      await this.request.put(`${API_BASE}/api/board`, { data: { notes: [] } });
    }

    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
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

export const test = base.extend<{ board: BoardDriver }>({
  board: async ({ page, request, $tags }, use) => {
    // @component answers the backend locally; @e2e hits the real backend.
    const stubbed = $tags.includes('@component');
    await use(new BoardDriver(page, request, stubbed));
  },
});

export const { Given, When, Then } = createBdd(test);
