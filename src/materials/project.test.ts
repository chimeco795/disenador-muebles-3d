import { beforeEach, expect, it, vi } from 'vitest';
import { useEditor } from '../store';
import { validProject } from '../validation';
import { migrateMaterials, stockSummary } from './project';
import type { Project } from '../model';
beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    useEditor.setState({ project: { version: 1, name: 'Test', pieces: [] }, selected: null, past: [], future: [] });
});
const state = () => useEditor.getState();
it('registers each commercial source immediately and uses independent readable sequences', () => {
    state().add('pino-100');
    state().add('mdf-18');
    state().add('pino-100');
    expect(state().project.pieces.map(p => [p.code, p.sourceMaterialId, p.usage])).toEqual([
        ['A1', 'TABLA-001', 'original'], ['B1', 'HOJA-001', 'original'], ['C1', 'TABLA-002', 'original']
    ]);
    expect(validProject(state().project)).toBe(true);
});
it('accounts for repeated cuts, reuse, archived material, undo/redo and serialized codes', () => {
    state().add('pino-100');
    state().cut(state().selected!, 720);
    let project = state().project;
    const remainder = project.pieces[1];
    state().update(remainder.id, { position: [200, 300, 400], usage: 'used' });
    expect(stockSummary(state().project, project.stocks![0]).used).toBe(3000);
    state().cut(remainder.id, 450);
    project = state().project;
    expect(project.pieces.map(p => p.code)).toEqual(['A2', 'A4', 'A5']);
    expect(project.pieces.every(p => p.sourceMaterialId === 'TABLA-001')).toBe(true);
    expect(stockSummary(project, project.stocks![0])).toMatchObject({ used: 1170, available: 1830, inactive: 0 });
    state().undo();
    state().redo();
    expect(state().project).toEqual(project);
    expect(migrateMaterials(JSON.parse(JSON.stringify(project)))).toEqual(project);
    expect(validProject(project)).toBe(true);
    state().select(project.pieces[2].id);
    state().remove();
    expect(state().project.archivedPieces![0].code).toBe('A5');
    expect(stockSummary(state().project, project.stocks![0])).toMatchObject({ available: 0, inactive: 1830 });
    state().add('pino-100');
    expect(state().project.pieces.at(-1)!.code).toBe('B1');
    expect(validProject(state().project)).toBe(true);
});
it('measures sheet consumption as area and does not count hidden parts twice', () => {
    state().add('mdf-18');
    state().cut(state().selected!, 1000);
    const project = state().project;
    state().update(project.pieces[1].id, { isHidden: true });
    expect(stockSummary(state().project, project.stocks![0])).toMatchObject({ used: 1.22, available: 1.7568, unit: 'm²' });
});
it('migrates Phase 3 ancestry and uncut pieces without changing geometry or bleaching colors', () => {
    state().add('pino-100');
    state().cut(state().selected!, 720);
    state().cut(state().project.pieces[1].id, 450);
    state().add('mdf-18');
    const current = state().project;
    const legacy: Project = JSON.parse(JSON.stringify(current));
    delete legacy.materialsVersion;
    legacy.stocks = legacy.stocks!.filter(s => s.id === 'TABLA-001').map(s => ({ ...s, id: 'old-stock' }));
    for (const piece of [...legacy.pieces, ...legacy.cuts!.map(c => c.parent)]) {
        piece.sourceMaterialId = piece.catalogMaterialId!;
        piece.stockId = piece.stockId === 'TABLA-001' ? 'old-stock' : undefined;
        delete piece.code;
        delete piece.catalogMaterialId;
        delete piece.usage;
    }
    legacy.cuts!.forEach(c => c.stockId = 'old-stock');
    expect(validProject(legacy)).toBe(true);
    const migrated = migrateMaterials(legacy);
    expect(validProject(migrated)).toBe(true);
    expect(migrated.pieces.map(p => [p.id, p.position, p.rotation, p.color])).toEqual(current.pieces.map(p => [p.id, p.position, p.rotation, p.color]));
    expect(stockSummary(migrated, migrated.stocks![0])).toMatchObject({ used: 1170, available: 1830 });
    expect(migrateMaterials(migrated)).toBe(migrated);
});
it('rejects duplicate codes and broken source references in persisted Phase 4 data', () => {
    state().add('pino-100');
    state().cut(state().selected!, 720);
    const project = state().project;
    expect(validProject({ ...project, pieces: project.pieces.map(p => ({ ...p, code: 'A2' })) })).toBe(false);
    expect(validProject({ ...project, pieces: project.pieces.map(p => ({ ...p, sourceMaterialId: 'missing' })) })).toBe(false);
});
