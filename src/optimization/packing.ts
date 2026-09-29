import { EPSILON } from './kerf';
import type { Demand, OptimizedStock, Packing, Placement, Rect, SawCut, Supply } from './types';
export interface Fit { placement: Placement; remaining: Rect[]; cuts: SawCut[]; score: number[] }
export type FitPiece = (piece: Demand, free: Rect, supply: Supply) => Fit | null;
export function compareScore(a: number[], b: number[]) {
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > EPSILON) return a[i] - b[i];
    return 0;
}
export function pack(required: Demand[], commercial: Supply, offcuts: Supply[], fitPiece: FitPiece): Packing {
    const stocks: OptimizedStock[] = [], unplaced: Demand[] = [], unused = [...offcuts];
    const create = (supply: Supply): OptimizedStock => ({ id: '', supply, placements: [], remaining: [{ x: 0, y: 0, length: supply.length, width: supply.width }], cuts: [] });
    for (const piece of required) {
        let best: { bin: OptimizedStock; rectIndex: number; fit: Fit; unusedIndex?: number; fresh?: boolean } | undefined;
        const consider = (bin: OptimizedStock, unusedIndex?: number, fresh?: boolean) => {
            bin.remaining.forEach((rect, rectIndex) => {
                const fit = fitPiece(piece, rect, bin.supply);
                if (fit && (!best || compareScore(fit.score, best.fit.score) < 0)) best = { bin, rectIndex, fit, unusedIndex, fresh };
            });
        };
        // Fill already-open material first. Only then open an unused offcut or a commercial blank.
        stocks.forEach(bin => consider(bin));
        if (!best) unused.forEach((supply, i) => consider(create(supply), i));
        if (!best) consider(create(commercial), undefined, true);
        if (!best) { unplaced.push(piece); continue; }
        const chosen = best as { bin: OptimizedStock; rectIndex: number; fit: Fit; unusedIndex?: number; fresh?: boolean };
        if (chosen.unusedIndex !== undefined) unused.splice(chosen.unusedIndex, 1);
        if (chosen.unusedIndex !== undefined || chosen.fresh) stocks.push(chosen.bin);
        chosen.bin.remaining.splice(chosen.rectIndex, 1, ...chosen.fit.remaining);
        chosen.bin.placements.push(chosen.fit.placement);
        chosen.bin.cuts.push(...chosen.fit.cuts);
    }
    return { stocks, unplaced };
}
export function packingScore(plan: Packing) {
    const volume = (s: OptimizedStock) => s.supply.length * s.supply.width * s.supply.height;
    const fresh = plan.stocks.filter(s => s.supply.kind === 'new');
    return [plan.unplaced.length, fresh.length, fresh.reduce((n, s) => n + volume(s), 0), plan.stocks.reduce((n, s) => n + volume(s), 0), plan.stocks.length];
}
export function bestPacking(plans: Packing[]) {
    return plans.reduce((best, p) => compareScore(packingScore(p), packingScore(best)) < 0 ? p : best);
}
