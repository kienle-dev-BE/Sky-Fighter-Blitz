import type { EnemyType } from "./constants";

/** Order matches `EnemyType` in constants (enemy_01 … enemy_15; phantom = enemy_9.png). */
import basicUrl from "../assets/enemies/enemy_01.png?url";
import droneUrl from "../assets/enemies/enemy_02.png?url";
import scoutUrl from "../assets/enemies/enemy_03.png?url";
import fastUrl from "../assets/enemies/enemy_04.png?url";
import cometUrl from "../assets/enemies/enemy_05.png?url";
import saucerUrl from "../assets/enemies/enemy_06.png?url";
import crystalUrl from "../assets/enemies/enemy_07.png?url";
import hunterUrl from "../assets/enemies/enemy_08.png?url";
import phantomUrl from "../assets/enemies/enemy_9.png?url";
import serpentUrl from "../assets/enemies/enemy_10.png?url";
import bruiserUrl from "../assets/enemies/enemy_11.png?url";
import pulsarUrl from "../assets/enemies/enemy_12.png?url";
import vortexUrl from "../assets/enemies/enemy_13.png?url";
import tankUrl from "../assets/enemies/enemy_14.png?url";
import voidUrl from "../assets/enemies/enemy_15.png?url";

const urls: Record<EnemyType, string> = {
  basic: basicUrl,
  drone: droneUrl,
  scout: scoutUrl,
  fast: fastUrl,
  comet: cometUrl,
  saucer: saucerUrl,
  crystal: crystalUrl,
  hunter: hunterUrl,
  phantom: phantomUrl,
  serpent: serpentUrl,
  bruiser: bruiserUrl,
  pulsar: pulsarUrl,
  vortex: vortexUrl,
  tank: tankUrl,
  void: voidUrl,
};

const cache: Partial<Record<EnemyType, HTMLImageElement>> = {};
let preloadPromise: Promise<void> | null = null;

export function preloadEnemySprites(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  const types = Object.keys(urls) as EnemyType[];
  preloadPromise = Promise.all(
    types.map(
      (type) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            cache[type] = img;
            resolve();
          };
          img.onerror = () => reject(new Error(`Failed to load ${type} sprite`));
          img.src = urls[type];
        }),
    ),
  ).then(() => undefined);
  return preloadPromise;
}

export function enemySpriteReady(type: EnemyType): boolean {
  const img = cache[type];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/**
 * Draws bitmap enemy art with tier styling (hue shifts as wave level rises).
 * Returns true if drawn; false to fall back to vector drawing.
 */
export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  type: EnemyType,
  waveLevel: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const img = cache[type];
  if (!img?.complete || img.naturalWidth === 0) return false;

  const tierHue = ((waveLevel - 1) * 14) % 360;
  const sat = 1 + Math.min(50, Math.max(0, waveLevel - 1)) * 0.015;
  const glow = 3 + Math.min(22, waveLevel);

  ctx.save();
  ctx.translate(x, y);
  ctx.filter = `hue-rotate(${tierHue}deg) saturate(${sat}) drop-shadow(0 0 ${glow}px rgba(100,180,255,0.4))`;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.filter = "none";
  ctx.restore();
  return true;
}
