import type { CutRecord, Piece, Project, StockRecord } from '../model';
export interface Rect { x: number; y: number; length: number; width: number }
export type PlanStatus = NonNullable<Piece['usage']> | 'archived';
export interface PlanPart extends Rect { id: string; code: string; status: PlanStatus; height: number }
export interface PlanCut extends Rect { record: CutRecord }
export const statusLabel: Record<PlanStatus, string> = {
    original: 'Original disponible', used: 'Pieza utilizada', available: 'Sobrante disponible', archived: 'Fuera de la escena',
};
export function stockTitle(stock: StockRecord) {
    const number = Number(stock.id.split('-').at(-1));
    return `${stock.family === 'Tableros' ? 'Hoja' : 'Tabla'} #${number || stock.id}`;
}
/** Reconstruct source-local rectangles from cuts. World-space movement never changes a plan. */
export function materialPlan(project: Project, stock: StockRecord) {
    const records = (project.cuts ?? []).filter(c => c.stockId === stock.id);
    const byParent = new Map(records.map(c => [c.parent.id, c]));
    const active = new Map(project.pieces.map(p => [p.id, p]));
    const archived = new Map((project.archivedPieces ?? []).map(p => [p.id, p]));
    const parts: PlanPart[] = [], cuts: PlanCut[] = [];
    const pending = [{ id: stock.rootPieceId, rect: { x: 0, y: 0, length: stock.length, width: stock.width } }];
    const visited = new Set<string>();
    while (pending.length) {
        const { id, rect } = pending.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const cut = byParent.get(id);
        if (!cut) {
            const piece = active.get(id) ?? archived.get(id);
            parts.push({ ...rect, id, code: piece?.code ?? 'Sin ID conservado', height: stock.height,
                status: active.has(id) ? piece?.usage ?? 'original' : 'archived' });
            continue;
        }
        const lengthwise = cut.axis === 'length';
        const strip = { ...rect, x: rect.x + (lengthwise ? cut.offset : 0), y: rect.y + (lengthwise ? 0 : cut.offset),
            length: lengthwise ? cut.kerf : rect.length, width: lengthwise ? rect.width : cut.kerf };
        cuts.push({ ...strip, record: cut });
        const first = { ...rect, [cut.axis]: cut.offset };
        const second = { ...rect, x: rect.x + (lengthwise ? cut.offset + cut.kerf : 0), y: rect.y + (lengthwise ? 0 : cut.offset + cut.kerf), [cut.axis]: rect[cut.axis] - cut.offset - cut.kerf };
        pending.push({ id: cut.childIds[1], rect: second }, { id: cut.childIds[0], rect: first });
    }
    return { parts, cuts };
}
export function manufacturingSummary(project: Project) {
    const stocks = project.stocks ?? [];
    const used = project.pieces.filter(p => p.usage === 'used');
    const usedSources = new Set(used.map(p => p.sourceMaterialId));
    const usedStocks = stocks.filter(s => usedSources.has(s.id));
    const groups = new Map<string, { stock: StockRecord; count: number }>();
    for (const stock of stocks) {
        const key = JSON.stringify([stock.family, stock.materialType, stock.length, stock.width, stock.height]);
        const group = groups.get(key);
        if (group) group.count++; else groups.set(key, { stock, count: 1 });
    }
    return { pieces: project.pieces.length, usedPieces: used.length, stocks: stocks.length,
        boards: usedStocks.filter(s => s.family !== 'Tableros').length,
        sheets: usedStocks.filter(s => s.family === 'Tableros').length,
        offcuts: project.pieces.filter(p => p.usage === 'available').length, groups: [...groups.values()] };
}
