
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  STAR_COUNT,
  POWERUP_CHANCE,
  MAX_GUN_LEVEL,
  MAX_ACTIVE_ENEMIES,
  MAIN_LEVEL_COUNT,
  subCountForMain,
  enemyPoolForMain,
  BOSS_WARNING_DURATION_MS,
  EnemyType,
} from "./constants";
import {
  Star, Player, PlayerBullet, Enemy, EnemyBullet, Particle, PowerUp,
  PowerUpType, rectsOverlap,
} from "./entities";
import { buildPlayerVolley, shotVelocity } from "./playerGun";
import { Boss } from "./Boss";
import { BombBullet, LaserBeam, LaserChargeEffect } from "./bossCombat";
import {
  playShoot, playExplosion, playPowerUp, playPlayerHit, playLevelUp,
  playPlayerGameOverExplosion, playGameOverImpact,
} from "./audio";
import { buildFormationForMain, type FormationSlot } from "./formations";

export type GameState = "start" | "playing" | "paused" | "gameover" | "victory";

export interface HUD {
  score: number;
  /** Main level 1…10. */
  level: number;
  /** Current sub-wave (0 during boss). */
  subWave: number;
  /** Sub-waves before boss (0 during boss). */
  subMax: number;
  /** Display e.g. `3-7` or `BOSS`. */
  stageLabel: string;
  hp: number;
  maxHp: number;
  /** Permanent gun power 0…MAX. */
  gunLevel: number;
  maxGunLevel: number;
  bossFight: boolean;
  shieldActive: boolean;
  shieldTimeLeft: number;
}

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  state: GameState = "start";
  score = 0;
  highScore = 0;
  level = 1;

  private player!: Player;
  private stars: Star[] = [];
  private playerBullets: PlayerBullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private boss: Boss | null = null;
  private bombBullets: BombBullet[] = [];
  private laserBeams: LaserBeam[] = [];
  private laserCharges: LaserChargeEffect[] = [];

  /** Pointer position in canvas pixel space (matches internal resolution). */
  private pointerCanvasX = CANVAS_WIDTH / 2;
  private pointerCanvasY = CANVAS_HEIGHT - 80;
  private lastEnemySpawn = 0;
  /** Formation pattern and entry edge rotation. */
  private formationWaveIndex = 0;
  /** Sub-wave within main level (1…subMax). */
  private subWave = 1;
  private levelStartTime = 0;
  private animFrame = 0;
  private frameCount = 0;

  /** After boss defeat: 3s warp overlay, then level-up or victory. */
  private bossTransitionUntil = 0;
  private defeatedBossMainLevel = 0;
  private warpPhase = 0;

  /** Last hit: screen shake + smoke/fire, then `gameover`. */
  private playerDeathUntil = 0;
  private deathShakeX = 0;
  private deathShakeY = 0;
  private static readonly PLAYER_DEATH_MS = 2800;

  // Callbacks to re-render React HUD
  onHUDUpdate?: (hud: HUD) => void;
  onStateChange?: (state: GameState) => void;
  /** Fires when the player actually loses HP (not blocked by invincibility/shield). */
  onPlayerDamaged?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;
    this.highScore = this._readHighScore();
    this._initStars();
    this._bindPointer();
    this._bindKeyboard();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  startGame() {
    this.highScore = this._readHighScore();
    this.score = 0;
    this.level = 1;
    this.subWave = 1;
    this.state = "playing";
    this.levelStartTime = Date.now();
    this.player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.pointerCanvasX = this.player.x;
    this.pointerCanvasY = this.player.y;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerUps = [];
    this.boss = null;
    this.bombBullets = [];
    this.laserBeams = [];
    this.laserCharges = [];
    this.lastEnemySpawn = 0;
    this.formationWaveIndex = 0;
    this.bossTransitionUntil = 0;
    this.defeatedBossMainLevel = 0;
    this.warpPhase = 0;
    this.playerDeathUntil = 0;
    this.deathShakeX = 0;
    this.deathShakeY = 0;
    this._notifyState();
    cancelAnimationFrame(this.animFrame);
    this._spawnArenaWave();
    this._loop();
  }

  destroy() {
    cancelAnimationFrame(this.animFrame);
    this._unbindPointer();
    this._unbindKeyboard();
  }

  private _readHighScore(): number {
    return parseInt(localStorage.getItem("planeShooterHigh") || "0");
  }

  getHUD(): HUD {
    const now = Date.now();
    const bossOn = Boolean(this.boss?.active);
    const subMax = subCountForMain(this.level);
    return {
      score: this.score,
      level: this.level,
      subWave: bossOn ? 0 : this.subWave,
      subMax: bossOn ? 0 : subMax,
      stageLabel: bossOn ? "BOSS" : `${this.level}-${this.subWave}`,
      hp: this.player?.hp ?? 0,
      maxHp: this.player?.maxHp ?? 6,
      gunLevel: this.player?.gunLevel ?? 0,
      maxGunLevel: MAX_GUN_LEVEL,
      bossFight: bossOn,
      shieldActive: this.player?.shieldActive ?? false,
      shieldTimeLeft: Math.max(0, (this.player?.shieldUntil ?? 0) - now),
    };
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  private _bindPointer() {
    this.canvas.addEventListener("pointermove", this._onPointerMove, { passive: true });
    this.canvas.addEventListener("pointerdown", this._onPointerDown, { passive: true });
  }

  private _unbindPointer() {
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
  }

  private _bindKeyboard() {
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _unbindKeyboard() {
    window.removeEventListener("keydown", this._onKeyDown);
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (this.state !== "playing" && this.state !== "paused") return;
    if (this._bossTransitionActive()) return;
    if (this.playerDeathUntil > 0) return;
    e.preventDefault();
    this.state = this.state === "playing" ? "paused" : "playing";
    this._notifyState();
  };

  private _canvasCoords(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    const sx = this.canvas.width / rw;
    const sy = this.canvas.height / rh;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
  }

  private _syncPointerFromEvent(e: PointerEvent) {
    const { x, y } = this._canvasCoords(e.clientX, e.clientY);
    this.pointerCanvasX = x;
    this.pointerCanvasY = y;
  }

  private _onPointerMove = (e: PointerEvent) => {
    if (this.state !== "playing") return;
    this._syncPointerFromEvent(e);
  };

  private _onPointerDown = (e: PointerEvent) => {
    if (this.state !== "playing") return;
    if (this._bossTransitionActive()) return;
    if (this.playerDeathUntil > 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this._syncPointerFromEvent(e);
    this._firePlayer();
  };

  private _bossTransitionActive(): boolean {
    return this.bossTransitionUntil > 0 && Date.now() < this.bossTransitionUntil;
  }

  private _handleInput() {
    const p = this.player;
    if (!p) return;
    p.x = Math.max(
      p.width / 2,
      Math.min(CANVAS_WIDTH - p.width / 2, this.pointerCanvasX),
    );
    p.y = Math.max(
      p.height / 2,
      Math.min(CANVAS_HEIGHT - p.height / 2, this.pointerCanvasY),
    );
  }

  /** Salvo: fan (≤5 rays) + stacked shots per ray from `gunLevel` 0…10. */
  private _spawnPlayerSalvo(isDouble: boolean) {
    const p = this.player;
    if (!p) return;
    const baseY = p.y - p.height / 2 + (isDouble ? 2 : 0);
    for (const s of buildPlayerVolley(p.gunLevel, isDouble)) {
      const { vx, vy } = shotVelocity(s.angle);
      this.playerBullets.push(
        new PlayerBullet(
          p.x + s.spawnXOff,
          baseY + s.yOff,
          s.isDouble,
          vx,
          vy,
        ),
      );
    }
  }

  private _firePlayer() {
    const p = this.player;
    if (!p) return;
    this._spawnPlayerSalvo(false);
    playShoot();
  }

  // ─── Initialization ───────────────────────────────────────────────────────

  private _initStars() {
    this.stars = Array.from({ length: STAR_COUNT }, () => new Star());
  }

  // ─── Spawn ───────────────────────────────────────────────────────────────

  /** Stacked enemy groups on Y — higher levels use more groups. */
  private _groupCountForMain(): number {
    return Math.min(5, 1 + Math.floor((this.level - 1) / 2));
  }

  private _centerSlotIndex(slots: FormationSlot[], count: number): number {
    let best = 0;
    let bm = Infinity;
    for (let i = 0; i < count; i++) {
      const s = slots[i]!;
      const m = Math.abs(s.dx) + Math.abs(s.dy);
      if (m < bm) {
        bm = m;
        best = i;
      }
    }
    return best;
  }

  /** Each group: mixed types, optional elite (highest in pool) at center. */
  private _assignTypesForGroup(pool: EnemyType[], mainLevel: number, count: number, centerIdx: number): EnemyType[] {
    if (count <= 0) return [];
    const elite = pool[pool.length - 1]!;
    const useElite = pool.length > 1 && count > 1 && Math.random() < 0.36 + mainLevel * 0.035;
    const low = pool.slice(0, -1);
    const out: EnemyType[] = [];
    for (let i = 0; i < count; i++) {
      if (useElite && i === centerIdx) {
        out.push(elite);
      } else if (low.length > 0) {
        out.push(low[Math.floor(Math.random() * low.length)]!);
      } else {
        out.push(pool[Math.floor(Math.random() * pool.length)]!);
      }
    }
    return out;
  }

  /** One sub-wave: multiple formation groups; each group has types (+ optional elite center). */
  private _spawnArenaWave() {
    if (this.boss?.active) return;
    const M = this.level;
    const pool = enemyPoolForMain(M);
    if (pool.length === 0) return;
    const groups = this._groupCountForMain();
    let room = MAX_ACTIVE_ENEMIES - this.enemies.length;
    /** Below React HUD; enemies stay in upper half + formation offset room. */
    const arenaHudTop = 128;
    const yMinLine = arenaHudTop + 16;
    const halfMaxY = CANVAS_HEIGHT * 0.5 - 26;
    const headroomDy = 72;
    let stackGap = 0;
    if (groups > 1) {
      const span = Math.max(0, halfMaxY - headroomDy - yMinLine);
      stackGap = Math.max(44, Math.min(88, Math.floor(span / (groups - 1))));
    }
    /** Horizontal spread for formation (wider toward screen edges). */
    const xSpread = 1.32;
    const edgePad = 8;

    for (let g = 0; g < groups; g++) {
      const { slots, scale, entry } = buildFormationForMain(M, this.formationWaveIndex, g);
      this.formationWaveIndex++;
      const rawCount = Math.min(slots.length, room);
      if (rawCount <= 0) break;
      const centerIdx = this._centerSlotIndex(slots, rawCount);
      const types = this._assignTypesForGroup(pool, M, rawCount, centerIdx);
      const fcx = CANVAS_WIDTH / 2;
      const fcy = yMinLine + g * stackGap + Math.min(18, M * 0.5);

      for (let i = 0; i < rawCount; i++) {
        const s = slots[i]!;
        const tx = Math.max(
          edgePad,
          Math.min(CANVAS_WIDTH - edgePad, fcx + s.dx * scale * xSpread),
        );
        const ty = Math.max(
          arenaHudTop,
          Math.min(halfMaxY, fcy + s.dy * scale),
        );
        let sx = tx;
        let sy = ty;
        if (entry === "top") {
          sx += (Math.random() - 0.5) * 10;
          sy = ty - 280 - Math.min(130, Math.abs(s.dx) * 8);
        } else if (entry === "left") {
          sx = -48 - Math.random() * 50 - Math.min(75, Math.abs(s.dy) * 12);
          sy = ty + (Math.random() - 0.5) * 48;
        } else {
          sx = CANVAS_WIDTH + 48 + Math.random() * 50 + Math.min(75, Math.abs(s.dy) * 12);
          sy = ty + (Math.random() - 0.5) * 48;
        }
        const type = types[i]!;
        this.enemies.push(
          new Enemy(sx, sy, type, M, { targetX: tx, targetY: ty }, { subWave: this.subWave }),
        );
      }
      room -= rawCount;
    }
    this.lastEnemySpawn = Date.now();
  }

  private _maybeSpawnPowerUp(x: number, y: number) {
    if (Math.random() > POWERUP_CHANCE) return;
    const p = this.player;
    const r = Math.random();
    let type: PowerUpType;
    if (r < 0.24) {
      if (p && p.gunLevel < MAX_GUN_LEVEL) type = "gunUpgrade";
      else if (r < 0.1) type = "heal";
      else type = "shield";
    } else if (r < 0.55) type = "shield";
    else type = "heal";
    this.powerUps.push(new PowerUp(x, y, type));
  }

  /** Rare heal drop after taking a hit (still capped by max HP via pickup). */
  private _maybeSpawnHealAfterDamage() {
    if (Math.random() > 0.14) return;
    const p = this.player;
    if (!p || p.hp >= p.maxHp) return;
    const x = p.x + (Math.random() - 0.5) * 90;
    const y = p.y - 24;
    this.powerUps.push(new PowerUp(
      Math.max(18, Math.min(CANVAS_WIDTH - 18, x)),
      y,
      "heal",
    ));
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  private _checkCollisions() {
    if (this.playerDeathUntil > 0) return;
    const p = this.player;
    if (!p) return;

    // Player bullets vs boss
    const boss = this.boss;
    if (boss?.active && boss.introPhase === "combat") {
      for (const bullet of this.playerBullets) {
        if (!bullet.active || !this.boss?.active) continue;
        if (rectsOverlap(
          bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height,
          boss.x - boss.width / 2, boss.y - boss.height / 2, boss.width, boss.height,
        )) {
          bullet.active = false;
          boss.hp--;
          for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(bullet.x, bullet.y, "#aef3ff"));
          }
          if (boss.hp <= 0) {
            boss.active = false;
            const clearedMain = this.level;
            this._explode(boss.x, boss.y, "#ff66cc", true);
            this._maybeSpawnPowerUp(boss.x, boss.y);
            this.boss = null;
            this._clearBossProjectiles();
            this._startBossWarpTransition(clearedMain);
            break;
          }
        }
      }
      const b2 = this.boss;
      if (b2?.active && b2.introPhase === "combat" && rectsOverlap(
        b2.x - b2.width / 2, b2.y - b2.height / 2, b2.width, b2.height,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        const hit = p.takeDamage();
        if (hit) {
          playPlayerHit();
          this.onPlayerDamaged?.();
          this._explode(p.x, p.y, "#5bc0eb", false);
          this._maybeSpawnHealAfterDamage();
          if (p.hp <= 0) this._onPlayerFatalHit();
        }
      }
    }

    // Player bullets vs enemies
    for (const bullet of this.playerBullets) {
      if (!bullet.active) continue;
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        if (rectsOverlap(
          bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height,
          enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height,
        )) {
          bullet.active = false;
          enemy.hp--;
          // Small hit particles
          for (let i = 0; i < 4; i++) {
            this.particles.push(new Particle(bullet.x, bullet.y, "#aef3ff"));
          }
          if (enemy.hp <= 0) {
            enemy.active = false;
            this.score += enemy.score;
            this._explode(
              enemy.x, enemy.y, enemy.color,
              ["tank", "void", "crystal", "bruiser"].includes(enemy.type),
            );
            this._maybeSpawnPowerUp(enemy.x, enemy.y);
          }
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.enemyBullets) {
      if (!bullet.active) continue;
      const br = bullet.radius;
      if (rectsOverlap(
        bullet.x - br, bullet.y - br, br * 2, br * 2,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        bullet.active = false;
        const hit = p.takeDamage();
        if (hit) {
          playPlayerHit();
          this.onPlayerDamaged?.();
          this._explode(p.x, p.y, "#5bc0eb", false);
          this._maybeSpawnHealAfterDamage();
          if (p.hp <= 0) this._onPlayerFatalHit();
        }
      }
    }

    for (const bomb of this.bombBullets) {
      if (!bomb.active) continue;
      const br = bomb.radius;
      if (rectsOverlap(
        bomb.x - br, bomb.y - br, br * 2, br * 2,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        bomb.active = false;
        const hit = p.takeDamage();
        if (hit) {
          playPlayerHit();
          this.onPlayerDamaged?.();
          this._explode(p.x, p.y, "#ff9900", false);
          this._maybeSpawnHealAfterDamage();
          if (p.hp <= 0) this._onPlayerFatalHit();
        }
      }
    }

    for (const beam of this.laserBeams) {
      if (!beam.active || !beam.canDamagePlayer()) continue;
      const hw = beam.halfW;
      if (rectsOverlap(
        beam.x - hw, 0, hw * 2, CANVAS_HEIGHT,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        const hit = p.takeDamage();
        if (hit) {
          beam.markDamageFrame();
          playPlayerHit();
          this.onPlayerDamaged?.();
          this._explode(p.x, p.y, "#00ffff", false);
          this._maybeSpawnHealAfterDamage();
          if (p.hp <= 0) this._onPlayerFatalHit();
        }
      }
    }

    // Enemies vs player (ram)
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (rectsOverlap(
        enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        enemy.active = false;
        const hit = p.takeDamage();
        if (hit) {
          playPlayerHit();
          this.onPlayerDamaged?.();
          this._explode(enemy.x, enemy.y, enemy.color, true);
          this._maybeSpawnHealAfterDamage();
          if (p.hp <= 0) this._onPlayerFatalHit();
        }
      }
    }

    // PowerUps vs player
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      if (rectsOverlap(
        pu.x - pu.width / 2, pu.y - pu.height / 2, pu.width, pu.height,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        pu.active = false;
        pu.applyTo(p);
        playPowerUp();
      }
    }
  }

  private _explode(x: number, y: number, color: string, big: boolean) {
    const count = big ? 20 : 10;
    const colors = [color, "#ffffff", "#ffcc44"];
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, colors[i % colors.length]));
    }
    playExplosion(big);
  }

  // ─── Level ───────────────────────────────────────────────────────────────

  private _beginBossEncounter() {
    this.enemies = [];
    this.enemyBullets = [];
    this.bombBullets = [];
    this.laserBeams = [];
    this.laserCharges = [];
    this.boss = new Boss(this.level, this.level - 1, BOSS_WARNING_DURATION_MS);
  }

  private _clearBossProjectiles() {
    this.enemyBullets = [];
    this.bombBullets = [];
    this.laserBeams = [];
    this.laserCharges = [];
  }

  private _startBossWarpTransition(defeatedMainLevel: number) {
    this.defeatedBossMainLevel = defeatedMainLevel;
    this.bossTransitionUntil = Date.now() + 3000;
    this.warpPhase = 0;
  }

  private _finishBossWarpTransition() {
    this.bossTransitionUntil = 0;
    const clearedMain = this.defeatedBossMainLevel;
    this.score += 380 + clearedMain * 88;
    if (clearedMain >= MAIN_LEVEL_COUNT) {
      this._victory();
      return;
    }
    this.boss = null;
    this.level++;
    this.subWave = 1;
    this.formationWaveIndex = 0;
    this.levelStartTime = Date.now();
    playLevelUp();
    this._spawnArenaWave();
  }

  private _victory() {
    this.state = "victory";
    if (this.score >= this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("planeShooterHigh", String(this.highScore));
    }
    this._notifyState();
    cancelAnimationFrame(this.animFrame);
  }

  /** All enemies cleared in sub-wave → next sub-wave or boss. */
  private _processArenaProgress() {
    if (this.state !== "playing") return;
    /** Boss just died this frame (`bossTransitionUntil` set) — do not treat as “wave clear” and spawn boss again. */
    if (this.bossTransitionUntil > 0) return;
    if (this.boss?.active) return;
    if (this.enemies.length > 0) return;

    const max = subCountForMain(this.level);
    if (this.subWave < max) {
      this.subWave++;
      this._spawnArenaWave();
      return;
    }
    this._beginBossEncounter();
  }

  // ─── Enemy Shooting ───────────────────────────────────────────────────────

  private _enemyShoot() {
    if (this.boss?.active) return;
    const play = this.player;
    if (!play) return;
    const L = this.level;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (!enemy.canShoot(L)) continue;
      enemy.resetShot();
      const { count, spread } = enemy.getBulletVolley(this.level, this.subWave);
      const yTop = enemy.y + enemy.height / 2;
      for (let i = 0; i < count; i++) {
        const off = count <= 1
          ? 0
          : (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
        this.enemyBullets.push(new EnemyBullet(
          enemy.x,
          yTop,
          play.x,
          play.y,
          off,
        ));
      }
    }
  }

  // ─── Game Over ────────────────────────────────────────────────────────────

  private _onPlayerFatalHit() {
    if (this.playerDeathUntil > 0) return;
    const p = this.player;
    if (!p) {
      this._gameOver();
      return;
    }
    p.dying = true;
    this.playerDeathUntil = Date.now() + GameManager.PLAYER_DEATH_MS;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.bombBullets = [];
    this.laserBeams = [];
    this.laserCharges = [];
    playPlayerGameOverExplosion();
    const fireCols = ["#ff2200", "#ff8800", "#ffcc00", "#ff4400", "#aa1100"];
    const smCols = ["#555555", "#666666", "#444444", "#333333"];
    for (let i = 0; i < 42; i++) {
      this.particles.push(new Particle(
        p.x + (Math.random() - 0.5) * 24,
        p.y + p.height * 0.28 + (Math.random() - 0.5) * 10,
        fireCols[i % fireCols.length]!,
        "crashFire",
      ));
    }
    for (let i = 0; i < 32; i++) {
      this.particles.push(new Particle(
        p.x + (Math.random() - 0.5) * 28,
        p.y + p.height * 0.34 + (Math.random() - 0.5) * 10,
        smCols[i % smCols.length]!,
        "crashSmoke",
      ));
    }
  }

  private _updatePlayerDeathSequence() {
    const p = this.player;
    if (!p) {
      this.playerDeathUntil = 0;
      this._gameOver();
      return;
    }
    const left = this.playerDeathUntil - Date.now();
    const total = GameManager.PLAYER_DEATH_MS;
    const k = Math.max(0, left / total);
    const shake = 6 + k * 22;
    this.deathShakeX = (Math.random() - 0.5) * shake;
    this.deathShakeY = (Math.random() - 0.5) * shake;
    p.y = Math.min(CANVAS_HEIGHT - p.height * 0.28, p.y + 0.58);
    p.x += (Math.random() - 0.5) * 0.55;
    p.x = Math.max(p.width / 2, Math.min(CANVAS_WIDTH - p.width / 2, p.x));

    this.stars.forEach((s) => s.update(1));
    this.particles.forEach((pt) => pt.update());
    this.particles = this.particles.filter((pt) => pt.active);

    const bx = p.x + (Math.random() - 0.5) * 14;
    const by = p.y + p.height * 0.32;
    const fireCols = ["#ff3300", "#ff8800", "#ffcc33", "#ff5500"];
    const smCols = ["#555", "#444", "#666"];
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle(bx + (Math.random() - 0.5) * 10, by, fireCols[i % 4]!, "crashFire"));
    }
    for (let i = 0; i < 3; i++) {
      this.particles.push(new Particle(bx + (Math.random() - 0.5) * 12, by + 5, smCols[i % 3]!, "crashSmoke"));
    }
  }

  private _gameOver(fromPlayerDeath = false) {
    if (fromPlayerDeath) {
      playGameOverImpact();
    }
    this.state = "gameover";
    if (this.score >= this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("planeShooterHigh", String(this.highScore));
    }
    this._notifyState();
    cancelAnimationFrame(this.animFrame);
  }

  private _notifyState() {
    this.onStateChange?.(this.state);
  }

  // ─── Game Loop ────────────────────────────────────────────────────────────

  private _loop() {
    this.animFrame = requestAnimationFrame(() => {
      this.frameCount++;
      this._update();
      this._draw();
      if (this.state === "playing" || this.state === "paused") {
        this._loop();
        if (this.state === "playing" && this.frameCount % 3 === 0) {
          this.onHUDUpdate?.(this.getHUD());
        }
      }
    });
  }

  private _update() {
    if (this.state !== "playing") return;

    if (this.bossTransitionUntil > 0 && Date.now() >= this.bossTransitionUntil) {
      this._finishBossWarpTransition();
      if (this.state !== "playing") return;
    }

    if (this._bossTransitionActive()) {
      this.warpPhase += 0.12;
      this._handleInput();
      const warpMult = 24;
      this.stars.forEach(s => s.update(warpMult));
      this.player?.updatePowerUps();
      this.playerBullets.forEach(b => b.update());
      this.particles.forEach(p => p.update());
      this.powerUps.forEach(pu => pu.update());
      this._checkCollisions();
      this.playerBullets = this.playerBullets.filter(b => b.active);
      this.particles = this.particles.filter(p => p.active);
      this.powerUps = this.powerUps.filter(pu => pu.active);
      return;
    }

    if (this.playerDeathUntil > 0) {
      if (Date.now() >= this.playerDeathUntil) {
        this.playerDeathUntil = 0;
        this.deathShakeX = 0;
        this.deathShakeY = 0;
        this._gameOver(true);
        if (this.player) this.player.dying = false;
        return;
      }
      this._updatePlayerDeathSequence();
      return;
    }

    this._handleInput();
    this._enemyShoot();

    if (this.boss?.active && this.player) {
      this.boss.update(this.player, this.level, {
        pushEnemyBullet: (b) => this.enemyBullets.push(b),
        pushBomb: (b) => this.bombBullets.push(b),
        pushLaser: (l) => this.laserBeams.push(l),
        pushLaserCharge: (c) => this.laserCharges.push(c),
      });
    }
    const spawnedLasers: LaserBeam[] = [];
    for (const ch of this.laserCharges) {
      const b = ch.update();
      if (b) spawnedLasers.push(b);
    }
    this.laserCharges = this.laserCharges.filter((c) => c.active);
    for (const b of spawnedLasers) this.laserBeams.push(b);
    this.stars.forEach(s => s.update(1));
    this.player?.updatePowerUps();
    this.playerBullets.forEach(b => b.update());
    this.enemyBullets.forEach(b => b.update());
    this.bombBullets.forEach(b => b.update());
    this.laserBeams.forEach(l => l.update());
    const px = this.player?.x;
    this.enemies.forEach(e => e.update(px));
    this.particles.forEach(p => p.update());
    this.powerUps.forEach(pu => pu.update());

    this._checkCollisions();

    // Prune inactive
    this.playerBullets = this.playerBullets.filter(b => b.active);
    this.enemyBullets = this.enemyBullets.filter(b => b.active);
    this.bombBullets = this.bombBullets.filter(b => b.active);
    this.laserBeams = this.laserBeams.filter(l => l.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.particles = this.particles.filter(p => p.active);
    this.powerUps = this.powerUps.filter(pu => pu.active);

    this._processArenaProgress();
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────

  private _draw() {
    const ctx = this.ctx;
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;

    if (this._bossTransitionActive()) {
      const hue = (this.frameCount * 5 + this.warpPhase * 30) % 360;
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `hsl(${(hue + 38) % 360}, 52%, 9%)`);
      g.addColorStop(0.45, `hsl(${hue}, 58%, 11%)`);
      g.addColorStop(1, `hsl(${(hue + 142) % 360}, 48%, 8%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = "#050a14";
      ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    if (this.state === "playing" && this.playerDeathUntil > 0) {
      ctx.translate(this.deathShakeX, this.deathShakeY);
    }

    this.stars.forEach(s => s.draw(ctx));

    if (this.state !== "playing" && this.state !== "paused") {
      ctx.restore();
      return;
    }

    this.powerUps.forEach(pu => pu.draw(ctx));
    this.playerBullets.forEach(b => b.draw(ctx));
    this.enemyBullets.forEach(b => b.draw(ctx));
    this.bombBullets.forEach(b => b.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this.boss?.draw(ctx);
    this.laserCharges.forEach((c) => c.draw(ctx));
    this.laserBeams.forEach((l) => l.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
    this._drawBossWarningOverlay();
    this.player?.draw(ctx);
    if (this.playerDeathUntil > 0 && this.player?.dying) {
      this._drawPlayerCrashOverlay(ctx);
    }
    this._drawBossWarpTransitionOverlay(ctx);
    ctx.restore();

    if (this.state === "paused") {
      this._drawPauseOverlay(ctx);
    }
  }

  private _drawPauseOverlay(ctx: CanvasRenderingContext2D) {
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 18, 0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#5bc0eb";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#e8f4ff";
    ctx.font = "bold 36px system-ui, Segoe UI, sans-serif";
    ctx.fillText("PAUSED", W / 2, H * 0.44);
    ctx.shadowBlur = 10;
    ctx.font = "600 15px system-ui, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(180, 210, 255, 0.92)";
    ctx.fillText("Press ESC to resume", W / 2, H * 0.54);
    ctx.restore();
  }

  /** Extra fire glow on the hull during crash sequence. */
  private _drawPlayerCrashOverlay(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    if (!p) return;
    const px = p.x;
    const py = p.y + p.height * 0.38;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(px, py, 2, px, py + 26, 46);
    g.addColorStop(0, "rgba(255,220,120,0.85)");
    g.addColorStop(0.4, "rgba(255,90,20,0.45)");
    g.addColorStop(1, "rgba(255,40,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 26, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 3s overlay + countdown after boss defeat before next stage. */
  private _drawBossWarpTransitionOverlay(ctx: CanvasRenderingContext2D) {
    if (!this._bossTransitionActive()) return;
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const d = this.defeatedBossMainLevel;
    const next = d + 1;
    const left = Math.max(0, (this.bossTransitionUntil - Date.now()) / 1000);
    const finalBoss = d >= MAIN_LEVEL_COUNT;

    ctx.save();
    ctx.fillStyle = "rgba(0, 8, 22, 0.42)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#5bc0eb";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#e8f4ff";
    ctx.font = "bold 20px system-ui, Segoe UI, sans-serif";
    ctx.fillText("WARPING — FULL THROTTLE", W / 2, H * 0.36);
    ctx.shadowBlur = 14;
    if (finalBoss) {
      ctx.font = "bold 26px system-ui, Segoe UI, sans-serif";
      ctx.fillStyle = "#a8ffd4";
      ctx.fillText("CAMPAIGN COMPLETE", W / 2, H * 0.48);
      ctx.font = "600 15px system-ui, Segoe UI, sans-serif";
      ctx.fillStyle = "rgba(220,240,255,0.92)";
      ctx.fillText("Preparing finale…", W / 2, H * 0.56);
    } else {
      ctx.font = "bold 28px system-ui, Segoe UI, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`NEXT STAGE ${next}`, W / 2, H * 0.5);
      ctx.font = "600 14px system-ui, Segoe UI, sans-serif";
      ctx.fillStyle = "rgba(180, 210, 255, 0.95)";
      ctx.fillText("Rushing to the next sector…", W / 2, H * 0.58);
    }
    ctx.shadowBlur = 0;
    ctx.font = "600 16px ui-monospace, monospace";
    ctx.fillStyle = "#7ab0ff";
    ctx.fillText(`${left.toFixed(1)}s`, W / 2, H * 0.7);
    ctx.restore();
  }

  /** Full-screen warning before boss enters combat. */
  private _drawBossWarningOverlay() {
    const boss = this.boss;
    if (!boss?.active || boss.introPhase !== "warning") return;
    const ctx = this.ctx;
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const pulse = 0.42 + 0.22 * Math.sin(this.frameCount * 0.11);
    ctx.save();
    ctx.fillStyle = `rgba(55, 0, 18, ${pulse})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(255, 51, 102, ${0.75 + 0.15 * Math.sin(this.frameCount * 0.18)})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ff0044";
    ctx.shadowBlur = 24;
    ctx.font = "bold 32px system-ui, Segoe UI, sans-serif";
    ctx.fillText("WARNING", W / 2, H * 0.36);
    ctx.font = "bold 19px system-ui, Segoe UI, sans-serif";
    ctx.fillStyle = "#ffc9d4";
    ctx.fillText("BOSS INCOMING — GET READY!", W / 2, H * 0.44);
    ctx.font = "600 15px ui-monospace, monospace";
    ctx.fillStyle = "rgba(255,200,210,0.92)";
    ctx.shadowBlur = 12;
    ctx.fillText("Heavy contact inbound", W / 2, H * 0.51);
    ctx.restore();
  }
}
