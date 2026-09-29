// Central numerical and saw accounting for both packing dimensions. No edge trim assumed.
export const EPSILON = 1e-6;
export const clean = (n: number) => Math.round(n * 1e9) / 1e9;
export function splitSpan(available: number, required: number, kerf: number) {
    const gap = clean(available - required);
    if (gap < -EPSILON) return null;
    if (Math.abs(gap) <= EPSILON) return { remainder: 0, loss: 0, cut: false };
    // A non-exact part must leave room for the entire blade width.
    if (gap + EPSILON < kerf) return null;
    return { remainder: Math.max(0, clean(gap - kerf)), loss: kerf, cut: true };
}
