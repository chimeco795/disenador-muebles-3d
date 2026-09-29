import { create } from 'zustand';
import type { Vec3 } from '../model';
import type { Face } from '../operations/types';
import type { Join } from '../assembly/model';
export type Alignment='free'|'center'|'min'|'max';
export interface PickedFace {pieceId:string;face:Face;point:Vec3}
interface Tools {manipulating:boolean;mode:'join'|'measure'|null;first:PickedFace|null;hover:PickedFace|null;second:PickedFace|null;joinDraft:Join|null;alignment:Alignment;drag:{ids:string[];delta:Vec3}|null;focus:{id:string|null;revision:number};context:{id:string;x:number;y:number}|null;setMode:(mode:Tools['mode'])=>void;cancel:()=>void}
export const useTools=create<Tools>(set=>({manipulating:false,mode:null,first:null,hover:null,second:null,joinDraft:null,alignment:'free',drag:null,focus:{id:null,revision:0},context:null,setMode:mode=>set({mode,first:null,hover:null,second:null,context:null}),cancel:()=>set({manipulating:false,mode:null,first:null,hover:null,second:null,joinDraft:null,context:null,drag:null})}));
export const focusPiece=(id:string|null)=>useTools.setState(s=>({focus:{id,revision:s.focus.revision+1}}));
