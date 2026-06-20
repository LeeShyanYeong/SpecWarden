/** A single sticky note: its text and where it sits on the freeform board. */
export interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
}
