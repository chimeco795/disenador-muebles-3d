export type Face = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
export type SpecialOperation =
    { id: string; kind: 'angular'; axis: 'length' | 'width'; offset: number; angle: number; keep: 'start' | 'end'; kerf: number }
    | { id: string; kind: 'drill'; face: Face; u: number; v: number; diameter: number; depth: number }
    | { id: string; kind: 'curve'; shape: 'round-corner' | 'arc' | 'semicircle' | 'circle'; radius: number; corner: 'near-left' | 'near-right' | 'far-left' | 'far-right'; u: number; v: number };
export type RepeatAction =
    { kind: 'cut'; axis: 'length' | 'width'; offset: number; kerf: number }
    | { kind: 'duplicate' }
    | { kind: 'transform'; translation: [number, number, number]; rotation: [number, number, number] }
    | { kind: 'visibility'; hidden: boolean }
    | { kind: 'special'; operation: SpecialOperation };
