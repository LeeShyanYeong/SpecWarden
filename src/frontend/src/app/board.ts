import { Component, OnInit, inject } from '@angular/core';
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
}
