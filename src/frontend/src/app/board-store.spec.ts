import { BoardStore, MAX_NOTE_LENGTH } from './board-store';
import { BoardApi } from './board-api';
import { Note } from './note';

function makeStore(api: Partial<BoardApi> = {}): BoardStore {
  const fake = { load: async () => [], save: async () => {}, ...api } as BoardApi;
  return new BoardStore(fake);
}

describe('BoardStore', () => {
  it('creates an empty note at the given position', () => {
    const store = makeStore();
    const note = store.create(120, 80);
    expect(note.text).toBe('');
    expect([note.x, note.y]).toEqual([120, 80]);
    expect(store.notes()).toHaveLength(1);
  });

  it('caps note text at 500 characters', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store.edit(note.id, 'a'.repeat(600));
    expect(store.notes()[0].text).toHaveLength(MAX_NOTE_LENGTH);
  });

  it('keeps a note that is left empty', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store.edit(note.id, '');
    expect(store.notes()).toHaveLength(1);
    expect(store.notes()[0].text).toBe('');
  });

  it('moves a note to a new position', () => {
    const store = makeStore();
    const note = store.create(100, 100);
    store.move(note.id, 400, 250);
    expect([store.notes()[0].x, store.notes()[0].y]).toEqual([400, 250]);
  });

  it('removes a note immediately', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store.remove(note.id);
    expect(store.notes()).toHaveLength(0);
  });

  it('opens a newly created note ready for editing', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    expect(store.editingId()).toBe(note.id);
  });

  it('begins and ends editing a note', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store.endEdit();
    expect(store.editingId()).toBeNull();
    store.beginEdit(note.id);
    expect(store.editingId()).toBe(note.id);
  });

  it('raises a note above overlapping notes', () => {
    const store = makeStore();
    const a = store.create(0, 0);
    store.create(0, 0); // created after A, so initially on top
    store.raise(a.id);
    const za = store.notes().find((n) => n.id === a.id)!.z;
    const others = store.notes().filter((n) => n.id !== a.id).map((n) => n.z);
    expect(za).toBeGreaterThan(Math.max(...others));
  });

  it('loads notes from the api', async () => {
    const saved: Note[] = [{ id: '1', text: 'Milk', x: 0, y: 0, z: 1 }];
    const store = makeStore({ load: async () => saved });
    await store.load();
    expect(store.notes().map((n) => n.text)).toEqual(['Milk']);
  });

  it('clears any error after a successful save', async () => {
    const store = makeStore({ save: async () => {} });
    store.create(0, 0);
    await store.save();
    expect(store.error()).toBeNull();
  });

  it('reports an error when the save fails', async () => {
    const store = makeStore({
      save: async () => {
        throw new Error('boom');
      },
    });
    store.create(0, 0);
    await store.save();
    expect(store.error()).not.toBeNull();
  });

  // ----- isDirty -----

  it('isDirty starts false', () => {
    const store = makeStore();
    expect(store.isDirty()).toBe(false);
  });

  it('isDirty becomes true after create()', () => {
    const store = makeStore();
    store.create(0, 0);
    expect(store.isDirty()).toBe(true);
  });

  it('isDirty becomes true after edit()', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store['_isDirty'].set(false); // reset post-create
    store.edit(note.id, 'hello');
    expect(store.isDirty()).toBe(true);
  });

  it('isDirty becomes true after move()', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store['_isDirty'].set(false);
    store.move(note.id, 10, 20);
    expect(store.isDirty()).toBe(true);
  });

  it('isDirty becomes true after remove()', () => {
    const store = makeStore();
    const note = store.create(0, 0);
    store['_isDirty'].set(false);
    store.remove(note.id);
    expect(store.isDirty()).toBe(true);
  });

  it('isDirty becomes false after a successful save()', async () => {
    const store = makeStore({ save: async () => {} });
    store.create(0, 0);
    expect(store.isDirty()).toBe(true);
    await store.save();
    expect(store.isDirty()).toBe(false);
  });

  it('isDirty stays true after a failed save()', async () => {
    const store = makeStore({ save: async () => { throw new Error('boom'); } });
    store.create(0, 0);
    await store.save();
    expect(store.isDirty()).toBe(true);
  });

  it('isDirty becomes false after load()', async () => {
    const store = makeStore();
    store.create(0, 0);
    expect(store.isDirty()).toBe(true);
    await store.load();
    expect(store.isDirty()).toBe(false);
  });

  // ----- savedToast -----

  it('savedToast starts false', () => {
    const store = makeStore();
    expect(store.savedToast()).toBe(false);
  });

  it('savedToast becomes true immediately after a successful save()', async () => {
    const store = makeStore({ save: async () => {} });
    store.create(0, 0);
    await store.save();
    expect(store.savedToast()).toBe(true);
  });

  it('savedToast stays false after a failed save()', async () => {
    const store = makeStore({ save: async () => { throw new Error('boom'); } });
    store.create(0, 0);
    await store.save();
    expect(store.savedToast()).toBe(false);
  });
});
