import { beforeEach, expect, it, vi } from 'vitest';
import { useEditor } from '../store';
import { useCut } from '../cutting/store';
import { materialPlan, manufacturingSummary } from './plan';
import { stockSummary } from '../materials/project';
import { validProject } from '../validation';
import { Vector3, Euler, Quaternion, MathUtils } from 'three';
import type { Vec3 } from '../model';
const state = () => useEditor.getState();
beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    useCut.getState().cancel();
    useEditor.setState({ project: { version: 1, name: 'Test', pieces: [] }, selected: null, past: [], future: [] });
});
it('reconstructs horizontal, vertical and repeated cuts with exact source-local areas and kerf', () => {
    state().add('mdf-18'); state().setKerf(3);
    state().cut(state().selected!, 500, 'width');
    const horizontal = state().project;
    expect(horizontal.pieces.map(p => [p.length, p.width])).toEqual([[2440, 500], [2440, 717]]);
    expect(horizontal.pieces.map(p => p.position[2])).toEqual([-360, 251.5]);
    state().cut(horizontal.pieces[0].id, 800, 'length');
    const parent = state().project.pieces[1];
    state().update(parent.id, { position: [100, 800, 400], rotation: [30, 45, 90] });
    state().cut(parent.id, 200, 'width');
    const project = state().project, stock = project.stocks![0], plan = materialPlan(project, stock);
    expect(plan.parts.map(p => [p.code, p.x, p.y, p.length, p.width])).toEqual([
        ['A4', 0, 0, 800, 500], ['A6', 803, 0, 1637, 200], ['A7', 803, 203, 1637, 297], ['A3', 0, 503, 2440, 717],
    ]);
    const area = plan.parts.reduce((n, p) => n + p.length * p.width, 0);
    const loss = plan.cuts.reduce((n, c) => n + c.length * c.width, 0);
    expect(area + loss).toBe(2440 * 1220);
    expect(stockSummary(project, stock).kerf).toBeCloseTo(loss / 1e6);
    expect(stockSummary(project, stock).inactive).toBeCloseTo(0);
    expect(new Set(project.pieces.map(p => p.sourceMaterialId))).toEqual(new Set(['HOJA-001']));
    expect(validProject(JSON.parse(JSON.stringify(project)))).toBe(true);
    expect(materialPlan(JSON.parse(JSON.stringify(project)), stock)).toEqual(plan);
    state().undo(); state().redo(); expect(state().project).toEqual(project);
});
it('width cuts preserve rotated world-space endpoints and a physical kerf gap', () => {
    state().add('triplay-15'); state().setKerf(2.5);
    const original = state().project.pieces[0];
    state().update(original.id, { rotation: [30, 45, 90], position: [200, 600, 400] });
    const parent = state().project.pieces[0];
    state().cut(parent.id, 400.25, 'width');
    const [a, b] = state().project.pieces;
    const axis = new Vector3(0, 0, 1).applyQuaternion(new Quaternion().setFromEuler(new Euler(...parent.rotation.map(MathUtils.degToRad) as Vec3)));
    const endA = new Vector3(...a.position).addScaledVector(axis, a.width / 2);
    const startB = new Vector3(...b.position).addScaledVector(axis, -b.width / 2);
    expect(endA.distanceTo(startB)).toBeCloseTo(2.5, 8);
    expect(a.width + b.width + 2.5).toBe(parent.width);
});
it('kerf is prospective, undoable, validated and does not change recorded cuts', () => {
    state().add('pino-100'); state().cut(state().selected!, 720);
    const before = state().project;
    state().setKerf(3); expect(state().project.cuts).toEqual(before.cuts);
    state().cut(state().project.pieces[1].id, 450);
    expect(state().project.pieces.map(p => p.length)).toEqual([720, 450, 1827]);
    expect(stockSummary(state().project, state().project.stocks![0])).toMatchObject({ used: 1170, available: 1827, kerf: 3, inactive: 0 });
    const after = state().project;
    for (const n of [-1, NaN, Infinity]) state().setKerf(n);
    expect(state().project).toBe(after);
    state().undo(); state().undo(); expect(state().project).toEqual(before);
    expect(validProject({ ...before, sawKerf: -3 })).toBe(false);
});
it('cut preview uses selected axis, allows width cuts for boards and rejects oversized kerf', () => {
    state().add('mdf-18'); state().setKerf(3); useCut.getState().begin(); useCut.getState().setAxis('width');
    useCut.getState().setOffset(1219, false, true); expect(useCut.getState().offset).toBe(1216);
    useCut.getState().confirm(); expect(state().project.pieces.map(p => p.width)).toEqual([1216, 1]);
    state().add('pino-100'); useCut.getState().begin(); useCut.getState().setAxis('width');
    expect(useCut.getState().axis).toBe('width'); useCut.getState().cancel();
    state().setKerf(3000); useCut.getState().begin(); expect(useCut.getState().pieceId).toBeNull();
});
it('keeps archived segments and counts independent sources without treating hidden parts as waste', () => {
    state().add('pino-100'); state().cut(state().selected!, 720);
    const p = state().project.pieces[0]; state().update(p.id, { isHidden: true });
    expect(manufacturingSummary(state().project)).toMatchObject({ boards: 1, offcuts: 1, usedPieces: 1 });
    state().select(p.id); state().remove(); state().add('mdf-18');
    const project = state().project;
    expect(materialPlan(project, project.stocks![0]).parts[0]).toMatchObject({ code: 'A2', status: 'archived', length: 720 });
    expect(materialPlan(project, project.stocks![1]).parts).toHaveLength(1);
    expect(manufacturingSummary(project)).toMatchObject({ stocks: 2, boards: 0, sheets: 0, offcuts: 1 });
});
