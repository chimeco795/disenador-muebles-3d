export const CUT = Object.freeze({
    minPart: 1,
    increment: 1,
    largeIncrement: 10,
    roundStep: 100,
    roundTolerance: 3,
    kerf: 0,
    handleRadius: 0.045,
    linePadding: 0.035,
    dragEpsilon: 1e-8,
});
export function cutOffset(raw: number, length: number, magnetic = true, kerf: number = CUT.kerf): number {
    let value = Math.round(raw / CUT.increment) * CUT.increment;
    const round = Math.round(value / CUT.roundStep) * CUT.roundStep;
    if (magnetic && Math.abs(round - value) <= CUT.roundTolerance)
        value = round;
    return Math.max(CUT.minPart, Math.min(length - CUT.minPart - kerf, value));
}
