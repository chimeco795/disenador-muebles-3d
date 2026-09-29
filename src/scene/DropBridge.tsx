import { projectCatalog } from '../materials/catalog';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { catalog, SCALE } from '../model';
import { useEditor } from '../store';
export function DropBridge({ host }: {
    host: HTMLDivElement;
}) {
    const { camera, gl } = useThree();
    useEffect(() => { const drop = (event: DragEvent) => { const material = projectCatalog(useEditor.getState().project).find(m => m.id === event.dataTransfer?.getData('application/x-taller-material')); if (!material)
        return; event.preventDefault(); const rect = gl.domElement.getBoundingClientRect(); const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera); const point = new THREE.Vector3(); if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point))
        point.set(0, 0, 0); useEditor.getState().add(material.id, [Math.round(point.x / SCALE), material.height / 2, Math.round(point.z / SCALE)]); }; host.addEventListener('drop', drop); return () => host.removeEventListener('drop', drop); }, [host, camera, gl]);
    return null;
}
