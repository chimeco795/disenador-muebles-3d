import { cutColor } from '../materials/color';
import { migrateMaterials, nextPieceNumber } from '../materials/project';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { Piece, Project, CutRecord, Vec3 } from '../model';
import { CUT } from './config';
export function splitPiece(project: Project, pieceId: string, offset: number, axis: 'length' | 'width' = 'length', kerf = 0, id: () => string = () => crypto.randomUUID()): Project | null {
    project = migrateMaterials(project);
    const parent = project.pieces.find(p => p.id === pieceId);
    if (!parent || parent.operations?.length || parent.isLocked || parent.isHidden || !Number.isFinite(offset) || !Number.isFinite(kerf) || kerf < 0 || offset < CUT.minPart || parent[axis] - offset - kerf < CUT.minPart)
        return null;
    const existing = project.stocks?.find(s => s.id === parent.stockId);
    if (!existing)
        return null;
    const stock = existing;
    const cutId = id();
    const childIds: [
        string,
        string
    ] = [id(), id()];
    const lengths = [offset, parent[axis] - offset - kerf];
    const quaternion = new Quaternion().setFromEuler(new Euler(...parent.rotation.map(MathUtils.degToRad) as Vec3));
    const pastel = cutColor(stock.color);
    const firstNumber = nextPieceNumber(project, stock);
    const children = lengths.map((length, i): Piece => {
        const shift = -parent[axis] / 2 + (i === 0 ? length / 2 : offset + kerf + length / 2);
        const center = new Vector3(axis === 'length' ? shift : 0, 0, axis === 'width' ? shift : 0).applyQuaternion(quaternion).add(new Vector3(...parent.position));
        return { ...parent, id: childIds[i], code: stock.piecePrefix + String(firstNumber + i), usage: i === 0 ? 'used' : 'available', sourceMaterialId: stock.id, catalogMaterialId: stock.catalogMaterialId, name: `${parent.name} · ${i === 0 ? 'A' : 'B'}`, [axis]: length, position: center.toArray() as Vec3, rotation: [...parent.rotation], color: pastel, originalColor: stock.color, isCut: true, isLocked: false, isHidden: false, stockId: stock.id, parentPieceId: parent.id, producedByCutId: cutId };
    });
    const record: CutRecord = { id: cutId, stockId: stock.id, parent: { ...parent, position: [...parent.position], rotation: [...parent.rotation] }, childIds, axis, offset, kerf };
    return { ...project, pieces: project.pieces.flatMap(p => p.id === pieceId ? children : [p]), stocks: project.stocks, cuts: [...(project.cuts ?? []), record] };
}
