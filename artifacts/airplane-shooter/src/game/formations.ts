
/** Screen entry edge: top / left / right — rotated per wave. */
export type EntryEdge = "top" | "left" | "right";

export interface FormationSlot {
  /** Normalized offset (multiplied by `scale`). */
  dx: number;
  dy: number;
}

export interface WaveFormation {
  slots: FormationSlot[];
  /** Spacing between formation cells (approx px). */
  scale: number;
  entry: EntryEdge;
}

function line(n: number, spacing = 1.2): FormationSlot[] {
  const out: FormationSlot[] = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    out.push({ dx: (i - mid) * spacing, dy: 0 });
  }
  return out;
}

/** Downward V — easy */
function vShape(): FormationSlot[] {
  return [
    { dx: 0, dy: -1.4 },
    { dx: -1, dy: -0.25 },
    { dx: 0, dy: -0.25 },
    { dx: 1, dy: -0.25 },
    { dx: -2, dy: 1.1 },
    { dx: -1, dy: 1.1 },
    { dx: 1, dy: 1.1 },
    { dx: 2, dy: 1.1 },
  ];
}

/** Chevron / inverted V */
function chevron(): FormationSlot[] {
  return [
    { dx: -2.2, dy: -0.8 },
    { dx: -1.1, dy: -0.8 },
    { dx: 0, dy: -1.5 },
    { dx: 1.1, dy: -0.8 },
    { dx: 2.2, dy: -0.8 },
    { dx: -1.6, dy: 0.9 },
    { dx: 0, dy: 0.4 },
    { dx: 1.6, dy: 0.9 },
  ];
}

/** 3×3 grid — hard, crowded */
function grid3(): FormationSlot[] {
  const out: FormationSlot[] = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      out.push({ dx: col * 1.15, dy: row * 0.95 });
    }
  }
  return out;
}

/** Diamond */
function diamond(): FormationSlot[] {
  return [
    { dx: 0, dy: -1.8 },
    { dx: -1.15, dy: -0.6 },
    { dx: 1.15, dy: -0.6 },
    { dx: -2.2, dy: 0.5 },
    { dx: 0, dy: 0.5 },
    { dx: 2.2, dy: 0.5 },
    { dx: -1.15, dy: 1.5 },
    { dx: 1.15, dy: 1.5 },
    { dx: 0, dy: 2.4 },
  ];
}

/** Staggered double row — very hard */
function staggeredDouble(): FormationSlot[] {
  const out: FormationSlot[] = [];
  for (let i = 0; i < 5; i++) {
    out.push({ dx: (i - 2) * 1.2, dy: -0.35 });
  }
  for (let i = 0; i < 6; i++) {
    out.push({ dx: (i - 2.5) * 1.1, dy: 1.05 });
  }
  return out;
}

/** Partial arc */
function arcSlots(n: number): FormationSlot[] {
  const out: FormationSlot[] = [];
  const r = 2.4;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1 || 1) - 0.5) * Math.PI * 0.85;
    out.push({ dx: Math.sin(t) * r * 1.4, dy: -Math.cos(t) * r * 0.5 - 0.3 });
  }
  return out;
}

/**
 * Pick formation by level (easy → hard) and entry edge by wave index.
 * @deprecated Use `buildFormationForMain` (10-level campaign).
 */
export function buildFormationForLevel(level: number, waveIndex: number): WaveFormation {
  return buildFormationForMain(level, waveIndex, 0);
}

/**
 * Campaign formations: rotate shapes by wave / group / main level.
 * `groupIndex` stacks groups vertically in `GameManager`.
 */
export function buildFormationForMain(
  mainLevel: number,
  waveIndex: number,
  groupIndex: number,
): WaveFormation {
  const edges: EntryEdge[] = ["top", "right", "left"];
  const entry = edges[(waveIndex + groupIndex * 2) % 3]!;
  const seed = waveIndex * 7 + groupIndex * 11 + mainLevel * 3;
  const nLine = Math.min(8, 4 + (mainLevel % 4) + (seed % 3));

  const variants: FormationSlot[][] = [
    line(nLine, 1.15),
    vShape(),
    chevron(),
    grid3(),
    diamond(),
    staggeredDouble(),
    arcSlots(5 + (mainLevel % 5)),
  ];
  const slots = variants[seed % variants.length]!;
  const scale = Math.max(20, 34 - mainLevel * 0.65 - groupIndex * 0.45);
  return { slots, scale, entry };
}
