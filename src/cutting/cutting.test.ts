import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { useEditor, validProject } from '../store';
import { splitPiece } from './split';
import { useCut } from './store';
import { cutOffset } from './config';
import type { Project, Vec3 } from '../model';
beforeEach(() => { vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() }); useCut.getState().cancel(); useEditor.setState({ project: { version: 1, name: 'Test', pieces: [] }, selected: null, past: [], future: [], mode: 'translate' }); });
function board() { useEditor.getState().add('pino-100'); return useEditor.getState().project; }
describe('linear cuts and source trace', () => {
    it('splits 3000 into 720 + 2280 without losing material or moving the occupied volume', () => {
        const project = board(), original = project.pieces[0], result = splitPiece(project, original.id, 720)!;
        expect(project.pieces).toHaveLength(1);
        expect(result.pieces.map(p => p.length)).toEqual([720, 2280]);
        expect(result.pieces.map(p => p.position)).toEqual([[-1140, 9, 0], [360, 9, 0]]);
        expect(result.pieces.every(p => p.isCut && !p.isHidden && !p.isLocked && p.color !== original.color)).toBe(true);
        expect(new Set(result.pieces.map(p => p.id)).size).toBe(2);
        expect(result.pieces[0].stockId).toBe(result.pieces[1].stockId);
        expect(result.stocks![0]).toMatchObject({ length: 3000, rootPieceId: original.id, color: original.color });
        expect(result.cuts![0].parent).toEqual(original);
        expect(validProject(result)).toBe(true);
    });
    it('keeps positions correct for compound rotations and prepared kerf', () => {
        const project = board(), p = project.pieces[0];
        p.position = [300, 800, -420];
        p.rotation = [15, 45, 90];
        const result = splitPiece(project, p.id, 720, 'length', 3)!;
        const q = new Quaternion().setFromEuler(new Euler(...p.rotation.map(MathUtils.degToRad) as Vec3));
        const axis = new Vector3(1, 0, 0).applyQuaternion(q);
        const [a, b] = result.pieces;
        expect(a.length + b.length + 3).toBe(3000);
        expect(a.rotation).toEqual(p.rotation);
        const endA = new Vector3(...a.position).addScaledVector(axis, a.length / 2), startB = new Vector3(...b.position).addScaledVector(axis, -b.length / 2);
        expect(endA.distanceTo(startB)).toBeCloseTo(3, 7);
        expect(new Vector3(...a.position).addScaledVector(axis, -a.length / 2).distanceTo(new Vector3(...p.position).addScaledVector(axis, -1500))).toBeCloseTo(0, 7);
    });
    it('retains all ancestors after repeated cutting, without progressively bleaching color', () => {
        const project = board(), first = splitPiece(project, project.pieces[0].id, 720)!;
        const b = first.pieces[1];
        const second = splitPiece(first, b.id, 450)!;
        expect(second.pieces.map(p => p.length)).toEqual([720, 450, 1830]);
        expect(second.stocks).toHaveLength(1);
        expect(second.cuts).toHaveLength(2);
        expect(second.cuts![1].parent.parentPieceId).toBe(project.pieces[0].id);
        expect(new Set(second.pieces.map(p => p.color)).size).toBe(1);
        expect(validProject(JSON.parse(JSON.stringify(second)))).toBe(true);
    });
    it('rejects zero, ends, invalid numbers, locked and hidden pieces', () => {
        const project = board(), p = project.pieces[0];
        for (const n of [0, -1, 3000, NaN, Infinity])
            expect(splitPiece(project, p.id, n)).toBeNull();
        expect(splitPiece({ ...project, pieces: [{ ...p, isLocked: true }] }, p.id, 720)).toBeNull();
        expect(splitPiece({ ...project, pieces: [{ ...p, isHidden: true }] }, p.id, 720)).toBeNull();
        expect(splitPiece(project, p.id, 1)).not.toBeNull();
    });
    it('undo/redo restore original objects and complete lineage in one command', () => {
        const project = board(), s = useEditor.getState();
        s.cut(project.pieces[0].id, 720);
        const cut = useEditor.getState().project;
        expect(useEditor.getState().past).toHaveLength(2);
        s.undo();
        expect(useEditor.getState().project).toEqual(project);
        s.redo();
        expect(useEditor.getState().project).toEqual(cut);
    });
    it('preview, fine steps and cancellation never mutate the project', () => {
        const project = board();
        useCut.getState().begin();
        useCut.getState().setOffset(499, true);
        expect(useCut.getState().offset).toBe(500);
        useCut.getState().setOffset(499, false);
        expect(useCut.getState().offset).toBe(499);
        useCut.getState().cancel();
        expect(useEditor.getState().project).toBe(project);
        expect(cutOffset(3000, 3000)).toBe(2999);
    });
    it('accepts legacy projects, rejects corrupted lineage, and duplicates get independent stock', () => {
        const project = board();
        expect(validProject(project)).toBe(true);
        useEditor.getState().cut(project.pieces[0].id, 720);
        useEditor.getState().duplicate();
        let state = useEditor.getState();
        const copy = state.project.pieces.at(-1)!;
        expect(copy.stockId).toBe('TABLA-002');
        expect(copy.sourceMaterialId).not.toBe(state.project.pieces[0].sourceMaterialId);
        state.cut(copy.id, 300);
        state = useEditor.getState();
        expect(state.project.stocks).toHaveLength(2);
        expect(validProject(state.project)).toBe(true);
        expect(validProject({ ...state.project, cuts: [null] })).toBe(false);
        expect(validProject({ ...state.project, stocks: [] })).toBe(false);
    });
});
