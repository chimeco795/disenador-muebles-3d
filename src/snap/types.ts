import type { Vector3 } from 'three';
import type { Vec3 } from '../model';
import type { Placement } from './placement';
import type { AngularSnap } from './angular';
/** Ephemeral feedback; never persisted or added to Undo/Redo. */
export interface SnapPreviewState {
    position: Vec3;
    placement?: Placement;
    angular?: AngularSnap | null;
    axis?: Vector3 | null;
    bypass?: boolean;
}
