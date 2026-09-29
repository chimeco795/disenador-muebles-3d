import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditor, validProject } from './store';
import { catalog, toScene } from './model';
beforeEach(() => { vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() }); useEditor.setState({ project: { version: 1, name: 'Test', pieces: [] }, selected: null, past: [], future: [], storageError: false }); });
describe('real-unit project and history', () => {
    it('keeps correct dimensions, places the bottom on the plane and isolates duplicate transforms', () => { useEditor.getState().add(catalog[0].id); const a = useEditor.getState().project.pieces[0]; toScene([a.length, a.height, a.width]).forEach((n, i) => expect(n).toBeCloseTo([3, .018, .1][i], 8)); expect(a.position[1]).toBe(9); useEditor.getState().duplicate(); const b = useEditor.getState().project.pieces[1]; expect(b.id).not.toBe(a.id); useEditor.getState().update(b.id, { position: [100, 720, 200] }); expect(useEditor.getState().project.pieces[0].position).toEqual([0, 9, 0]); });
    it('undoes and redoes transforms, lock, visibility and delete', () => { const s = useEditor.getState(); s.add(catalog[0].id); const id = useEditor.getState().selected!; for (const patch of [{ position: [0, 720, 0] as [
                number,
                number,
                number
            ] }, { rotation: [0, 0, 90] as [
                number,
                number,
                number
            ] }, { isLocked: true }, { isHidden: true }])
        s.update(id, patch); s.remove(); expect(useEditor.getState().project.pieces).toHaveLength(0); for (let i = 0; i < 6; i++)
        s.undo(); expect(useEditor.getState().project.pieces).toHaveLength(0); for (let i = 0; i < 5; i++)
        s.redo(); expect(useEditor.getState().project.pieces[0]).toMatchObject({ position: [0, 720, 0], rotation: [0, 0, 90], isLocked: true, isHidden: true }); });
    it('prevents locked transforms and clears the redo branch on a new edit', () => { const s = useEditor.getState(); s.add(catalog[0].id); const id = useEditor.getState().selected!; s.update(id, { isLocked: true }); const n = useEditor.getState().past.length; s.update(id, { position: [5, 5, 5] }); expect(useEditor.getState().past).toHaveLength(n); s.undo(); s.update(id, { name: 'Renamed' }); expect(useEditor.getState().future).toHaveLength(0); });
    it('validates storage and reports quota failures without losing in-memory edits', () => { expect(validProject({ version: 1, name: 'bad', pieces: [null] })).toBe(false); expect(validProject({ version: 1, name: 'bad', pieces: [{ id: 'x' }] })).toBe(false); vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota'); } }); useEditor.getState().add(catalog[0].id); expect(useEditor.getState().project.pieces).toHaveLength(1); expect(useEditor.getState().storageError).toBe(true); });
    it('caps history at 100 operations and ignores no-op updates', () => { useEditor.getState().add(catalog[0].id); const id = useEditor.getState().selected!; for (let i = 0; i < 120; i++)
        useEditor.getState().update(id, { name: `P${i}` }); expect(useEditor.getState().past).toHaveLength(100); useEditor.getState().update(id, { name: 'P119' }); expect(useEditor.getState().past).toHaveLength(100); });
});
