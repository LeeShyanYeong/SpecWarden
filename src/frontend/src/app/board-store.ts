import { Injectable, signal } from '@angular/core';
import { BoardApi } from './board-api';
import { Note } from './note';

/** Maximum length of a note's text; input beyond this is rejected. */
export const MAX_NOTE_LENGTH = 500;

/**
 * Holds the board state and the rules over it (create/edit/move/delete/raise,
 * which note is being edited, the 500-char cap, load/save + error). Components
 * render this and call its methods; the logic lives here, not in the components
 * (ARCH-4).
 */
@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly _notes = signal<Note[]>([]);
  readonly notes = this._notes.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  private readonly _editingId = signal<string | null>(null);
  readonly editingId = this._editingId.asReadonly();

  private idSeq = 0;
  private nextZ = 1;

  constructor(private readonly api: BoardApi) {}

  async load(): Promise<void> {
    const notes = await this.api.load();
    this._notes.set(notes);
    this._editingId.set(null);
    this.nextZ = notes.reduce((max, n) => Math.max(max, n.z), 0) + 1;
  }

  async save(): Promise<void> {
    try {
      await this.api.save(this._notes());
      this._error.set(null);
    } catch {
      this._error.set('The board could not be saved.');
    }
  }

  /** Add a new note, opened ready for text entry. */
  create(x: number, y: number): Note {
    const note: Note = { id: `note-${++this.idSeq}`, text: '', x, y, z: this.nextZ++ };
    this._notes.update((notes) => [...notes, note]);
    this._editingId.set(note.id);
    return note;
  }

  edit(id: string, text: string): void {
    const capped = text.slice(0, MAX_NOTE_LENGTH);
    this._notes.update((notes) => notes.map((n) => (n.id === id ? { ...n, text: capped } : n)));
  }

  beginEdit(id: string): void {
    this.raise(id);
    this._editingId.set(id);
  }

  endEdit(): void {
    this._editingId.set(null);
  }

  move(id: string, x: number, y: number): void {
    this._notes.update((notes) => notes.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }

  remove(id: string): void {
    this._notes.update((notes) => notes.filter((n) => n.id !== id));
    if (this._editingId() === id) {
      this._editingId.set(null);
    }
  }

  /** Bring a note above all others (used when it is dragged or edited). */
  raise(id: string): void {
    const z = this.nextZ++;
    this._notes.update((notes) => notes.map((n) => (n.id === id ? { ...n, z } : n)));
  }
}
