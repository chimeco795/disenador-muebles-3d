import { chooseAlignment } from './interaction/alignment';
import { ProjectFiles } from './ui/ProjectFiles';
import { VisualTools } from './ui/VisualTools';
import { useTools, focusPiece, type Alignment } from './interaction/store';
import { OperationBar } from './ui/OperationBar';
import { useOperation } from './operations/store';
import { Manufacturing } from './ui/Manufacturing';
import { KerfSetting } from './ui/KerfSetting';
import { ProjectMaterials } from './ui/ProjectMaterials';
import { useEffect, useState } from 'react';
import { Scene, type View, type SceneSettings } from './scene/Scene';
import { useEditor, selectionIds } from './store';
import { Panel, type Dock, type PanelState } from './ui/Panel';
import { Materials, Properties } from './ui/Contents';
import { CutBar } from './ui/CutBar';
import { useCut } from './cutting/store';
const panelTitles: Record<string, string> = { materials: 'Materiales', properties: 'Propiedades', projectMaterials: 'Materiales del proyecto' };
const initial: Record<string, PanelState> = { projectMaterials: { open: false, dock: 'float', size: 360, x: 340, y: 150 }, materials: { open: true, dock: 'left', size: 284, x: 70, y: 110 }, properties: { open: true, dock: 'right', size: 290, x: 700, y: 110 } };
export default function App() {
    const s = useEditor();
    const busyCut=useCut(s=>!!s.pieceId),busyOperation=useOperation(s=>!!s.pieceId);
    const [workspace, setWorkspace] = useState<'design' | 'manufacturing'>('design');
    const switchWorkspace = (next: 'design' | 'manufacturing') => { useCut.getState().cancel(); useOperation.getState().cancel(); useTools.getState().cancel(); setMenu(false); setWorkspace(next); };
    useEffect(()=>{if(!s.feedback)return;const timer=window.setTimeout(()=>useEditor.setState({feedback:''}),6000);return()=>window.clearTimeout(timer);},[s.feedback]);
    const [panels, setPanels] = useState(initial);
    const [view, setView] = useState<View>('Isométrica');
    const [revision, setRevision] = useState(0);
    const [menu, setMenu] = useState(false);
    const [dragPanel, setDragPanel] = useState(false);
    const [settings, setSettings] = useState<SceneSettings>({ grid: true, shadows: true, dimensions: true });
    useEffect(()=>{const preferences=s.project.preferences;if(preferences){setSettings({grid:preferences.grid,shadows:preferences.shadows,dimensions:preferences.dimensions});useTools.setState({alignment:preferences.snapAlignment});}else{setSettings({grid:true,shadows:true,dimensions:true});useTools.setState({alignment:'free'});}},[s.project.preferences]);
    const change = (id: string, patch: Partial<PanelState>) => setPanels(p => ({ ...p, [id]: { ...p[id], ...patch } }));
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if(document.querySelector('[aria-modal="true"]'))return;
            const checkboxHistory = e.target instanceof HTMLInputElement && e.target.type === 'checkbox' && (e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase());
            if ((e.target as HTMLElement).closest('input,select,textarea,[contenteditable]') && !checkboxHistory)
                return;
            if (useCut.getState().pieceId && ['g', 'r'].includes(e.key.toLowerCase()))
                return;
            const store = useEditor.getState();
            if(workspace==='design'&&!useCut.getState().pieceId&&!useOperation.getState().pieceId){
                if(e.key==='Escape'&&(useTools.getState().mode||useTools.getState().first||useTools.getState().context)){useTools.getState().cancel();return;}
                if(useTools.getState().mode)return;
                if(['1','2','3','4'].includes(e.key)&&!e.ctrlKey&&!e.metaKey){const alignment=(['free','center','min','max'] as Alignment[])[Number(e.key)-1];chooseAlignment(alignment);return;}
                if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'].includes(e.key)&&store.selected){e.preventDefault();const ids=selectionIds(store),p=store.project.pieces.find(p=>p.id===store.selected);if(!p||ids.some(id=>store.project.pieces.find(p=>p.id===id)?.isLocked))return;const position=[...p.position] as [number,number,number],step=e.shiftKey?10:1,axis=e.key.startsWith('Page')||(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key))?1:['ArrowLeft','ArrowRight'].includes(e.key)?0:2;position[axis]+=step*(['ArrowLeft','ArrowDown','PageDown'].includes(e.key)?-1:1);store.update(p.id,{position});return;}
            }
            if (workspace==='design' && e.key.toLowerCase()==='q' && !e.ctrlKey && !e.metaKey && !e.altKey && !useCut.getState().pieceId && !useOperation.getState().pieceId) {e.preventDefault();store.repeat();return;}
            if (workspace === 'manufacturing' && (['Delete', 'g', 'r'].includes(e.key) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd'))) { e.preventDefault(); return; }
            if (e.ctrlKey || e.metaKey) {
                if (['z', 'y', 'd', 's'].includes(e.key.toLowerCase()))
                    e.preventDefault();
                if (e.key.toLowerCase() === 'z')
                    e.shiftKey ? store.redo() : store.undo();
                if (e.key.toLowerCase() === 'y')
                    store.redo();
                if (e.key.toLowerCase() === 'd')
                    store.duplicate();
                if (e.key.toLowerCase() === 's')
                    store.save();
                return;
            }
            if (e.key === 'Delete')
                store.remove();
            if (e.key === 'Escape')
                store.select(null);
            if (e.key.toLowerCase() === 'g')
                store.setMode('translate');
            if (e.key.toLowerCase() === 'r')
                store.setMode('rotate');
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [workspace]);
    const renderPanels = (dock: Dock) => Object.entries(panels).filter(([, p]) => p.open && p.dock === dock).map(([id, state]) => <Panel key={id} id={id} title={panelTitles[id]} state={state} change={patch => change(id, patch)}>{id === 'materials' ? <Materials /> : id === 'projectMaterials' ? <ProjectMaterials /> : <Properties />}</Panel>);
    return <div className="app" onDragStart={e => {
            if (e.dataTransfer.types.includes('application/x-taller-panel'))
                setDragPanel(true);
        }} onDragEnd={() => setDragPanel(false)}>
    <header><div className="brand"><span className="brand-icon">▱</span><b>taller<span>ESTUDIO DE MUEBLES</span></b></div><div className="toolbar"><button onClick={()=>{useTools.getState().cancel();s.newProject();focusPiece(null);}} title="Crear un proyecto vacío; puedes deshacer">＋ Nuevo</button><button onClick={s.save} title="Guardar en este navegador (Ctrl+S)">▣ Guardar</button><ProjectFiles/><span className="divider"/><button disabled={!s.past.length} onClick={s.undo} title="Deshacer (Ctrl+Z)">↶ <span>Deshacer</span></button><button disabled={!s.future.length} onClick={s.redo} title="Rehacer (Ctrl+Shift+Z)">↷ <span>Rehacer</span></button><span className="divider"/><button disabled={!s.selected || workspace === 'manufacturing'} onClick={s.duplicate}>⧉ Duplicar</button><button disabled={!s.selected || workspace === 'manufacturing'} onClick={s.remove}>× Eliminar</button></div><div className="workspace-tabs" role="group" aria-label="Vista principal"><button aria-pressed={workspace === 'design'} onClick={() => switchWorkspace('design')}>Diseño</button><button aria-pressed={workspace === 'manufacturing'} onClick={() => switchWorkspace('manufacturing')}>Fabricación</button></div><div className="header-end"><button className={menu ? 'active' : ''} onClick={() => setMenu(!menu)}>⚙ Configuración</button><a className="help-link" href={new URL('../Manual_Usuario_Disenador_3D_Muebles.html', import.meta.url).href} target="_blank" rel="noopener noreferrer" aria-label="Ayuda: abrir manual en una pestaña nueva" title="Ayuda: abrir manual en una pestaña nueva"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><path d="M12 16v1"/></svg></a><span className="phase">v1.0</span></div></header>
    {menu && <div className="settings-menu"><h3>Espacio de trabajo</h3>{Object.entries(panels).map(([id, p]) => <label key={id}><input type="checkbox" checked={p.open} onChange={e => change(id, { open: e.target.checked })}/>{panelTitles[id]}</label>)}<hr />{(['grid', 'shadows', 'dimensions'] as const).map((key, i) => <label key={key}><input type="checkbox" checked={settings[key]} onChange={e => {const next={...settings,[key]:e.target.checked};setSettings(next);s.setPreferences({...next,snapAlignment:useTools.getState().alignment});}}/>{['Cuadrícula y referencias (mm)', 'Sombras suaves', 'Medidas de la selección'][i]}</label>)}{workspace === 'design' && <KerfSetting />}<button onClick={() => { setPanels(initial); setMenu(false); }}>Restablecer paneles</button></div>}
    {workspace === 'manufacturing' && <Manufacturing />}
    <div className="design-surface" style={{display: workspace === 'design' ? 'contents' : 'none'}}><div className="workspace"><div className="main-row">{renderPanels('left')}<main className="work"><Scene view={view} revision={revision} settings={settings}/><VisualTools/><div className="workspace-top"><div><p className="eyebrow">PROYECTO PERSONAL</p><h1>{s.project.name}</h1><span className="save-state">{s.storageError ? 'No se pudo guardar. Revisa el almacenamiento del navegador.' : s.saved ? '● Guardado en este navegador' : 'Guardando…'}</span></div><div className="view-controls"><label>Vista <select aria-label="Vista" value={view} onChange={e => { focusPiece(null);setView(e.target.value as View); setRevision(r => r + 1); }}>{(['Isométrica', 'Frontal', 'Posterior', 'Izquierda', 'Derecha', 'Superior'] as View[]).map(v => <option key={v}>{v}</option>)}</select></label><button title="Encuadrar todas las piezas" onClick={() => {focusPiece(null);setRevision(r => r + 1);}}>⊡ Ajustar todo</button></div></div>
    {!s.project.pieces.length && <div className="empty-scene"><div className="empty-symbol">＋</div><h2>Haz espacio para tu próxima idea.</h2><p>Arrastra tu primera pieza desde Materiales.</p><span>Medidas reales. Posibilidades abiertas.</span></div>}
    <div className="viewport-bottom"><span><b>Arrastrar pieza</b> mueve · <b>Fondo</b> orbita · <b>Rueda</b> zoom · <b>Botón derecho</b> desplaza</span></div>
    <div className="restore-panels">{Object.entries(panels).filter(([, p]) => !p.open).map(([id]) => <button key={id} onClick={() => change(id, { open: true })}>＋ {panelTitles[id]}</button>)}</div>
    {dragPanel && <div className="dock-targets">{(['left', 'right', 'bottom'] as Dock[]).map(dock => <div key={dock} className={`target-${dock}`} onDragOver={e => e.preventDefault()} onDrop={e => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('application/x-taller-panel');
                    if (panels[id])
                        change(id, { dock });
                    setDragPanel(false);
                }}>Acoplar {dock === 'left' ? 'a la izquierda' : dock === 'right' ? 'a la derecha' : 'abajo'}</div>)}</div>}
    <CutBar /><OperationBar />
    <button className="repeat-action" disabled={!s.selected||!s.project.lastAction||busyCut||busyOperation} title="Repetir última acción (Q). No sustituye Ctrl+R del navegador." onClick={s.repeat}>↻ Repetir última acción · Q</button>
    {s.feedback&&<div className="editor-feedback" role="status">{s.feedback}</div>}
    </main>{renderPanels('right')}</div><div className="bottom-dock">{renderPanels('bottom')}</div></div>{renderPanels('float')}</div>
    <footer><span className="status-dot"/>Editor 3D<span className="footer-divider">/</span><span>{s.project.pieces.length} piezas · {s.project.stocks?.length ?? 0} materiales originales · {s.project.pieces.filter(p => p.usage === 'available').length} sobrantes disponibles · {s.project.pieces.filter(p => p.isHidden).length} ocultas</span><span className="footer-right">Milímetros <span>·</span> X largo / Y altura / Z ancho</span></footer>
  </div>;
}
