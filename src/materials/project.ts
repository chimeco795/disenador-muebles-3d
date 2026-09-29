import { projectCatalog } from './catalog';
import { catalog, type Piece, type Project, type StockRecord } from '../model';
function letters(index: number): string {
    let value = index + 1, result = '';
    while (value > 0) {
        value--;
        result = String.fromCharCode(65 + value % 26) + result;
        value = Math.floor(value / 26);
    }
    return result;
}
export function createStock(project: Project, piece: Piece): StockRecord {
    const stocks = project.stocks ?? [];
    const catalogMaterialId = piece.catalogMaterialId ?? piece.sourceMaterialId;
    const material = projectCatalog(project).find(m => m.id === catalogMaterialId);
    const family = material?.family ?? 'Tablas / listones';
    const prefix = family === 'Tableros' ? 'HOJA-' : 'TABLA-';
    let number = 1;
    while (stocks.some(s => s.id === prefix + String(number).padStart(3, '0')))
        number++;
    return { id: prefix + String(number).padStart(3, '0'), piecePrefix: letters(stocks.length), rootPieceId: piece.id,
        catalogMaterialId, family, materialType: piece.materialType, name: material?.name ?? piece.name,
        length: piece.length, width: piece.width, height: piece.height, color: piece.originalColor ?? piece.color };
}
export function registerPiece(project: Project, piece: Piece): Project {
    const stock = createStock(project, piece);
    return { ...project, materialsVersion: 1, colorVersion: 1, stocks: [...(project.stocks ?? []), stock], pieces: [...project.pieces,
            { ...piece, sourceMaterialId: stock.id, stockId: stock.id, catalogMaterialId: stock.catalogMaterialId,
                code: stock.piecePrefix + '1', usage: 'original' }] };
}
export function nextPieceNumber(project: Project, stock: StockRecord): number {
    const all = [...project.pieces, ...(project.archivedPieces ?? []), ...(project.cuts ?? []).map(c => c.parent)];
    return 1 + Math.max(0, ...all.filter(p => p.stockId === stock.id).map(p => Number(p.code?.slice(stock.piecePrefix!.length)) || 0));
}
/** Upgrade Phase 1–3 saves once, preserving geometry, UUIDs, cut snapshots and source dimensions. */
export function migrateMaterials(project: Project): Project {
    if (project.materialsVersion === 1)
        return project;
    let result: Project = { ...project, materialsVersion: 1, pieces: [], stocks: [], cuts: [] };
    const stockMap = new Map<string, StockRecord>();
    for (const old of project.stocks ?? []) {
        const material = catalog.find(m => m.id === old.catalogMaterialId);
        const root = project.cuts?.find(c => c.parent.id === old.rootPieceId)?.parent;
        const stock = createStock(result, { ...root, ...old, id: old.rootPieceId,
            sourceMaterialId: old.catalogMaterialId, materialType: material?.materialType ?? root?.materialType ?? old.name } as Piece);
        result.stocks!.push(stock);
        stockMap.set(old.id, stock);
    }
    const codes = new Map<string, string>();
    const counters = new Map<string, number>();
    const convert = (piece: Piece): Piece => {
        const stock = stockMap.get(piece.stockId ?? '') ?? [...stockMap.values()].find(s => s.rootPieceId === piece.id);
        if (!stock)
            return piece;
        if (!codes.has(piece.id)) {
            const next = (counters.get(stock.id) ?? 0) + 1;
            counters.set(stock.id, next);
            codes.set(piece.id, stock.piecePrefix + String(next));
        }
        const produced = project.cuts?.find(c => c.childIds.includes(piece.id));
        return { ...piece, stockId: stock.id, sourceMaterialId: stock.id, catalogMaterialId: stock.catalogMaterialId,
            code: codes.get(piece.id), usage: produced ? (produced.childIds[0] === piece.id ? 'used' : 'available') : 'original' };
    };
    result.cuts = (project.cuts ?? []).map(c => ({ ...c, stockId: stockMap.get(c.stockId)!.id, parent: convert(c.parent) }));
    for (const piece of project.pieces) {
        const converted = convert(piece);
        if (converted.stockId)
            result.pieces.push(converted);
        else
            result = registerPiece(result, converted);
    }
    result.archivedPieces = (project.archivedPieces ?? []).map(convert);
    return result;
}
export function stockSummary(project: Project, stock: StockRecord) {
    const pieces = project.pieces.filter(p => p.sourceMaterialId === stock.id);
    const sheet = stock.family === 'Tableros';
    // Area also supports future width cuts. Boards use equivalent length at original cross-section.
    const measure = (p: Pick<Piece, 'length' | 'width' | 'height'>) => sheet
        ? p.length * p.width / 1e6 : p.length * p.width * p.height / (stock.width * stock.height);
    const used = pieces.filter(p => p.usage === 'used').reduce((sum, p) => sum + measure(p), 0);
    const available = pieces.filter(p => p.usage !== 'used').reduce((sum, p) => sum + measure(p), 0);
    const kerf = (project.cuts ?? []).filter(c => c.stockId === stock.id).reduce((sum, c) => sum + measure({ ...c.parent, [c.axis]: c.kerf }), 0);
    return { used, available, kerf, inactive: Math.max(0, measure(stock) - used - available - kerf), unit: sheet ? 'm²' : 'mm',
        uncut: !(project.cuts ?? []).some(c => c.stockId === stock.id) };
}
