import { create } from 'zustand';
import { useEditor } from '../store';
import type { SpecialOperation, Face } from './types';
import { faceFrame } from './geometry';
interface State { pieceId:string|null; draft:SpecialOperation|null; begin:(kind:SpecialOperation['kind'])=>void; patch:(patch:Record<string,unknown>)=>void; pick:(face:Face,u:number,v:number)=>void; cancel:()=>void; confirm:()=>void }
export const useOperation=create<State>((set,get)=>({pieceId:null,draft:null,
    begin:kind=>{const s=useEditor.getState(),p=s.project.pieces.find(p=>p.id===s.selected);if(!p||p.isHidden||p.isLocked)return;const id=crypto.randomUUID();
        const draft:SpecialOperation=kind==='angular'?{id,kind,axis:'length',offset:p.length/2,angle:45,keep:'start',kerf:s.project.sawKerf??0}:kind==='drill'?{id,kind,face:'top',u:p.length/2,v:p.width/2,diameter:Math.min(10,p.width/2,p.length/2),depth:p.height}:{id,kind,shape:'round-corner',corner:'near-left',radius:Math.min(20,p.length/4,p.width/4),u:p.length/2,v:p.width/2};set({pieceId:p.id,draft});},
    patch:patch=>set(s=>({draft:s.draft?{...s.draft,...patch} as SpecialOperation:null})),
    pick:(face,u,v)=>{const s=get(),p=useEditor.getState().project.pieces.find(p=>p.id===s.pieceId);if(p&&s.draft?.kind==='drill')set({draft:{...s.draft,face,u:Math.round(u),v:Math.round(v),depth:Math.min(s.draft.depth,faceFrame(p,face).depth)}});},
    cancel:()=>set({pieceId:null,draft:null}),
    confirm:()=>{const {pieceId,draft}=get();if(pieceId&&draft&&useEditor.getState().addOperation(pieceId,draft))set({pieceId:null,draft:null});},
}));
useEditor.subscribe((s,prev)=>{const id=useOperation.getState().pieceId;if(id&&(s.selected!==id||s.project!==prev.project))useOperation.getState().cancel();});
