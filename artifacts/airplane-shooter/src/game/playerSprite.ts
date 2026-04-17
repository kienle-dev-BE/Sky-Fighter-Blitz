import playerUrl from "../assets/Player/layer.png?url";

let cache: HTMLImageElement | undefined;
let preloadPromise: Promise<void> | null = null;

export function preloadPlayerSprite(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cache = img;
      resolve();
    };
    img.onerror = () => reject(new Error("player sprite"));
    img.src = playerUrl;
  });
  return preloadPromise;
}

/**
 * Draw the player ship sprite centered at (x, y). Returns false if not loaded yet.
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const img = cache;
  if (!img?.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.filter = "drop-shadow(0 2px 12px rgba(91,192,235,0.5))";
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
  return true;
}

/** Minimal placeholder while the PNG is loading. */
export function drawPlayerSpriteFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.shadowColor = "#5bc0eb";
  ctx.shadowBlur = 10;
  const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  g.addColorStop(0, "#7ecbff");
  g.addColorStop(0.5, "#3a8fd1");
  g.addColorStop(1, "#1a4a7a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w * 0.35, y);
  ctx.lineTo(x + w / 2, y + h * 0.3);
  ctx.lineTo(x + w * 0.25, y + h / 2);
  ctx.lineTo(x, y + h * 0.35);
  ctx.lineTo(x - w * 0.25, y + h / 2);
  ctx.lineTo(x - w / 2, y + h * 0.3);
  ctx.lineTo(x - w * 0.35, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
