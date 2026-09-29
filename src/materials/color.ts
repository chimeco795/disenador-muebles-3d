import { Color } from 'three';
/** Blend in linear color space; always derive from the original, never from a previous cut. */
export const CUT_COLOR = Object.freeze({ soften: .22 });
export const cutColor = (original: string) => '#' + new Color(original).lerp(new Color('#ffffff'), CUT_COLOR.soften).getHexString();
