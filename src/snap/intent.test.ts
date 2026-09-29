import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import type { Piece } from '../model';
import { bodyFor } from './geometry';
import { solvePlacement } from './placement';
import { grabWorld } from './intent';
const board = (id: string, x: number, y = 0, patch: Partial<Piece> = {}): Piece => ({ id, name: id, sourceMaterialId: 'pino-100', materialType: 'Pino', length: 3000, width: 100, height: 18, color: '#ee555c', rotation: [0, 0, 0], position: [x, y, 0], isCut: false, isHidden: false, isLocked: false, ...patch });
describe('grab intent supplements existing snap', () => {
    it('selects the grabbed end even when the opposite end is slightly closer', () => {
        const moving = board('moving', 0), right = bodyFor(board('right', 1608, 0, { length: 200 })), left = bodyFor(board('left', -1604, 0, { length: 200 }));
        expect(solvePlacement(moving, [left, right]).face!.targetId).toBe('left');
        const fromRight = solvePlacement(moving, [left, right], [true, true, true], { localPoint: [1490, 0, 0], motion: [10, 0, 0] });
        expect(fromRight.face!.targetId).toBe('right');
        expect(fromRight.position[0]).toBe(8);
        expect(fromRight.grabGuide).toBeDefined();
        const fromLeft = solvePlacement(moving, [left, right], [true, true, true], { localPoint: [-1490, 0, 0], motion: [-10, 0, 0] });
        expect(fromLeft.face!.targetId).toBe('left');
        expect(fromLeft.position[0]).toBe(-4);
    });
    it('uses direction to disambiguate equally close faces at a grabbed corner', () => {
        const moving = board('moving', 0, 0, { length: 100, height: 100 }), right = bodyFor(board('right', 108, 0, { length: 100, height: 100 })), top = bodyFor(board('top', 0, 108, { length: 100, height: 100 }));
        expect(solvePlacement(moving, [right, top], [true, true, true], { localPoint: [50, 50, 0], motion: [5, 0, 0] }).face!.targetId).toBe('right');
        expect(solvePlacement(moving, [right, top], [true, true, true], { localPoint: [50, 50, 0], motion: [0, 5, 0] }).face!.targetId).toBe('top');
    });
    it('transforms grip points with the piece and snaps cut pieces using the same solver', () => {
        const rotated = board('rotated', 100, 500, { rotation: [0, 0, 90] });
        expect(grabWorld(rotated, { localPoint: [1500, 0, 0], motion: [0, 1, 0] }).distanceTo(new Vector3(100, 2000, 0))).toBeCloseTo(0, 7);
        const cut = board('cut', 0, 0, { length: 720, isCut: true });
        const target = bodyFor(board('target', 468, 0, { length: 200 }));
        expect(solvePlacement(cut, [target], [true, true, true], { localPoint: [350, 0, 0], motion: [8, 0, 0] }).position[0]).toBe(8);
    });
});
