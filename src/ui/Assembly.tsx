import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store';
import { describeJoin, joinEnd, joinReview, joinTypes, nearestFaces, type Join } from '../assembly/model';
import { faceNames, describeOperation } from '../operations/geometry';
import type { Face } from '../operations/types';
export function JoinEditor({initial,onClose}:{initial:Join;onClose:()=>void}){
 const project=useEditor(s=>s.project),[draft,setDraft]=useState(initial),[error,setError]=useState('');
 const patch=(value:Partial<Join>)=>setDraft({...draft,...value});
 const review=joinReview(project,draft);
 return createPortal(<div className="report-overlay"><form className="join-editor" role="dialog" aria-modal="true" aria-label="Editar unión" onSubmit={e=>{e.preventDefault();const a=project.pieces.find(p=>p.id===draft.a.pieceId),b=project.pieces.find(p=>p.id===draft.b.pieceId);if(!a||!b||a.id===b.id){setError('Selecciona dos piezas diferentes existentes.');return;}useEditor.getState().saveJoin({...draft,a:joinEnd(a,draft.a.face),b:joinEnd(b,draft.b.face)});onClose();}}>
 <h2>Crear / editar unión</h2><p>Elige dos piezas y sus caras. Al guardar se incluyen en la fabricación.</p>
 {(['a','b'] as const).map((key,i)=><div className="join-end" key={key}><label>Pieza {i+1}<select value={draft[key].pieceId} onChange={e=>{const p=project.pieces.find(p=>p.id===e.target.value)!;patch({[key]:joinEnd(p,draft[key].face)});}}><option value="" disabled>Seleccionar pieza</option>{!project.pieces.some(p=>p.id===draft[key].pieceId)&&<option value={draft[key].pieceId}>{draft[key].code} (fuera de escena)</option>}{project.pieces.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label>Cara {i+1}<select value={draft[key].face} onChange={e=>patch({[key]:{...draft[key],face:e.target.value as Face}})}>{Object.entries(faceNames).map(([face,name])=><option key={face} value={face}>{name}</option>)}</select></label></div>)}
 <label>Tipo de unión<select value={draft.type} onChange={e=>patch({type:e.target.value as Join['type']})}>{joinTypes.map(t=><option key={t}>{t}</option>)}</select></label>
 <div className="join-fields">{([['quantity','Cantidad'],['diameter','Diámetro (mm)'],['length','Longitud (mm)'],['spacing','Separación (mm)']] as const).map(([key,label])=><label key={key}>{label}<input type="number" min={key==='quantity'?1:.01} step={key==='quantity'?1:'any'} value={draft[key]??''} onChange={e=>patch({[key]:e.target.value===''?undefined:Number(e.target.value)})}/></label>)}</div>
 <label>Posición / referencia<input value={draft.position??''} maxLength={300} onChange={e=>patch({position:e.target.value})}/></label><label>Notas<textarea value={draft.notes??''} maxLength={1000} onChange={e=>patch({notes:e.target.value})}/></label>
 {review&&<p className="join-review">Para revisión: {review} Puedes conservar la unión y completar la colocación después.</p>}{error&&<p role="alert">{error}</p>}
 <div className="report-actions"><button type="button" onClick={onClose}>Cancelar unión</button><button type="submit">Guardar unión</button></div>
 </form></div>,document.body);
}
export function Assembly({pieceId}:{pieceId?:string}){
 const project=useEditor(s=>s.project),[editing,setEditing]=useState<Join|null>(null);
 const joins=(project.joins??[]).filter(j=>!pieceId||j.a.pieceId===pieceId||j.b.pieceId===pieceId);
 const start=()=>{const a=project.pieces.find(p=>p.id===pieceId)??project.pieces[0],b=project.pieces.find(p=>p.id!==a?.id);if(!a||!b)return;const [af,bf]=nearestFaces(a,b);setEditing({id:crypto.randomUUID(),a:joinEnd(a,af),b:joinEnd(b,bf),type:'Sin especificar'});};
 return <section className="assembly-section"><h2>Uniones / Ensamble</h2><button disabled={project.pieces.length<2} onClick={start}>Crear unión</button>{!joins.length&&<p className="muted">Selecciona dos piezas y registra cómo se ensamblan.</p>}{joins.map(j=>{const review=joinReview(project,j);return <article key={j.id}><b>{j.a.code} + {j.b.code}</b><small>Caras: {faceNames[j.a.face]} + {faceNames[j.b.face]}</small><p>{describeJoin(j)}</p>{review&&<p className="join-review">Revisar unión: {review}</p>}<button onClick={()=>setEditing(j)}>Editar unión</button><button onClick={()=>useEditor.getState().deleteJoin(j.id)}>Eliminar unión</button></article>;})}{editing&&<JoinEditor key={editing.id} initial={editing} onClose={()=>setEditing(null)}/>}</section>;
}
export function WorkshopOperations(){const pieces=useEditor(s=>s.project.pieces).filter(p=>p.operations?.length);return <section className="workshop-operations"><h2>Operaciones especiales</h2>{!pieces.length?<p className="muted">Sin acabados registrados.</p>:pieces.map(p=><article key={p.id}><h3>{p.code} · {p.materialType}</h3>{p.operations?.map(op=><p key={op.id}>{describeOperation(op)}</p>)}</article>)}</section>;}
