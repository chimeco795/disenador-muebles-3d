import { jsPDF } from 'jspdf';
import { describeOperation, faceFrame, faceNames, faceReference, outline } from '../operations/geometry';
import { mm } from '../cutting/measure';
import { dimensions } from '../model';
import { reportPurchases, type WorkshopReport } from './model';
export function createReportPdf(report:WorkshopReport) {
    const doc=new jsPDF({unit:'mm',format:'a4'});let y=24;
    const safe=(s:string)=>s.replace(/[–—]/g,'-').replace(/↻/g,' giro ').replace(/°/g,'°');
    const heading=(title:string)=>{doc.setTextColor(24,63,91);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(safe(title),15,y);y+=10;};
    const next=()=>{doc.addPage();y=24;};
    const text=(value:string,size=10)=>{doc.setFont('helvetica','normal');doc.setTextColor(45,59,69);doc.setFontSize(size);const lines=doc.splitTextToSize(safe(value),180) as string[];for(const line of lines){if(y>267)next();doc.text(line,15,y);y+=size*.45+1;}y+=2;};
    const section=(title:string)=>{if(y>246)next();doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(24,63,91);doc.text(title,15,y);y+=8;};
    heading('REPORTE DE FABRICACIÓN');text(report.project,13);text(`Fecha: ${report.date} | ${report.mode==='optimized'?'Plan optimizado vigente':'Plan actual del diseño'}`);
    text(`${report.pieces.reduce((n,p)=>n+p.quantity,0)} piezas requeridas | ${report.stocks.length} fuentes de material | Sierra de referencia: ${mm(report.kerf)} mm.`);
    text('Todas las cotas están en mm. Los diagramas son proporcionales, no plantillas a escala 1:1. Los IDs identifican las mismas piezas en el diseño, el plan y este reporte.',9);
    section(report.mode==='optimized'?'Lista de compra propuesta':'Material según el plan actual');
    for(const p of reportPurchases(report))text(`${p.quantity} × ${p.label}`);
    if(!reportPurchases(report).length)text('No se requiere material nuevo en esta propuesta.');
    for(const s of report.stocks.filter(s=>s.reused))text(`Reutilizar: ${s.reused} - ${s.material} ${dimensions(s)}`);
    section('Lista de piezas');text('IDs | Material | Base rectangular (largo × ancho × espesor) | Cantidad',9);
    for(const p of report.pieces)text(`${p.codes.join(', ')} | ${p.material} | ${dimensions(p)} | ${p.quantity}`,9);
    if(report.specials.length)text('Las bases con acabados se cortan primero como rectángulos. Después realizar las operaciones especiales indicadas en sus hojas de detalle.',9);
    for(const stock of report.stocks){next();heading(`${stock.name} - ${stock.material}`);text(dimensions(stock));text(stock.reused??'Material comercial');
        const visualHeight=stock.sheet?stock.width:Math.max(stock.width,stock.length*.13),scale=Math.min(180/stock.length,95/visualHeight),sy=scale*visualHeight/stock.width,top=y;
        for(const cell of stock.cells){doc.setFillColor(...(cell.available?[237,244,221]:[218,235,246]) as [number,number,number]);doc.setDrawColor(112,137,155);const x=15+cell.x*scale,cy=top+cell.y*sy,w=cell.length*scale,h=cell.width*sy;doc.rect(x,cy,w,h,'FD');if(w>14&&h>9){doc.setFontSize(Math.min(10,Math.max(6,w/3)));doc.setTextColor(36,65,85);doc.text(cell.label+(cell.rotated?' (90°)':''),x+w/2,cy+h/2-1,{align:'center'});doc.setFontSize(7);doc.text(stock.sheet?`${mm(cell.length)} × ${mm(cell.width)}`:`${mm(cell.length)} mm`,x+w/2,cy+h/2+3,{align:'center'});}}
        for(const c of stock.cuts){doc.setFillColor(220,164,70);if(c.length&&c.width)doc.rect(15+c.x*scale,top+c.y*sy,c.length*scale,c.width*sy,'F');doc.setDrawColor(83,102,119);doc.setLineWidth(.2);doc.line(15+c.x*scale,top+c.y*sy,15+(c.x+(c.axis==='width'?c.length:0))*scale,top+(c.y+(c.axis==='length'?c.width:0))*sy);}
        y=top+visualHeight*scale+9;text('Azul: piezas. Verde: material disponible. Ocre/líneas: cortes de sierra.',8);
        for(const cell of stock.cells)text(`${cell.label}${cell.rotated?' - girada 90° en el plan':''}: ${mm(cell.length)} × ${mm(cell.width)} × ${mm(stock.height)} mm${cell.available?' - disponible / fuera de la lista requerida':''}`,9);
        section('Cortes y ancho de sierra');
        if(!stock.cuts.length)text('Sin cortes de separación.');
        stock.cuts.forEach((c,i)=>text(`${i+1}. ${c.code}: ${c.axis==='length'?'transversal, por largo':'longitudinal, por ancho'} a ${mm(c.offset)} mm del borde inicial de la sección restante; sierra ${mm(c.kerf)} mm.`,9));
    }
    for(const entry of report.specials){next();heading(`Acabados de ${entry.code}`);text(`${entry.piece.materialType} - base ${dimensions(entry.piece)}`);text('Vista superior: largo de izquierda a derecha; borde inicial arriba. Las medidas del acabado se toman sobre la base, antes de girarla en el plan.',9);
        const p=entry.piece,poly=outline(p),minX=Math.min(...poly.map(v=>v[0])),minY=Math.min(...poly.map(v=>v[1])),width=Math.max(...poly.map(v=>v[0]))-minX,height=Math.max(...poly.map(v=>v[1]))-minY,scale=Math.min(180/width,75/height),top=y;
        doc.setDrawColor(88,111,128);doc.setFillColor(222,237,246);const start=poly[0];if(start){const deltas=poly.slice(1).map((point,i)=>[(point[0]-poly[i][0])*scale,(point[1]-poly[i][1])*scale]);doc.lines(deltas,15+(start[0]-minX)*scale,top+(start[1]-minY)*scale,[1,1],'FD',true);}
        for(const op of entry.operations){if(op.kind==='drill'&&(op.face==='top'||op.face==='bottom')){doc.setDrawColor(154,83,23);doc.circle(15+(op.u-minX)*scale,top+(op.v-minY)*scale,op.diameter/2*scale,'S');}if(op.kind==='curve'&&op.shape==='circle'){doc.setDrawColor(154,83,23);doc.circle(15+(op.u-minX)*scale,top+(op.v-minY)*scale,op.radius*scale,'S');}}
        y=top+height*scale+8;text('Detalle ampliado del contorno final. Las cotas siguientes conservan el origen de la base rectangular.',8);
        for(const op of entry.operations){text(describeOperation(op),10);if(op.kind==='drill'){const f=faceFrame(p,op.face);text(`Cara ${faceNames[op.face]}: ${mm(f.maxU)} × ${mm(f.maxV)} mm. ${faceReference(op.face)} Profundidad hacia el interior.`,8);}}
        text('Acabados no incluidos como sobrantes rectangulares reutilizables. Verificar orientación de la pieza antes de mecanizar.',9);
    }
    if(report.assembly.length){next();heading('Uniones / Ensamble');for(const j of report.assembly){section(j.pieces);text('Caras: '+j.faces);text(j.description);if(j.review)text('REVISAR: '+j.review);}}
    const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);doc.setDrawColor(210,220,229);doc.line(15,281,195,281);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,117,130);doc.text('Taller - '+safe(report.project).slice(0,65),15,287);doc.text(`${i} / ${count}`,195,287,{align:'right'});}
    return doc;
}
