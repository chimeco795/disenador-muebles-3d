import { Line } from '@react-three/drei';
import { DoubleSide, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { SCALE, toScene, type Vec3 } from '../model';
import { SNAP } from '../snap/config';
import { corners, type Face } from '../snap/geometry';
import type { SnapPreviewState } from '../snap/types';
import { SceneLabel } from './SceneLabel';
const scene = (v: Vector3) => toScene(v.toArray() as Vec3);
export function FaceHighlight({ face, color }: {
    face: Face;
    color: string;
}) {
    const position = face.center.clone().addScaledVector(face.normal, SNAP.faceOverlayOffset);
    const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(face.u, face.v, face.u.clone().cross(face.v)));
    const cs = corners({ ...face, center: position });
    return <group><mesh position={scene(position)} quaternion={q} renderOrder={10} raycast={() => { }}><planeGeometry args={[face.halfU * 2 * SCALE, face.halfV * 2 * SCALE]}/><meshBasicMaterial color={color} opacity={.16} transparent side={DoubleSide} depthWrite={false} depthTest={false}/></mesh><Line points={[0, 1, 3, 2, 0].map(i => scene(cs[i]))} color={color} lineWidth={1.5} depthTest={false} raycast={() => { }}/></group>;
}
function AngularGuide({ center, axis, angle }: {
    center: Vector3;
    axis: Vector3;
    angle: number;
}) {
    const u = (Math.abs(axis.x) > .5 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0));
    const v = axis.clone().cross(u).normalize();
    const point = (degrees: number) => center.clone().addScaledVector(u, Math.cos(MathUtils.degToRad(degrees)) * SNAP.arcRadius).addScaledVector(v, Math.sin(MathUtils.degToRad(degrees)) * SNAP.arcRadius);
    const points = Array.from({ length: SNAP.arcSegments + 1 }, (_, i) => scene(point(angle * i / SNAP.arcSegments)));
    return <group><Line points={points} color="#008e86" lineWidth={2} depthTest={false} raycast={() => { }}/><Line points={[scene(center), scene(point(angle))]} color="#008e86" dashed dashSize={.025} gapSize={.015} depthTest={false} raycast={() => { }}/></group>;
}
export function SnapPreview({ state }: {
    state: SnapPreviewState;
}) {
    const { placement, angular, axis, bypass } = state;
    const center = new Vector3(...state.position);
    const label = center.clone().add(new Vector3(0, SNAP.guideLabelOffset, 0));
    const guides = placement?.guides ?? [];
    let text = bypass ? 'Alt · Movimiento libre' : '';
    if (placement?.face)
        text = placement.face.captured ? '✓ Caras unidas' : 'Caras cercanas';
    const descriptions = guides.map(g => (g.captured ? '✓ ' : '') + (g.kind === 'center' ? ['Centros X', 'Misma altura', 'Misma profundidad'][g.axis] : `Bordes ${'XYZ'[g.axis]}`) + (g.captured ? '' : ' cerca'));
    if (descriptions.length)
        text = [text, ...descriptions].filter(Boolean).join(' · ');
    if (angular)
        text = `${angular.angle.toFixed(1)}°${angular.suggested !== null ? (angular.captured ? ' · Ajuste angular' : ` · Guía: ${angular.suggested}°`) : ' · Giro libre'}`;
    if (text && !bypass)
        text += ' · Alt: libre';
    return <group>
   {placement?.face && <><FaceHighlight face={placement.face.moving} color="#0074ce"/><FaceHighlight face={placement.face.target} color="#008e86"/></>}
   {placement?.grabGuide && <><Line points={[scene(placement.grabGuide.from), scene(placement.grabGuide.to)]} color="#0074ce" lineWidth={2} dashed dashSize={.025} gapSize={.015} depthTest={false} raycast={() => { }}/><mesh position={scene(placement.grabGuide.from)} raycast={() => { }}><sphereGeometry args={[.018, 12, 8]}/><meshBasicMaterial color="#0074ce" depthTest={false}/></mesh></>}
   {guides.map((g, i) => <Line key={i} points={[scene(g.from), scene(g.to)]} color={g.captured ? '#008e86' : '#6ba4bd'} lineWidth={1.2} dashed dashSize={.04} gapSize={.025} depthTest={false} raycast={() => { }}/>)}
   {angular?.suggested !== null && angular && axis && <AngularGuide center={center} axis={axis} angle={angular.suggested!}/>}
   {text && <SceneLabel position={scene(label)} className={`snap-tag ${placement?.face?.captured || angular?.captured || guides.some(g => g.captured) ? 'captured' : ''}`} text={text}/>}
 </group>;
}
