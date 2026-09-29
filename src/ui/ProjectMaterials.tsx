import { dimensions } from '../model';
import { stockSummary } from '../materials/project';
import { useEditor } from '../store';
const quantity = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(value);
export function ProjectMaterials() {
    const { project } = useEditor();
    const offcuts = project.pieces.filter(p => p.usage === 'available').length;
    const stocks = project.stocks ?? [];
    return <div className="project-materials">
        <p className="eyebrow">PROYECTO</p>
        <p className="material-summary">{project.pieces.length} piezas<br />{stocks.length} {stocks.length === 1 ? 'material original' : 'materiales originales'}<br />{offcuts} {offcuts === 1 ? 'sobrante disponible' : 'sobrantes disponibles'}</p>
        {!stocks.length && <p className="muted">Agrega una pieza del catálogo para registrar su material original.</p>}
        {stocks.map(stock => {
            const summary = stockSummary(project, stock);
            return <article className="stock-card" key={stock.id}>
                <h3><i style={{ background: stock.color }}/>{stock.id}</h3>
                <p>{stock.materialType} — {dimensions(stock)}</p>
                {summary.uncut && <small>Sin cortar</small>}
                <dl><dt>Utilizado</dt><dd>{quantity(summary.used)} {summary.unit}</dd><dt>Disponible</dt><dd>{quantity(summary.available)} {summary.unit}</dd>
                {summary.kerf > 0 && <><dt>Sierra (kerf)</dt><dd>{quantity(summary.kerf)} {summary.unit}</dd></>}{summary.inactive > .000001 && <><dt>Fuera de la escena</dt><dd>{quantity(summary.inactive)} {summary.unit}</dd></>}</dl>
                {stock.family!=='Tableros'&&project.cuts?.some(c=>c.stockId===stock.id&&c.axis==='width')&&<small>Balance en mm equivalentes al ancho original de {stock.width} mm.</small>}
            </article>;
        })}
        {!!stocks.length && <p className="muted">Cada pieza conserva su origen. En Propiedades puedes usar un sobrante en el mueble o reservar una pieza. Moverla u ocultarla no cambia su estado.</p>}
    </div>;
}
