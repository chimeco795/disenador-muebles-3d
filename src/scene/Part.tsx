import { OperationGeometry, OperationVisuals } from './OperationVisuals';
import { useOperation } from '../operations/store';
import { faceFrame, faceFromNormal } from '../operations/geometry';
import { useRef, useEffect } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useDirectDrag } from '../snap/useDirectDrag';
import { useCut } from '../cutting/store';
import { CutPreview } from './CutPreview';
import { TransformControls, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { SceneLabel } from './SceneLabel';
import { SnapPreview } from './SnapPreview';
import { useSnapGesture } from '../snap/useSnapGesture';
import { useEditor, selectionIds } from '../store';
import { SCALE, toScene, type Piece, type Vec3 } from '../model';
import { useTools, focusPiece } from '../interaction/store';
import { pickInteraction } from '../interaction/pick';
import { SelectionDimensions } from './SelectionDimensions';
export function Part({piece:p,showDimensions}:{piece:Piece;showDimensions:boolean}){
 const selected=useEditor(s=>selectionIds(s).includes(p.id)),primary=useEditor(s=>s.selected===p.id),mode=useEditor(s=>s.mode),count=useEditor(s=>selectionIds(s).length);
 const selectionLocked=useEditor(s=>s.project.pieces.some(p=>selectionIds(s).includes(p.id)&&p.isLocked));
 const mesh=useRef<THREE.Mesh>(null!),drillDragging=useRef(false),rightStart=useRef<[number,number]|null>(null);const {controls}=useThree();const orbit=controls as unknown as {enabled:boolean}|null;
 const tools=useTools(),operation=useOperation(),operating=operation.pieceId===p.id,draft=operating?operation.draft:null;
 const cutting=useCut(s=>s.pieceId===p.id),blocked=!!tools.mode||!!tools.joinDraft;
 const snap=useSnapGesture(p,mesh,primary&&!p.isLocked&&!cutting&&!operating&&!blocked,mode);
 const {start,change,finish,preview,angles}=snap;
 const {down,dragging}=useDirectDrag(p,mesh,mode==='translate'&&!cutting&&!operating&&!blocked,snap);
 useEffect(()=>{const release=()=>{if(drillDragging.current&&orbit)orbit.enabled=true;drillDragging.current=false;};window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);return()=>{release();window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);};},[orbit,operating]);
 const pick=(e:ThreeEvent<PointerEvent>)=>({pieceId:p.id,face:faceFromNormal((e.face?.normal??new THREE.Vector3(0,1,0)).toArray() as Vec3),point:e.point.clone().divideScalar(SCALE).toArray() as Vec3});
 const drill=(e:ThreeEvent<PointerEvent>)=>{if(!e.face)return;const face=pick(e).face,f=faceFrame(p,face),local=mesh.current.worldToLocal(e.point.clone()).divideScalar(SCALE).sub(new THREE.Vector3(...f.origin));operation.pick(face,local.dot(new THREE.Vector3(...f.u)),local.dot(new THREE.Vector3(...f.v)));};
 const shifted=tools.drag?.ids.includes(p.id)?p.position.map((n,i)=>n+tools.drag!.delta[i]) as Vec3:p.position;
 return <><mesh ref={mesh} position={toScene(shifted)} rotation={p.rotation.map(THREE.MathUtils.degToRad) as Vec3} castShadow receiveShadow
 onPointerDown={e=>{if(e.button===2){rightStart.current=[e.clientX,e.clientY];return;}if(e.button!==0)return;if(tools.mode){e.stopPropagation();pickInteraction(pick(e));return;}if(operating){e.stopPropagation();if(draft?.kind==='drill'){drillDragging.current=true;if(orbit)orbit.enabled=false;drill(e);}return;}if(e.shiftKey){e.stopPropagation();useEditor.getState().select(p.id,true);return;}down(e);}}
 onPointerMove={e=>{if(tools.mode){e.stopPropagation();if(!tools.second)useTools.setState({hover:pick(e)});}else if(operating&&drillDragging.current&&draft?.kind==='drill'){e.stopPropagation();drill(e);}}}
 onPointerUp={e=>{if(tools.mode==='join'&&tools.first&&tools.first.pieceId!==p.id){e.stopPropagation();pickInteraction(pick(e));}}}
 onClick={e=>{e.stopPropagation();if(blocked||operating||e.shiftKey)return;if(!selectionIds(useEditor.getState()).includes(p.id))useEditor.getState().select(p.id);}}
 onDoubleClick={e=>{e.stopPropagation();if(!blocked&&!operating)focusPiece(p.id);}}
 onContextMenu={e=>{e.stopPropagation();e.nativeEvent.preventDefault();if(rightStart.current&&Math.hypot(e.clientX-rightStart.current[0],e.clientY-rightStart.current[1])>4)return;if(!selectionIds(useEditor.getState()).includes(p.id))useEditor.getState().select(p.id);useTools.setState({context:{id:p.id,x:e.clientX,y:e.clientY}});}}>
 {(p.operations?.length||draft)?<OperationGeometry piece={p} draft={draft?.kind==='drill'?null:draft}/>:<boxGeometry args={[p.length*SCALE,p.height*SCALE,p.width*SCALE]}/>}<OperationVisuals piece={p} draft={draft}/><meshStandardMaterial color={p.color} roughness={.62}/>
 {selected&&p.code&&<SceneLabel position={[0,p.height*SCALE/2+.25,0]} className="piece-code-tag" text={p.code+(p.usage==='available'?' · Sobrante':'')}/>}{selected&&<Edges color="#005098" lineWidth={2}/>}
 {primary&&!cutting&&!operating&&showDimensions&&!angles&&<SelectionDimensions piece={p}/>}
 {primary&&angles&&<SceneLabel position={[0,p.height*SCALE/2+.1,0]} className="dimension-tag" text={angles.map((v,i)=>'XYZ'[i]+' '+v.toFixed(1)+'°').join(' · ')}/>}
 </mesh>
 {primary&&!selectionLocked&&!p.isLocked&&!cutting&&!operating&&!blocked&&!dragging&&(mode==='translate'||count===1)&&<TransformControls object={mesh} mode={mode} space="world" size={.85} onMouseDown={start} onMouseUp={finish} onObjectChange={change}/>}
 {primary&&preview&&!cutting&&<SnapPreview state={preview}/>}{cutting&&<CutPreview piece={p}/>}
 </>;
}
