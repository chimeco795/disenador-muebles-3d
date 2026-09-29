import { useState } from 'react';
import { dimensions } from '../model';
import { mm } from '../cutting/measure';
import { useEditor } from '../store';
import { optimizationTotals } from '../optimization/optimize';
import { planIsStale, settingsFor } from '../optimization/supplies';
import type { OptimizedStock, Supply } from '../optimization/types';

const percent = (n: number) => `${n.toFixed(1)} %`;
function title(stock: OptimizedStock, all: OptimizedStock[]) {
    return `${stock.supply.sheet ? 'Hoja' : 'Tabla'} #${all.filter(s => s.supply.sheet === stock.supply.sheet).findIndex(s => s.id === stock.id) + 1}`;
}
function Diagram({ stock, name }: { stock: OptimizedStock; name: string }) {
    const { supply: s } = stock, height = s.sheet ? s.width : Math.max(s.width, s.length * .15), scaleY = height / s.width;
    const baseFont = s.length / 65;
    const cells = [
        ...stock.placements.map(p => ({ ...p, label: p.piece.code + (p.rotated ? ' ↻90°' : ''), kind: 'used' })),
        ...stock.remaining.map((r, i) => ({ ...r, label: `Sobrante ${i + 1}`, kind: 'available' })),
    ];
    return <section className="stock-plan optimized-stock" aria-label={`Propuesta ${name}`}>
        <div className="plan-heading"><div><p className="eyebrow">PROPUESTA · {s.materialType}</p><h2>{name}</h2><p>{dimensions(s)}</p></div><span className={s.kind === 'offcut' ? 'reused-badge' : ''}>{s.kind === 'offcut' ? 'Sobrante reutilizado' : 'Material nuevo'}</span></div>
        {s.kind === 'offcut' && <p className="reuse-origin">Origen: {s.sourceCode} · {s.sourceMaterialId}. Se propone su uso; permanece intacto en Diseño.</p>}
        <svg className="stock-diagram optimized-diagram" viewBox={`-2 -2 ${s.length + 4} ${height + 4}`} role="img" aria-label={`Distribución optimizada ${name}`}>
            <title>{name} · {dimensions(s)}</title>
            {cells.map((r, i) => {
                const size = s.sheet ? `${mm(r.length)} × ${mm(r.width)}` : `${mm(r.length)} mm`;
                const font = Math.min(baseFont, r.length / (Math.max(r.label.length, size.length) * .6 + 2), r.width * scaleY / 4);
                return <g key={i} className={`plan-part ${r.kind}`}><title>{r.label} · {size}</title><rect x={r.x} y={r.y * scaleY} width={r.length} height={r.width * scaleY} vectorEffect="non-scaling-stroke" />{font >= baseFont * .65 && <text x={r.x + r.length / 2} y={(r.y + r.width / 2) * scaleY - font / 2} fontSize={font} textAnchor="middle"><tspan fontWeight="700">{r.label}</tspan><tspan x={r.x + r.length / 2} dy={font * 1.5}>{size}</tspan></text>}</g>;
            })}
            {stock.cuts.map((c, i) => <g key={i}><title>Sierra: {mm(c.kerf)} mm · {c.pieceCode}</title><rect x={c.x} y={c.y * scaleY} width={c.length} height={c.width * scaleY} fill="#e5ad51" /><line x1={c.x} y1={c.y * scaleY} x2={c.x + (c.axis === 'width' ? c.length : 0)} y2={(c.y + (c.axis === 'length' ? c.width : 0)) * scaleY} stroke="#627d91" strokeWidth="1" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" /></g>)}
        </svg>
        <p className="plan-legend">Azul: piezas requeridas · Verde: sobrantes disponibles · Ocre: sierra</p>
        <div className="plan-part-list">{stock.placements.map(p => <div className="part-detail" key={p.piece.id}><b>{p.piece.code}{p.rotated ? ' · Giro 90°' : ''}</b><span>{dimensions(p.piece)}</span><small>Origen en Diseño: {p.piece.sourceMaterialId}</small></div>)}{stock.remaining.map((r, i) => <div className="part-detail available" key={i}><b>Sobrante disponible</b><span>{dimensions({ ...r, height: s.height })}</span></div>)}</div>
        {!s.sheet && <div className="optimized-cut-order"><h3>Orden de cortes</h3><ol>{stock.placements.map(p => {
            const c = stock.cuts.find(c => c.pieceCode === p.piece.code && c.axis==='length');
            const rip=stock.cuts.find(c=>c.pieceCode===p.piece.code&&c.axis==='width');
            return <li key={p.piece.id}>{c ? 'Cortar' : 'Conservar'} {p.piece.code} — {mm(p.length)} mm{c ? ` · sierra ${mm(c.kerf)} mm` : ' · extremo exacto, sin corte adicional'}{rip ? `; rajar a ${mm(p.width)} mm de ancho · sierra ${mm(rip.kerf)} mm` : ''}</li>;
        })}{stock.remaining.map((r, i) => <li key={i}>Sobrante — {mm(r.length)} mm</li>)}</ol><small>Medidas desde el extremo de la parte restante; cada corte descuenta la sierra indicada.</small></div>}
    </section>;
}
export function Optimization() {
    const { project, setOptimizerSettings, storageError } = useEditor(), settings = settingsFor(project), plan = project.optimizedPlan;
    const [selected, setSelected] = useState<string | null>(null);
    const stale = planIsStale(project), totals = plan ? optimizationTotals(plan) : null;
    const stock = plan?.stocks.find(s => s.id === selected) ?? plan?.stocks[0];
    const shopping = new Map<string, { supply: Supply; count: number }>();
    for (const bin of totals?.fresh ?? []) {
        const key = JSON.stringify([bin.supply.catalogMaterialId, bin.supply.length, bin.supply.width, bin.supply.height]);
        const entry = shopping.get(key);
        if (entry) entry.count++; else shopping.set(key, { supply: bin.supply, count: 1 });
    }
    return <section className="optimization-view">
        <div className="optimizer-settings"><label><input type="checkbox" checked={settings.allowRotation} onChange={e => setOptimizerSettings({ allowRotation: e.target.checked })} /> Permitir rotación de piezas: 90°</label><label><input type="checkbox" checked={settings.reuseOffcuts} onChange={e => setOptimizerSettings({ reuseOffcuts: e.target.checked })} /> Considerar sobrantes existentes</label></div>
        <p className="muted">Incluye las piezas marcadas «utilizadas» en Diseño. Los sobrantes son recursos opcionales. La propuesta no mueve, corta ni consume material del proyecto.</p>
        {storageError && <p role="alert" className="optimization-warning">No se pudo guardar. Revisa el almacenamiento del navegador.</p>}
        {stale && <p role="status" className="optimization-warning stale-plan"><b>Plan desactualizado.</b> Cambiaron las piezas, materiales o configuración. Los datos de abajo corresponden al cálculo anterior; pulsa «Optimizar material» para actualizarlos.</p>}
        {!plan ? <p className="manufacturing-empty">Pulsa «Optimizar material» para generar una propuesta.</p> : <>
            {!!plan.issues.length && <div className="optimization-warning" role="alert"><b>Propuesta incompleta: {plan.unplaced.length} piezas sin ubicar.</b><p>La lista de compra y los diagramas cubren únicamente las piezas ubicadas.</p><ul>{plan.issues.map(i => <li key={i.code}>{i.code}: {i.reason}</li>)}</ul></div>}
            {plan.requiredCount === 0 ? <p className="manufacturing-empty">No hay piezas marcadas como utilizadas. En Propiedades elige «Usar en el mueble» y vuelve a optimizar.</p> : <>
                <div className="manufacturing-summary optimization-summary">{[[totals!.fresh.filter(s => !s.supply.sheet).length, 'Tablas nuevas'], [totals!.fresh.filter(s => s.supply.sheet).length, 'Hojas nuevas'], [totals!.reused.length, 'Sobrantes reutilizados'], [percent(totals!.usedPercent), 'Material utilizado'], [percent(totals!.remainingPercent), 'Sobrante disponible'], [percent(totals!.lossPercent), 'Pérdida de sierra']].map(([n, label]) => <div key={label}><b>{n}</b><span>{label}</span></div>)}</div>
                <p className="optimization-basis">Kerf del cálculo: {mm(plan.kerf)} mm · {plan.requiredCount - plan.unplaced.length} / {plan.requiredCount} piezas ubicadas · Porcentajes por volumen del material propuesto, incluidos sobrantes reutilizados.</p>
                {!plan.unplaced.length && <p className="optimization-comparison">Plan actual: {plan.current.boards} tablas y {plan.current.sheets} hojas de origen. Propuesta: {totals!.boards} tablas y {totals!.sheets} hojas, incluidos {totals!.reused.length} sobrantes. Material nuevo requerido: {totals!.fresh.length} unidades.</p>}
                {!!stock && <div className="manufacturing-layout"><nav className="stock-navigation" aria-label="Material optimizado">{plan.stocks.map(s => <button key={s.id} aria-pressed={stock.id === s.id} onClick={() => setSelected(s.id)}><b>{title(s, plan.stocks)} · {s.supply.materialType}</b><small>{s.supply.kind === 'offcut' ? `Sobrante reutilizado · ${s.supply.sourceCode}` : 'Material nuevo'}</small><span>{dimensions(s.supply)}</span></button>)}</nav><Diagram stock={stock} name={title(stock, plan.stocks)} /></div>}
                <section className="stock-groups optimization-shopping"><h2>Lista de material propuesta{stale ? ' · desactualizada' : ''}</h2><h3>Material nuevo requerido</h3>{shopping.size ? [...shopping.values()].map(({ supply, count }) => <p key={supply.catalogMaterialId}><b>{count} ×</b> {supply.materialType} · {dimensions(supply)}</p>) : <p>No se requiere material nuevo para las piezas ubicadas.</p>}<h3>Sobrantes reutilizados</h3>{totals!.reused.length ? totals!.reused.map(({ id, supply }) => <p key={id}><b>{supply.sourceCode}</b> · {supply.sourceMaterialId} · {supply.materialType} · {dimensions(supply)}</p>) : <p>No se propone reutilizar sobrantes.</p>}</section>
            </>}
        </>}
    </section>;
}
