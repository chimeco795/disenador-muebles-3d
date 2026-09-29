import { compareId } from './supplies';
import { clean, EPSILON, splitSpan } from './kerf';
import { bestPacking, compareScore, pack, type Fit, type FitPiece } from './packing';
import type { Demand, Rect, SawCut, Supply } from './types';
export function optimizeSheets(required: Demand[], commercial: Supply, offcuts: Supply[], kerf: number, allowRotation: boolean) {
    const fit: FitPiece = (piece, free, supply) => {
        if (Math.abs(piece.height - supply.height) > EPSILON || piece.materialType !== supply.materialType) return null;
        const candidates: Fit[] = [];
        for (const rotated of allowRotation && piece.rotationAllowed && piece.length !== piece.width ? [false, true] : [false]) {
            const length = rotated ? piece.width : piece.length, width = rotated ? piece.length : piece.width;
            const sx = splitSpan(free.length, length, kerf), sy = splitSpan(free.width, width, kerf);
            if (!sx || !sy) continue;
            for (const verticalFirst of [true, false]) {
                const remaining: Rect[] = [], cuts: SawCut[] = [];
                if (sx.remainder > EPSILON) remaining.push({ x: clean(free.x + length + sx.loss), y: free.y, length: sx.remainder, width: verticalFirst ? free.width : width });
                if (sy.remainder > EPSILON) remaining.push({ x: free.x, y: clean(free.y + width + sy.loss), length: verticalFirst ? length : free.length, width: sy.remainder });
                const vertical: SawCut = { x: clean(free.x + length), y: free.y, length: sx.loss, width: verticalFirst ? free.width : width, axis: 'length', offset: length, pieceCode: piece.code, kerf };
                const horizontal: SawCut = { x: free.x, y: clean(free.y + width), length: verticalFirst ? length : free.length, width: sy.loss, axis: 'width', offset: width, pieceCode: piece.code, kerf };
                if (verticalFirst) { if (sx.cut) cuts.push(vertical); if (sy.cut) cuts.push(horizontal); }
                else { if (sy.cut) cuts.push(horizontal); if (sx.cut) cuts.push(vertical); }
                candidates.push({ placement: { x: free.x, y: free.y, length, width, piece, rotated }, remaining, cuts,
                    score: [free.length * free.width - length * width, -Math.max(0, ...remaining.map(r => r.length * r.width)), rotated ? 1 : 0] });
            }
        }
        return candidates.sort((a, b) => compareScore(a.score, b.score))[0] ?? null;
    };
    const orders = [
        [...required].sort((a, b) => b.length * b.width - a.length * a.width || compareId(a, b)),
        [...required].sort((a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width) || b.length * b.width - a.length * a.width || compareId(a, b)),
    ];
    return bestPacking(orders.flatMap(order => [pack(order, commercial, [], fit), ...(offcuts.length ? [pack(order, commercial, offcuts, fit)] : [])]));
}
