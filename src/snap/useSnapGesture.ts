import { useTools } from '../interaction/store';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh, Quaternion, MathUtils } from 'three';
import type { Piece, Vec3 } from '../model';
import { SCALE } from '../model';
import { useEditor, selectionIds } from '../store';
import { prepareTargets, solvePlacement } from './placement';
import { solveRotation } from './angular';
import type { SnapBody } from './geometry';
import type { SnapPreviewState } from './types';
import type { GrabIntent } from './intent';
interface Gesture {
    axis: string;
    mode: 'translate' | 'rotate';
    targets: SnapBody[];
    rawPosition: Vec3;
    rawQuaternion: Quaternion;
    intent?: GrabIntent;
}
/** The library exposes axis on its runtime event target (its declarations mark it private).
 * Keep that compatibility boundary here, not throughout scene or geometry code. */
function eventAxis(event: unknown): string {
    return (event as {
        target?: {
            axis?: string;
        };
    })?.target?.axis ?? '';
}
export function useSnapGesture(piece: Piece, mesh: RefObject<Mesh>, active: boolean, mode: 'translate' | 'rotate') {
    const orbit = useThree(s => s.controls) as unknown as {
        enabled: boolean;
    } | null;
    const gesture = useRef<Gesture | null>(null), alt = useRef(false);
    const [preview, setPreview] = useState<SnapPreviewState | null>(null);
    const [angles, setAngles] = useState<Vec3 | null>(null);
    const apply = useCallback(() => {
        const g = gesture.current, m = mesh.current;
        if (!g || !m)
            return;
        m.position.set(...g.rawPosition.map(n => n * SCALE) as Vec3);
        m.quaternion.copy(g.rawQuaternion);
        if (alt.current) {
            setPreview({ position: g.rawPosition, bypass: true });
        }
        else if (g.mode === 'translate') {
            const rotation = [m.rotation.x, m.rotation.y, m.rotation.z].map(MathUtils.radToDeg) as Vec3;
            const result = solvePlacement({ ...piece, position: g.rawPosition, rotation }, g.targets, ['X', 'Y', 'Z'].map(a => g.axis.includes(a)), g.intent, useTools.getState().alignment);
            m.position.set(...result.position.map(n => n * SCALE) as Vec3);
            setPreview({ position: result.position, placement: result });
        }
        else {
            const result = solveRotation(g.rawQuaternion, g.axis);
            m.quaternion.copy(result.quaternion);
            setPreview({ position: g.rawPosition, angular: result.feedback, axis: result.axis });
        }
        if (g.mode === 'rotate')
            setAngles([m.rotation.x, m.rotation.y, m.rotation.z].map(MathUtils.radToDeg) as Vec3);
        const ids=selectionIds(useEditor.getState());
        if(g.mode==='translate'&&ids.length>1)useTools.setState({drag:{ids:ids.filter(id=>id!==piece.id),delta:m.position.toArray().map((n,i)=>n/SCALE-piece.position[i]) as Vec3}});
        m.updateMatrixWorld();
    }, [piece, mesh]);
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.key !== 'Alt')
                return;
            alt.current = e.type === 'keydown';
            if (gesture.current) {
                e.preventDefault();
                apply();
            }
        };
        const blur = () => {
            alt.current = false;
            if (gesture.current)
                apply();
        };
        window.addEventListener('keydown', key);
        window.addEventListener('keyup', key);
        window.addEventListener('blur', blur);
        return () => { window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); window.removeEventListener('blur', blur); };
    }, [apply]);
    useEffect(()=>useTools.subscribe((s,previous)=>{if(s.alignment!==previous.alignment&&gesture.current)apply();}),[apply]);
    // Selection/mode changes cancel the uncommitted preview and release the orbit controls.
    useEffect(() => {
        if (!gesture.current || (active && gesture.current.mode === mode))
            return;
        useTools.setState({drag:null});
        gesture.current = null;
        useTools.setState({drag:null,manipulating:false});
        setPreview(null);
        setAngles(null);
        if (mesh.current) {
            mesh.current.position.set(...piece.position.map(n => n * SCALE) as Vec3);
            mesh.current.rotation.set(...piece.rotation.map(MathUtils.degToRad) as Vec3);
        }
        if (orbit)
            orbit.enabled = true;
    }, [active, mode, piece, mesh, orbit]);
    useEffect(() => () => {
        if (gesture.current && orbit)
            orbit.enabled = true;
    }, [orbit]);
    const start = (event: unknown) => {
        if (useEditor.getState().project.pieces.some(p=>selectionIds(useEditor.getState()).includes(p.id)&&p.isLocked))return;
        useTools.setState({manipulating:true});
        gesture.current = { axis: eventAxis(event), mode: useEditor.getState().mode, targets: prepareTargets(useEditor.getState().project.pieces.filter(p=>p.id===piece.id||!selectionIds(useEditor.getState()).includes(p.id)), piece.id), rawPosition: mesh.current.position.toArray().map(n => n / SCALE) as Vec3, rawQuaternion: mesh.current.quaternion.clone() };
    };
    const change = () => {
        const g = gesture.current;
        if (!g)
            return;
        // TransformControls recomputes this pose from the gesture's original pointer on each event.
        // We never feed our snapped pose back into that origin: escaping capture remains possible.
        const nextPosition = mesh.current.position.toArray().map(n => n / SCALE) as Vec3;
        if (g.intent)
            g.intent.motion = nextPosition.map((n, i) => n - g.rawPosition[i]) as Vec3;
        g.rawPosition = nextPosition;
        g.rawQuaternion.copy(mesh.current.quaternion);
        apply();
    };
    const finish = () => {
        if (!gesture.current)
            return;
        const m = mesh.current;
        useEditor.getState().update(piece.id, { position: m.position.toArray().map(n => n / SCALE) as Vec3, rotation: [m.rotation.x, m.rotation.y, m.rotation.z].map(MathUtils.radToDeg) as Vec3 });
        gesture.current = null;
        if(useTools.getState().drag)useTools.setState({drag:null});
        setPreview(null);
        setAngles(null);
    };
    const beginDirect = (localPoint: Vec3) => {
        start({ target: { axis: 'XYZ' } });
        if (gesture.current) {
            gesture.current.mode = 'translate';
            gesture.current.intent = { localPoint, motion: [0, 0, 0] };
        }
    };
    const cancel = () => {
        gesture.current = null;
        if(useTools.getState().drag)useTools.setState({drag:null});
        setPreview(null);
        setAngles(null);
        if (mesh.current) {
            mesh.current.position.set(...piece.position.map(n => n * SCALE) as Vec3);
            mesh.current.rotation.set(...piece.rotation.map(MathUtils.degToRad) as Vec3);
        }
        if (orbit)
            orbit.enabled = true;
    };
    return { start, change, finish, preview, angles, beginDirect, cancel, isManipulating: () => !!gesture.current && !gesture.current.intent };
}
