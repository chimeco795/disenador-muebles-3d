import { MathUtils, Quaternion, Vector3 } from 'three';
import { ANGULAR_GUIDES } from '../model';
import { SNAP, attraction } from './config';
import { WORLD_AXES } from './geometry';
export interface AngularSnap {
    raw: number;
    angle: number;
    suggested: number | null;
    captured: boolean;
}
export function solveAngle(raw: number): AngularSnap {
    let suggested = 0, distance = Infinity;
    const quadrant = Math.floor(raw / 90);
    for (let q = quadrant - 1; q <= quadrant + 1; q++)
        for (const a of ANGULAR_GUIDES)
            for (const sign of [-1, 1]) {
                const candidate = q * 90 + a * sign;
                const d = Math.abs(candidate - raw);
                if (d < distance) {
                    distance = d;
                    suggested = candidate;
                }
            }
    if (distance > SNAP.angularDetection)
        return { raw, angle: raw, suggested: null, captured: false };
    return { raw, angle: raw + (suggested - raw) * attraction(distance, SNAP.angularCapture, SNAP.angularDetection), suggested, captured: distance <= SNAP.angularCapture };
}
/** World-axis swing/twist: apply only the active-axis correction, preserving tilt.
 * Undefined twist (180° swing) and free/view-plane rings intentionally stay free. */
export function solveRotation(raw: Quaternion, axis: string): {
    quaternion: Quaternion;
    feedback: AngularSnap | null;
    axis: Vector3 | null;
} {
    const index = ['X', 'Y', 'Z'].indexOf(axis);
    if (index < 0)
        return { quaternion: raw.clone(), feedback: null, axis: null };
    const component = [raw.x, raw.y, raw.z][index];
    if (Math.hypot(component, raw.w) < SNAP.quaternionEpsilon)
        return { quaternion: raw.clone(), feedback: null, axis: null };
    const degrees = MathUtils.radToDeg(2 * Math.atan2(component, raw.w));
    const feedback = solveAngle(degrees), direction = WORLD_AXES[index];
    const correction = new Quaternion().setFromAxisAngle(direction, MathUtils.degToRad(feedback.angle - degrees));
    return { quaternion: correction.multiply(raw).normalize(), feedback, axis: direction };
}
