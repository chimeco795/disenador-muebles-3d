import { projectCatalog } from '../materials/catalog';
import { catalog, type Project } from '../model';
import type { Demand, OptimizerSettings, Supply } from './types';
export const DEFAULT_OPTIMIZER: OptimizerSettings = { allowRotation: true, reuseOffcuts: true };
export const settingsFor = (project: Project): OptimizerSettings => ({ ...DEFAULT_OPTIMIZER, ...project.optimizerSettings });
export const compareId = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
export function optimizerInput(project: Project) {
    const settings = settingsFor(project);
    const required: Demand[] = project.pieces.filter(p => p.usage === 'used').map(p => ({
        id: p.id, code: p.code ?? p.id, length: p.length, width: p.width, height: p.height,
        catalogMaterialId: p.catalogMaterialId ?? project.stocks?.find(s => s.id === p.sourceMaterialId)?.catalogMaterialId ?? '',
        materialType: p.materialType, sourceMaterialId: p.sourceMaterialId, rotationAllowed: p.cutRotationAllowed !== false,
    })).sort(compareId);
    const commercial: Supply[] = projectCatalog(project).map(m => ({ id: m.id, catalogMaterialId: m.id, materialType: m.materialType,
        length: m.length, width: m.width, height: m.height, sheet: m.family === 'Tableros', kind: 'new' }));
    const offcuts: Supply[] = project.pieces.filter(p => p.usage === 'available' && !p.operations?.length).flatMap(p => {
        const stock = project.stocks?.find(s => s.id === p.sourceMaterialId);
        if (!stock) return [];
        return [{ id: p.id, catalogMaterialId: stock.catalogMaterialId, materialType: p.materialType,
            length: p.length, width: p.width, height: p.height, sheet: stock.family === 'Tableros', kind: 'offcut' as const,
            sourceMaterialId: stock.id, sourcePieceId: p.id, sourceCode: p.code ?? p.id }];
    }).sort(compareId);
    const kerf = project.sawKerf ?? 0;
    // Do not include 3D poses: they have no bearing on manufacture. Inputs are stable-sorted.
    const signature = JSON.stringify({ algorithm: 1, specialOperations: project.pieces.filter(p => p.operations?.length).map(p => ({id:p.id, operations:p.operations})).sort(compareId), settings, kerf, required, commercial, offcuts,
        sources: (project.stocks ?? []).map(s => ({ id: s.id, catalogMaterialId: s.catalogMaterialId, length: s.length, width: s.width, height: s.height, family: s.family, materialType: s.materialType })).sort(compareId) });
    return { settings, required, commercial, offcuts, kerf, signature };
}
export function planIsStale(project: Project) {
    return !!project.optimizedPlan && project.optimizedPlan.signature !== optimizerInput(project).signature;
}
