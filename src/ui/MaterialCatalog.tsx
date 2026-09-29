import { Templates } from './Templates';
import { useState } from 'react';
import { dimensions } from '../model';
import { materialCategory, projectCatalog } from '../materials/catalog';
import { useEditor } from '../store';
export function Materials() {
    const s=useEditor(), all=projectCatalog(s.project);
    const [category,setCategory]=useState('Destacados'),[search,setSearch]=useState(''),[custom,setCustom]=useState(false);
    const [base,setBase]=useState(all[0].id),[size,setSize]=useState([3000,100,18]),[name,setName]=useState('Material personalizado');
    const categories=['Destacados','Plantillas',...new Set(all.map(materialCategory)),'Personalizados'];
    const filtered=all.filter(m=>(search || category==='Destacados' ? search ? true : all.indexOf(m)<5 : category==='Personalizados' ? s.project.customMaterials?.some(c=>c.id===m.id) : materialCategory(m)===category)&&`${m.name} ${m.materialType} ${dimensions(m)}`.toLowerCase().includes(search.toLowerCase()));
    return <><p className="eyebrow">DE LA MATERIA A LA IDEA</p><h2>Todo empieza<br/>con una pieza.</h2><p className="muted">Arrastra un material al espacio de trabajo para empezar a construir.</p>
        <div className="catalog-filters"><input aria-label="Buscar material" placeholder="Buscar material o medida" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Categoría del material" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><button onClick={()=>setCustom(!custom)}>＋ Material a medida</button></div>
        {category==='Plantillas'&&<Templates/>}
        {custom&&<form className="custom-material" onSubmit={e=>{e.preventDefault();const original=all.find(m=>m.id===base)!;if(!name.trim()||!size.every(n=>Number.isFinite(n)&&n>0))return;s.addCustomMaterial({...original,id:'custom-'+crypto.randomUUID(),name:name.trim(),length:size[0],width:size[1],height:size[2]});setCategory('Personalizados');setSearch('');setCustom(false);}}>
            <label>Tipo base<select aria-label="Tipo base" value={base} onChange={e=>{setBase(e.target.value);const m=all.find(m=>m.id===e.target.value)!;setSize([m.length,m.width,m.height]);}}>{all.map(m=><option key={m.id} value={m.id}>{m.name} · {dimensions(m)}</option>)}</select></label>
            <label>Nombre<input aria-label="Nombre del material" value={name} onChange={e=>setName(e.target.value)} required/></label>{['Largo','Ancho','Espesor'].map((label,i)=><label key={label}>{label} (mm)<input aria-label={`${label} del material`} type="number" min="1" step="any" value={size[i]} required onChange={e=>setSize(size.map((n,j)=>j===i?Number(e.target.value):n))}/></label>)}<button type="submit">Guardar material</button>
        </form>}
        {(['Tablas / listones','Tableros'] as const).map(family=>{const items=filtered.filter(m=>m.family===family);return items.length>0&&<section className="material-family" key={family}><h3>{family}</h3>{items.map(m=><button className="material-card" key={m.id} draggable onDragStart={e=>{e.dataTransfer.setData('application/x-taller-material',m.id);e.dataTransfer.effectAllowed='copy';}} onClick={()=>s.add(m.id)} title="Arrastra a la escena o haz clic para agregar en el centro"><div className={`material-preview ${family==='Tableros'?'sheet':''}`}><span style={{background:m.color}}/></div><div className="material-description"><b>{m.name}</b><small>{dimensions(m)}</small></div><span className="add-mark">+</span></button>)}</section>;})}
        {category!=='Plantillas'&&!filtered.length&&<p className="muted">No hay materiales que coincidan con la búsqueda.</p>}
    </>;
}
