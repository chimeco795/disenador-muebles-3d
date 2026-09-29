import { Assembly, WorkshopOperations } from './Assembly';
import { ReportButton } from './Report';
import { Optimization } from './Optimization';
import { planIsStale } from '../optimization/supplies';
import { useState } from 'react';
import { dimensions, type Project, type StockRecord } from '../model';
import { manufacturingSummary, materialPlan, statusLabel, stockTitle } from '../manufacturing/plan';
import { stockSummary } from '../materials/project';
import { mm } from '../cutting/measure';
import { useEditor } from '../store';
import { KerfSetting } from './KerfSetting';

function StockDiagram({ project, stock }: { project: Project; stock: StockRecord }) {
    const plan = materialPlan(project, stock), summary = stockSummary(project, stock);
    const sheet = stock.family === 'Tableros';
    const [focus, setFocus] = useState<string | null>(null);
    // Sheets preserve both axes; narrow boards retain length proportions with a legible band height.
    const height = sheet ? stock.width : Math.max(stock.width, stock.length * .15);
    const scaleY = height / stock.width, font = stock.length / 65;
    return <section className="stock-plan" aria-label={`Plan de ${stock.id}`}>
        <div className="plan-heading"><div><p className="eyebrow">{stock.id} · {stock.materialType}</p><h2>{stockTitle(stock)}</h2><p>{dimensions(stock)}</p></div><span>{plan.cuts.length ? `${plan.cuts.length} cortes registrados` : 'Sin cortar'}</span></div>
        <p className="muted">Distribución del material original según tus cortes. {sheet ? 'Vista superior: largo horizontal y ancho vertical.' : 'Proporciones de longitud; ancho ampliado para facilitar la lectura.'}</p>
        <svg className="stock-diagram" viewBox={`-2 -2 ${stock.length + 4} ${height + 4}`} role="img" aria-label={`Diagrama de ${stock.id}`}>
            <title>{stockTitle(stock)} — {dimensions(stock)}</title>
            {plan.parts.map(part => {
                const y = part.y * scaleY, h = part.width * scaleY;
                const size = sheet ? `${mm(part.length)} × ${mm(part.width)}` : `${mm(part.length)} mm`;
                const longest = Math.max(part.code.length, size.length, statusLabel[part.status].length);
                const labelFont = Math.min(font, part.length / (longest * .6 + 2), h / 5);
                const room = labelFont >= font * .65;
                return <g key={part.id} data-piece-id={part.id} data-code={part.code} data-status={part.status} className={`plan-part ${part.status} ${focus === part.id ? 'focused' : ''}`} onClick={() => setFocus(part.id)}>
                    <title>{part.code} · {dimensions(part)} · {statusLabel[part.status]}</title>
                    <rect x={part.x} y={y} width={part.length} height={h} vectorEffect="non-scaling-stroke" />
                    {room && <text x={part.x + part.length / 2} y={y + h / 2 - labelFont} fontSize={labelFont} textAnchor="middle"><tspan fontWeight="700">{part.code}</tspan><tspan x={part.x + part.length / 2} dy={labelFont * 1.5}>{size}</tspan><tspan x={part.x + part.length / 2} dy={labelFont * 1.5} fontSize={labelFont * .8}>{statusLabel[part.status]}</tspan></text>}
                </g>;
            })}
            {plan.cuts.map(c => <g key={c.record.id} className="plan-cut"><title>Corte {c.record.parent.code} · {c.record.axis === 'length' ? 'vertical' : 'horizontal'} · {mm(c.record.offset)} mm · kerf {mm(c.record.kerf)} mm</title><rect x={c.x} y={c.y * scaleY} width={c.length} height={c.width * scaleY} fill="#e5ad51" /><line x1={c.x} y1={c.y * scaleY} x2={c.x + (c.record.axis === 'width' ? c.length : 0)} y2={(c.y + (c.record.axis === 'length' ? c.width : 0)) * scaleY} stroke="#5b6e80" strokeWidth="1.5" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" /></g>)}
        </svg>
        {!sheet&&plan.cuts.some(c=>c.record.axis==='width')&&<p className="muted">El balance expresa longitud equivalente al ancho original ({stock.width} mm); las medidas reales aparecen en cada pieza.</p>}
        <p className="plan-legend"><span>■ Utilizada</span><span>▧ Disponible / sobrante</span><span>□ Fuera de escena</span><span>▰ Sierra (ocre)</span></p>
        <p className="plan-balance">Utilizado: {mm(summary.used)} {summary.unit} · Disponible: {mm(summary.available)} {summary.unit} · Sierra: {mm(summary.kerf)} {summary.unit}{summary.inactive > .000001 ? ` · Fuera de escena: ${mm(summary.inactive)} ${summary.unit}` : ''}</p>
        <div className="plan-part-list">{plan.parts.map(part => <button key={part.id} aria-pressed={focus === part.id} onClick={() => setFocus(part.id)} className={`part-detail ${part.status}`}><b>{part.code}</b><span>{dimensions(part)}</span><small>{statusLabel[part.status]}</small></button>)}</div>
        {!!plan.cuts.length && <details className="cut-register"><summary>Orden de los cortes registrados</summary><ol>{(project.cuts ?? []).filter(c => c.stockId === stock.id).map(c => <li key={c.id}>{c.parent.code} · {c.axis === 'length' ? 'Vertical (largo)' : 'Horizontal (ancho)'} · a {mm(c.offset)} mm del borde inicial · sierra {mm(c.kerf)} mm</li>)}</ol></details>}
    </section>;
}
export function Manufacturing() {
    const project = useEditor(s => s.project), stocks = project.stocks ?? [], summary = manufacturingSummary(project);
    const [planMode, setPlanMode] = useState<'current' | 'optimized'>('current');
    const [selected, setSelected] = useState<string | null>(null);
    const stock = stocks.find(s => s.id === selected) ?? stocks[0];
    return <main className="manufacturing">
        <div className="manufacturing-title"><div><p className="eyebrow">HOJA DE TALLER</p><h1>Fabricación</h1><p>{project.name}</p></div><div className="manufacturing-tools"><ReportButton/><KerfSetting /></div></div>
        <div className="manufacturing-plan-tabs"><div role="group" aria-label="Tipo de plan"><button aria-pressed={planMode === 'current'} onClick={() => setPlanMode('current')}>Plan actual</button><button aria-pressed={planMode === 'optimized'} onClick={() => setPlanMode('optimized')}>Plan optimizado{planIsStale(project) ? ' · desactualizado' : ''}</button></div><button className="optimize-action" onClick={() => { useEditor.getState().optimize(); setPlanMode('optimized'); }}>Optimizar material</button></div>
        {planMode === 'optimized' ? <Optimization /> : <><div className="manufacturing-summary">{[[summary.pieces, 'Piezas en el proyecto'], [summary.usedPieces, 'Piezas utilizadas'], [summary.stocks, 'Materiales originales'], [summary.boards, 'Tablas utilizadas'], [summary.sheets, 'Hojas utilizadas'], [summary.offcuts, 'Sobrantes disponibles']].map(([n, label]) => <div key={label}><b>{n}</b><span>{label}</span></div>)}</div>
        {!stocks.length ? <p className="manufacturing-empty">Agrega materiales y realiza cortes en Diseño para ver aquí tu hoja de taller.</p> : <>
            <section className="stock-groups"><h2>Material registrado</h2>{summary.groups.map(({ stock, count }) => <p key={`${stock.catalogMaterialId}-${stock.length}-${stock.width}-${stock.height}`}><b>{count} ×</b> {stock.family === 'Tableros' ? 'Hoja' : 'Tabla'} · {stock.materialType} · {dimensions(stock)}</p>)}<small>Inventario existente, sin optimización ni cálculo de compra.</small></section>
            <div className="manufacturing-layout"><nav className="stock-navigation" aria-label="Material original">{stocks.map(s => <button key={s.id} aria-pressed={stock?.id === s.id} onClick={() => setSelected(s.id)}><b>{stockTitle(s)} · {s.materialType}</b><small>{s.id}</small><span>{dimensions(s)}</span></button>)}</nav>{stock && <StockDiagram key={stock.id} project={project} stock={stock} />}</div>
            <section className="manufacturing-pieces"><h2>Piezas del proyecto</h2><p className="muted">Los códigos coinciden con Diseño. Los sobrantes siguen disponibles para reutilizarse.</p><table><thead><tr><th>ID</th><th>Material</th><th>Medidas (mm)</th><th>Origen</th><th>Estado</th></tr></thead><tbody>{project.pieces.map(p => <tr key={p.id}><td>{p.code}</td><td>{p.materialType}</td><td>{dimensions(p)}</td><td>{p.sourceMaterialId}</td><td>{statusLabel[p.usage ?? 'original']}</td></tr>)}</tbody></table></section>
        </>}
        </>}
        <WorkshopOperations/><Assembly/>
    </main>;
}
