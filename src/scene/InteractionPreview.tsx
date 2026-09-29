import { useOperation } from '../operations/store';
import { useCut } from '../cutting/store';
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { useEditor } from '../store';
import { useTools } from '../interaction/store';
import { startJoin } from '../interaction/pick';
import { faceFor, joinEnd, joinReview, nearestFaces } from '../assembly/model';
import { toScene, type Vec3 } from '../model';
import { FaceHighlight } from './SnapPreview';
import { SceneLabel } from './SceneLabel';
export function InteractionPreview(){const editing=useOperation(s=>!!s.pieceId),cutting=useCut(s=>!!s.pieceId),t=useTools(),project=useEditor(s=>s.project),selected=useEditor(s=>s.selected);
 const suggestion=useMemo(()=>{const a=project.pieces.find(p=>p.id===selected&&!p.isHidden);if(!a)return null;for(const b of project.pieces.filter(p=>p.id!==a.id&&!p.isHidden)){if(project.joins?.some(j=>[j.a.pieceId,j.b.pieceId].includes(a.id)&&[j.a.pieceId,j.b.pieceId].includes(b.id)))continue;const [af,bf]=nearestFaces(a,b);const j={id:'preview',a:joinEnd(a,af),b:joinEnd(b,bf),type:'Sin especificar' as const};if(!joinReview({...project,pieces:[{...a,usage:'used'},{...b,usage:'used'}]},j))return {a:{pieceId:a.id,face:af,point:faceFor(a,af).center.toArray() as Vec3},b:{pieceId:b.id,face:bf,point:faceFor(b,bf).center.toArray() as Vec3}};}return null;},[project,selected]);
 const end=t.second??t.hover,first=t.first;
 return <>{[first,end].map((pick,i)=>{const p=project.pieces.find(p=>p.id===pick?.pieceId&&!p.isHidden);return p&&pick?<FaceHighlight key={i} face={faceFor(p,pick.face)} color={i?'#008e86':'#0074ce'}/>:null;})}
 {first&&end&&t.mode==='measure'&&<><Line points={[toScene(first.point),toScene(end.point)]} color="#005098" lineWidth={2} depthTest={false} raycast={()=>{}}/><SceneLabel position={toScene(first.point.map((n,i)=>(n+end.point[i])/2) as Vec3)} text={new Vector3(...first.point).distanceTo(new Vector3(...end.point)).toFixed(1)+' mm'} className="snap-tag captured"/></>}
 {(project.joins??[]).map(j=>{const a=project.pieces.find(p=>p.id===j.a.pieceId&&!p.isHidden),b=project.pieces.find(p=>p.id===j.b.pieceId&&!p.isHidden);if(!a||!b)return null;const p=faceFor(a,j.a.face).center,q=faceFor(b,j.b.face).center,mid=p.clone().add(q).multiplyScalar(.5),review=joinReview(project,j);return <group key={j.id}><Line points={[toScene(p.toArray() as Vec3),toScene(q.toArray() as Vec3)]} color={review?'#b47a28':'#008e86'} lineWidth={2} dashed depthTest={false} raycast={()=>{}}/><mesh position={toScene(mid.toArray() as Vec3)} onClick={e=>{e.stopPropagation();useTools.setState({joinDraft:j});}}><sphereGeometry args={[.015,12,8]}/><meshBasicMaterial color={review?'#b47a28':'#008e86'} depthTest={false}/></mesh>{[a.id,b.id].includes(selected??'')&&<SceneLabel position={toScene(mid.toArray() as Vec3)} text={j.a.code+' + '+j.b.code+(review?' · Revisar':' · Unión')} className="join-tag" onActivate={()=>useTools.setState({joinDraft:j})}/>}</group>;})}
 {suggestion&&!editing&&!cutting&&!t.mode&&!t.manipulating&&!t.joinDraft&&<SceneLabel position={toScene(suggestion.a.point)} text="+ Crear unión" className="join-tag" onActivate={()=>startJoin(suggestion.a,suggestion.b)}/>}
 </>;
}
