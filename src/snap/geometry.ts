import { Box3, Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { Piece } from '../model';
import { SNAP } from './config';
export interface Face {
    center: Vector3;
    normal: Vector3;
    u: Vector3;
    v: Vector3;
    halfU: number;
    halfV: number;
    key: string;
}
export interface SnapBody {
    id: string;
    center: Vector3;
    axes: Vector3[];
    faces: Face[];
    bounds: Box3;
}
export const WORLD_AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
export const parallelCos = Math.cos(MathUtils.degToRad(SNAP.parallelDegrees));
export function bodyFor(piece: Piece): SnapBody {
    const center = new Vector3(...piece.position);
    const q = new Quaternion().setFromEuler(new Euler(...piece.rotation.map(MathUtils.degToRad) as [
        number,
        number,
        number
    ]));
    const axes = WORLD_AXES.map(a => a.clone().applyQuaternion(q));
    const half = [piece.length / 2, piece.height / 2, piece.width / 2];
    const faces: Face[] = [];
    axes.forEach((axis, i) => { const j = (i + 1) % 3, k = (i + 2) % 3; for (const sign of [-1, 1])
        faces.push({ key: `${piece.id}:${i}:${sign}`, center: center.clone().addScaledVector(axis, half[i] * sign), normal: axis.clone().multiplyScalar(sign), u: axes[j], v: axes[k], halfU: half[j], halfV: half[k] }); });
    const bounds = new Box3().setFromPoints(faces.flatMap(corners));
    return { id: piece.id, center, axes, faces, bounds };
}
export function corners(f: Face): Vector3[] { return [-1, 1].flatMap(i => [-1, 1].map(j => f.center.clone().addScaledVector(f.u, f.halfU * i).addScaledVector(f.v, f.halfV * j))); }
/** Separating axis test of two parallel face rectangles, not their AABB silhouettes. */
export function facesOverlap(a: Face, b: Face): boolean {
    const ac = corners(a), bc = corners(b);
    return [a.u, a.v, b.u, b.v].every(axis => {
        const ap = ac.map(p => p.dot(axis)), bp = bc.map(p => p.dot(axis));
        return Math.min(Math.max(...ap), Math.max(...bp)) - Math.max(Math.min(...ap), Math.min(...bp)) > SNAP.geometryEpsilon;
    });
}
export function shiftedFace(f: Face, delta: Vector3): Face { return { ...f, center: f.center.clone().add(delta) }; }
export function nearby(a: SnapBody, b: SnapBody): boolean {
    const gap = WORLD_AXES.map((_, i) => Math.max(0, b.bounds.min.getComponent(i) - a.bounds.max.getComponent(i), a.bounds.min.getComponent(i) - b.bounds.max.getComponent(i)));
    return Math.hypot(...gap) <= SNAP.neighborDistance;
}
