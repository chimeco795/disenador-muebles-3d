import { validOperation, validRepeat, validJoin, validMaterial } from './operations/validation';
import { validOptimizedPlan, validOptimizerSettings } from './optimization/validation';
import type { Piece, Project } from './model';
const vector = (v: unknown): boolean => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
function record(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object'; }
function validPiece(v: unknown): v is Piece {
    if (!record(v))
        return false;
    if(v.operations!==undefined&&(!Array.isArray(v.operations)||!v.operations.every(validOperation)||new Set(v.operations.map(o=>o.id)).size!==v.operations.length))return false;
    return ['id', 'name', 'materialType', 'sourceMaterialId', 'color'].every(k => typeof v[k] === 'string') && ['length', 'width', 'height'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]) && (v[k] as number) > 0) && vector(v.position) && vector(v.rotation) && ['isCut', 'isLocked', 'isHidden'].every(k => typeof v[k] === 'boolean') && ['stockId', 'parentPieceId', 'producedByCutId', 'originalColor', 'duplicateOf', 'code', 'catalogMaterialId'].every(k => v[k] === undefined || typeof v[k] === 'string') && (v.cutRotationAllowed === undefined || typeof v.cutRotationAllowed === 'boolean') && (v.usage === undefined || ['original', 'used', 'available'].includes(v.usage as string));
}
export function validProject(v: unknown): v is Project {
    if (!record(v) || v.version !== 1 || typeof v.name !== 'string' || !Array.isArray(v.pieces) || !v.pieces.every(validPiece) || new Set(v.pieces.map(p => p.id)).size !== v.pieces.length)
        return false;
    const p = v as unknown as Project;
    if(p.preferences!==undefined&&(!record(p.preferences)||!['grid','shadows','dimensions'].every(k=>typeof (p.preferences as unknown as Record<string,unknown>)[k]==='boolean')||!['free','center','min','max'].includes(p.preferences.snapAlignment)))return false;
    if(p.customMaterials!==undefined&&(!Array.isArray(p.customMaterials)||!p.customMaterials.every(validMaterial)||new Set(p.customMaterials.map(m=>m.id)).size!==p.customMaterials.length))return false;
    if(p.joins!==undefined&&(!Array.isArray(p.joins)||!p.joins.every(validJoin)||new Set(p.joins.map(j=>j.id)).size!==p.joins.length))return false;
    if(p.lastAction!==undefined&&!validRepeat(p.lastAction))return false;
    if(p.colorVersion!==undefined&&p.colorVersion!==1)return false;
    if (p.optimizerSettings !== undefined && !validOptimizerSettings(p.optimizerSettings)) return false;
    if (p.optimizedPlan !== undefined && !validOptimizedPlan(p.optimizedPlan)) return false;
    if (p.sawKerf !== undefined && (typeof p.sawKerf !== 'number' || !Number.isFinite(p.sawKerf) || p.sawKerf < 0)) return false;
    if (p.stocks !== undefined && (!Array.isArray(p.stocks) || !p.stocks.every(s => record(s) && ['id', 'rootPieceId', 'catalogMaterialId', 'name', 'color'].every(k => typeof s[k] === 'string') && [s.length, s.width, s.height].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)) || new Set(p.stocks.map(s => s.id)).size !== p.stocks.length))
        return false;
    if (p.cuts !== undefined && (!Array.isArray(p.cuts) || !p.cuts.every(c => record(c) && typeof c.id === 'string' && typeof c.stockId === 'string' && validPiece(c.parent) && Array.isArray(c.childIds) && c.childIds.length === 2 && c.childIds.every(id => typeof id === 'string') && c.childIds[0] !== c.childIds[1] && (c.axis === 'length' || c.axis === 'width') && Number.isFinite(c.offset) && Number.isFinite(c.kerf) && c.kerf >= 0 && c.offset > 0 && c.offset + c.kerf < c.parent[c.axis] && p.stocks?.some(s => s.id === c.stockId)) || new Set(p.cuts.map(c => c.id)).size !== p.cuts.length))
        return false;
    if (p.archivedPieces !== undefined && (!Array.isArray(p.archivedPieces) || !p.archivedPieces.every(validPiece)))
        return false;
    if (p.materialsVersion !== undefined && p.materialsVersion !== 1)
        return false;
    const all = [...p.pieces, ...(p.archivedPieces ?? [])];
    if (new Set(all.map(piece => piece.id)).size !== all.length)
        return false;
    if (p.materialsVersion === 1) {
        const historical = [...all, ...(p.cuts ?? []).map(c => c.parent)];
        const codes = new Map<string, string>();
        for (const piece of historical) {
            const stock = p.stocks?.find(s => s.id === piece.sourceMaterialId);
            if (!stock || piece.stockId !== stock.id || piece.catalogMaterialId !== stock.catalogMaterialId || !piece.usage || !piece.code || !stock.piecePrefix || !/^[A-Z]+[1-9][0-9]*$/.test(piece.code) || piece.code.match(/^[A-Z]+/)?.[0] !== stock.piecePrefix)
                return false;
            if (codes.has(piece.code) && codes.get(piece.code) !== piece.id)
                return false;
            codes.set(piece.code, piece.id);
        }
        if (new Set(p.stocks?.map(s => s.piecePrefix)).size !== p.stocks?.length)
            return false;
        if (p.cuts?.some(c => c.stockId !== c.parent.stockId))
            return false;
        if (p.stocks?.some(s => !s.piecePrefix || !s.materialType || !['Tablas / listones', 'Tableros'].includes(s.family!)))
            return false;
    }
    return all.every(piece => (!piece.stockId || p.stocks?.some(s => s.id === piece.stockId)) && (!piece.producedByCutId || p.cuts?.some(c => c.id === piece.producedByCutId && c.childIds.includes(piece.id) && c.parent.id === piece.parentPieceId && c.stockId === piece.stockId)));
}
