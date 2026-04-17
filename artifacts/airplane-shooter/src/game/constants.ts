
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 720;

export const PLAYER_SPEED = 5;
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 50;
export const PLAYER_MAX_HP = 3;
export const PLAYER_INVINCIBLE_DURATION = 2000;

export const BULLET_SPEED = 10;
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 14;
export const PLAYER_FIRE_RATE = 200;

export const ENEMY_BULLET_SPEED = 4;
export const ENEMY_BULLET_WIDTH = 4;
export const ENEMY_BULLET_HEIGHT = 10;

export const STAR_COUNT = 60;
export const LEVEL_DURATION = 30000;

export const POWERUP_CHANCE = 0.12;
export const POWERUP_DURATION = 7000;

export type EnemyType = "basic" | "fast" | "tank";

export const ENEMY_CONFIGS: Record<EnemyType, {
  width: number;
  height: number;
  hp: number;
  speed: number;
  score: number;
  color: string;
  shootChance: number;
  shootInterval: number;
}> = {
  basic: {
    width: 36,
    height: 36,
    hp: 1,
    speed: 1.2,
    score: 10,
    color: "#e74c3c",
    shootChance: 0,
    shootInterval: 3000,
  },
  fast: {
    width: 28,
    height: 28,
    hp: 1,
    speed: 2.8,
    score: 20,
    color: "#f39c12",
    shootChance: 0,
    shootInterval: 2000,
  },
  tank: {
    width: 50,
    height: 44,
    hp: 5,
    speed: 0.6,
    score: 50,
    color: "#8e44ad",
    shootChance: 0,
    shootInterval: 1800,
  },
};
