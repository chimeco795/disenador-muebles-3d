import type { Alignment } from '../interaction/store';
import { Vector3 } from 'three';
import { grabWorld, intentScore, closestOnFace, type GrabIntent } from './intent';
import type { Piece, Vec3 } from '../model';
import { SNAP, attraction } from './config';
import { bodyFor, corners, facesOverlap, nearby, parallelCos, shiftedFace, WORLD_AXES, type Face, type SnapBody } from './geometry';
export interface FaceMatch {
    moving: Face;
    target: Face;
    targetId: string;
    captured: boolean;
    distance: number;
}
export interface AlignmentGuide {
    from: Vector3;
    to: Vector3;
    axis: number;
    kind: 'center' | 'edge';
    captured: boolean;
}
export interface Placement {
    position: Vec3;
    face: FaceMatch | null;
    guides: AlignmentGuide[];
    grabGuide?: {
        from: Vector3;
        to: Vector3;
    };
}
export function prepareTargets(pieces: Piece[], movingId: string): SnapBody[] { return pieces.filter(p => p.id !== movingId && !p.isHidden).map(bodyFor); }
/** Only the requested world axes may change. Locked pieces remain valid targets. */
export function solvePlacement(piece: Piece, targets: SnapBody[], allowed: readonly boolean[] = [true, true, true], intent?: GrabIntent, alignment: Alignment = 'free'): Placement {
    const moving = bodyFor(piece), neighbors = targets.filter(t => t.id !== piece.id && nearby(moving, t));
    const grab = intent ? grabWorld(piece, intent) : null;
    let best: {
        face: FaceMatch;
        delta: Vector3;
        score: number;
    } | null = null;
    if (piece.isLocked)
        return { position: [...piece.position], face: null, guides: [] };
    for (const target of neighbors)
        for (const a of moving.faces)
            for (const b of target.faces) {
                if (a.normal.dot(b.normal) > -parallelCos)
                    continue;
                if (target.center.clone().sub(moving.center).dot(a.normal) <= SNAP.geometryEpsilon)
                    continue;
                const normal = a.normal.clone();
                normal.set(...normal.toArray().map((n, i) => allowed[i] ? n : 0) as Vec3);
                // A plane constraint needs only one free coordinate. Use the strongest
                // normal component to avoid amplifying a tiny denominator on rotated faces.
                const dominant=normal.toArray().map(Math.abs).indexOf(Math.max(...normal.toArray().map(Math.abs)));
                normal.set(...normal.toArray().map((n,i)=>i===dominant?n:0) as Vec3);
                const denominator = normal.dot(a.normal);
                if (denominator < SNAP.axisEpsilon)
                    continue;
                const gap = b.center.clone().sub(a.center).dot(a.normal);
                const correction = normal.multiplyScalar(gap / denominator), distance = correction.length();
                if (distance > SNAP.faceDetection || !facesOverlap(shiftedFace(a, correction), b))
                    continue;
                // Stable ordering for equal candidates prevents alternating highlights.
                const score = distance + (grab && intent ? intentScore(a, grab, intent.motion) * SNAP.intentWeight : 0);
                if (!best || score < best.score - SNAP.geometryEpsilon) {
                    best = { score, delta: correction.multiplyScalar(attraction(distance, SNAP.faceCapture, SNAP.faceDetection)), face: { moving: a, target: b, targetId: target.id, captured: distance <= SNAP.faceCapture, distance } };
                }
            }
    const delta = best?.delta.clone() ?? new Vector3();
    const guideCandidates: {
        axis: number;
        kind: 'center' | 'edge';
        offset: number;
        from: Vector3;
        to: Vector3;
    }[] = [];
    for (let axis = 0; axis < 3; axis++) {
        if (best && Math.abs(best.face.moving.normal.getComponent(axis)) > SNAP.axisEpsilon)
            continue;
        let candidate: typeof guideCandidates[number] | undefined;
        for (const target of neighbors.filter(t=>!best||t.id===best.face.targetId)) {
            const choices: ('center' | 'min' | 'max')[] = best&&alignment!=='free' ? [alignment] : ['center'];
            // Bounds are actual face coordinates only if both boxes have a world-aligned axis.
            if ((!best||alignment==='free')&&[moving, target].every(b => b.axes.some(a => Math.abs(a.dot(WORLD_AXES[axis])) >= parallelCos)))
                choices.push('min', 'max');
            for (const choice of choices) {
                const from = moving.center.clone().add(delta), to = target.center.clone();
                if (choice !== 'center') {
                    from.setComponent(axis, moving.bounds[choice].getComponent(axis) + delta.getComponent(axis));
                    to.setComponent(axis, target.bounds[choice].getComponent(axis));
                }
                const offset = to.getComponent(axis) - from.getComponent(axis);
                if (Math.abs(offset) > SNAP.alignmentDetection || (!allowed[axis] && Math.abs(offset) > SNAP.geometryEpsilon))
                    continue;
                if (!candidate || Math.abs(offset) < Math.abs(candidate.offset) - SNAP.geometryEpsilon)
                    candidate = { axis, kind: choice === 'center' ? 'center' : 'edge', offset, from: from.clone().sub(delta), to };
            }
        }
        if (candidate) {
            const next = delta.clone();
            if (allowed[axis] && (!best || alignment!=='free'))
                next.setComponent(axis, next.getComponent(axis) + candidate.offset * attraction(Math.abs(candidate.offset), SNAP.alignmentCapture, SNAP.alignmentDetection));
            if (!best || facesOverlap(shiftedFace(best.face.moving, next), best.face.target)) {
                delta.copy(next);
                guideCandidates.push(candidate);
            }
        }
    }
    const position = moving.center.clone().add(delta).toArray() as Vec3;
    const face = best ? { ...best.face, moving: shiftedFace(best.face.moving, delta) } : null;
    const guides = guideCandidates.slice(0, SNAP.maxGuides).map(g => {
        const from = g.from.clone().add(delta);
        return { from, to: g.to, axis: g.axis, kind: g.kind, captured: Math.abs(from.getComponent(g.axis) - g.to.getComponent(g.axis)) <= SNAP.geometryEpsilon };
    });
    return { position, face, guides, grabGuide: face && grab ? { from: closestOnFace(grab.clone().add(delta), face.moving), to: closestOnFace(grab.clone().add(delta), face.target) } : undefined };
}

/** Explicit post-contact alignment, expressed in the contacting face's own plane. */
export function alignContact(piece:Piece,targets:SnapBody[],alignment:Alignment):Placement {
 const result=solvePlacement(piece,targets);if(alignment==='free'||!result.face?.captured)return result;
 const source=result.face.moving,target=result.face.target,delta=new Vector3();
 const guides:AlignmentGuide[]=[];
 for(const axis of [source.u,source.v]){
   const a=corners(source).map(p=>p.dot(axis)),b=corners(target).map(p=>p.dot(axis));
   const value=(values:number[],center:Vector3)=>alignment==='center'?center.dot(axis):alignment==='min'?Math.min(...values):Math.max(...values);
   const offset=value(b,target.center)-value(a,source.center);delta.addScaledVector(axis,offset);
   guides.push({from:source.center.clone(),to:source.center.clone().addScaledVector(axis,offset),axis:axis.toArray().map(Math.abs).indexOf(Math.max(...axis.toArray().map(Math.abs))),kind:alignment==='center'?'center':'edge',captured:true});
 }
 if(!facesOverlap(shiftedFace(source,delta),target))return result;
 return {...result,position:new Vector3(...result.position).add(delta).toArray() as Vec3,face:{...result.face,moving:shiftedFace(source,delta)},guides};
}
