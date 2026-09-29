import { useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Euler, MathUtils, Plane, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { SCALE, toScene, type Piece, type Vec3 } from '../model';
import { useEditor } from '../store';
import { cutMeasure, isSheet } from '../cutting/measure';
import { CUT } from '../cutting/config';
import { useCut } from '../cutting/store';
import { SceneLabel } from './SceneLabel';
export function CutPreview({ piece: p }: {
    piece: Piece;
}) {
    const { offset, axis: cutAxis } = useCut();
    const project = useEditor(s => s.project);
    const kerf = project.sawKerf ?? 0;
    const acrossWidth = cutAxis === 'width';
    const { camera, gl, controls } = useThree();
    const cleanup = useRef<(() => void) | null>(null);
    const rotation = p.rotation.map(MathUtils.degToRad) as Vec3;
    const q = new Quaternion().setFromEuler(new Euler(...rotation));
    const x = (offset - p[cutAxis] / 2) * SCALE, h = p.height * SCALE / 2 + CUT.linePadding, w = (acrossWidth ? p.length : p.width) * SCALE / 2 + CUT.linePadding;
    useEffect(() => () => { cleanup.current?.(); }, []);
    const down = (e: ThreeEvent<PointerEvent>) => {
        if (e.button !== 0)
            return;
        e.stopPropagation();
        const axis = new Vector3(acrossWidth ? 0 : 1, 0, acrossWidth ? 1 : 0).applyQuaternion(q), direction = camera.getWorldDirection(new Vector3());
        const normal = direction.clone().addScaledVector(axis, -direction.dot(axis));
        if (normal.lengthSq() < CUT.dragEpsilon)
            return;
        normal.normalize();
        const plane = new Plane().setFromNormalAndCoplanarPoint(normal, e.point);
        const ray = new Raycaster(), first = e.point.clone(), hit = new Vector3();
        const start = useCut.getState().offset;
        const orbit = controls as unknown as {
            enabled: boolean;
        } | null;
        const wasEnabled = orbit?.enabled ?? true;
        if (orbit)
            orbit.enabled = false;
        const pointerId = e.pointerId;
        const finish = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); window.removeEventListener('blur', finish); if (orbit)
            orbit.enabled = wasEnabled; try {
            gl.domElement.releasePointerCapture(pointerId);
        }
        catch { } cleanup.current = null; };
        const move = (event: PointerEvent) => { if (event.pointerId !== pointerId)
            return; const rect = gl.domElement.getBoundingClientRect(); ray.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera); if (ray.ray.intersectPlane(plane, hit))
            useCut.getState().setOffset(start + hit.clone().sub(first).dot(axis) / SCALE, !event.altKey); };
        cleanup.current = finish;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);
        window.addEventListener('blur', finish);
        try {
            gl.domElement.setPointerCapture(pointerId);
        }
        catch { }
    };
    return <group position={toScene(p.position)} rotation={rotation}>
  <group position={acrossWidth ? [0, 0, x] : [x, 0, 0]} rotation={[0, acrossWidth ? -Math.PI / 2 : 0, 0]} onPointerDown={down} onClick={e => e.stopPropagation()}>
   <mesh><boxGeometry args={[.035, h * 2, w * 2]}/><meshBasicMaterial color="#005098" transparent opacity={.13} depthWrite={false}/></mesh>
   <Line points={[[0, -h, -w], [0, h, -w], [0, h, w], [0, -h, w], [0, -h, -w]]} color="#005098" lineWidth={2.5} raycast={() => { }} depthTest={false}/>
   <mesh position={[0, h + CUT.handleRadius, 0]}><sphereGeometry args={[CUT.handleRadius, 20, 12]}/><meshBasicMaterial color="#005098" depthTest={false}/></mesh>
  </group>
  <SceneLabel position={acrossWidth ? [0, h + CUT.handleRadius * 3, x] : [x, h + CUT.handleRadius * 3, 0]} text={cutMeasure(p, cutAxis, offset, kerf, isSheet(project, p))} className="cut-measure-label" onActivate={() => useCut.getState().setEditing(true)}/>
 </group>;
}
