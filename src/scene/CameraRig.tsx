import { useTools } from '../interaction/store';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '../store';
import { SCALE, toScene, type Vec3 } from '../model';
import type { View } from './Scene';
export function CameraRig({ view, revision }: {
    view: View;
    revision: number;
}) {
    const focus=useTools(s=>s.focus);
    const { camera, controls } = useThree();
    const destination = useRef<THREE.Vector3 | null>(null);
    const target = useRef(new THREE.Vector3());
    useEffect(() => {
        const box = new THREE.Box3();
        for (const p of useEditor.getState().project.pieces.filter(p => !p.isHidden&&(!focus.id||p.id===focus.id))) {
            const transform = new THREE.Matrix4().compose(new THREE.Vector3(...toScene(p.position)), new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation.map(THREE.MathUtils.degToRad) as Vec3)), new THREE.Vector3(1, 1, 1));
            box.union(new THREE.Box3(new THREE.Vector3(-p.length * SCALE / 2, -p.height * SCALE / 2, -p.width * SCALE / 2), new THREE.Vector3(p.length * SCALE / 2, p.height * SCALE / 2, p.width * SCALE / 2)).applyMatrix4(transform));
        }
        const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
        target.current.copy(center);
        const radius = box.isEmpty() ? 5 : Math.max(focus.id ? .25 : 3, box.getSize(new THREE.Vector3()).length() * 1.5);
        const directions: Record<View, Vec3> = { 'Isométrica': [1, .8, 1], 'Frontal': [0, 0, 1], 'Posterior': [0, 0, -1], 'Izquierda': [-1, 0, 0], 'Derecha': [1, 0, 0], 'Superior': [0, 1, .0001] };
        destination.current = new THREE.Vector3(...directions[view]).normalize().multiplyScalar(radius).add(center);
    }, [view, revision, focus]);
    useFrame((_, delta) => { if (!destination.current || !controls)
        return; const orbit = controls as unknown as {
        target: THREE.Vector3;
        update: () => void;
    }; const alpha = 1 - Math.exp(-delta * 9); camera.position.lerp(destination.current, alpha); orbit.target.lerp(target.current, alpha); orbit.update(); if (camera.position.distanceTo(destination.current) < .005){camera.position.copy(destination.current);orbit.target.copy(target.current);orbit.update();destination.current = null;} });
    return <OrbitControls makeDefault minDistance={.08} maxDistance={100} onStart={() => { destination.current = null; }}/>;
}
