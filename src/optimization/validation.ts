import type { OptimizedPlan, OptimizerSettings } from './types';
const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object';
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonnegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const strings = (v: Record<string, any>, keys: string[]) => keys.every(k => typeof v[k] === 'string');
const size = (v: unknown) => record(v) && ['length', 'width', 'height'].every(k => positive(v[k]));
const rect = (v: unknown, zero = false) => record(v) && nonnegative(v.x) && nonnegative(v.y) && (zero ? nonnegative(v.length) && nonnegative(v.width) : positive(v.length) && positive(v.width));
const demand = (v: unknown) => record(v) && size(v) && strings(v, ['id', 'code', 'catalogMaterialId', 'materialType', 'sourceMaterialId']) && typeof v.rotationAllowed === 'boolean';
export function validOptimizerSettings(v: unknown): v is OptimizerSettings {
    return record(v) && typeof v.allowRotation === 'boolean' && typeof v.reuseOffcuts === 'boolean';
}
export function validOptimizedPlan(v: unknown): v is OptimizedPlan {
    if (!record(v) || v.version !== 1 || typeof v.signature !== 'string' || !validOptimizerSettings(v.settings) || !nonnegative(v.kerf) || !Number.isInteger(v.requiredCount) || v.requiredCount < 0 || !record(v.current) || !nonnegative(v.current.boards) || !nonnegative(v.current.sheets)) return false;
    if (!Array.isArray(v.unplaced) || !v.unplaced.every(demand) || !Array.isArray(v.issues) || !v.issues.every((i: unknown) => record(i) && strings(i, ['code', 'reason'])) || !Array.isArray(v.stocks)) return false;
    const ids = new Set<string>(), stockIds = new Set<string>(), reused = new Set<string>();
    for (const stock of v.stocks) {
        if (!record(stock) || typeof stock.id !== 'string' || stockIds.has(stock.id) || !record(stock.supply)) return false;
        stockIds.add(stock.id);
        const s = stock.supply;
        if (!size(s) || !strings(s, ['id', 'catalogMaterialId', 'materialType']) || typeof s.sheet !== 'boolean' || !['new', 'offcut'].includes(s.kind)) return false;
        if (s.kind === 'offcut') {
            if (!strings(s, ['sourceMaterialId', 'sourcePieceId', 'sourceCode']) || reused.has(s.sourcePieceId)) return false;
            reused.add(s.sourcePieceId);
        }
        if (!Array.isArray(stock.placements) || !stock.placements.length || !Array.isArray(stock.remaining) || !Array.isArray(stock.cuts)) return false;
        for (const p of stock.placements) {
            if (!record(p) || !rect(p) || !demand(p.piece) || typeof p.rotated !== 'boolean' || ids.has(p.piece.id)) return false;
            if (Math.abs(p.length - (p.rotated ? p.piece.width : p.piece.length)) > 1e-6 || Math.abs(p.width - (p.rotated ? p.piece.length : p.piece.width)) > 1e-6 || p.piece.height !== s.height || p.piece.catalogMaterialId !== s.catalogMaterialId || p.piece.materialType !== s.materialType) return false;
            if (p.rotated && (!s.sheet || !v.settings.allowRotation || !p.piece.rotationAllowed)) return false;
            ids.add(p.piece.id);
        }
        if (!stock.remaining.every((r: unknown) => rect(r)) || !stock.cuts.every((c: unknown) => record(c) && rect(c, true) && ['length', 'width'].includes(c.axis) && positive(c.offset) && c.kerf === v.kerf && typeof c.pieceCode === 'string')) return false;
        const rectangles = [...stock.placements, ...stock.remaining, ...stock.cuts];
        if (rectangles.some(r => r.x + r.length > s.length + 1e-6 || r.y + r.width > s.width + 1e-6)) return false;
        const area = rectangles.reduce((n, r) => n + r.length * r.width, 0);
        if (Math.abs(area - s.length * s.width) > Math.max(1e-4, area * 1e-9)) return false;
    }
    for (const p of v.unplaced) { if (ids.has(p.id)) return false; ids.add(p.id); }
    return ids.size === v.requiredCount && v.issues.length === v.unplaced.length;
}
