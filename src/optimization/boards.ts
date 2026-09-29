import { compareId } from './supplies';
import { clean, EPSILON, splitSpan } from './kerf';
import { bestPacking, pack, type FitPiece } from './packing';
import type { Demand, Supply } from './types';
export function optimizeBoards(required: Demand[], commercial: Supply, offcuts: Supply[], kerf: number) {
    const sorted = [...required].sort((a, b) => b.length - a.length || compareId(a, b));
    const fit: FitPiece = (piece, free, supply) => {
        if (Math.abs(piece.height - supply.height) > EPSILON || piece.materialType !== supply.materialType) return null;
        const span = splitSpan(free.length, piece.length, kerf);
        const cross = splitSpan(free.width,piece.width,kerf);
        if (!span || !cross) return null;
        return { placement: { ...free, length: piece.length, width:piece.width, piece, rotated: false },
            remaining: [...(span.remainder > EPSILON ? [{ ...free, x: clean(free.x + piece.length + span.loss), length: span.remainder }] : []),...(cross.remainder>EPSILON?[{x:free.x,y:clean(free.y+piece.width+cross.loss),length:piece.length,width:cross.remainder}]:[])],
            cuts: [...(span.cut ? [{ x: clean(free.x + piece.length), y: free.y, length: span.loss, width: free.width, axis: 'length' as const, offset: piece.length, pieceCode: piece.code, kerf }] : []),...(cross.cut?[{x:free.x,y:clean(free.y+piece.width),length:piece.length,width:cross.loss,axis:'width' as const,offset:piece.width,pieceCode:piece.code,kerf}]:[])],
            score: [span.remainder,cross.remainder] };
    };
    const plain = pack(sorted, commercial, [], fit);
    return offcuts.length ? bestPacking([plain, pack(sorted, commercial, offcuts, fit)]) : plain;
}
