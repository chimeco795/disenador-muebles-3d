import { create } from 'zustand';
import { useEditor } from '../store';
import { CUT, cutOffset } from './config';
import type { CutAxis } from './measure';
interface CutState {
    pieceId: string | null;
    axis: CutAxis;
    offset: number;
    editing: boolean;
    begin: () => void;
    setAxis: (axis: CutAxis) => void;
    setOffset: (offset: number, magnetic?: boolean, exact?: boolean) => void;
    setEditing: (editing: boolean) => void;
    cancel: () => void;
    confirm: () => void;
}
export const useCut = create<CutState>((set, get) => ({
    pieceId: null, axis: 'length', offset: 0, editing: false,
    begin: () => {
        const { project, selected } = useEditor.getState(), p = project.pieces.find(p => p.id === selected);
        if (!p || p.isLocked || p.isHidden) return;
        const kerf = project.sawKerf ?? 0;
        const axis = p.length >= CUT.minPart * 2 + kerf ? 'length' : 'width';
        if (p[axis] < CUT.minPart * 2 + kerf) return;
        set({ pieceId: p.id, axis, offset: cutOffset((p[axis] - kerf) / 2, p[axis], false, kerf), editing: false });
    },
    setAxis: axis => {
        const { project } = useEditor.getState(), p = project.pieces.find(p => p.id === get().pieceId), kerf = project.sawKerf ?? 0;
        if (!p || p[axis] < CUT.minPart * 2 + kerf) return;
        set({ axis, offset: cutOffset((p[axis] - kerf) / 2, p[axis], false, kerf), editing: false });
    },
    setOffset: (offset, magnetic = false, exact = false) => {
        const { project } = useEditor.getState(), p = project.pieces.find(p => p.id === get().pieceId), kerf = project.sawKerf ?? 0;
        if (p && Number.isFinite(offset)) set({ offset: exact ? Math.max(CUT.minPart, Math.min(p[get().axis] - CUT.minPart - kerf, offset)) : cutOffset(offset, p[get().axis], magnetic, kerf) });
    },
    setEditing: editing => set({ editing }),
    cancel: () => set({ pieceId: null, editing: false }),
    confirm: () => {
        const { pieceId, offset, axis } = get();
        if (!pieceId) return;
        useEditor.getState().cut(pieceId, offset, axis);
        set({ pieceId: null, editing: false });
    },
}));
useEditor.subscribe((s, previous) => {
    const id = useCut.getState().pieceId;
    if (id && (s.selected !== id || s.project !== previous.project)) useCut.getState().cancel();
});
