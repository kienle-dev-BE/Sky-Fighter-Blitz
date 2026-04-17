import boss01 from "../assets/bosses/boss-01.png?url";
import boss02 from "../assets/bosses/boss-02.png?url";
import boss03 from "../assets/bosses/boss-03.png?url";
import boss04 from "../assets/bosses/boss-04.png?url";
import boss05 from "../assets/bosses/boss-05.png?url";
import boss06 from "../assets/bosses/boss-06.png?url";
import boss07 from "../assets/bosses/boss-07.png?url";
import boss08 from "../assets/bosses/boss-08.png?url";
import boss09 from "../assets/bosses/boss-09.png?url";
import boss10 from "../assets/bosses/boss-10.png?url";

const urls: readonly string[] = [
  boss01, boss02, boss03, boss04, boss05,
  boss06, boss07, boss08, boss09, boss10,
];

const cache: (HTMLImageElement | undefined)[] = [];
let preloadPromise: Promise<void> | null = null;

export function preloadBossSprites(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all(
    urls.map(
      (src, i) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            cache[i] = img;
            resolve();
          };
          img.onerror = () => reject(new Error(`boss ${i + 1}`));
          img.src = src;
        }),
    ),
  ).then(() => undefined);
  return preloadPromise;
}

export function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  bossIndex: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const img = cache[bossIndex % 10];
  if (!img?.complete || !img.naturalWidth) return false;
  ctx.save();
  const hue = (bossIndex * 18) % 360;
  ctx.filter = `hue-rotate(${hue}deg) saturate(1.15) drop-shadow(0 4px 14px rgba(0,200,255,0.35))`;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
  return true;
}
