import { Euler, Quaternion, MathUtils, Vector3 } from 'three';
import { registerPiece } from '../materials/project';
import { splitPiece } from '../cutting/split';
import type { Material, Piece, Project, Vec3 } from '../model';
export const templates=['Caja cerrada','Caja abierta','Repisa','Estantería','Mesa','Banco','Cajonera','Escalera','Marco'] as const;
export type Template=typeof templates[number];
export const templateDefaults:Record<Template,[number,number,number]>={'Caja cerrada':[600,600,400],'Caja abierta':[600,400,400],Repisa:[800,300,300],Estantería:[800,1600,350],Mesa:[1200,750,700],Banco:[1000,450,400],Cajonera:[700,800,450],Escalera:[700,600,800],Marco:[600,800,80]};
interface Blank {name:string;length:number;width:number;position:Vec3;rotation:Vec3}
export function templatePieces(kind:Template,W:number,H:number,D:number,t:number):Blank[]{
 if(![W,H,D,t].every(n=>Number.isFinite(n)&&n>0)||W<8*t||H<8*t||D<2*t)throw new Error('Las medidas deben permitir el espesor del material (ancho/alto ≥ 8 espesores; fondo ≥ 2).');
 const parts:Blank[]=[];const add=(name:string,length:number,width:number,position:Vec3,rotation:Vec3=[0,0,0])=>parts.push({name,length,width,position,rotation});
 const floor=(name:string,y:number,w=W,d=D,x=0,z=0)=>add(name,w,d,[x,y,z]);
 const side=(name:string,x:number,y:number,h:number,d=D,z=0)=>add(name,h,d,[x,y,z],[0,0,90]);
 const front=(name:string,z:number,y:number,w:number,h:number,x=0)=>add(name,w,h,[x,y,z],[90,0,0]);
 if(kind==='Mesa'||kind==='Banco'){floor('Cubierta',H-t/2);const leg=Math.min(80,D/4);for(const x of [-1,1])for(const z of [-1,1])side('Pata',x*(W/2-t*1.5),(H-t)/2,H-t,leg,z*(D/2-leg/2-t));if(kind==='Banco')front('Travesaño',0,H/3,W-4*t,Math.min(80,H/4));}
 else if(kind==='Marco'){const rail=Math.min(D,W/4,H/4);front('Travesaño inferior',0,rail/2,W,rail);front('Travesaño superior',0,H-rail/2,W,rail);for(const x of [-1,1])add('Lateral',H-2*rail,rail,[x*(W-rail)/2,H/2,0],[90,90,0]);}
 else if(kind==='Escalera'){const n=4,step=H/n,depth=D/n;if(step<=t||depth<=t)throw new Error('Aumenta el alto o fondo de la escalera.');for(let i=0;i<n;i++){floor('Peldaño '+(i+1),step*(i+1)-t/2,W,depth,0,-D/2+depth*(i+.5));front('Contrahuella '+(i+1),-D/2+depth*i+t/2,step*i+(step-t)/2,W,step-t);}}
 else if(kind==='Repisa'){floor('Repisa',H-t/2);for(const x of [-1,1])side('Soporte',x*(W-t)/2,(H-t)/2,H-t);}
 else{
 const open=kind==='Caja abierta',innerH=H-(open?1:2)*t;
 floor('Base',t/2);if(!open)floor('Tapa',H-t/2);for(const x of [-1,1])side('Lateral',x*(W-t)/2,t+innerH/2,innerH);
 front('Trasera',-D/2+t/2,t+innerH/2,W-2*t,innerH);
 if(kind==='Caja cerrada'||open)front('Frente',D/2-t/2,t+innerH/2,W-2*t,innerH);
 if(kind==='Estantería')for(let i=1;i<=3;i++)floor('Entrepaño '+i,t+innerH*i/4,W-2*t,D-t,0,t/2);
 if(kind==='Cajonera'){const clearance=3,slot=innerH/3,dh=slot-2*clearance,dw=W-2*t-2*clearance,dd=D-t-2*clearance;if(dh<=3*t||dd<=2*t||dw<=2*t)throw new Error('La cajonera necesita más espacio para sus tres cajones.');for(let i=0;i<3;i++){const bottom=t+i*slot+clearance,z=t/2;floor('Cajón '+(i+1)+' · fondo',bottom+t/2,dw,dd,0,z);for(const x of [-1,1])side('Cajón '+(i+1)+' · lateral',x*(dw-t)/2,bottom+t+(dh-t)/2,dh-t,dd,z);for(const end of [-1,1])front('Cajón '+(i+1)+(end===1?' · frente':' · trasera'),z+end*(dd-t)/2,bottom+t+(dh-t)/2,dw-2*t,dh-t);}}
 }
 return parts;
}
export function buildTemplate(project:Project,kind:Template,W:number,H:number,D:number,material:Material):Project {
 const specs=templatePieces(kind,W,H,D,material.height).map(spec=>{
 if((spec.length>material.length||spec.width>material.width)&&spec.width<=material.length&&spec.length<=material.width){const q=new Quaternion().setFromEuler(new Euler(...spec.rotation.map(MathUtils.degToRad) as Vec3)).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/2)),e=new Euler().setFromQuaternion(q);return {...spec,length:spec.width,width:spec.length,rotation:[e.x,e.y,e.z].map(MathUtils.radToDeg) as Vec3};}return spec;
 }),kerf=project.sawKerf??0;
 if(specs.some(s=>s.length>material.length||s.width>material.width||s.length<=0||s.width<=0))throw new Error('Alguna pieza supera el material elegido. Usa una hoja mayor o reduce las medidas.');
 let result=project;const created:string[]=[];
 const xOffset=project.pieces.length?Math.max(...project.pieces.map(p=>p.position[0]+Math.max(p.length,p.width,p.height)/2))+W/2+200:0;
 for(const spec of specs){let id:string=crypto.randomUUID();const blank:Piece={id,name:kind+' · '+spec.name,materialType:material.materialType,sourceMaterialId:material.id,length:material.length,width:material.width,height:material.height,color:material.color,position:[xOffset+W+material.length/2+300,material.height/2,created.length*(material.width+100)],rotation:[0,0,0],isCut:false,isHidden:false,isLocked:false};result=registerPiece(result,blank);
 for(const axis of ['length','width'] as const){const parent=result.pieces.find(p=>p.id===id)!;if(Math.abs(parent[axis]-spec[axis])<.001)continue;const split=splitPiece(result,id,spec[axis],axis,kerf);if(!split)throw new Error('El ancho de sierra no deja espacio para cortar esta plantilla. Ajusta material o dimensiones.');result=split;id=result.cuts!.at(-1)!.childIds[0];}
 created.push(id);result={...result,pieces:result.pieces.map(p=>p.id===id?{...p,name:kind+' · '+spec.name,usage:'used',position:[spec.position[0]+xOffset,spec.position[1],spec.position[2]] as Vec3,rotation:spec.rotation}:p)};
 }
 // Offcuts remain available in inventory; initially hidden so the template can be inspected.
 return {...result,pieces:result.pieces.map(p=>!project.pieces.some(old=>old.id===p.id)&&!created.includes(p.id)?{...p,isHidden:true}:p)};
}
