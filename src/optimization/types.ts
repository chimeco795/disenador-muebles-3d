export interface OptimizerSettings { allowRotation: boolean; reuseOffcuts: boolean }
export interface Size { length: number; width: number; height: number }
export interface Rect { x: number; y: number; length: number; width: number }
export interface Demand extends Size {
    id: string; code: string; catalogMaterialId: string; materialType: string;
    sourceMaterialId: string;
    /** Future grain constraints can disallow rotation for an individual piece. */
    rotationAllowed: boolean;
}
export interface Supply extends Size {
    id: string; catalogMaterialId: string; materialType: string; sheet: boolean;
    kind: 'new' | 'offcut'; sourceMaterialId?: string; sourcePieceId?: string; sourceCode?: string;
}
export interface Placement extends Rect { piece: Demand; rotated: boolean }
export interface SawCut extends Rect { axis: 'length' | 'width'; offset: number; pieceCode: string; kerf: number }
export interface OptimizedStock {
    id: string; supply: Supply; placements: Placement[]; remaining: Rect[]; cuts: SawCut[];
}
export interface Packing { stocks: OptimizedStock[]; unplaced: Demand[] }
export interface OptimizedPlan extends Packing {
    version: 1; signature: string; settings: OptimizerSettings; kerf: number;
    requiredCount: number;
    issues: { code: string; reason: string }[];
    current: { boards: number; sheets: number };
}
