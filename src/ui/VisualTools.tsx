import { chooseAlignment } from '../interaction/alignment';
import { useEffect } from 'react';
import { useEditor, selectionIds } from '../store';
import { useTools, focusPiece, type Alignment } from '../interaction/store';
import { useCut } from '../cutting/store';
import { useOperation } from '../operations/store';
import { JoinEditor } from './Assembly';
export function VisualTools(){const tools=useTools(),editor=useEditor(),ids=selectionIds(editor),cutting=useCut(s=>!!s.pieceId),operating=useOperation(s=>!!s.pieceId);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){tools.cancel();}if(tools.context&&!['Shift','Control'].includes(e.key))useTools.setState({context:null});};const close=()=>useTools.setState({context:null});window.addEventListener('keydown',key);window.addEventListener('pointerdown',close);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('pointerdown',close);};},[tools.cancel,tools.context]);
 const begin=(mode:'join'|'measure')=>{useCut.getState().cancel();useOperation.getState().cancel();tools.setMode(tools.mode===mode?null:mode);};
 return <><div className="interaction-toolbar"><button aria-pressed={tools.mode==='join'} disabled={editor.project.pieces.filter(p=>!p.isHidden).length<2} onClick={()=>begin('join')}>Unir</button><button aria-pressed={tools.mode==='measure'} onClick={()=>begin('measure')}>Medir</button><label>Alin. <select aria-label="Alineación del snap" value={tools.alignment} onChange={e=>chooseAlignment(e.target.value as Alignment)}><option value="free">Libre · 1</option><option value="center">Centro · 2</option><option value="min">Borde inicial · 3</option><option value="max">Borde final · 4</option></select></label>{ids.length>1&&<><span>{ids.length} piezas</span><button onClick={editor.group}>Agrupar</button><button onClick={editor.ungroup}>Desagrupar</button></>}{(tools.mode||tools.second)&&<button onClick={tools.cancel}>Terminar · Esc</button>}</div>
 {tools.mode&&!cutting&&!operating&&<p className="tool-hint">{tools.mode==='join'?(tools.first?'Elige la cara de la otra pieza.':'Selecciona o arrastra desde la primera cara.'):(tools.second?'Distancia en mm. Esc para terminar.':tools.first?'Elige el segundo punto o cara.':'Elige el primer punto sobre una pieza.')}</p>}
 {tools.joinDraft&&<JoinEditor initial={tools.joinDraft} onClose={tools.cancel}/>}
 {tools.context&&<div role="menu" className="piece-context" style={{left:Math.min(tools.context.x,window.innerWidth-210),top:Math.min(tools.context.y,window.innerHeight-260)}} onPointerDown={e=>e.stopPropagation()}>{[['Enfocar',()=>focusPiece(tools.context!.id)],['Duplicar',editor.duplicate],['Cortar',()=>useCut.getState().begin()],['Perforar',()=>useOperation.getState().begin('drill')],['Unir',()=>begin('join')],['Eliminar',editor.remove]].map(([label,action])=><button role="menuitem" key={String(label)} onClick={()=>{(action as ()=>void)();useTools.setState({context:null});}}>{String(label)}</button>)}</div>}
 </>;
}
