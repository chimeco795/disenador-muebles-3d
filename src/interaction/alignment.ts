import { useTools, type Alignment } from './store';
import { useEditor, selectionIds } from '../store';
import { alignContact, prepareTargets } from '../snap/placement';
export function chooseAlignment(alignment:Alignment){
 useTools.setState({alignment});const s=useEditor.getState();s.setPreferences({...s.project.preferences??{grid:true,shadows:true,dimensions:true},snapAlignment:alignment});
 if(useTools.getState().manipulating||alignment==='free')return;
 const p=s.project.pieces.find(p=>p.id===s.selected);if(!p||p.isLocked||p.isHidden)return;
 const ids=selectionIds(s),targets=prepareTargets(s.project.pieces.filter(p=>!ids.includes(p.id)),p.id),result=alignContact(p,targets,alignment);
 if(result.face?.captured)s.update(p.id,{position:result.position});
}
