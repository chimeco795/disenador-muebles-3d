import { SceneLabel } from './SceneLabel';
import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Path, Quaternion, Shape, Vector3 } from 'three';
import { Line } from '@react-three/drei';
import type { Piece, Vec3 } from '../model';
import { SCALE } from '../model';
import type { SpecialOperation } from '../operations/types';
import { angularLine, faceFrame, facePoint, operationError, outline } from '../operations/geometry';
export function OperationGeometry({piece:p,draft}:{piece:Piece;draft?:SpecialOperation|null}) {
    const operations=draft&&!operationError(p,draft)?[...(p.operations??[]),draft]:p.operations??[];
    const key=JSON.stringify(operations);
    const geometry=useMemo(()=>{
        const points=outline(p,operations),shape=new Shape();
        points.forEach(([x,y],i)=>i===0?shape.moveTo((x-p.length/2)*SCALE,-(y-p.width/2)*SCALE):shape.lineTo((x-p.length/2)*SCALE,-(y-p.width/2)*SCALE));shape.closePath();
        for(const op of operations){const hole=op.kind==='curve'&&op.shape==='circle'?{u:op.u,v:op.v,r:op.radius}:op.kind==='drill'&&(op.face==='top'||op.face==='bottom')&&op.depth>=p.height?{u:op.u,v:op.v,r:op.diameter/2}:null;if(hole){const path=new Path();path.absarc((hole.u-p.length/2)*SCALE,-(hole.v-p.width/2)*SCALE,hole.r*SCALE,0,Math.PI*2,true);shape.holes.push(path);}}
        const g=new ExtrudeGeometry(shape,{depth:p.height*SCALE,bevelEnabled:false,curveSegments:32});g.rotateX(-Math.PI/2);g.translate(0,-p.height*SCALE/2,0);return g;
    },[p.length,p.width,p.height,key]);
    useEffect(()=>()=>geometry.dispose(),[geometry]);return <primitive object={geometry} attach="geometry"/>;
}
export function OperationVisuals({piece:p,draft}:{piece:Piece;draft?:SpecialOperation|null}) {
    const operations=[...(p.operations??[]),...(draft&&!operationError(p,draft)?[draft]:[])];
    return <>{operations.map(op=>{
        if(op.kind==='angular'){const {hits}=angularLine(p,op);if(hits.length<2)return null;return <Line key={op.id} points={hits.slice(0,2).map(([x,z])=>[(x-p.length/2)*SCALE,p.height*SCALE/2+.004,(z-p.width/2)*SCALE] as Vec3)} color="#005098" lineWidth={3} depthTest={false} raycast={()=>{}}/>;}
        if(op.kind==='drill'){const f=faceFrame(p,op.face),point=facePoint(p,op.face,op.u,op.v).map((n,i)=>(n+f.normal[i]*.8)*SCALE) as Vec3,q=new Quaternion().setFromUnitVectors(new Vector3(0,0,1),new Vector3(...f.normal));return <group key={op.id} position={point} quaternion={q}>{draft?.id===op.id&&<SceneLabel position={[0,op.diameter*SCALE/2+.04,0]} text={'Ø'+op.diameter+' · '+op.u+' × '+op.v+' mm · profundidad '+op.depth+' mm'} className="snap-tag"/>}<mesh raycast={()=>{}}><ringGeometry args={[op.diameter*SCALE/2,op.diameter*SCALE/2+.002,48]}/><meshBasicMaterial color={draft?.id===op.id?'#005098':'#b06b28'} depthTest={false}/></mesh>{(op.depth<f.depth||draft?.id===op.id)&&<mesh raycast={()=>{}}><circleGeometry args={[op.diameter*SCALE/2,48]}/><meshBasicMaterial color="#334c5f" transparent opacity={.85}/></mesh>}</group>;}
        return null;
    })}</>;
}
