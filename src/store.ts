import type { Join } from './assembly/model';
import { projectCatalog } from './materials/catalog';
import { cutColor } from './materials/color';
import { operationError } from './operations/geometry';
import type { RepeatAction, SpecialOperation } from './operations/types';
import { optimizeProject } from './optimization/optimize';
import { settingsFor } from './optimization/supplies';
import type { OptimizerSettings } from './optimization/types';
import { migrateMaterials, registerPiece } from './materials/project';
import { create } from 'zustand';
import { splitPiece } from './cutting/split';
import { catalog, type Material, type Piece, type Project, type Vec3 } from './model';
const KEY = 'taller-project-v1';
const empty = (): Project => ({ version: 1, name: 'Mi primer mueble', pieces: [] });
import { validProject } from './validation';
export { validProject } from './validation';
function refreshColors(project: Project): Project {
    if(project.colorVersion===1)return project;
    const recolor=(p:Piece):Piece=>p.isCut?{...p,color:cutColor(p.originalColor ?? project.stocks?.find(s=>s.id===p.stockId)?.color ?? p.color)}:p;
    return {...project,colorVersion:1,pieces:project.pieces.map(recolor),archivedPieces:project.archivedPieces?.map(recolor),cuts:project.cuts?.map(c=>({...c,parent:recolor(c.parent)}))};
}
function restore(): Project {
    try {
        const p = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (validProject(p)) return refreshColors(migrateMaterials(p));
        // A damaged optional proposal must never erase a valid 3D design.
        if (p && typeof p === 'object') {
            const { optimizedPlan, optimizerSettings, ...design } = p;
            if (validProject(design)) return refreshColors(migrateMaterials(design));
        }
        return empty();
    }
    catch {
        return empty();
    }
}
interface State {
    project: Project;
    selected: string | null;
    selectedIds: string[];
    groups: string[][];
    group: () => void;
    ungroup: () => void;
    loadProject: (project: Project) => boolean;
    setPreferences: (preferences: NonNullable<Project['preferences']>) => void;
    past: Project[];
    future: Project[];
    mode: 'translate' | 'rotate';
    saved: boolean;
    storageError: boolean;
    feedback: string;
    repeat: () => void;
    saveJoin: (join: Join) => void;
    deleteJoin: (id: string) => void;
    addOperation: (id: string, op: SpecialOperation) => boolean;
    removeOperation: (id: string, operationId: string) => void;
    addCustomMaterial: (material: Material) => void;
    select: (id: string | null, additive?: boolean) => void;
    setMode: (mode: State['mode']) => void;
    commit: (pieces: Piece[], action?: RepeatAction) => void;
    cut: (id: string, offset: number, axis?: 'length' | 'width', kerf?: number) => void;
    setKerf: (kerf: number) => void;
    setOptimizerSettings: (patch: Partial<OptimizerSettings>) => void;
    optimize: () => void;
    add: (materialId: string, position?: Vec3) => void;
    update: (id: string, patch: Partial<Piece>) => void;
    duplicate: () => void;
    remove: () => void;
    undo: () => void;
    redo: () => void;
    newProject: () => void;
    save: () => void;
}
export const useEditor = create<State>((set, get) => ({
    project: restore(), selected: null, selectedIds:[], groups:[], past: [], future: [], mode: 'translate', saved: true, storageError: false, feedback: '',
    select: (id, additive=false) => {const s=get();if(!id){set({selected:null,selectedIds:[]});return;}const ids=s.groups.find(g=>g.includes(id))??[id];const current=selectionIds(s);const next=additive?(current.includes(id)?current.filter(v=>!ids.includes(v)):[...new Set([...current,...ids])]):ids;set({selected:next.includes(id)?id:next.at(-1)??null,selectedIds:next});},
    group:()=>{const s=get(),ids=selectionIds(s);if(ids.length>1)set({groups:[...s.groups.filter(g=>!g.some(id=>ids.includes(id))),ids],feedback:'Selección agrupada temporalmente.'});},
    ungroup:()=>{const s=get(),ids=selectionIds(s);set({groups:s.groups.filter(g=>!g.some(id=>ids.includes(id))),feedback:'Grupo temporal separado.'});},
    loadProject:project=>{if(!validProject(project))return false;const s=get();set({project:refreshColors(migrateMaterials(project)),past:[...s.past,s.project].slice(-100),future:[],selected:null,selectedIds:[],groups:[],saved:false});return true;},
    setPreferences:preferences=>set(s=>({project:{...s.project,preferences},saved:false})), setMode: mode => set({ mode }),
    commit: (pieces, action) => set(s => ({ project: { ...s.project, pieces, ...(action ? {lastAction:action} : {}) }, past: [...s.past, s.project].slice(-100), future: [], saved: false })),
    saveJoin: join => {
        const s=get();if(join.a.pieceId===join.b.pieceId||![join.a,join.b].every(e=>s.project.pieces.some(p=>p.id===e.pieceId)))return;
        const joins=[...(s.project.joins??[]).filter(j=>j.id!==join.id),join];
        set({project:{...s.project,joins,pieces:s.project.pieces.map(p=>[join.a.pieceId,join.b.pieceId].includes(p.id)?{...p,usage:'used'}:p)},past:[...s.past,s.project].slice(-100),future:[],saved:false});
    },
    deleteJoin: id => {const s=get();set({project:{...s.project,joins:s.project.joins?.filter(j=>j.id!==id)},past:[...s.past,s.project].slice(-100),future:[],saved:false});},
    addCustomMaterial: material => {
        const s=get();
        if(projectCatalog(s.project).some(m=>m.id===material.id)||![material.length,material.width,material.height].every(n=>Number.isFinite(n)&&n>0))return;
        set({project:{...s.project,customMaterials:[...(s.project.customMaterials??[]),material]},past:[...s.past,s.project].slice(-100),future:[],saved:false});
    },
    addOperation: (id, operation) => {
        const s=get(),p=s.project.pieces.find(p=>p.id===id);
        if(!p || p.isLocked || p.isHidden){set({feedback:'Selecciona una pieza visible y desbloqueada.'});return false;}
        const error=operationError(p,operation);if(error){set({feedback:error});return false;}
        s.commit(s.project.pieces.map(piece=>piece.id===id?{...piece,usage:'used',operations:[...(piece.operations??[]),operation]}:piece),{kind:'special',operation});
        set({feedback:'Operación guardada en la pieza y en Fabricación.'});return true;
    },
    removeOperation: (id,operationId) => {const s=get();s.commit(s.project.pieces.map(p=>p.id===id&&!p.isLocked?{...p,operations:p.operations?.filter(o=>o.id!==operationId)}:p));},
    repeat: () => {
        const s=get(),p=s.project.pieces.find(p=>p.id===s.selected),a=s.project.lastAction;
        if(!p||!a){set({feedback:'Selecciona una pieza y realiza primero una acción repetible.'});return;}
        if(p.isLocked&&a.kind!=='duplicate'&&a.kind!=='visibility'){set({feedback:'Desbloquea la pieza para repetir esta acción.'});return;}
        set({feedback:''});
        if(a.kind==='cut')s.cut(p.id,a.offset,a.axis,a.kerf);
        else if(a.kind==='duplicate')s.duplicate();
        else if(a.kind==='visibility')s.update(p.id,{isHidden:a.hidden});
        else if(a.kind==='transform')s.update(p.id,{position:p.position.map((n,i)=>n+a.translation[i]) as Vec3,rotation:p.rotation.map((n,i)=>n+a.rotation[i]) as Vec3});
        else s.addOperation(p.id,{...a.operation,id:crypto.randomUUID()});
        if(!get().feedback)set({feedback:'Acción repetida.'});
    },
    setOptimizerSettings: patch => {
        const s = get(), settings = { ...settingsFor(s.project), ...patch };
        if (typeof settings.allowRotation !== 'boolean' || typeof settings.reuseOffcuts !== 'boolean' || JSON.stringify(settings) === JSON.stringify(settingsFor(s.project))) return;
        set({ project: { ...s.project, optimizerSettings: settings }, past: [...s.past, s.project].slice(-100), future: [], saved: false });
    },
    optimize: () => {
        const s = get(), optimizedPlan = optimizeProject(s.project);
        if (JSON.stringify(s.project.optimizedPlan) === JSON.stringify(optimizedPlan)) return;
        set({ project: { ...s.project, optimizerSettings: settingsFor(s.project), optimizedPlan }, past: [...s.past, s.project].slice(-100), future: [], saved: false });
    },
    setKerf: kerf => {
        const s = get();
        if (!Number.isFinite(kerf) || kerf < 0 || kerf === (s.project.sawKerf ?? 0)) return;
        set({ project: { ...s.project, sawKerf: kerf }, past: [...s.past, s.project].slice(-100), future: [], saved: false });
    },
    cut: (id, offset, axis = 'length', kerf = get().project.sawKerf ?? 0) => {
        const s = get(), project = splitPiece(s.project, id, offset, axis, kerf);
        if (!project) { set({feedback:'No se puede repetir este corte: revisa medidas, bloqueo u operaciones especiales.'}); return; }
        project.lastAction = {kind:'cut',axis,offset,kerf};
        set({ project, past: [...s.past, s.project].slice(-100), future: [], selected: project.cuts!.at(-1)!.childIds[0], saved: false });
    },
    add: (materialId, position) => {
        const m = projectCatalog(get().project).find(m => m.id === materialId);
        if (!m)
            return;
        const id = crypto.randomUUID();
        const s = get();
        const piece: Piece = { id, name: `${m.name} #${String(s.project.pieces.length + 1).padStart(2, '0')}`, materialType: m.materialType, sourceMaterialId: m.id, length: m.length, width: m.width, height: m.height, color: m.color, position: position ?? [0, m.height / 2, 0], rotation: [0, 0, 0], isCut: false, isLocked: false, isHidden: false };
        const project = registerPiece(s.project, piece);
        set({ project, past: [...s.past, s.project].slice(-100), future: [], saved: false });
        set({ selected: id });
    },
    update: (id, patch) => {
        const s = get();
        const p = s.project.pieces.find(p => p.id === id);
        if (!p)
            return;
        if (p.isLocked && (patch.position || patch.rotation))
            return;
        const next = { ...p, ...patch };
        if (JSON.stringify(next) === JSON.stringify(p))
            return;
        const translation=next.position.map((n,i)=>n-p.position[i]) as Vec3, rotation=next.rotation.map((n,i)=>n-p.rotation[i]) as Vec3;
        const action:RepeatAction|undefined = [...translation,...rotation].some(n=>Math.abs(n)>1e-7) ? {kind:'transform',translation,rotation} : next.isHidden!==p.isHidden ? {kind:'visibility',hidden:next.isHidden} : undefined;
        const ids=selectionIds(s);
        if(patch.position&&ids.includes(id)&&ids.length>1){if(s.project.pieces.some(p=>ids.includes(p.id)&&p.isLocked)){set({feedback:'Desbloquea todas las piezas de la selección para moverlas juntas.'});return;}s.commit(s.project.pieces.map(p=>ids.includes(p.id)?{...p,position:p.position.map((n,i)=>n+translation[i]) as Vec3}:p),action);}
        else s.commit(s.project.pieces.map(p => p.id === id ? next : p), action);
    },
    duplicate: () => {
        const s = get(), p = s.project.pieces.find(p => p.id === s.selected);
        if (!p)
            return;
        const id = crypto.randomUUID();
        const project = registerPiece(s.project, { ...p, stockId: undefined, parentPieceId: undefined, producedByCutId: undefined, duplicateOf: p.id, id, name: `${p.name} · copia`, position: [p.position[0], p.position[1], p.position[2] + p.width + 100], isLocked: false, isHidden: false });
        set({ project, past: [...s.past, s.project].slice(-100), future: [], saved: false });
        set({ selected: id, project:{...get().project,lastAction:{kind:'duplicate'}} });
    },
    remove: () => {
        const s = get();
        if (!s.selected)
            return;
        const ids=selectionIds(s);
        const removed = s.project.pieces.filter(p => ids.includes(p.id));
        if (!removed.length)
            return;
        set({ project: { ...s.project, pieces: s.project.pieces.filter(p => !ids.includes(p.id)), archivedPieces: [...(s.project.archivedPieces ?? []), ...removed] }, past: [...s.past, s.project].slice(-100), future: [], saved: false });
        set({ selected: null });
    },
    undo: () => {
        const s = get(), previous = s.past.at(-1);
        if (previous)
            set({ project: previous, past: s.past.slice(0, -1), future: [s.project, ...s.future], selected: null, saved: false });
    },
    redo: () => {
        const s = get(), next = s.future[0];
        if (next)
            set({ project: next, past: [...s.past, s.project], future: s.future.slice(1), selected: null, saved: false });
    },
    newProject: () => { const s = get(); set({ project: empty(), selected: null, selectedIds:[], groups:[], past: [...s.past, s.project].slice(-100), future: [], saved: false }); },
    save: () => {
        try {
            localStorage.setItem(KEY, JSON.stringify(get().project));
            set({ saved: true, storageError: false });
        }
        catch {
            set({ saved: false, storageError: true });
        }
    },
}));
useEditor.subscribe((s, prev) => {
    if (s.project !== prev.project)
        s.save();
});
// Persist upgraded provenance immediately, including on a reload without editing.
if (useEditor.getState().project.materialsVersion === 1)
    useEditor.getState().save();

export function selectionIds(s:Pick<State,"selected"|"selectedIds"|"project">):string[]{return s.selected ? (s.selectedIds.includes(s.selected)?s.selectedIds:[s.selected]).filter(id=>s.project.pieces.some(p=>p.id===id)) : [];}
