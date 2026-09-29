import { useEffect, useRef, useState, type RefObject } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Mesh, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Piece, Vec3 } from '../model';
import { SCALE } from '../model';
import { useEditor, selectionIds } from '../store';
import { SNAP } from './config';
interface DragActions {
    isManipulating: () => boolean;
    beginDirect: (point: Vec3) => void;
    change: () => void;
    finish: () => void;
    cancel: () => void;
}
export function useDirectDrag(piece: Piece, mesh: RefObject<Mesh>, enabled: boolean, actions: DragActions) {
    const { camera, gl, controls } = useThree();
    const [dragging, setDragging] = useState(false);
    const cleanup = useRef<(() => void) | null>(null);
    const enabledNow = useRef(enabled);
    enabledNow.current = enabled;
    useEffect(() => () => { cleanup.current?.(); }, []);
    const down = (event: ThreeEvent<PointerEvent>) => {
        if (event.button !== 0 || !enabled || piece.isLocked)
            return;
        event.stopPropagation();
        if (actions.isManipulating())
            return;
        const editor=useEditor.getState();
        if(selectionIds(editor).includes(piece.id))useEditor.setState({selected:piece.id});else editor.select(piece.id);
        if(editor.project.pieces.some(p=>selectionIds(useEditor.getState()).includes(p.id)&&p.isLocked))return;
        const orbit = controls as unknown as {
            enabled: boolean;
        } | null;
        const oldEnabled = orbit?.enabled ?? true;
        if (orbit)
            orbit.enabled = false;
        const local = mesh.current.worldToLocal(event.point.clone()).divideScalar(SCALE).toArray() as Vec3;
        const origin = mesh.current.position.clone(), grab = event.point.clone();
        const plane = new Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()), grab);
        const ray = new Raycaster(), hit = new Vector3();
        let started = false;
        const x = event.clientX, y = event.clientY, pointerId = event.pointerId;
        const remove = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); window.removeEventListener('blur', cancel); window.removeEventListener('keydown', key); if (orbit)
            orbit.enabled = oldEnabled; try {
            gl.domElement.releasePointerCapture(pointerId);
        }
        catch { } cleanup.current = null; };
        const cancel = () => { remove(); if (started)
            actions.cancel(); setDragging(false); };
        const move = (e: PointerEvent) => {
            if (e.pointerId !== pointerId)
                return;
            if (!enabledNow.current || useEditor.getState().selected !== piece.id || useEditor.getState().mode !== 'translate') {
                cancel();
                return;
            }
            if (!started) {
                if (Math.hypot(e.clientX - x, e.clientY - y) < SNAP.directDragPixels)
                    return;
                started = true;
                actions.beginDirect(local);
                setDragging(true);
            }
            const rect = gl.domElement.getBoundingClientRect();
            ray.setFromCamera(new Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
            if (!ray.ray.intersectPlane(plane, hit))
                return;
            mesh.current.position.copy(origin).add(hit.clone().sub(grab));
            actions.change();
        };
        const up = (e: PointerEvent) => { if (e.pointerId !== pointerId)
            return; remove(); if (started)
            actions.finish(); setDragging(false); };
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
            cancel(); };
        cleanup.current = remove;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        window.addEventListener('keydown', key);
        try {
            gl.domElement.setPointerCapture(pointerId);
        }
        catch { }
    };
    return { down, dragging };
}
