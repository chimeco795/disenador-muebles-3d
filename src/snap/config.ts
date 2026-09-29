/** All distances are millimeters, angles degrees. No scene-scale tolerances here. */
export const SNAP = Object.freeze({
    faceDetection: 45,
    intentWeight: .1,
    grabZone: 100,
    grabPriority: 24,
    directionPriority: 8,
    directDragPixels: 4,
    faceCapture: 12,
    alignmentDetection: 18,
    alignmentCapture: 6,
    neighborDistance: 180,
    angularDetection: 4,
    angularCapture: 2,
    magneticStrength: 0.7,
    parallelDegrees: 0.05,
    geometryEpsilon: 0.001,
    axisEpsilon: 1e-8,
    quaternionEpsilon: 1e-8,
    maxGuides: 3,
    faceOverlayOffset: 0.4,
    guideLabelOffset: 215,
    arcRadius: 240,
    arcSegments: 48,
});
/** Exact at the capture core, smoothly weaker toward the detection boundary.
 * This is evaluated against the raw pointer pose, never the previous snapped pose. */
export function attraction(distance: number, capture: number, detection: number): number {
    if (distance <= capture)
        return 1;
    if (distance >= detection)
        return 0;
    return Math.pow(1 - (distance - capture) / (detection - capture), 1 / SNAP.magneticStrength);
}
