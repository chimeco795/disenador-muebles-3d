import { useState } from 'react';
import { useEditor } from '../store';
export function KerfSetting() {
    const kerf = useEditor(s => s.project.sawKerf ?? 0), setKerf = useEditor(s => s.setKerf);
    return <KerfInput key={kerf} value={kerf} save={setKerf} />;
}
function KerfInput({ value, save }: { value: number; save: (n: number) => void }) {
    const [draft, setDraft] = useState(String(value));
    const valid = draft.trim() !== '' && Number.isFinite(Number(draft)) && Number(draft) >= 0;
    return <div className="kerf-setting"><label>Ancho de corte de sierra (kerf)<span><input aria-label="Ancho de corte de sierra (kerf)" type="number" min="0" step="0.1" value={draft} aria-invalid={!valid} onChange={e => setDraft(e.target.value)} onBlur={() => { if (valid) save(Number(draft)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /> mm</span></label>
        <small>{valid ? 'Aplica a nuevos cortes. Los existentes conservan su ancho registrado.' : 'Introduce un valor mayor o igual a 0 mm.'}</small></div>;
}
