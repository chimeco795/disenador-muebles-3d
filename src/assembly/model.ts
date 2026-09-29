import type { Piece, Project } from '../model';
import type { Face } from '../operations/types';
import { bodyFor, facesOverlap } from '../snap/geometry';
export const joinTypes=['Sin especificar','Tornillos','Tarugos','Pocket hole','Espiga','Otro'] as const;
export interface JoinEnd { pieceId:string; code:string; face:Face; geometry:string }
export interface Join { id:string; a:JoinEnd; b:JoinEnd; type:typeof joinTypes[number]; quantity?:number; diameter?:number; length?:number; spacing?:number; position?:string; notes?:string }
export const JOIN_TOLERANCE={distance:2,angleDegrees:5};
export const geometryStamp=(p:Piece)=>JSON.stringify([p.length,p.width,p.height,p.operations??[]]);
export const joinEnd=(p:Piece,face:Face):JoinEnd=>({pieceId:p.id,code:p.code??p.name,face,geometry:geometryStamp(p)});
const faceKeys:Record<Face,string>={left:'0:-1',right:'0:1',bottom:'1:-1',top:'1:1',back:'2:-1',front:'2:1'};
export const faceFor=(p:Piece,f:Face)=>bodyFor(p).faces.find(v=>v.key===p.id+':'+faceKeys[f])!;
export function joinReview(project:Project,j:Join):string|null {
 const a=project.pieces.find(p=>p.id===j.a.pieceId),b=project.pieces.find(p=>p.id===j.b.pieceId);
 if(!a||!b)return 'Una pieza fue eliminada o subdividida. Reasigna la unión.';
 if(geometryStamp(a)!==j.a.geometry||geometryStamp(b)!==j.b.geometry)return 'Cambió la geometría de una pieza. Revisa las caras y guarda la unión.';
 const fa=faceFor(a,j.a.face),fb=faceFor(b,j.b.face);
 if(fa.normal.dot(fb.normal)>-Math.cos(JOIN_TOLERANCE.angleDegrees*Math.PI/180)||Math.abs(fb.center.clone().sub(fa.center).dot(fa.normal))>JOIN_TOLERANCE.distance||!facesOverlap(fa,fb))return 'Las caras ya no están enfrentadas y en contacto. Revisa la colocación o las caras.';
 if(a.usage!=='used'||b.usage!=='used')return 'Una pieza está fuera de la lista de fabricación.';
 return null;
}
export function nearestFaces(a:Piece,b:Piece):[Face,Face]{
 let result:[Face,Face]=['right','left'],best=Infinity;
 for(const af of Object.keys(faceKeys) as Face[])for(const bf of Object.keys(faceKeys) as Face[]){const fa=faceFor(a,af),fb=faceFor(b,bf);const contact=fa.normal.dot(fb.normal)<=-Math.cos(JOIN_TOLERANCE.angleDegrees*Math.PI/180)&&Math.abs(fb.center.clone().sub(fa.center).dot(fa.normal))<=JOIN_TOLERANCE.distance&&facesOverlap(fa,fb);const score=fa.center.distanceTo(fb.center)+(contact?0:4*(a.length+a.width+a.height+b.length+b.width+b.height))+(1+fa.normal.dot(fb.normal))*10000;if(score<best){best=score;result=[af,bf];}}
 return result;
}
export function describeJoin(j:Join){return [j.quantity ? j.quantity+' × '+j.type:j.type,j.diameter?'diámetro '+j.diameter+' mm':'',j.length?'longitud '+j.length+' mm':'',j.spacing?'separación '+j.spacing+' mm':'',j.position,j.notes].filter(Boolean).join(' · ');}
