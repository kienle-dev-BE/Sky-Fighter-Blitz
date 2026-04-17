
import { BULLET_SPEED, MAX_GUN_LEVEL } from "./constants";

export interface PlayerRayShot {
  /** Angle from vertical-up (radians). 0 = straight up. */
  angle: number;
  /** Lateral spawn offset from ship center (parallel mode, ≤2 rays). */
  spawnXOff: number;
  yOff: number;
  isDouble: boolean;
}

/**
 * gunLevel 0…10: max 5 rays; stacks add bullets per ray; at ≥6 center ray has +1;
 * extra stacks from 7+ distribute round-robin.
 * Fan spread only when ray count > 2.
 */
export function buildPlayerVolley(gunLevel: number, isDoubleSalvo: boolean): PlayerRayShot[] {
  const g = Math.max(0, Math.min(MAX_GUN_LEVEL, gunLevel));
  const rays = Math.min(5, g + 1);
  const stacks = new Array(rays).fill(1);
  if (g >= 6) stacks[Math.floor(rays / 2)]++;
  const extra = Math.max(0, g - 6);
  for (let e = 0; e < extra; e++) stacks[e % rays]++;

  const colSpacing =
    rays <= 1 ? 0 : rays === 2 ? 16 : 0;
  const fanSpread = rays > 2 ? 0.48 : 0;
  const shots: PlayerRayShot[] = [];

  for (let r = 0; r < rays; r++) {
    const spawnXOff =
      rays <= 2 ? (r - (rays - 1) / 2) * colSpacing : 0;
    const angle =
      rays > 2
        ? (r - (rays - 1) / 2) * (fanSpread / Math.max(1, rays - 1))
        : 0;
    for (let s = 0; s < stacks[r]!; s++) {
      shots.push({
        angle,
        spawnXOff,
        yOff: s * 5,
        isDouble: isDoubleSalvo,
      });
    }
  }
  return shots;
}

export function shotVelocity(angleRad: number): { vx: number; vy: number } {
  return {
    vx: Math.sin(angleRad) * BULLET_SPEED,
    vy: -Math.cos(angleRad) * BULLET_SPEED,
  };
}
