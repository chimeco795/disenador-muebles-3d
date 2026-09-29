import { catalog, type Piece, type Project } from '../model';
export type CutAxis = 'length' | 'width';
export function isSheet(project: Project, piece: Piece): boolean {
    return (project.stocks?.find(s => s.id === piece.sourceMaterialId)?.family ?? catalog.find(m => m.id === (piece.catalogMaterialId ?? piece.sourceMaterialId))?.family) === 'Tableros';
}
export const mm = (n: number) => String(Math.round(n * 1e6) / 1e6);
export function cutMeasure(piece: Piece, axis: CutAxis, offset: number, kerf: number, sheet: boolean) {
    const remaining = piece[axis] - offset - kerf;
    if (!sheet && axis === 'length') return `${mm(offset)} mm | ${mm(remaining)} mm`;
    const size = (value: number) => axis === 'length' ? `${mm(value)} × ${mm(piece.width)} × ${mm(piece.height)}` : `${mm(piece.length)} × ${mm(value)} × ${mm(piece.height)}`;
    return `${size(offset)} mm | ${size(remaining)} mm`;
}
