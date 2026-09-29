import { useEditor } from '../store';
import { joinEnd, type Join } from '../assembly/model';
import { useTools, type PickedFace } from './store';
export function startJoin(a:PickedFace,b:PickedFace){const project=useEditor.getState().project,pa=project.pieces.find(p=>p.id===a.pieceId),pb=project.pieces.find(p=>p.id===b.pieceId);if(!pa||!pb||pa.id===pb.id)return;const join:Join={id:crypto.randomUUID(),a:joinEnd(pa,a.face),b:joinEnd(pb,b.face),type:'Sin especificar'};useTools.setState({mode:null,first:a,second:b,hover:null,joinDraft:join});}
export function pickInteraction(pick:PickedFace){const t=useTools.getState();if(!t.mode)return;if(!t.first){useTools.setState({first:pick});return;}if(t.mode==='join'){if(t.first.pieceId!==pick.pieceId)startJoin(t.first,pick);}else useTools.setState({second:pick,hover:null});}
