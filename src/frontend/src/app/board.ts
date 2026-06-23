import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { BoardStore } from './board-store';
import { StickyNote } from './sticky-note';

/**
 * The freeform board: loads the saved board on open, creates a note where the
 * empty canvas is double-clicked, and saves on demand. Rendering and rules live
 * in StickyNote / BoardStore; this component wires the canvas + toolbar.
 */
@Component({
  selector: 'app-board',
  imports: [StickyNote],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class Board implements OnInit {
  protected readonly store = inject(BoardStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showSignOutDialog = signal(false);

  ngOnInit(): void {
    void this.store.load();
  }

  protected onCanvasDblClick(event: MouseEvent): void {
    // Only the empty canvas creates a note; a note's own dblclick edits it.
    if (event.target !== event.currentTarget) {
      return;
    }
    this.store.create(event.offsetX, event.offsetY);
  }

  protected save(): void {
    void this.store.save();
  }

  protected retry(): void {
    void this.store.load();
  }

  protected signOut(): void {
    if (this.store.isDirty()) {
      this.showSignOutDialog.set(true);
    } else {
      void this.doSignOut();
    }
  }

  protected async saveAndSignOut(): Promise<void> {
    await this.store.save();
    await this.doSignOut();
  }

  protected discardAndSignOut(): void {
    this.store.clearDirty(); // bypass CanDeactivate — discard is intentional
    void this.doSignOut();
  }

  protected cancelSignOut(): void {
    this.showSignOutDialog.set(false);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.store.isDirty()) {
      event.preventDefault();
    }
  }

  private async doSignOut(): Promise<void> {
    this.showSignOutDialog.set(false);
    await this.auth.logout();
    await this.router.navigate(['/signin']);
  }
}
