import type { Join } from './assembly/model';
import type { RepeatAction, SpecialOperation } from './operations/types';
import type { OptimizedPlan, OptimizerSettings } from './optimization/types';
export type Vec3 = [
    number,
    number,
    number
];
export interface Material {
    category?: string;
    id: string;
    name: string;
    family: 'Tablas / listones' | 'Tableros';
    materialType: string;
    length: number;
    width: number;
    height: number;
    color: string;
}
// All lengths and positions are millimeters; rotations are degrees. Y is up.
export interface Piece {
    id: string;
    name: string;
    materialType: string;
    sourceMaterialId: string;
    length: number;
    width: number;
    height: number;
    position: Vec3;
    rotation: Vec3;
    color: string;
    isCut: boolean;
    isLocked: boolean;
    isHidden: boolean;
    code?: string;
    catalogMaterialId?: string;
    usage?: 'original' | 'used' | 'available';
    stockId?: string;
    parentPieceId?: string;
    producedByCutId?: string;
    originalColor?: string;
    duplicateOf?: string;
    cutRotationAllowed?: boolean;
    operations?: SpecialOperation[];
}
export interface StockRecord {
    piecePrefix?: string;
    materialType?: string;
    family?: Material['family'];
    id: string;
    rootPieceId: string;
    catalogMaterialId: string;
    name: string;
    length: number;
    width: number;
    height: number;
    color: string;
}
export interface CutRecord {
    id: string;
    stockId: string;
    parent: Piece;
    childIds: [
        string,
        string
    ];
    axis: 'length' | 'width';
    offset: number;
    kerf: number;
}
export interface Project {
    preferences?: {grid:boolean;shadows:boolean;dimensions:boolean;snapAlignment:'free'|'center'|'min'|'max'};
    joins?: Join[];
    version: 1;
    name: string;
    pieces: Piece[];
    sawKerf?: number;
    customMaterials?: Material[];
    lastAction?: RepeatAction;
    colorVersion?: 1;
    optimizerSettings?: OptimizerSettings;
    optimizedPlan?: OptimizedPlan;
    materialsVersion?: 1;
    archivedPieces?: Piece[];
    stocks?: StockRecord[];
    cuts?: CutRecord[];
}
export const SCALE = 0.001;
export const toScene = (v: Vec3): Vec3 => v.map(n => n * SCALE) as Vec3;
export const dimensions = (p: Pick<Piece, 'length' | 'width' | 'height'>) => `${p.length} × ${p.width} × ${p.height} mm`;
export const catalog: Material[] = [
    { id: 'pino-100', name: 'Tabla de pino', family: 'Tablas / listones', materialType: 'Pino', length: 3000, width: 100, height: 18, color: '#ee555c' },
    { id: 'pino-90', name: 'Tabla de pino', family: 'Tablas / listones', materialType: 'Pino', length: 2400, width: 90, height: 18, color: '#3989e8' },
    { id: 'liston-40', name: 'Listón de pino', family: 'Tablas / listones', materialType: 'Pino', length: 2400, width: 40, height: 40, color: '#ecb52c' },
    { id: 'mdf-18', name: 'Tablero MDF', family: 'Tableros', materialType: 'MDF', length: 2440, width: 1220, height: 18, color: '#38ad80' },
    { id: 'triplay-15', name: 'Triplay', family: 'Tableros', materialType: 'Triplay', length: 2440, width: 1220, height: 15, color: '#f28a3d' },
];
catalog.push(
    ...[ [3000, 150, 25], [2400, 200, 18], [3000, 200, 38], [1800, 100, 25] ].map(([length,width,height], i) => ({ id: 'tabla-extra-' + i, name: 'Tabla de pino', family: 'Tablas / listones' as const, category: 'Tablas', materialType: 'Pino', length,width,height,color:'#ee555c' })),
    ...[ [2400,20,20], [3000,30,30], [2400,40,60], [1800,25,50] ].map(([length,width,height], i) => ({ id:'liston-extra-'+i,name:'Listón de pino',family:'Tablas / listones' as const,category:'Listones',materialType:'Pino',length,width,height,color:'#ecb52c' })),
    ...[6,9,12,25].map(height => ({ id:'mdf-'+height,name:'Tablero MDF',family:'Tableros' as const,category:'MDF',materialType:'MDF',length:2440,width:1220,height,color:'#38ad80' })),
    ...[6,9,12,18].map(height => ({ id:'triplay-'+height,name:'Triplay',family:'Tableros' as const,category:'Triplay',materialType:'Triplay',length:2440,width:1220,height,color:'#f28a3d' })),
    ...['Melamina','OSB','Aglomerado'].map((materialType,i) => ({ id:'tablero-otro-'+i,name:materialType,family:'Tableros' as const,category:'Otros tableros',materialType,length:2440,width:1220,height:18,color:['#7b75c8','#cf9243','#8a9871'][i] }))
);
// Future operations (cuts, snap, manufacturing) consume the real-unit model.
// sourceMaterialId and stockId identify original stock; catalogMaterialId identifies its catalog type.
export const ANGULAR_GUIDES = [0, 15, 30, 45, 60, 90] as const;
