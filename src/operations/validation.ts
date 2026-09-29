import type { SpecialOperation } from './types';
import { joinTypes } from '../assembly/model';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object';
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const positive=(v:unknown)=>finite(v)&&(v as number)>0;
const vector=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(finite);
const faces=['top','bottom','front','back','left','right'];
export function validOperation(v:unknown):v is SpecialOperation {
 if(!record(v)||typeof v.id!=='string')return false;
 if(v.kind==='angular')return ['length','width'].includes(v.axis as string)&&positive(v.offset)&&finite(v.angle)&&Math.abs(v.angle as number)<=90&&['start','end'].includes(v.keep as string)&&finite(v.kerf)&&(v.kerf as number)>=0;
 if(v.kind==='drill')return faces.includes(v.face as string)&&[v.u,v.v].every(finite)&&[v.diameter,v.depth].every(positive);
 return v.kind==='curve'&&['round-corner','arc','semicircle','circle'].includes(v.shape as string)&&['near-left','near-right','far-left','far-right'].includes(v.corner as string)&&positive(v.radius)&&[v.u,v.v].every(finite);
}
export function validRepeat(v:unknown):boolean {if(!record(v))return false;switch(v.kind){case 'duplicate':return true;case 'visibility':return typeof v.hidden==='boolean';case 'transform':return vector(v.translation)&&vector(v.rotation);case 'special':return validOperation(v.operation);case 'cut':return ['length','width'].includes(v.axis as string)&&positive(v.offset)&&finite(v.kerf)&&(v.kerf as number)>=0;default:return false;}}
export function validJoin(v:unknown):boolean {if(!record(v))return false;return typeof v.id==='string'&&joinTypes.includes(v.type as typeof joinTypes[number])&&[v.a,v.b].every(e=>record(e)&&['pieceId','code','geometry'].every(k=>typeof e[k]==='string')&&faces.includes(e.face as string))&&['quantity','diameter','length','spacing'].every(k=>v[k]===undefined||positive(v[k]))&&(v.quantity===undefined||Number.isInteger(v.quantity))&&['position','notes'].every(k=>v[k]===undefined||typeof v[k]==='string');}
export function validMaterial(v:unknown):boolean {return record(v)&&['id','name','materialType','color'].every(k=>typeof v[k]==='string')&&['Tablas / listones','Tableros'].includes(v.family as string)&&[v.length,v.width,v.height].every(positive)&&(v.category===undefined||typeof v.category==='string');}
