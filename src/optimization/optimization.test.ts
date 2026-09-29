import { beforeEach, expect, it, vi } from 'vitest';
import { optimizeBoards } from './boards';
import { optimizeSheets } from './sheets';
import { optimizationTotals, optimizeProject } from './optimize';
import { optimizerInput, planIsStale } from './supplies';
import { validOptimizedPlan } from './validation';
import { useEditor, validProject } from '../store';
import type { Demand, Packing, Supply } from './types';
const supply = (length: number, width = 100, sheet = false): Supply => ({ id: 'pino-100', catalogMaterialId: 'pino-100', materialType: 'Pino', length, width, height: 18, kind: 'new', sheet });
const part = (id: string, length: number, width = 100): Demand => ({ id, code: id, catalogMaterialId: 'pino-100', materialType: 'Pino', sourceMaterialId: 'TABLA-001', length, width, height: 18, rotationAllowed: true });
const offcut = (id: string, length: number, width = 100, sheet = false): Supply => ({ ...supply(length, width, sheet), id, kind: 'offcut', sourceCode: id, sourcePieceId: id, sourceMaterialId: 'TABLA-002' });
function validGeometry(plan: Packing, required: Demand[]) {
    expect(new Set([...plan.stocks.flatMap(s => s.placements.map(p => p.piece.id)), ...plan.unplaced.map(p => p.id)]).size).toBe(required.length);
    for (const stock of plan.stocks) {
        const rectangles = [...stock.placements, ...stock.remaining, ...stock.cuts];
        expect(rectangles.reduce((sum, r) => sum + r.length * r.width, 0)).toBeCloseTo(stock.supply.length * stock.supply.width, 5);
        for (const r of rectangles) {
            expect(r.x).toBeGreaterThanOrEqual(0); expect(r.y).toBeGreaterThanOrEqual(0);
            expect(r.x + r.length).toBeLessThanOrEqual(stock.supply.length + 1e-6);
            expect(r.y + r.width).toBeLessThanOrEqual(stock.supply.width + 1e-6);
        }
        for (let i = 0; i < rectangles.length; i++) for (let j = i + 1; j < rectangles.length; j++) {
            const a = rectangles[i], b = rectangles[j];
            const overlapX = Math.min(a.x + a.length, b.x + b.length) - Math.max(a.x, b.x);
            const overlapY = Math.min(a.y + a.width, b.y + b.width) - Math.max(a.y, b.y);
            expect(overlapX <= 1e-6 || overlapY <= 1e-6).toBe(true);
        }
    }
}
it('packs boards decreasing by best fit and reserves kerf even before a remaining offcut', () => {
    const required = [720, 720, 450, 800, 250].map((n, i) => part(`A${i + 1}`, n));
    const plan = optimizeBoards(required, supply(3000), [], 3);
    expect(plan.stocks).toHaveLength(1); expect(plan.unplaced).toHaveLength(0);
    expect(plan.stocks[0].placements.map(p => p.length)).toEqual([800, 720, 720, 450, 250]);
    expect(plan.stocks[0].remaining[0].length).toBe(45);
    expect(plan.stocks[0].cuts).toHaveLength(5);
    validGeometry(plan, required);
});
it('exact edge fit needs no final cut; 500 + 500 requires 1003 with a 3 mm saw', () => {
    const parts = [part('A1', 500), part('A2', 500)];
    const exact = optimizeBoards(parts, supply(1003), [], 3);
    expect(exact.stocks).toHaveLength(1); expect(exact.stocks[0].cuts).toHaveLength(1);
    expect(exact.stocks[0].remaining).toHaveLength(0); validGeometry(exact, parts);
    expect(optimizeBoards(parts, supply(1000), [], 3).stocks).toHaveLength(2);
    expect(optimizeBoards([part('A1', 1000)], supply(1001), [], 3).unplaced).toHaveLength(1);
});
it('reuses an offcut once, but rejects reuse when it would only open more material', () => {
    const one = optimizeBoards([part('A1', 700)], supply(3000), [offcut('R1', 1000)], 3);
    expect(one.stocks[0].supply.kind).toBe('offcut');
    const two = optimizeBoards([part('A1', 700), part('A2', 700)], supply(3000), [offcut('R1', 1000)], 3);
    expect(two.stocks).toHaveLength(1); expect(two.stocks[0].supply.kind).toBe('new');
});
it('packs rectangular sheets with rotation, honoring a per-piece rotation restriction', () => {
    const required = [part('A1', 60, 100)], sheet = supply(100, 60, true);
    expect(optimizeSheets(required, sheet, [], 3, false).unplaced).toHaveLength(1);
    const rotated = optimizeSheets(required, sheet, [], 3, true);
    expect(rotated.stocks[0].placements[0]).toMatchObject({ rotated: true, length: 100, width: 60 });
    expect(rotated.stocks[0].cuts).toHaveLength(0); validGeometry(rotated, required);
    expect(optimizeSheets([{ ...required[0], rotationAllowed: false }], sheet, [], 3, true).unplaced).toHaveLength(1);
});
it('separates incompatible thickness/material/cross-sections and reports impossible pieces', () => {
    expect(optimizeBoards([part('A1', 700, 110)], supply(3000), [], 3).unplaced).toHaveLength(1);
    expect(optimizeSheets([{ ...part('A1', 100, 100), height: 15 }], supply(1000, 1000, true), [], 3, true).unplaced).toHaveLength(1);
    expect(optimizeBoards([{ ...part('A1', 700), materialType: 'MDF' }], supply(3000), [], 3).unplaced).toHaveLength(1);
});
it('conserves material without overlap through multiple guillotine cuts, rotations and offcuts', () => {
    let seed = 42;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    for (let run = 0; run < 16; run++) {
        const required = Array.from({ length: 18 }, (_, i) => part(`A${i}`, 40 + Math.floor(random() * 700), 40 + Math.floor(random() * 600)));
        const sheet = supply(1000, 700, true), offcuts = [offcut('R1', 300, 500, true), offcut('R2', 500, 600, true)];
        const plan = optimizeSheets(required, sheet, offcuts, run % 2 ? 3 : .7, true);
        validGeometry(plan, required);
        expect(plan).toEqual(optimizeSheets([...required].reverse(), sheet, offcuts, run % 2 ? 3 : .7, true));
        expect(new Set(plan.stocks.filter(s => s.supply.kind === 'offcut').map(s => s.supply.id)).size).toBe(plan.stocks.filter(s => s.supply.kind === 'offcut').length);
    }
});
beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    useEditor.setState({ project: { version: 1, name: 'Test', pieces: [] }, selected: null, past: [], future: [] });
});
const state = () => useEditor.getState();
it('runs explicitly without changing design/cuts/stock and persists a validated proposal with undo/redo', () => {
    state().add('pino-100'); state().cut(state().selected!, 720);
    state().add('mdf-18'); state().cut(state().selected!, 800); state().cut(state().selected!, 500, 'width');
    state().setKerf(3);
    const original = state().project;
    state().optimize(); const result = state().project;
    expect(result.pieces).toBe(original.pieces); expect(result.cuts).toBe(original.cuts); expect(result.stocks).toBe(original.stocks);
    expect(validOptimizedPlan(result.optimizedPlan)).toBe(true); expect(validProject(result)).toBe(true);
    const restored = JSON.parse(JSON.stringify(result));
    expect(planIsStale(restored)).toBe(false); expect(validProject(restored)).toBe(true);
    expect(optimizeProject(restored)).toEqual(result.optimizedPlan);
    const total = optimizationTotals(result.optimizedPlan!);
    expect(total.usedPercent + total.remainingPercent + total.lossPercent).toBeCloseTo(100);
    state().undo(); expect(state().project).toEqual(original); state().redo(); expect(state().project).toEqual(result);
});
it('marks changes to dimensions, kerf, material and settings stale, while ignoring scene poses', () => {
    state().add('pino-100'); state().cut(state().selected!, 720); state().optimize();
    const id = state().project.pieces[0].id;
    state().update(id, { position: [400, 500, 200], rotation: [30, 45, 90] }); expect(planIsStale(state().project)).toBe(false);
    state().update(id, { length: 600 }); expect(planIsStale(state().project)).toBe(true);
    state().optimize(); expect(planIsStale(state().project)).toBe(false);
    state().setKerf(3); expect(planIsStale(state().project)).toBe(true); state().undo(); expect(planIsStale(state().project)).toBe(false);
    state().setOptimizerSettings({ allowRotation: false }); expect(planIsStale(state().project)).toBe(true);
    state().optimize(); state().update(id, { materialType: 'Otro' }); expect(planIsStale(state().project)).toBe(true);
});
it('has deterministic inputs independent of collection order and preserves zero-demand/partial plans', () => {
    expect(optimizeProject(state().project).requiredCount).toBe(0);
    expect(validOptimizedPlan(optimizeProject(state().project))).toBe(true);
    state().add('pino-100'); state().cut(state().selected!, 720); state().add('pino-100'); state().cut(state().selected!, 450);
    const p = state().project;
    expect(optimizerInput({ ...p, pieces: [...p.pieces].reverse(), stocks: [...p.stocks!].reverse() }).signature).toBe(optimizerInput(p).signature);
    state().update(p.pieces[0].id, { length: 4000 }); state().optimize();
    expect(state().project.optimizedPlan!.issues).toHaveLength(1);
    expect(validProject(state().project)).toBe(true);
    expect(validOptimizedPlan({ ...state().project.optimizedPlan, stocks: [null] })).toBe(false);
});
