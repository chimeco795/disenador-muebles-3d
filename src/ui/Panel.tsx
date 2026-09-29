import { useState, type ReactNode, type PointerEvent } from 'react';
export type Dock = 'left' | 'right' | 'bottom' | 'float';
export interface PanelState {
    open: boolean;
    dock: Dock;
    size: number;
    x: number;
    y: number;
}
export function Panel({ id, title, state, change, children }: {
    id: string;
    title: string;
    state: PanelState;
    change: (patch: Partial<PanelState>) => void;
    children: ReactNode;
}) {
    const [moving, setMoving] = useState(false);
    const resize = (e: PointerEvent<HTMLDivElement>) => { e.preventDefault(); const startX = e.clientX, startY = e.clientY, size = state.size; const move = (ev: globalThis.PointerEvent) => change({ size: Math.max(220, Math.min(550, size + (state.dock === 'bottom' ? startY - ev.clientY : state.dock === 'right' ? startX - ev.clientX : ev.clientX - startX))) }); const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); };
    const moveFloat = (e: PointerEvent<HTMLDivElement>) => { if (state.dock !== 'float' || (e.target as HTMLElement).closest('button,select'))
        return; const dx = e.clientX - state.x, dy = e.clientY - state.y; e.currentTarget.setPointerCapture(e.pointerId); setMoving(true); const node = e.currentTarget; const move = (ev: globalThis.PointerEvent) => change({ x: Math.max(0, Math.min(window.innerWidth - state.size, ev.clientX - dx)), y: Math.max(62, Math.min(window.innerHeight - 150, ev.clientY - dy)) }); const end = () => { setMoving(false); node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', end); }; node.addEventListener('pointermove', move); node.addEventListener('pointerup', end); };
    return <aside className={`panel dock-${state.dock} ${moving ? 'moving' : ''}`} style={state.dock === 'float' ? { left: state.x, top: state.y, width: state.size } : state.dock === 'bottom' ? { height: state.size } : { width: state.size }}>
    <div className="panel-heading" draggable={state.dock !== 'float'} onDragStart={e => { e.dataTransfer.setData('application/x-taller-panel', id); }} onPointerDown={moveFloat}><span className="grip">⠿</span><strong>{title}</strong><select aria-label={`Acoplar ${title}`} value={state.dock} onChange={e => change({ dock: e.target.value as Dock })}><option value="left">Izquierda</option><option value="right">Derecha</option><option value="bottom">Abajo</option><option value="float">Flotante</option></select><button className="icon" aria-label={`Cerrar ${title}`} title={`Cerrar ${title}`} onClick={() => change({ open: false })}>×</button></div>
    <div className="panel-body">{children}</div><div className="resize" role="separator" aria-label={`Redimensionar ${title}`} onPointerDown={resize}/>
  </aside>;
}
