import { describe, it, expect } from 'vitest';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { catalog, type Piece, type Vec3 } from '../model';
import { SNAP } from './config';
import { bodyFor, facesOverlap } from './geometry';
import { prepareTargets, solvePlacement } from './placement';
import { solveAngle, solveRotation } from './angular';
const piece = (id: string, position: Vec3 = [0, 50, 0], patch: Partial<Piece> = {}): Piece => ({ id, name: id, materialType: 'Pino', sourceMaterialId: catalog[0].id, length: 200, width: 100, height: 100, position, rotation: [0, 0, 0], color: '#ee555c', isLocked: false, isHidden: false, isCut: false, ...patch });
const near = (a: number[], b: number[]) => a.forEach((n, i) => expect(n).toBeCloseTo(b[i], 6));
describe('snap geometry in real millimeters', () => {
    it('contacts opposing faces, previews before capture and releases without sticking', () => {
        const target = piece('target'), targets = prepareTargets([target], 'moving');
        const preview = solvePlacement(piece('moving', [230, 50, 0]), targets, [true, false, false]);
        expect(preview.face).not.toBeNull();
        expect(preview.face!.captured).toBe(false);
        expect(preview.position[0]).toBeLessThan(230);
        const contact = solvePlacement(piece('moving', [208, 50, 0]), targets, [true, false, false]);
        near(contact.position, [200, 50, 0]);
        expect(contact.face!.captured).toBe(true);
        expect(contact.face!.moving.center.distanceTo(contact.face!.target.center)).toBeCloseTo(0);
        const free = solvePlacement(piece('moving', [200 + SNAP.faceDetection + 10, 50, 0]), targets, [true, false, false]);
        expect(free.position[0]).toBe(255);
        expect(free.face).toBeNull();
    });
    it('stacks 18mm boards accurately, including shallow penetration', () => {
        const target = piece('target', [0, 9, 0], { height: 18 });
        const moving = piece('moving', [0, 35, 0], { height: 18 });
        near(solvePlacement(moving, [bodyFor(target)], [false, true, false]).position, [0, 27, 0]);
        near(solvePlacement({ ...moving, position: [0, 25, 0] }, [bodyFor(target)], [false, true, false]).position, [0, 27, 0]);
    });
    it('rejects nonoverlapping faces and hidden targets, but accepts locked targets', () => {
        const moving = piece('moving', [208, 50, 200]);
        expect(solvePlacement(moving, [bodyFor(piece('target'))], [true, false, false]).face).toBeNull();
        expect(prepareTargets([piece('self'), piece('hidden', [0, 50, 0], { isHidden: true }), piece('locked', [0, 50, 0], { isLocked: true })], 'self').map(b => b.id)).toEqual(['locked']);
        near(solvePlacement(piece('locked', [208, 50, 0], { isLocked: true }), [bodyFor(piece('target'))]).position, [208, 50, 0]);
    });
    it('uses real rotated face planes and preserves axes excluded by the manipulator', () => {
        const q = new Quaternion().setFromEuler(new Euler(0, Math.PI / 4, 0));
        const center = new Vector3(208, 0, 0).applyQuaternion(q);
        const moving = piece('moving', [center.x, 50, center.z], { rotation: [0, 45, 0] });
        const target = piece('target', [0, 50, 0], { rotation: [0, 45, 0] });
        const result = solvePlacement(moving, [bodyFor(target)], [true, false, true]);
        expect(result.position.filter((n,i)=>Math.abs(n-moving.position[i])>1e-6)).toHaveLength(1);
        expect(result.face!.moving.center.clone().sub(result.face!.target.center).dot(result.face!.target.normal)).toBeCloseTo(0,6);
        expect(result.face!.captured).toBe(true);
        const constrained = solvePlacement(moving, [bodyFor(target)], [true, false, false]);
        expect(constrained.position[2]).toBe(moving.position[2]);
        expect(constrained.face!.moving.center.clone().sub(constrained.face!.target.center).dot(constrained.face!.target.normal)).toBeCloseTo(0, 6);
    });
    it('does not join tilted, merely nearby bounding boxes', () => { expect(solvePlacement(piece('moving', [208, 50, 0], { rotation: [0, 20, 0] }), [bodyFor(piece('target'))], [true, false, false]).face).toBeNull(); });
    it('aligns centers, matching edges, height and depth without choosing remote furniture', () => {
        const target = bodyFor(piece('target'));
        const center = solvePlacement(piece('moving', [4, 50, 210]), [target], [true, false, false]);
        expect(center.position[0]).toBe(0);
        expect(center.guides.some(g => g.kind === 'center' && g.axis === 0)).toBe(true);
        const edge = solvePlacement(piece('moving', [54, 50, 210], { length: 100 }), [target], [true, false, false]);
        expect(edge.position[0]).toBe(50);
        expect(edge.guides.some(g => g.kind === 'edge')).toBe(true);
        const height = solvePlacement(piece('moving', [310, 54, 0]), [target], [false, true, false]);
        expect(height.position[1]).toBe(50);
        const depth = solvePlacement(piece('moving', [310, 50, 4]), [target], [false, false, true]);
        expect(depth.position[2]).toBe(0);
        expect(solvePlacement(piece('moving', [4, 50, 2000]), [target], [true, false, false]).guides).toHaveLength(0);
    });
    it('face projection SAT rejects tangentially separated rectangles', () => { const a = bodyFor(piece('a')).faces[0], b = bodyFor(piece('b', [0, 50, 200])).faces[0]; expect(facesOverlap(a, b)).toBe(false); });
});
describe('angular magnets', () => {
    it.each([0, 15, 30, 45, 60, 90, -15, -45, -90, 120, 135, 180, 225, 270, 315, 360])('captures %s and its neighborhood', angle => { expect(solveAngle(angle + 1.2).angle).toBe(angle); expect(solveAngle(angle + 1.2).captured).toBe(true); });
    it('previews 45°, captures 43.8°, and lets the pointer pass through', () => { const pre = solveAngle(41.5); expect(pre.suggested).toBe(45); expect(pre.captured).toBe(false); expect(pre.angle).toBeGreaterThan(41.5); expect(solveAngle(43.8).angle).toBe(45); expect(solveAngle(51).angle).toBe(51); expect(solveAngle(51).suggested).toBeNull(); expect(solveAngle(88.8).angle).toBe(90); expect(solveAngle(96).angle).toBe(96); });
    it('preserves compound tilt and does not quantize inactive Euler axes', () => {
        const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .3);
        const raw = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), MathUtils.degToRad(43.8)).multiply(tilt);
        const expected = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), MathUtils.degToRad(45)).multiply(tilt);
        const solved = solveRotation(raw, 'Z');
        expect(solved.quaternion.angleTo(expected)).toBeCloseTo(0, 6);
        expect(solveRotation(raw, 'E').quaternion.angleTo(raw)).toBeCloseTo(0, 6);
    });
});
