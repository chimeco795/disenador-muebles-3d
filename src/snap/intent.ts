import { Vector3, Euler, Quaternion, MathUtils } from 'three';
import type { Piece, Vec3 } from '../model';
import { corners, type Face } from './geometry';
import { SNAP } from './config';
export interface GrabIntent {
    localPoint: Vec3;
    motion: Vec3;
}
export function grabWorld(piece: Piece, intent: GrabIntent): Vector3 {
    const q = new Quaternion().setFromEuler(new Euler(...piece.rotation.map(MathUtils.degToRad) as Vec3));
    return new Vector3(...intent.localPoint).applyQuaternion(q).add(new Vector3(...piece.position));
}
export function closestOnFace(point: Vector3, face: Face): Vector3 {
    const relative = point.clone().sub(face.center);
    return face.center.clone().addScaledVector(face.u, MathUtils.clamp(relative.dot(face.u), -face.halfU, face.halfU)).addScaledVector(face.v, MathUtils.clamp(relative.dot(face.v), -face.halfV, face.halfV));
}
export function intentScore(face: Face, grab: Vector3, motion: Vec3): number {
    const reach = grab.distanceTo(closestOnFace(grab, face));
    const direction = new Vector3(...motion);
    if (direction.lengthSq() > SNAP.axisEpsilon)
        direction.normalize();
    return Math.min(reach / SNAP.grabZone, 4) * SNAP.grabPriority - Math.max(0, direction.dot(face.normal)) * SNAP.directionPriority;
}
export function faceFeatures(face: Face): {
    point: Vector3;
    kind: 'center' | 'edge';
}[] {
    return [{ point: face.center.clone(), kind: 'center' }, ...corners(face).map(point => ({ point, kind: 'edge' as const })), ...[-1, 1].flatMap(sign => [
            { point: face.center.clone().addScaledVector(face.u, sign * face.halfU), kind: 'edge' as const },
            { point: face.center.clone().addScaledVector(face.v, sign * face.halfV), kind: 'edge' as const },
        ])];
}
