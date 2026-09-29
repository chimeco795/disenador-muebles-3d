import { useOperation } from '../operations/store';
import { useEffect, useRef, useState } from 'react';
import { useCut } from '../cutting/store';
import { useEditor } from '../store';
import { cutMeasure, isSheet } from '../cutting/measure';
import { CUT } from '../cutting/config';
export function CutBar() {
    const cut = useCut();
    const project = useEditor(s => s.project);
    const p = project.pieces.find(p => p.id === cut.pieceId);
    const kerf = project.sawKerf ?? 0;
    const [draft, setDraft] = useState('');
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => { if (cut.editing) {
        setDraft(String(cut.offset));
        requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); });
    } }, [cut.editing]);
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            const s = useCut.getState();
            if (!s.pieceId)
                return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                s.cancel();
                return;
            }
            if ((e.target as HTMLElement).closest('input,select,textarea,[contenteditable]'))
                return;
            if (e.key === 'Enter') {
                if ((e.target as HTMLElement).closest('button,[role=button]'))
                    return;
                e.preventDefault();
                e.stopPropagation();
                s.confirm();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                s.setOffset(s.offset + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? CUT.largeIncrement : CUT.increment));
            }
        };
        window.addEventListener('keydown', key, true);
        return () => window.removeEventListener('keydown', key, true);
    }, []);
    if (!p)
        return null;
    const valid = Number.isFinite(Number(draft)) && draft.trim() !== '' && Number(draft) >= CUT.minPart && Number(draft) <= p[cut.axis] - kerf - CUT.minPart;
    const apply = () => { if (valid) {
        cut.setOffset(Number(draft), false, true);
        cut.setEditing(false);
    } };
    return <div className="cut-bar" role="region" aria-label="Corte de pieza">
  <button onClick={()=>{cut.cancel();useOperation.getState().begin('angular');}}>Corte angular</button>
  <div><b>Corte recto{kerf > 0 ? ' · Sierra ' + kerf + ' mm' : ''}</b><small>Desliza la línea · ← → 1 mm · Mayús 10 mm · Alt sin ajuste</small></div>
  {<div className="cut-directions" role="group" aria-label="Dirección del corte"><button aria-pressed={cut.axis === 'length'} disabled={p.length < kerf + 2 * CUT.minPart} onClick={() => cut.setAxis('length')}>{isSheet(project,p) ? 'Corte vertical ↕' : 'Transversal · largo'}</button><button aria-pressed={cut.axis === 'width'} disabled={p.width < kerf + 2 * CUT.minPart} onClick={() => cut.setAxis('width')}>{isSheet(project,p) ? 'Corte horizontal ↔' : 'Longitudinal · ancho'}</button><small>Ejes del tablero · vista superior</small></div>}
  {cut.editing ? <label className="cut-exact"><input ref={input} aria-label="Medida de corte" type="number" step="any" min={CUT.minPart} max={p[cut.axis] - kerf - CUT.minPart} value={draft} onChange={e => setDraft(e.target.value)} onBlur={apply} onKeyDown={e => { if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        apply();
    } }}/> mm{!valid && <small>Entre {CUT.minPart} y {p[cut.axis] - kerf - CUT.minPart} mm</small>}</label> : <button className="cut-measure" onClick={() => cut.setEditing(true)} title="Introducir una medida exacta">{cutMeasure(p, cut.axis, cut.offset, kerf, isSheet(project, p))}</button>}
  {!!p.operations?.length&&<small>Retira los acabados de la pieza antes de dividir su base.</small>}
  <button className="cut-confirm" disabled={!!p.operations?.length || (cut.editing && !valid)} onClick={() => { if (cut.editing && valid)
        cut.setOffset(Number(draft), false, true); cut.confirm(); }}>✓ Confirmar corte</button><button onClick={cut.cancel}>✕ Cancelar</button>
 </div>;
}
