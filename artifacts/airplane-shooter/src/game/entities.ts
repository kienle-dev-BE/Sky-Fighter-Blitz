
import {
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED,
  PLAYER_START_HP, PLAYER_MAX_HP, PLAYER_INVINCIBLE_DURATION,
  MAX_GUN_LEVEL,
  BULLET_SPEED, BULLET_WIDTH, BULLET_HEIGHT,
  ENEMY_BULLET_SPEED, ENEMY_BULLET_RADIUS,
  ENEMY_CONFIGS, EnemyType, POWERUP_DURATION,
  CANVAS_WIDTH, CANVAS_HEIGHT,
  enemyTypeTier,
} from "./constants";
import { drawEnemySprite } from "./enemySprites";
import { drawPlayerSprite, drawPlayerSpriteFallback } from "./playerSprite";

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

  /** `warpMultiplier` > 1 during stage transition (fast scroll). */
  update(warpMultiplier = 1) {
    this.y += this.speed * warpMultiplier;
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
  vx: number;
  vy: number;

  constructor(x: number, y: number, isDouble = false, vx?: number, vy?: number) {
    this.x = x;
    this.y = y;
    this.isDouble = isDouble;
    this.vx = vx ?? 0;
    this.vy = vy ?? -BULLET_SPEED;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y + this.height < 0 || this.y > CANVAS_HEIGHT + 40) this.active = false;
    if (this.x < -60 || this.x > CANVAS_WIDTH + 60) this.active = false;
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
  /** Center of the round bullet. */
  x: number;
  y: number;
  radius = ENEMY_BULLET_RADIUS;
  active = true;
  vx: number;
  vy: number;

  /**
   * `yTop` = spawn along former “top edge” (below enemy nose).
   * `angleOffsetRad` rotates aim in a fan (“arc”) toward the target.
   */
  constructor(x: number, yTop: number, targetX: number, targetY: number, angleOffsetRad = 0) {
    const cx = x;
    const cy = yTop + ENEMY_BULLET_RADIUS;
    const dx = targetX - cx;
    const dy = targetY - cy;
    const base = Math.atan2(dy, dx) + angleOffsetRad;
    this.x = cx;
    this.y = cy;
    this.vx = Math.cos(base) * ENEMY_BULLET_SPEED;
    this.vy = Math.sin(base) * ENEMY_BULLET_SPEED;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    const pad = this.radius + 8;
    if (this.y > CANVAS_HEIGHT + pad || this.x < -pad || this.x > CANVAS_WIDTH + pad) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, radius: r } = this;
    ctx.save();
    ctx.shadowColor = "#ff6644";
    ctx.shadowBlur = 10;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#ff8866");
    g.addColorStop(1, "#aa0000");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(80,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Explosion Particle ───────────────────────────────────────────────────────

type ParticleVariant = "normal" | "crashSmoke" | "crashFire";

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
  private variant: ParticleVariant = "normal";

  constructor(x: number, y: number, color: string, variant?: "crashSmoke" | "crashFire") {
    this.x = x;
    this.y = y;
    this.color = color;
    if (variant === "crashSmoke") {
      this.variant = "crashSmoke";
      this.vx = (Math.random() - 0.5) * 2.2;
      this.vy = -Math.random() * 1.6 - 0.35;
      this.maxLife = 48 + Math.random() * 40;
      this.life = this.maxLife;
      this.size = 6 + Math.random() * 12;
      return;
    }
    if (variant === "crashFire") {
      this.variant = "crashFire";
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.15;
      const speed = Math.random() * 3.2 + 1.4;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.maxLife = 22 + Math.random() * 22;
      this.life = this.maxLife;
      this.size = 2 + Math.random() * 5;
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = Math.random() * 30 + 20;
    this.life = this.maxLife;
    this.size = Math.random() * 5 + 2;
  }

  update() {
    if (this.variant === "crashSmoke") {
      this.x += this.vx;
      this.y += this.vy;
      this.vx += (Math.random() - 0.5) * 0.2;
      this.vy -= 0.045;
      this.life--;
    } else if (this.variant === "crashFire") {
      this.x += this.vx;
      this.y += this.vy;
      this.vy -= 0.14;
      this.vx *= 0.96;
      this.life--;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.93;
      this.vy *= 0.93;
      this.life--;
    }
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    if (this.variant === "crashSmoke") {
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = this.color;
      ctx.shadowColor = "#222";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * (0.65 + 0.35 * alpha), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.variant === "crashFire") {
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = this.color;
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ─── Player ───────────────────────────────────────────────────────────────────

export class Player {
  x: number;
  y: number;
  width = PLAYER_WIDTH;
  height = PLAYER_HEIGHT;
  hp = PLAYER_START_HP;
  maxHp = PLAYER_MAX_HP;
  /** Permanent until game over — more shots in parallel (see `MAX_GUN_LEVEL`). */
  gunLevel = 0;
  invincibleUntil = 0;
  shieldActive = false;
  shieldUntil = 0;
  /** Final hit — ship stays visible with crash VFX (no blink-out). */
  dying = false;

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
    if (this.shieldActive && now >= this.shieldUntil) {
      this.shieldActive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const px = this.x;
    const py = this.y;
    const w = this.width;
    const h = this.height;
    const blinkVisible =
      this.dying || !this.isInvincible || Math.floor(Date.now() / 100) % 2 === 0;

    if (!blinkVisible) return;

    ctx.save();

    if (this.dying) {
      ctx.translate(px, py);
      ctx.rotate(Math.sin(Date.now() / 80) * 0.14);
      ctx.translate(-px, -py);
    }

    // Shield glow
    if (this.shieldActive && !this.dying) {
      ctx.beginPath();
      ctx.arc(px, py, Math.max(w, h) * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,200,255,0.7)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00ccff";
      ctx.shadowBlur = 18;
      ctx.stroke();
    }

    const drew = drawPlayerSprite(ctx, px, py, w, h);
    if (!drew) {
      drawPlayerSpriteFallback(ctx, px, py, w, h);
    }

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
  tick = 0;
  /** Game level when this enemy spawned — drives sprite tier & scaling. */
  spawnWaveLevel: number;
  /** Fly into formation slot before normal behavior. */
  formationApproach = false;
  /** Hold formation — no drift down, slight sway + shooting. */
  arenaHold = false;
  private formationTargetX = 0;
  private formationTargetY = 0;

  constructor(
    x: number,
    y: number,
    type: EnemyType,
    mainLevel: number,
    formation?: { targetX: number; targetY: number },
    ctx?: { subWave: number },
  ) {
    const cfg = ENEMY_CONFIGS[type];
    this.x = x;
    this.y = y;
    this.type = type;
    this.spawnWaveLevel = mainLevel;
    this.width = cfg.width;
    this.height = cfg.height;

    const tier = enemyTypeTier(type);
    const sub = ctx?.subWave ?? 1;
    const tierMul = 0.42 + tier * 0.13;
    let hp = Math.floor(cfg.hp * tierMul + mainLevel * 1.15 + sub * 0.5 + tier * 0.35);
    hp = Math.max(1, hp);
    this.hp = hp;
    this.maxHp = hp;

    const speedBoost = Math.min(
      1.75,
      1 + (mainLevel - 1) * 0.065 + (sub - 1) * 0.028 + (tier - 1) * 0.012,
    );
    this.speed = cfg.speed * speedBoost;
    const scoreBump =
      type === "tank" || type === "void" ? 5
        : ["crystal", "saucer", "vortex", "pulsar", "bruiser", "serpent"].includes(type) ? 3
        : 2;
    this.score = cfg.score + Math.floor(mainLevel + sub * 0.5) * scoreBump;
    this.color = cfg.color;
    const agile = ["fast", "scout", "drone", "comet", "phantom"].includes(type);
    this.shootInterval = Math.max(
      360,
      cfg.shootInterval
        - (mainLevel - 1) * 58
        - (sub - 1) * 24
        - (agile ? 38 : 0)
        - Math.min(120, tier * 6),
    );
    this.lastShot = Date.now() + Math.random() * 1500;

    if (formation) {
      this.formationApproach = true;
      this.formationTargetX = formation.targetX;
      this.formationTargetY = formation.targetY;
    }
  }

  canShoot(_mainLevel: number): boolean {
    if (this.formationApproach) return false;
    return Date.now() - this.lastShot > this.shootInterval;
  }

  resetShot() {
    this.lastShot = Date.now();
  }

  /**
   * Shooting pattern by type — ray count + spread (rad); scaled by main level & sub-wave.
   */
  getBulletVolley(mainLevel: number, subWave: number): { count: number; spread: number } {
    const L = mainLevel;
    const S = subWave;
    const tier = enemyTypeTier(this.type);
    const t = this.type;
    let count = 1;
    let spread = 0;

    switch (t) {
      case "basic":
        count = L >= 6 ? 2 : 1;
        spread = count > 1 ? 0.22 + S * 0.02 : 0;
        break;
      case "drone":
        count = L >= 4 ? 2 : 1;
        spread = count > 1 ? 0.3 : 0;
        break;
      case "scout":
        count = L >= 5 ? 2 : 1;
        spread = 0.28;
        break;
      case "fast":
        count = L >= 3 ? 2 : 1;
        spread = 0.35 + Math.min(0.12, S * 0.03);
        break;
      case "comet":
        count = L >= 7 ? 3 : 2;
        spread = 0.4;
        break;
      case "saucer":
        count = L >= 4 ? 3 : 2;
        spread = 0.38;
        break;
      case "crystal":
        count = L >= 6 ? 3 : 2;
        spread = 0.42;
        break;
      case "hunter":
        count = 3;
        spread = 0.18;
        break;
      case "phantom":
        count = 2;
        spread = 0.5 + Math.sin(S) * 0.05;
        break;
      case "serpent":
        count = L >= 8 ? 3 : 2;
        spread = 0.48;
        break;
      case "bruiser":
        count = L >= 5 ? 3 : 2;
        spread = 0.32;
        break;
      case "pulsar":
        count = 3;
        spread = 0.55;
        break;
      case "vortex":
        count = L >= 7 ? 3 : 2;
        spread = 0.52;
        break;
      case "tank":
        count = L >= 4 ? 3 : 2;
        spread = 0.28;
        break;
      case "void":
        count = 3;
        spread = 0.36 + tier * 0.015;
        break;
      default:
        count = 1;
    }

    count = Math.min(3, Math.max(1, count));
    if (spread === 0 && count > 1) {
      spread = 0.26 + Math.min(0.22, (L - 1) * 0.015 + S * 0.01);
    }
    return { count, spread };
  }

  private _clampCx() {
    const hw = this.width / 2;
    this.x = Math.max(hw, Math.min(CANVAS_WIDTH - hw, this.x));
  }

  /** Horizontal / vertical quirks per type. `playerX` = player ship center for trackers. */
  update(playerX?: number) {
    this.tick++;

    if (this.formationApproach) {
      const dx = this.formationTargetX - this.x;
      const dy = this.formationTargetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2.8) {
        this.x = this.formationTargetX;
        this.y = this.formationTargetY;
        this.formationApproach = false;
        this.arenaHold = true;
        return;
      }
      const step = Math.min(5.8 + this.speed * 0.4, dist);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.wobble += 0.045;
      this._clampCx();
      return;
    }

    if (this.arenaHold) {
      this.wobble += 0.052;
      const t = this.type;
      const px = playerX;
      switch (t) {
        case "basic":
          break;
        case "drone":
          this.x += Math.sin(this.wobble * 1.85) * 1.4;
          break;
        case "scout":
        case "fast":
          this.x += Math.sin(this.wobble) * (t === "scout" ? 1.2 : 0.9);
          break;
        case "comet":
          this.x += Math.sin(this.tick * 0.2) * 0.9;
          break;
        case "saucer":
          this.x += Math.sin(this.wobble * 0.75) * 1.3;
          break;
        case "crystal":
          this.x += Math.sin(this.wobble * 1.1) * 0.85;
          break;
        case "hunter":
          if (px !== undefined) this.x += (px - this.x) * 0.025;
          break;
        case "phantom":
          this.x += Math.sin(this.tick * 0.26) * 2.2;
          break;
        case "serpent":
          this.x += Math.sin(this.tick * 0.07) * 1.5;
          break;
        case "bruiser":
          this.x += Math.sin(this.wobble * 0.45) * 0.7;
          break;
        case "pulsar":
          this.x += Math.sin(this.tick * 0.13) * 1.0;
          break;
        case "vortex":
          this.x += Math.sin(this.tick * 0.11) * 2.0;
          break;
        case "tank":
        case "void":
          break;
        default:
          break;
      }
      this.y += Math.sin(this.tick * 0.045) * 0.45;
      this._clampCx();
      return;
    }

    const t = this.type;
    let vy = this.speed;
    if (t === "pulsar") {
      vy *= 0.3 + 0.7 * Math.abs(Math.sin(this.tick * 0.087));
    }
    this.y += vy;
    this.wobble += 0.052;

    switch (t) {
      case "basic":
        break;
      case "drone":
        this.x += Math.sin(this.wobble * 1.85) * 2.9;
        break;
      case "scout":
      case "fast":
        this.x += Math.sin(this.wobble) * (t === "scout" ? 2 : 1.5);
        break;
      case "comet":
        this.x += Math.sin(this.tick * 0.2) * 1.35;
        break;
      case "saucer":
        this.x += Math.sin(this.wobble * 0.75) * 2.85;
        break;
      case "crystal":
        this.x += Math.sin(this.wobble * 1.1) * 1.1;
        break;
      case "hunter":
        if (playerX !== undefined) this.x += (playerX - this.x) * 0.038;
        break;
      case "phantom":
        this.x += Math.sin(this.tick * 0.26) * 4.6;
        break;
      case "serpent":
        this.x += Math.sin(this.y * 0.064) * 2.4;
        break;
      case "bruiser":
        this.x += Math.sin(this.wobble * 0.45) * 1.2;
        break;
      case "pulsar":
        this.x += Math.sin(this.tick * 0.13) * 1.5;
        break;
      case "vortex":
        this.x += Math.sin(this.tick * 0.11) * 4.1 + Math.cos(this.tick * 0.074) * 2.5;
        break;
      case "tank":
      case "void":
        break;
      default:
        break;
    }

    this._clampCx();
    if (this.y > CANVAS_HEIGHT + this.height) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, width: w, height: h, color, type } = this;

    ctx.save();
    const usedSprite = drawEnemySprite(ctx, type, this.spawnWaveLevel, x, y, w, h);
    if (!usedSprite) {
      if (type === "phantom") {
        ctx.globalAlpha = 0.58 + 0.32 * Math.sin(this.tick * 0.09);
      }
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      if (type === "basic") this._drawBasic(ctx, x, y, w, h, color);
      else if (type === "fast") this._drawFast(ctx, x, y, w, h, color);
      else if (type === "tank") this._drawTank(ctx, x, y, w, h, color);
      else if (type === "scout") this._drawScout(ctx, x, y, w, h);
      else if (type === "drone") this._drawDrone(ctx, x, y, w, h);
      else if (type === "comet") this._drawComet(ctx, x, y, w, h);
      else if (type === "saucer") this._drawSaucer(ctx, x, y, w, h);
      else if (type === "crystal") this._drawCrystal(ctx, x, y, w, h);
      else if (type === "hunter") this._drawHunter(ctx, x, y, w, h);
      else if (type === "phantom") this._drawPhantom(ctx, x, y, w, h);
      else if (type === "serpent") this._drawSerpent(ctx, x, y, w, h);
      else if (type === "bruiser") this._drawBruiser(ctx, x, y, w, h);
      else if (type === "pulsar") this._drawPulsar(ctx, x, y, w, h);
      else if (type === "vortex") this._drawVortex(ctx, x, y, w, h);
      else this._drawVoid(ctx, x, y, w, h);
    }

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

  /** Small ion probe — metallic wedge + dish */
  private _drawScout(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#dfe6e9";
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.arc(x, y + h * 0.15, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7f8c8d";
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x, y - h * 0.85);
    ctx.stroke();
    ctx.fillStyle = "#95a5a6";
    ctx.beginPath();
    ctx.arc(x, y - h * 0.9, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Tiny escort drone */
  private _drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#7f8c8d";
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3498db";
    ctx.fillRect(x - w * 0.15, y - h * 0.1, w * 0.3, h * 0.22);
  }

  /** Meteor — flame tail */
  private _drawComet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#fdcb6e");
    g.addColorStop(1, "#d63031");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w * 0.35, y + h * 0.15);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w * 0.35, y + h * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6c2b00";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  /** Classic UFO profile */
  private _drawSaucer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#1abc9c";
    ctx.strokeStyle = "#0d4d42";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#a3fff4";
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.08, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x + i * w * 0.22, y + h * 0.12, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x - w * 0.35, y - 2, w * 0.7, 3);
  }

  /** Jagged energy crystal */
  private _drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, "#81ecec");
    g.addColorStop(0.5, "#00cec9");
    g.addColorStop(1, "#006064");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#004d5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w * 0.35, y - h * 0.1);
    ctx.lineTo(x + w * 0.45, y + h * 0.25);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w * 0.45, y + h * 0.25);
    ctx.lineTo(x - w * 0.35, y - h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.35);
    ctx.lineTo(x, y + h * 0.35);
    ctx.stroke();
  }

  /** Seeker missile silhouette */
  private _drawHunter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#d63031";
    ctx.strokeStyle = "#2d0a0a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff7675";
    ctx.fillRect(x - 2, y - h * 0.15, 4, 5);
  }

  /** Ghost diamond — semi-transparent handled in draw() */
  private _drawPhantom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#dfe6ff";
    ctx.strokeStyle = "#6c5ce7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /** Long body + head node */
  private _drawSerpent(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#00b894";
    ctx.strokeStyle = "#004d40";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.48, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#55efc4";
    ctx.beginPath();
    ctx.arc(x, y - h * 0.2, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(x + w * 0.12, y - h * 0.22, 2.5, 0, Math.PI * 2);
    ctx.arc(x - w * 0.12, y - h * 0.22, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Armored block — heavy */
  private _drawBruiser(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, "#ce93d8");
    g.addColorStop(1, "#6a1b9a");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#2a0a2e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y - h * 0.15);
    ctx.lineTo(x + w * 0.35, y - h * 0.15);
    ctx.stroke();
  }

  /** Pulsing core — rays */
  private _drawPulsar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const pulse = 1 + 0.12 * Math.sin(this.tick * 0.15);
    ctx.strokeStyle = "#fdcb6e";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.tick * 0.04;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * w * 0.15 * pulse, y + Math.sin(a) * h * 0.15 * pulse);
      ctx.lineTo(x + Math.cos(a) * w * 0.48, y + Math.sin(a) * h * 0.48);
      ctx.stroke();
    }
    const rg = ctx.createRadialGradient(x, y, 0, x, y, w * 0.38);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.45, "#ffeaa7");
    rg.addColorStop(1, "#e17055");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b25b00";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /** Triple-arc whirl */
  private _drawVortex(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.strokeStyle = "#0984e3";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y, w * 0.2 + i * 6, i * 0.7, Math.PI * 1.25 + i * 0.7);
      ctx.stroke();
    }
    ctx.fillStyle = "#74b9ff";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#dfe6e9";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Dark singularity craft — purple rim, three “eyes” */
  private _drawVoid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "#1e0a2e";
    ctx.strokeStyle = "#a29bfe";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const rg = ctx.createRadialGradient(x - w * 0.15, y - w * 0.15, 0, x, y, w * 0.45);
    rg.addColorStop(0, "#6c5ce7");
    rg.addColorStop(1, "#000000");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, w * 0.38, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = "#ff4757";
      ctx.shadowColor = "#ff6b81";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x + i * w * 0.16, y + h * 0.05, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

// ─── PowerUp ─────────────────────────────────────────────────────────────────

export type PowerUpType = "shield" | "heal" | "gunUpgrade";

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

    let color = "#2ecc71";
    let label = "SH";
    if (type === "heal") { color = "#e74c3c"; label = "+"; }
    else if (type === "gunUpgrade") { color = "#f39c12"; label = "W"; }

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
    ctx.font = `bold ${type === "heal" ? 18 : type === "gunUpgrade" ? 11 : 10}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  applyTo(player: Player) {
    const now = Date.now();
    if (this.type === "shield") {
      player.shieldActive = true;
      player.shieldUntil = now + POWERUP_DURATION;
    } else if (this.type === "heal") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    } else if (this.type === "gunUpgrade") {
      if (player.gunLevel < MAX_GUN_LEVEL) player.gunLevel++;
    }
  }
}
