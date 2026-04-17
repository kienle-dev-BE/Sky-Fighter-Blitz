
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

/** Falling arc projectile (boss bomb). */
export class BombBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 9;
  active = true;
  readonly gravity = 0.13;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    const pad = this.radius + 16;
    if (this.y > CANVAS_HEIGHT + pad || this.x < -pad || this.x > CANVAS_WIDTH + pad) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, radius: r } = this;
    ctx.save();
    ctx.shadowColor = "#ff8800";
    ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
    g.addColorStop(0, "#fff3b0");
    g.addColorStop(0.55, "#ff6600");
    g.addColorStop(1, "#662200");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Boss laser: charge visuals at top of screen, then spawns {@link LaserBeam}.
 */
export class LaserChargeEffect {
  x: number;
  finalVx: number;
  finalLife: number;
  halfW = 12;
  t = 0;
  readonly chargeFrames: number;
  active = true;

  constructor(x: number, finalVx: number, finalLife: number, chargeFrames = 56) {
    this.x = x;
    this.finalVx = finalVx;
    this.finalLife = finalLife;
    this.chargeFrames = chargeFrames;
  }

  /**
   * Returns a laser when charge completes; snaps x to playable bounds like {@link LaserBeam}.
   */
  update(): LaserBeam | null {
    this.t++;
    if (this.t < this.chargeFrames) return null;
    this.active = false;
    let x = this.x;
    const hw = this.halfW;
    x = Math.max(hw + 8, Math.min(CANVAS_WIDTH - hw - 8, x));
    return new LaserBeam(x, this.finalVx, this.finalLife);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const p = Math.min(1, (this.t + 1) / this.chargeFrames);
    const f = this.t;
    const cx = this.x;
    const focusY = 26;
    const pulse = 0.45 + 0.55 * Math.sin(f * 0.28);
    ctx.save();

    const coreR = 8 + p * 52 * pulse;
    const g = ctx.createRadialGradient(cx, focusY, 0, cx, focusY, coreR + 24);
    g.addColorStop(0, `rgba(220,255,255,${0.45 + p * 0.45})`);
    g.addColorStop(0.35, `rgba(0,220,255,${0.25 + p * 0.35})`);
    g.addColorStop(0.65, `rgba(255,0,160,${0.12 * pulse})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, focusY, coreR + 22, 0, Math.PI * 2);
    ctx.fill();

    const n = 16;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + f * 0.06;
      const pull = (1 - p * 0.92) * (140 + (i % 3) * 20);
      const px = cx + Math.cos(angle) * pull;
      const py = focusY + Math.sin(angle) * pull * 0.65;
      ctx.fillStyle = `rgba(160,255,255,${0.15 + p * 0.65})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + p * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(0,255,255,${0.35 + p * 0.45})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, focusY, 18 + p * 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.14 + p * 0.28;
    const previewH = CANVAS_HEIGHT * (0.22 + p * 0.18);
    const gradV = ctx.createLinearGradient(cx - this.halfW, 0, cx + this.halfW, previewH);
    gradV.addColorStop(0, "rgba(0,255,255,0.7)");
    gradV.addColorStop(1, "rgba(0,100,200,0)");
    ctx.fillStyle = gradV;
    ctx.fillRect(cx - this.halfW, 0, this.halfW * 2, previewH);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("CHARGE", cx, focusY + 4);

    ctx.restore();
  }
}

/** Vertical sweeping laser column. */
export class LaserBeam {
  x: number;
  halfW = 12;
  life: number;
  vx: number;
  dmgCooldown = 0;
  active = true;

  constructor(x: number, vx: number, lifeFrames: number) {
    this.x = x;
    this.vx = vx;
    this.life = lifeFrames;
  }

  update() {
    this.x += this.vx;
    this.x = Math.max(this.halfW + 8, Math.min(CANVAS_WIDTH - this.halfW - 8, this.x));
    this.life--;
    if (this.life <= 0) this.active = false;
    if (this.dmgCooldown > 0) this.dmgCooldown--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, halfW } = this;
    ctx.save();
    const grad = ctx.createLinearGradient(x - halfW, 0, x + halfW, CANVAS_HEIGHT);
    grad.addColorStop(0, "rgba(255,80,200,0.15)");
    grad.addColorStop(0.5, "rgba(0,255,255,0.85)");
    grad.addColorStop(1, "rgba(0,160,255,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - halfW, 0, halfW * 2, CANVAS_HEIGHT);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - halfW, 0, halfW * 2, CANVAS_HEIGHT);
    ctx.restore();
  }

  canDamagePlayer(): boolean {
    return this.dmgCooldown === 0;
  }

  markDamageFrame() {
    this.dmgCooldown = 28;
  }
}
