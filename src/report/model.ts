import { describeJoin, joinReview } from '../assembly/model';
import { faceNames } from '../operations/geometry';
import type { Piece, Project } from '../model';
import { materialPlan, stockTitle } from '../manufacturing/plan';
import { planIsStale } from '../optimization/supplies';
import type { SpecialOperation } from '../operations/types';
export interface ReportCell { x:number;y:number;length:number;width:number;label:string;available:boolean;rotated?:boolean }
export interface ReportStock { name:string;material:string;length:number;width:number;height:number;sheet:boolean;reused?:string;cells:ReportCell[];cuts:{x:number;y:number;length:number;width:number;axis:'length'|'width';offset:number;kerf:number;code:string}[] }
export interface WorkshopReport { assembly:{pieces:string;description:string;faces:string;review:string|null}[];project:string;date:string;mode:'current'|'optimized';kerf:number;stocks:ReportStock[];pieces:{codes:string[];material:string;length:number;width:number;height:number;quantity:number}[];specials:{code:string;piece:Piece;operations:SpecialOperation[]}[] }
export function buildReport(project:Project,mode:'current'|'optimized',date=new Date()):WorkshopReport {
    if(mode==='optimized'&&(!project.optimizedPlan||planIsStale(project)||project.optimizedPlan.unplaced.length))throw new Error('El plan optimizado debe estar vigente y completo.');
    const required=project.pieces.filter(p=>p.usage==='used');
    const groups=new Map<string,WorkshopReport['pieces'][number]>();
    for(const p of required){const key=JSON.stringify([p.materialType,p.length,p.width,p.height,p.operations?.map(({id,...o})=>o)]),entry=groups.get(key);if(entry){entry.codes.push(p.code!);entry.quantity++;}else groups.set(key,{codes:[p.code!],material:p.materialType,length:p.length,width:p.width,height:p.height,quantity:1});}
    const stocks:ReportStock[]=mode==='optimized'?project.optimizedPlan!.stocks.map((s,i,all)=>({
        name:`${s.supply.sheet?'Hoja':'Tabla'} #${all.slice(0,i+1).filter(v=>v.supply.sheet===s.supply.sheet).length}`,material:s.supply.materialType,length:s.supply.length,width:s.supply.width,height:s.supply.height,sheet:s.supply.sheet,
        reused:s.supply.kind==='offcut'?`Sobrante ${s.supply.sourceCode} de ${stockTitle(project.stocks!.find(st=>st.id===s.supply.sourceMaterialId)!)}`:undefined,
        cells:[...s.placements.map(p=>({x:p.x,y:p.y,length:p.length,width:p.width,label:p.piece.code,available:false,rotated:p.rotated})),...s.remaining.map(r=>({...r,label:'Sobrante',available:true}))],cuts:s.cuts.map(c=>({...c,code:c.pieceCode})),
    })):(project.stocks??[]).filter(s=>required.some(p=>p.sourceMaterialId===s.id)).map(s=>{const plan=materialPlan(project,s);return {name:stockTitle(s),material:s.materialType??s.name,length:s.length,width:s.width,height:s.height,sheet:s.family==='Tableros',cells:plan.parts.map(p=>({...p,label:p.status==='archived'?'Retirada':p.code,available:p.status!=='used'})),cuts:plan.cuts.map(c=>({...c,axis:c.record.axis,offset:c.record.offset,kerf:c.record.kerf,code:c.record.parent.code??'Base'}))};});
    return {assembly:(project.joins??[]).map(j=>({pieces:j.a.code+' + '+j.b.code,description:describeJoin(j),faces:faceNames[j.a.face]+' + '+faceNames[j.b.face],review:joinReview(project,j)})),project:project.name,date:date.toLocaleDateString('es-MX'),mode,kerf:mode==='optimized'?project.optimizedPlan!.kerf:project.sawKerf??0,stocks,pieces:[...groups.values()],specials:required.filter(p=>p.operations?.length).map(p=>({code:p.code!,piece:p,operations:p.operations!}))};
}
export function reportPurchases(report:WorkshopReport){const groups=new Map<string,{label:string;quantity:number}>();for(const s of report.stocks.filter(s=>!s.reused)){const label=`${s.sheet?'Hoja':'Tabla'} ${s.material} ${s.length} × ${s.width} × ${s.height} mm`;const found=groups.get(label);if(found)found.quantity++;else groups.set(label,{label,quantity:1});}return [...groups.values()];}
