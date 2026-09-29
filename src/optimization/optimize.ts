import type { Project } from '../model';
import { optimizerInput } from './supplies';
import { optimizeBoards } from './boards';
import { optimizeSheets } from './sheets';
import type { OptimizedPlan } from './types';
import { manufacturingSummary } from '../manufacturing/plan';
export function optimizeProject(project: Project): OptimizedPlan {
    const input = optimizerInput(project), current = manufacturingSummary(project);
    const result: OptimizedPlan = { version: 1, signature: input.signature, settings: input.settings, kerf: input.kerf,
        stocks: [], unplaced: [], requiredCount: input.required.length, issues: [], current: { boards: current.boards, sheets: current.sheets } };
    const groups = [...new Set(input.required.map(p => p.catalogMaterialId))].sort();
    for (const materialId of groups) {
        const required = input.required.filter(p => p.catalogMaterialId === materialId);
        const commercial = input.commercial.find(s => s.catalogMaterialId === materialId);
        if (!commercial) { result.unplaced.push(...required); continue; }
        const offcuts = input.settings.reuseOffcuts ? input.offcuts.filter(s => s.catalogMaterialId === materialId) : [];
        const packed = commercial.sheet ? optimizeSheets(required, commercial, offcuts, input.kerf, input.settings.allowRotation) : optimizeBoards(required, commercial, offcuts, input.kerf);
        result.stocks.push(...packed.stocks); result.unplaced.push(...packed.unplaced);
    }
    result.stocks.forEach((stock, i) => stock.id = `optimized-${i + 1}`);
    result.issues = result.unplaced.map(p => ({ code: p.code, reason: 'No cabe en material compatible con estas dimensiones, kerf y rotación. Revisa el catálogo o la configuración.' }));
    return result;
}
export function optimizationTotals(plan: OptimizedPlan) {
    const fresh = plan.stocks.filter(s => s.supply.kind === 'new'), reused = plan.stocks.filter(s => s.supply.kind === 'offcut');
    const volume = plan.stocks.reduce((n, s) => n + s.supply.length * s.supply.width * s.supply.height, 0);
    const used = plan.stocks.reduce((n, s) => n + s.placements.reduce((a, p) => a + p.length * p.width * s.supply.height, 0), 0);
    const remaining = plan.stocks.reduce((n, s) => n + s.remaining.reduce((a, r) => a + r.length * r.width * s.supply.height, 0), 0);
    const loss = plan.stocks.reduce((n, s) => n + s.cuts.reduce((a, c) => a + c.length * c.width * s.supply.height, 0), 0);
    const percent = (n: number) => volume ? n / volume * 100 : 0;
    return { fresh, reused, boards: plan.stocks.filter(s => !s.supply.sheet).length, sheets: plan.stocks.filter(s => s.supply.sheet).length,
        usedPercent: percent(used), remainingPercent: percent(remaining), lossPercent: percent(loss) };
}
