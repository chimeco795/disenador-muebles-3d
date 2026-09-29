import { Vector3 } from 'three';
import type { Piece, Vec3 } from '../model';
import type { Face, SpecialOperation } from './types';
export type Point = [number, number];
export const faceNames: Record<Face,string> = { top:'Superior',bottom:'Inferior',front:'Frente',back:'Fondo',left:'Extremo inicial',right:'Extremo final' };
export function faceReference(face:Face){return face==='top'||face==='bottom'?'Primera cota desde el extremo inicial; segunda desde el fondo de la base.':face==='front'||face==='back'?'Primera cota desde el extremo inicial; segunda desde la cara inferior.':'Primera cota desde el fondo de la base; segunda desde la cara inferior.';}
export function faceFrame(p: Piece, face: Face) {
    const x=p.length/2,y=p.height/2,z=p.width/2;
    const frames: Record<Face,{origin:Vec3;u:Vec3;v:Vec3;normal:Vec3;maxU:number;maxV:number;depth:number}> = {
        top:{origin:[-x,y,-z],u:[1,0,0],v:[0,0,1],normal:[0,1,0],maxU:p.length,maxV:p.width,depth:p.height},
        bottom:{origin:[-x,-y,-z],u:[1,0,0],v:[0,0,1],normal:[0,-1,0],maxU:p.length,maxV:p.width,depth:p.height},
        front:{origin:[-x,-y,z],u:[1,0,0],v:[0,1,0],normal:[0,0,1],maxU:p.length,maxV:p.height,depth:p.width},
        back:{origin:[-x,-y,-z],u:[1,0,0],v:[0,1,0],normal:[0,0,-1],maxU:p.length,maxV:p.height,depth:p.width},
        left:{origin:[-x,-y,-z],u:[0,0,1],v:[0,1,0],normal:[-1,0,0],maxU:p.width,maxV:p.height,depth:p.length},
        right:{origin:[x,-y,-z],u:[0,0,1],v:[0,1,0],normal:[1,0,0],maxU:p.width,maxV:p.height,depth:p.length},
    }; return frames[face];
}
export function facePoint(p:Piece,face:Face,u:number,v:number):Vec3 {
    const f=faceFrame(p,face);return new Vector3(...f.origin).addScaledVector(new Vector3(...f.u),u).addScaledVector(new Vector3(...f.v),v).toArray() as Vec3;
}
export function faceFromNormal(n:Vec3):Face { const axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))); return axis===0?(n[0]>0?'right':'left'):axis===1?(n[1]>0?'top':'bottom'):(n[2]>0?'front':'back'); }
export function angularLine(p:Piece,op:Extract<SpecialOperation,{kind:'angular'}>) {
    const a=op.angle*Math.PI/180;
    const normal:Point=op.axis==='length'?[Math.cos(a),-Math.sin(a)]:[Math.sin(a),Math.cos(a)];
    const center:Point=op.axis==='length'?[op.offset,p.width/2]:[p.length/2,op.offset];
    const signed=(point:Point)=>(point[0]-center[0])*normal[0]+(point[1]-center[1])*normal[1];
    const corners:Point[]=[[0,0],[p.length,0],[p.length,p.width],[0,p.width]], hits:Point[]=[];
    for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],da=signed(a),db=signed(b);if(Math.abs(da)<1e-8)hits.push(a);if(da*db<0){const t=da/(da-db);hits.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}
    return {normal,center,signed,hits};
}
export function outline(p:Piece, operations=p.operations??[]):Point[] {
    const L=p.length,W=p.width,curve=operations.find(o=>o.kind==='curve'&&o.shape!=='circle');
    let poly:Point[]=[[0,0],[L,0],[L,W],[0,W]];
    if(curve?.kind==='curve'){
        const r=curve.radius;
        if(curve.shape==='semicircle') poly=Array.from({length:49},(_,i)=>{const a=-Math.PI/2+i*Math.PI/48;return [curve.u+Math.cos(a)*r,curve.v+Math.sin(a)*r] as Point;});
        else if(curve.shape==='arc') poly=[[0,0],[L-r,0],[L-r,W/2-r],...Array.from({length:49},(_,i)=>{const a=-Math.PI/2+i*Math.PI/48;return [L-r+Math.cos(a)*r,W/2+Math.sin(a)*r] as Point;}),[L-r,W],[0,W]];
        else {
            const near=curve.corner.startsWith('near'),left=curve.corner.endsWith('left');
            const base:Point[]=[[r,0],[L,0],[L,W],[0,W],[0,r],...Array.from({length:17},(_,i)=>{const a=Math.PI+i*Math.PI/32;return [r+Math.cos(a)*r,r+Math.sin(a)*r] as Point;})];
            poly=base.map(([x,y])=>[left?x:L-x,near?y:W-y]);
        }
    }
    for(const op of operations){if(op.kind!=='angular')continue;const {signed}=angularLine(p,op),sign=op.keep==='start'?1:-1;
        const next:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=signed(a)*sign+op.kerf/2,db=signed(b)*sign+op.kerf/2;if(da<=0)next.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}poly=next;
    }return poly;
}
export function area(poly:Point[]){return Math.abs(poly.reduce((n,a,i)=>{const b=poly[(i+1)%poly.length];return n+a[0]*b[1]-b[0]*a[1];},0))/2;}
export function inside(point:Point,poly:Point[]){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function operationError(p:Piece,op:SpecialOperation):string|null {
    const operations=(p.operations??[]).filter(o=>o.id!==op.id);
    if(op.kind==='angular'){
        if(!Number.isFinite(op.angle)||Math.abs(op.angle)>90||!Number.isFinite(op.offset)||op.offset<=0||op.offset>=p[op.axis]||!Number.isFinite(op.kerf)||op.kerf<0)return 'Revisa ángulo (-90 a 90°), posición y ancho de sierra.';
        if(operations.some(o=>o.kind==='angular'))return 'Elimina el corte angular anterior antes de definir otro.';
        if(area(outline(p,[...operations,op]))<1)return 'El corte eliminaría toda la pieza.';
    }else if(op.kind==='drill'){
        const f=faceFrame(p,op.face),r=op.diameter/2;
        if(!f||![op.u,op.v,op.diameter,op.depth].every(Number.isFinite)||r<=0||op.depth<=0||op.depth>f.depth||op.u-r<0||op.v-r<0||op.u+r>f.maxU||op.v+r>f.maxV)return 'La perforación debe caber en la cara y su profundidad no puede superar la pieza.';
        if((op.face==='top'||op.face==='bottom')&&!Array.from({length:24},(_,i)=>inside([op.u+Math.cos(i*Math.PI/12)*r,op.v+Math.sin(i*Math.PI/12)*r],outline(p))).every(Boolean))return 'La perforación sale del contorno acabado.';
    }else{
        if(![op.radius,op.u,op.v].every(Number.isFinite)||op.radius<=0)return 'Indica un radio válido.';
        if(op.shape!=='circle'&&operations.some(o=>o.kind==='curve'&&o.shape!=='circle'))return 'Usa una forma de contorno por pieza; elimina la anterior para cambiarla.';
        if(op.shape==='round-corner'&&op.radius>Math.min(p.length,p.width)/2)return 'El radio excede la mitad del lado menor.';
        if(op.shape==='arc'&&(op.radius>p.width/2||op.radius>=p.length))return 'El arco debe caber en el ancho y largo de la base.';
        if(['circle','semicircle'].includes(op.shape)&&(op.u-op.radius<0||op.v-op.radius<0||op.u+op.radius>p.length||op.v+op.radius>p.width))return 'La forma debe caber dentro de la base.';
        if(op.shape==='circle'&&!Array.from({length:24},(_,i)=>inside([op.u+Math.cos(i*Math.PI/12)*op.radius,op.v+Math.sin(i*Math.PI/12)*op.radius],outline(p))).every(Boolean))return 'El círculo sale del contorno acabado.';
    }
    const hole=(o:SpecialOperation)=>o.kind==='curve'&&o.shape==='circle'?{u:o.u,v:o.v,r:o.radius}:o.kind==='drill'&&(o.face==='top'||o.face==='bottom')?{u:o.u,v:o.v,r:o.diameter/2}:null;
    const addedHole=hole(op);
    if(addedHole&&operations.some(o=>{const h=hole(o);return h&&Math.hypot(h.u-addedHole.u,h.v-addedHole.v)<h.r+addedHole.r;}))return 'Los agujeros no pueden solaparse. Cambia su posición o elimina el anterior.';
    // Finish changes may not silently remove previously placed holes.
    if(op.kind==='angular'||(op.kind==='curve'&&op.shape!=='circle'))for(const existing of operations){if((existing.kind==='drill'&&(existing.face==='top'||existing.face==='bottom'))||(existing.kind==='curve'&&existing.shape==='circle')){const finished={...p,operations:[...operations.filter(o=>o.id!==existing.id),op]};if(operationError(finished,existing))return 'La forma eliminaría una perforación existente. Retírala o cambia la forma.';}}
    return null;
}
export function describeOperation(op:SpecialOperation):string {
    if(op.kind==='angular')return `Corte angular ${op.angle}°; línea por ${op.offset} mm del ${op.axis==='length'?'extremo inicial (largo)':'borde inicial (ancho)'}, a mitad del otro lado; conservar ${op.keep==='start'?'lado inicial':'lado final'}; sierra ${op.kerf} mm.`;
    if(op.kind==='drill')return `Perforación en cara ${faceNames[op.face].toLowerCase()}: centro a ${op.u} y ${op.v} mm de los bordes iniciales; diámetro ${op.diameter} mm; profundidad ${op.depth} mm. ${faceReference(op.face)}`;
    const names={'round-corner':'Esquina redondeada',arc:'Arco convexo en extremo final',semicircle:'Semicírculo conservado hacia el extremo final',circle:'Agujero circular pasante'};
    if(op.shape==='arc')return `Arco convexo de radio ${op.radius} mm centrado sobre el eje medio del ancho, tangente al extremo final de la base.`;
    return `${names[op.shape]}; radio ${op.radius} mm; ${op.shape==='round-corner'?`esquina ${op.corner.startsWith('near')?'cercana':'lejana'} ${op.corner.endsWith('left')?'inicial':'final'}`:`centro/referencia a ${op.u} × ${op.v} mm`}.`;
}
