
import {
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_INVINCIBLE_DURATION,
  BULLET_SPEED, BULLET_WIDTH, BULLET_HEIGHT,
  ENEMY_BULLET_SPEED, ENEMY_BULLET_WIDTH, ENEMY_BULLET_HEIGHT,
  ENEMY_CONFIGS, EnemyType, POWERUP_DURATION,
  CANVAS_WIDTH, CANVAS_HEIGHT,
} from "./constants";

// ─── Utility ─────────────────────────────────────────────────────────────────

export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Star (scrolling background) ─────────────────────────────────────────────

export class Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;

  constructor() {
    this.x = Math.random() * CANVAS_WIDTH;
    this.y = Math.random() * CANVAS_HEIGHT;
    this.size = Math.random() * 2 + 0.5;
    this.speed = Math.random() * 1.5 + 0.3;
    this.brightness = Math.random() * 0.6 + 0.4;
  }

  update() {
    this.y += this.speed;
    if (this.y > CANVAS_HEIGHT) {
      this.y = 0;
      this.x = Math.random() * CANVAS_WIDTH;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.brightness;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Player Bullet ────────────────────────────────────────────────────────────

export class PlayerBullet {
  x: number;
  y: number;
  width = BULLET_WIDTH;
  height = BULLET_HEIGHT;
  active = true;
  isDouble: boolean;

  constructor(x: number, y: number, isDouble = false) {
    this.x = x;
    this.y = y;
    this.isDouble = isDouble;
  }

  update() {
    this.y -= BULLET_SPEED;
    if (this.y + this.height < 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Glow effect
    ctx.shadowColor = this.isDouble ? "#00ffff" : "#00e5ff";
    ctx.shadowBlur = 8;
    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    grad.addColorStop(0, this.isDouble ? "#ffffff" : "#aef3ff");
    grad.addColorStop(1, this.isDouble ? "#00ffff" : "#0099cc");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(this.x - this.width / 2, this.y, this.width, this.height, 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Enemy Bullet ─────────────────────────────────────────────────────────────

export class EnemyBullet {
  x: number;
  y: number;
  width = ENEMY_BULLET_WIDTH;
  height = ENEMY_BULLET_HEIGHT;
  active = true;
  vx: number;
  vy: number;

  constructor(x: number, y: number, targetX: number, targetY: number) {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x = x;
    this.y = y;
    this.vx = (dx / dist) * ENEMY_BULLET_SPEED;
    this.vy = (dy / dist) * ENEMY_BULLET_SPEED;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y > CANVAS_HEIGHT + 20 || this.x < -20 || this.x > CANVAS_WIDTH + 20) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowColor = "#ff4444";
    ctx.shadowBlur = 8;
    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    grad.addColorStop(0, "#ff8888");
    grad.addColorStop(1, "#cc0000");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(this.x - this.width / 2, this.y, this.width, this.height, 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Explosion Particle ───────────────────────────────────────────────────────

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active = true;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = Math.random() * 30 + 20;
    this.life = this.maxLife;
    this.size = Math.random() * 5 + 2;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.93;
    this.vy *= 0.93;
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Player ───────────────────────────────────────────────────────────────────

export class Player {
  x: number;
  y: number;
  width = PLAYER_WIDTH;
  height = PLAYER_HEIGHT;
  hp = PLAYER_MAX_HP;
  maxHp = PLAYER_MAX_HP;
  invincibleUntil = 0;
  doubleShot = false;
  doubleShotUntil = 0;
  shieldActive = false;
  shieldUntil = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 80;
  }

  get isInvincible(): boolean {
    return Date.now() < this.invincibleUntil;
  }

  moveLeft() { this.x = Math.max(this.width / 2, this.x - PLAYER_SPEED); }
  moveRight(canvasWidth: number) { this.x = Math.min(canvasWidth - this.width / 2, this.x + PLAYER_SPEED); }
  moveUp() { this.y = Math.max(this.height / 2, this.y - PLAYER_SPEED); }
  moveDown(canvasHeight: number) { this.y = Math.min(canvasHeight - this.height / 2, this.y + PLAYER_SPEED); }

  takeDamage(): boolean {
    if (this.isInvincible || this.shieldActive) return false;
    this.hp--;
    this.invincibleUntil = Date.now() + PLAYER_INVINCIBLE_DURATION;
    return true;
  }

  updatePowerUps() {
    const now = Date.now();
    if (this.doubleShot && now >= this.doubleShotUntil) {
      this.doubleShot = false;
    }
    if (this.shieldActive && now >= this.shieldUntil) {
      this.shieldActive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const px = this.x;
    const py = this.y;
    const w = this.width;
    const h = this.height;
    const blinkVisible = !this.isInvincible || Math.floor(Date.now() / 100) % 2 === 0;

    if (!blinkVisible) return;

    ctx.save();

    // Shield glow
    if (this.shieldActive) {
      ctx.beginPath();
      ctx.arc(px, py, w * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,200,255,0.7)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00ccff";
      ctx.shadowBlur = 18;
      ctx.stroke();
    }

    // Engine glow
    const thrusterGrad = ctx.createRadialGradient(px, py + h * 0.4, 0, px, py + h * 0.4, 14);
    thrusterGrad.addColorStop(0, "rgba(0,200,255,0.9)");
    thrusterGrad.addColorStop(0.4, "rgba(0,100,200,0.5)");
    thrusterGrad.addColorStop(1, "rgba(0,0,100,0)");
    ctx.fillStyle = thrusterGrad;
    ctx.beginPath();
    ctx.ellipse(px, py + h * 0.4, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyGrad = ctx.createLinearGradient(px - w / 2, py - h / 2, px + w / 2, py + h / 2);
    bodyGrad.addColorStop(0, "#7ecbff");
    bodyGrad.addColorStop(0.5, "#3a8fd1");
    bodyGrad.addColorStop(1, "#1a4a7a");
    ctx.shadowColor = "#5bc0eb";
    ctx.shadowBlur = 12;
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    // Nose
    ctx.moveTo(px, py - h / 2);
    // Right shoulder
    ctx.lineTo(px + w * 0.35, py);
    // Right wing tip
    ctx.lineTo(px + w / 2, py + h * 0.3);
    // Right tail
    ctx.lineTo(px + w * 0.25, py + h / 2);
    // Center bottom
    ctx.lineTo(px, py + h * 0.35);
    // Left tail
    ctx.lineTo(px - w * 0.25, py + h / 2);
    // Left wing tip
    ctx.lineTo(px - w / 2, py + h * 0.3);
    // Left shoulder
    ctx.lineTo(px - w * 0.35, py);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    const cockpitGrad = ctx.createRadialGradient(px, py - h * 0.1, 0, px, py - h * 0.1, 9);
    cockpitGrad.addColorStop(0, "#e0f7ff");
    cockpitGrad.addColorStop(1, "#5bc0eb");
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.ellipse(px, py - h * 0.1, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ─── Enemy ────────────────────────────────────────────────────────────────────

export class Enemy {
  x: number;
  y: number;
  type: EnemyType;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  score: number;
  color: string;
  shootInterval: number;
  lastShot: number;
  active = true;
  wobble = 0;

  constructor(x: number, y: number, type: EnemyType, level: number) {
    const cfg = ENEMY_CONFIGS[type];
    this.x = x;
    this.y = y;
    this.type = type;
    this.width = cfg.width;
    this.height = cfg.height;
    const hpBoost = Math.max(1, Math.floor(level / 3));
    const speedBoost = 1 + (level - 1) * 0.08;
    this.hp = cfg.hp + (type === "tank" ? hpBoost : 0);
    this.maxHp = this.hp;
    this.speed = cfg.speed * speedBoost;
    this.score = cfg.score;
    this.color = cfg.color;
    this.shootInterval = Math.max(800, cfg.shootInterval - (level - 1) * 100);
    this.lastShot = Date.now() + Math.random() * 1500;
  }

  canShoot(level: number): boolean {
    if (level < 2) return false;
    return Date.now() - this.lastShot > this.shootInterval;
  }

  resetShot() {
    this.lastShot = Date.now();
  }

  update() {
    this.y += this.speed;
    this.wobble += 0.05;
    if (this.type === "fast") {
      this.x += Math.sin(this.wobble) * 1.5;
    }
    if (this.y > CANVAS_HEIGHT + this.height) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, width: w, height: h, color, type } = this;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    if (type === "basic") {
      this._drawBasic(ctx, x, y, w, h, color);
    } else if (type === "fast") {
      this._drawFast(ctx, x, y, w, h, color);
    } else {
      this._drawTank(ctx, x, y, w, h, color);
    }

    // HP bar (only for tank or multi-hp)
    if (this.maxHp > 1) {
      const barW = w;
      const barH = 5;
      const barX = x - w / 2;
      const barY = y + h / 2 + 4;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }

    ctx.restore();
  }

  private _drawBasic(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    const grad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    grad.addColorStop(0, "#ff9999");
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    // Body
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x - w * 0.4, y);
    ctx.lineTo(x - w * 0.3, y - h / 2);
    ctx.lineTo(x, y - h * 0.2);
    ctx.lineTo(x + w * 0.3, y - h / 2);
    ctx.lineTo(x + w * 0.4, y);
    ctx.closePath();
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(x - 6, y, 4, 0, Math.PI * 2);
    ctx.arc(x + 6, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawFast(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    const grad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    grad.addColorStop(0, "#ffe0aa");
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    // Sleek delta shape
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    // Accent stripe
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.3);
    ctx.lineTo(x, y + h * 0.3);
    ctx.stroke();
  }

  private _drawTank(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    const grad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    grad.addColorStop(0, "#d7b4f0");
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    // Bulky hexagon
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w * 0.45, y - h * 0.25);
    ctx.lineTo(x + w * 0.45, y + h * 0.25);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w * 0.45, y + h * 0.25);
    ctx.lineTo(x - w * 0.45, y - h * 0.25);
    ctx.closePath();
    ctx.fill();
    // Core
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    // Armor plating lines
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.3, y - h * 0.15);
    ctx.lineTo(x + w * 0.3, y - h * 0.15);
    ctx.moveTo(x - w * 0.3, y + h * 0.15);
    ctx.lineTo(x + w * 0.3, y + h * 0.15);
    ctx.stroke();
  }
}

// ─── PowerUp ─────────────────────────────────────────────────────────────────

export type PowerUpType = "doubleShot" | "shield" | "heal";

export class PowerUp {
  x: number;
  y: number;
  width = 24;
  height = 24;
  type: PowerUpType;
  active = true;
  wobble = 0;
  speed = 1.5;

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  update() {
    this.y += this.speed;
    this.wobble += 0.08;
    if (this.y > CANVAS_HEIGHT + this.height) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, width: w, height: h, type, wobble } = this;
    const pulse = 1 + Math.sin(wobble) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);

    let color = "#00e5ff";
    let label = "2x";
    if (type === "shield") { color = "#2ecc71"; label = "SH"; }
    if (type === "heal") { color = "#e74c3c"; label = "+"; }

    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    // Gem shape
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, color + "88");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${type === "heal" ? 18 : 10}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  applyTo(player: Player) {
    const now = Date.now();
    if (this.type === "doubleShot") {
      player.doubleShot = true;
      player.doubleShotUntil = now + POWERUP_DURATION;
    } else if (this.type === "shield") {
      player.shieldActive = true;
      player.shieldUntil = now + POWERUP_DURATION;
    } else if (this.type === "heal") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    }
  }
}
