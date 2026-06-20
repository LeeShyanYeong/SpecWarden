import { Component, inject, input } from '@angular/core';
import { BoardStore, MAX_NOTE_LENGTH } from './board-store';
import { Note } from './note';

/**
 * One sticky note on the board. Renders at its absolute position, edits on
 * double-click, drags with the pointer, and deletes via its × button. All state
 * changes go through BoardStore — this component only translates DOM events.
 *
 * Drag uses setPointerCapture so all pointermove/pointerup events are routed to
 * this element without needing document-level listeners.
 */
@Component({
  selector: 'app-sticky-note',
  imports: [],
  templateUrl: './sticky-note.html',
  styleUrl: './sticky-note.css',
  host: {
    class: 'sticky-note',
    '[style.left.px]': 'note().x',
    '[style.top.px]': 'note().y',
    '[style.zIndex]': 'note().z',
    '[attr.data-testid]': '"note"',
    '[attr.data-text]': 'note().text',
    '[attr.data-x]': 'note().x',
    '[attr.data-y]': 'note().y',
    '[attr.data-z]': 'note().z',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp()',
    '(pointercancel)': 'onPointerUp()',
    '(dblclick)': 'startEdit($event)',
  },
})
export class StickyNote {
  readonly note = input.required<Note>();
  protected readonly maxLength = MAX_NOTE_LENGTH;

  private readonly store = inject(BoardStore);

  protected editing(): boolean {
    return this.store.editingId() === this.note().id;
  }

  protected startEdit(event: Event): void {
    event.stopPropagation();
    this.store.beginEdit(this.note().id);
  }

  protected stopEdit(): void {
    this.store.endEdit();
  }

  protected onInput(value: string): void {
    this.store.edit(this.note().id, value);
  }

  protected remove(event: Event): void {
    event.stopPropagation();
    this.store.remove(this.note().id);
  }

  // --- drag: pointer capture keeps all pointermove/up on this element ---
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;

  protected onPointerDown(event: PointerEvent): void {
    if (this.editing()) {
      return;
    }
    this.dragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.originX = this.note().x;
    this.originY = this.note().y;
    this.store.raise(this.note().id);
    (event.target as Element).setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.store.move(
      this.note().id,
      this.originX + (event.clientX - this.startX),
      this.originY + (event.clientY - this.startY),
    );
  }

  protected onPointerUp(): void {
    this.dragging = false;
  }
}
