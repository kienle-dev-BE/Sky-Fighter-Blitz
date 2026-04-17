
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { EnemyBullet } from "./entities";
import type { Player } from "./entities";
import type { LaserBeam } from "./bossCombat";
import { BombBullet, LaserChargeEffect } from "./bossCombat";
import { drawBossSprite } from "./bossSprites";

export interface BossFireSink {
  pushEnemyBullet(b: EnemyBullet): void;
  pushBomb(b: BombBullet): void;
  pushLaser(l: LaserBeam): void;
  pushLaserCharge(c: LaserChargeEffect): void;
}

export type BossIntroPhase = "warning" | "entranced" | "combat";

export class Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  active = true;
  bossIndex: number;
  color = "#ff00aa";
  tick = 0;
  private pattern = 0;
  private nextAttack = 0;
  readonly tier: number;
  /** Warning → drop from top → combat */
  introPhase: BossIntroPhase = "warning";
  private readonly targetCombatY = 110;
  private warningUntil: number;

  /** `mainLevel` 1…10 — difficulty & boss sprite (bossIndex = mainLevel − 1). */
  constructor(mainLevel: number, bossIndex: number, warningDurationMs: number) {
    this.bossIndex = Math.min(9, Math.max(0, bossIndex));
    this.tier = Math.max(1, Math.min(10, mainLevel));
    this.x = CANVAS_WIDTH / 2;
    this.width = 124;
    this.height = 104;
    this.y = -this.height - 80;
    this.maxHp = 88 + this.tier * 74 + this.bossIndex * 28;
    this.hp = this.maxHp;
    this.nextAttack = Number.POSITIVE_INFINITY;
    this.warningUntil = Date.now() + warningDurationMs;
  }

  private attackCooldown(): number {
    return Math.max(280, 1020 - this.tier * 54 - this.bossIndex * 16);
  }

  update(player: Player, _level: number, sink: BossFireSink) {
    if (!this.active) return;
    const now = Date.now();

    if (this.introPhase === "warning") {
      this.tick++;
      this.x = CANVAS_WIDTH / 2;
      if (now >= this.warningUntil) {
        this.introPhase = "entranced";
      }
      return;
    }

    if (this.introPhase === "entranced") {
      this.tick++;
      const dy = this.targetCombatY - this.y;
      this.y += dy * Math.min(0.12, 1);
      this.x = CANVAS_WIDTH / 2 + Math.sin(this.tick * 0.02) * 8;
      if (dy < 1.2) {
        this.y = this.targetCombatY;
        this.introPhase = "combat";
        this.nextAttack = now + 700;
      }
      return;
    }

    this.tick++;
    this.x = CANVAS_WIDTH / 2 + Math.sin(this.tick * 0.035) * (68 + this.bossIndex * 3);
    this.x = Math.max(this.width / 2 + 10, Math.min(CANVAS_WIDTH - this.width / 2 - 10, this.x));
    if (now < this.nextAttack) return;
    this.nextAttack = now + this.attackCooldown();

    const px = player.x;
    const py = player.y;
    const ySpawn = this.y + this.height * 0.45;
    const hasBombs = this.bossIndex >= 1 || this.tier >= 2;
    const hasLaser = true;
    const hasDoubleLaser = this.tier >= 5;
    const volleyFan = 5 + this.tier + Math.min(5, this.bossIndex);

    const phase = this.pattern % 9;
    this.pattern++;

    // 0 — Ring arc
    if (phase === 0) {
      for (let i = 0; i < volleyFan; i++) {
        const t = (i / Math.max(1, volleyFan - 1) - 0.5) * 0.95;
        const tx = this.x + t * 220;
        const ty = CANVAS_HEIGHT * 0.72;
        sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, tx, ty, t * 0.18));
      }
      return;
    }

    // 1 — 3–7 aimed fan
    if (phase === 1) {
      const n = this.tier >= 7 ? 7 : this.tier >= 4 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (0.18 + this.tier * 0.008);
        sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, px, py, off));
      }
      return;
    }

    // 2 — Laser (high tier: dual beam)
    if (phase === 2 && hasLaser) {
      const ch = this.tier >= 6 ? 44 : 56;
      sink.pushLaserCharge(new LaserChargeEffect(this.x, this.tier >= 4 ? 2.4 : 1.5, 58, ch));
      if (hasDoubleLaser) {
        sink.pushLaserCharge(new LaserChargeEffect(CANVAS_WIDTH * 0.34, -1.9, 48, ch + 12));
      }
      return;
    }

    // 3 — Falling bombs
    if (phase === 3 && hasBombs) {
      const cols = 3 + (this.bossIndex % 4) + Math.min(2, Math.floor(this.tier / 3));
      for (let c = 0; c < cols; c++) {
        const bx = 46 + (c / Math.max(1, cols - 1)) * (CANVAS_WIDTH - 92);
        sink.pushBomb(
          new BombBullet(
            bx + (Math.random() - 0.5) * 40,
            ySpawn - 10,
            (Math.random() - 0.5) * 1.1,
            2.05 + Math.random() * 0.55 + this.tier * 0.04,
          ),
        );
      }
      return;
    }

    // 4 — Tighter ring
    if (phase === 4) {
      const shots = 7 + Math.min(5, this.tier);
      for (let i = 0; i < shots; i++) {
        const t = (i - (shots - 1) / 2) * 0.14;
        sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, px, py, t));
      }
      return;
    }

    // 5 — Close bombs (high tier)
    if (phase === 5 && hasBombs && this.tier >= 3) {
      for (let k = 0; k < 3 + Math.min(2, Math.floor(this.tier / 4)); k++) {
        sink.pushBomb(
          new BombBullet(
            this.x + (k - 1) * 38,
            ySpawn,
            (k - 1) * 0.85,
            1.75 + this.tier * 0.05,
          ),
        );
      }
      return;
    }

    // 6 — Large ring + high boss: extra fan
    if (phase === 6) {
      const ring = 9 + Math.min(4, this.bossIndex);
      for (let i = 0; i < ring; i++) {
        const t = (i / Math.max(1, ring - 1) - 0.5) * 1.1;
        sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, px, py, t * 0.35));
      }
      if (this.tier >= 8) {
        for (let j = 0; j < 5; j++) {
          const off = (j - 2) * 0.25;
          sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, px, py, off));
        }
      }
      return;
    }

    // 7 — 11-way burst
    if (phase === 7) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const off = (i / (n - 1) - 0.5) * 0.95;
        sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, px, py, off));
      }
      return;
    }

    // 8 — Fast laser + bombs (late boss)
    if (phase === 8 && this.tier >= 4) {
      sink.pushLaserCharge(new LaserChargeEffect(this.x * 0.92, 1.8, 52, 40));
      if (hasBombs) {
        sink.pushBomb(new BombBullet(this.x - 40, ySpawn, -0.4, 2.4));
        sink.pushBomb(new BombBullet(this.x + 40, ySpawn, 0.4, 2.4));
      }
      return;
    }

    for (let i = 0; i < 5; i++) {
      const t = (i - 2) * 0.2;
      sink.pushEnemyBullet(new EnemyBullet(this.x, ySpawn, px, py, t));
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    if (this.introPhase === "warning") return;
    const { x, y, width: w, height: h } = this;
    const drew = drawBossSprite(ctx, this.bossIndex, x, y, w, h);
    if (!drew) {
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#3a0520";
      ctx.strokeStyle = "#ff66aa";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffccff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`BOSS ${this.bossIndex + 1}`, x, y + 6);
      ctx.restore();
    }
    const barW = w + 8;
    const barY = y - h / 2 - 12;
    ctx.fillStyle = "#111";
    ctx.fillRect(x - barW / 2, barY, barW, 7);
    ctx.fillStyle = this.hp < this.maxHp * 0.35 ? "#e74c3c" : "#2ecc71";
    ctx.fillRect(x - barW / 2, barY, barW * (this.hp / this.maxHp), 7);
  }
}
