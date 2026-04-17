
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 720;

export const PLAYER_SPEED = 5;
/** Hitbox / draw size (matches `layer.png` aspect ~2:3). */
export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 46;
/** Starting HP each new game (can heal up to cap). */
export const PLAYER_START_HP = 3;
/** Maximum HP (heart slots). */
export const PLAYER_MAX_HP = 6;
export const PLAYER_INVINCIBLE_DURATION = 2000;

/** Permanent gun power for this run (pickups stack): 0…MAX. Fan ≤5 rays; extra adds shots per ray (center ×2 at 6+). */
export const MAX_GUN_LEVEL = 10;

/** Full-screen warning before boss drops in. */
export const BOSS_WARNING_DURATION_MS = 2400;

/** 10 main levels — each ends with a boss (sprites boss-01 … boss-10). */
export const MAIN_LEVEL_COUNT = 10;

/** Sub-waves per main level before boss: 5 / 7 / 9 / 9 / … */
export function subCountForMain(mainLevel: number): number {
  if (mainLevel <= 1) return 5;
  if (mainLevel === 2) return 7;
  return 9;
}

export const BULLET_SPEED = 10;
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 14;
export const ENEMY_BULLET_SPEED = 4;
export const ENEMY_BULLET_RADIUS = 5;

/** Max simultaneous enemies (waves spawn in formation; cap prevents lag). */
export const MAX_ACTIVE_ENEMIES = 42;

export const STAR_COUNT = 60;

export const POWERUP_CHANCE = 0.12;
export const POWERUP_DURATION = 7000;

/**
 * 15 space enemy archetypes. Skills implemented in `Enemy.update`.
 * Sprites: PNG `enemy_01`…`enemy_15` in `assets/enemies` (see `enemySprites.ts`).
 */
export type EnemyType =
  | "basic"
  | "drone"
  | "scout"
  | "fast"
  | "comet"
  | "saucer"
  | "crystal"
  | "hunter"
  | "phantom"
  | "serpent"
  | "bruiser"
  | "pulsar"
  | "vortex"
  | "tank"
  | "void";

/** Order enemy #1 … #15 — matches `enemy_01`…`enemy_15` PNGs. */
export const ENEMY_ORDER: readonly EnemyType[] = [
  "basic", "drone", "scout", "fast", "comet",
  "saucer", "crystal", "hunter", "phantom", "serpent",
  "bruiser", "pulsar", "vortex", "tank", "void",
] as const;

export function enemyTypeTier(t: EnemyType): number {
  const i = ENEMY_ORDER.indexOf(t);
  return i < 0 ? 1 : i + 1;
}

/** Enemy type pool by main level (by enemy_01 … enemy_15 tier). */
export function enemyPoolForMain(mainLevel: number): EnemyType[] {
  const n: Record<number, number[]> = {
    1: [1, 2],
    2: [1, 2, 3],
    3: [2, 3, 4, 5],
    4: [2, 3, 4, 5, 6],
    5: [4, 5, 6, 7],
    6: [6, 7, 8],
    7: [7, 8, 9, 10],
    8: [8, 9, 10, 11],
    9: [10, 11, 12, 13],
    10: [11, 12, 13, 14, 15],
  };
  const arr = n[mainLevel] ?? [1, 2];
  return arr.map((k) => ENEMY_ORDER[k - 1]!);
}

export const ENEMY_CONFIGS: Record<EnemyType, {
  width: number;
  height: number;
  hp: number;
  speed: number;
  score: number;
  color: string;
  shootInterval: number;
}> = {
  basic: { width: 36, height: 36, hp: 1, speed: 1.12, score: 10, color: "#e74c3c", shootInterval: 3000 },
  drone: { width: 22, height: 22, hp: 1, speed: 2.45, score: 11, color: "#bdc3c7", shootInterval: 2700 },
  scout: { width: 28, height: 28, hp: 1, speed: 2.05, score: 14, color: "#ecf0f1", shootInterval: 2800 },
  fast: { width: 34, height: 34, hp: 1, speed: 2.55, score: 20, color: "#f39c12", shootInterval: 2000 },
  comet: { width: 30, height: 26, hp: 1, speed: 3.05, score: 18, color: "#fdcb6e", shootInterval: 2200 },
  saucer: { width: 42, height: 24, hp: 2, speed: 0.92, score: 24, color: "#1abc9c", shootInterval: 2300 },
  crystal: { width: 34, height: 38, hp: 3, speed: 1.22, score: 32, color: "#00cec9", shootInterval: 1900 },
  hunter: { width: 32, height: 30, hp: 2, speed: 1.38, score: 28, color: "#e17055", shootInterval: 1700 },
  phantom: { width: 30, height: 30, hp: 2, speed: 1.52, score: 26, color: "#a29bfe", shootInterval: 2050 },
  serpent: { width: 36, height: 32, hp: 2, speed: 1.08, score: 30, color: "#00b894", shootInterval: 2000 },
  bruiser: { width: 46, height: 40, hp: 6, speed: 0.68, score: 45, color: "#9b59b6", shootInterval: 1750 },
  pulsar: { width: 32, height: 32, hp: 2, speed: 1.05, score: 34, color: "#ffeaa7", shootInterval: 1950 },
  vortex: { width: 34, height: 34, hp: 2, speed: 1.32, score: 36, color: "#74b9ff", shootInterval: 1850 },
  tank: { width: 50, height: 44, hp: 5, speed: 0.52, score: 50, color: "#8e44ad", shootInterval: 1800 },
  void: { width: 40, height: 40, hp: 7, speed: 0.40, score: 75, color: "#6c5ce7", shootInterval: 1550 },
};
