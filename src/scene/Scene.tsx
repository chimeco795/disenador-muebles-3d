import { InteractionPreview } from './InteractionPreview';
import { useTools } from '../interaction/store';
import { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { SceneLabel } from './SceneLabel';
import { Part } from './Part';
import { CameraRig } from './CameraRig';
import { DropBridge } from './DropBridge';
import { useEditor } from '../store';
export type View = 'Isométrica' | 'Frontal' | 'Posterior' | 'Izquierda' | 'Derecha' | 'Superior';
export interface SceneSettings {
    grid: boolean;
    shadows: boolean;
    dimensions: boolean;
}
function Rulers() { return <group>{Array.from({ length: 9 }, (_, i) => i - 4).map(n => <group key={n}><SceneLabel position={[n, .003, 0]} className="ruler-label" text={String(n * 1000)}/>{n !== 0 && <SceneLabel position={[0, .003, n]} className="ruler-label" text={String(n * 1000)}/>}</group>)}</group>; }
function ToolControls(){const mode=useTools(s=>s.mode),dialog=useTools(s=>s.joinDraft),controls=useThree(s=>s.controls) as unknown as {enabled:boolean}|null;useEffect(()=>{if(!controls||(!mode&&!dialog))return;const old=controls.enabled;controls.enabled=false;return()=>{controls.enabled=old;};},[mode,dialog,controls]);return null;}
export function Scene({ view, revision, settings }: {
    view: View;
    revision: number;
    settings: SceneSettings;
}) {
    const pieces = useEditor(s => s.project.pieces);
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    return <div className="canvas-host" ref={setHost} onDragOver={e => { if (e.dataTransfer.types.includes('application/x-taller-material')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    } }}>
    <Canvas shadows={settings.shadows} camera={{ position: [4, 3.2, 4], fov: 45, near: .005, far: 500 }} onPointerMissed={e => { if (e.type === 'click'&&!useTools.getState().mode)
        useEditor.getState().select(null); }}>
      <color attach="background" args={['#f5f7fa']}/><ambientLight intensity={1.5}/><directionalLight castShadow={settings.shadows} position={[3, 8, 5]} intensity={2.3} shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.0001} shadow-normalBias={.015}/>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.004, 0]} receiveShadow><planeGeometry args={[200, 200]}/><shadowMaterial transparent opacity={.12}/></mesh>
      {settings.grid && <><Grid position={[0, -.002, 0]} args={[100, 100]} cellSize={.1} sectionSize={1} cellColor="#d8e0e9" sectionColor="#a9bbc9" cellThickness={.5} sectionThickness={.8} fadeDistance={18} infiniteGrid/><Rulers /><axesHelper args={[1]}/></>}
      {pieces.filter(p => !p.isHidden).map(p => <Part key={p.id} piece={p} showDimensions={settings.dimensions}/>)}
      <ToolControls/><InteractionPreview/><CameraRig view={view} revision={revision}/>{host && <DropBridge host={host}/>}
      <GizmoHelper alignment="bottom-right" margin={[65, 65]}><GizmoViewport axisColors={['#eb5160', '#38ad80', '#3989e8']} labelColor="white"/></GizmoHelper>
    </Canvas>
  </div>;
}
