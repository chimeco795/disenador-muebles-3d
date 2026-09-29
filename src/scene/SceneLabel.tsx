import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import type { Vec3 } from '../model';
// Lightweight text overlays share the canvas container, without nested React roots.
export function SceneLabel({ position, text, className, onActivate }: {
    position: Vec3;
    text: string;
    className: string;
    onActivate?: () => void;
}) {
    const group = useRef<Group>(null!);
    const label = useRef<HTMLDivElement | null>(null);
    const point = useRef(new Vector3());
    const { gl, camera, size } = useThree();
    useEffect(() => { const element = document.createElement('div'); Object.assign(element.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none', whiteSpace: 'nowrap' }); gl.domElement.parentElement?.appendChild(element); label.current = element; return () => { element.remove(); label.current = null; }; }, [gl]);
    useEffect(() => {
        if (label.current) {
            label.current.textContent = text;
            label.current.className = className;
        }
    }, [text, className]);
    useEffect(() => {
        const element = label.current;
        if (!element || !onActivate)
            return;
        element.style.pointerEvents = 'auto';
        element.tabIndex = 0;
        element.setAttribute('role', 'button');
        const click = (event: Event) => { event.stopPropagation(); onActivate(); };
        const key = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            onActivate();
        } };
        element.addEventListener('click', click);
        element.addEventListener('keydown', key);
        return () => { element.removeEventListener('click', click); element.removeEventListener('keydown', key); };
    }, [onActivate]);
    useFrame(() => {
        if (!label.current || !group.current)
            return;
        group.current.getWorldPosition(point.current);
        point.current.project(camera);
        label.current.style.display = point.current.z > 1 || point.current.z < -1 ? 'none' : 'block';
        label.current.style.transform = `translate(-50%, -50%) translate(${(point.current.x + 1) * size.width / 2}px, ${(-point.current.y + 1) * size.height / 2}px)`;
    });
    return <group ref={group} position={position}/>;
}
