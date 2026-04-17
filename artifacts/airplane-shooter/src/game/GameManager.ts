
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  STAR_COUNT, LEVEL_DURATION,
  PLAYER_FIRE_RATE,
  POWERUP_CHANCE,
  EnemyType,
} from "./constants";
import {
  Star, Player, PlayerBullet, Enemy, EnemyBullet, Particle, PowerUp,
  PowerUpType, rectsOverlap,
} from "./entities";
import { playShoot, playExplosion, playPowerUp, playPlayerHit, playLevelUp } from "./audio";

export type GameState = "start" | "playing" | "paused" | "gameover";

export interface HUD {
  score: number;
  level: number;
  hp: number;
  maxHp: number;
  doubleShot: boolean;
  shieldActive: boolean;
  doubleShotTimeLeft: number;
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

  private keys: Record<string, boolean> = {};
  private lastFire = 0;
  private lastEnemySpawn = 0;
  private levelStartTime = 0;
  private lastLevelCheck = 0;
  private animFrame = 0;
  private frameCount = 0;

  // Callbacks to re-render React HUD
  onHUDUpdate?: (hud: HUD) => void;
  onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;
    this.highScore = parseInt(localStorage.getItem("planeShooterHigh") || "0");
    this._initStars();
    this._bindKeys();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  startGame() {
    this.score = 0;
    this.level = 1;
    this.state = "playing";
    this.levelStartTime = Date.now();
    this.lastLevelCheck = Date.now();
    this.player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerUps = [];
    this.lastEnemySpawn = 0;
    this.lastFire = 0;
    this._notifyState();
    cancelAnimationFrame(this.animFrame);
    this._loop();
  }

  destroy() {
    cancelAnimationFrame(this.animFrame);
    this._unbindKeys();
  }

  getHUD(): HUD {
    const now = Date.now();
    return {
      score: this.score,
      level: this.level,
      hp: this.player?.hp ?? 0,
      maxHp: this.player?.maxHp ?? 3,
      doubleShot: this.player?.doubleShot ?? false,
      shieldActive: this.player?.shieldActive ?? false,
      doubleShotTimeLeft: Math.max(0, (this.player?.doubleShotUntil ?? 0) - now),
      shieldTimeLeft: Math.max(0, (this.player?.shieldUntil ?? 0) - now),
    };
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  private _bindKeys() {
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  private _unbindKeys() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }

  private _onKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;
    if (e.code === "Space") e.preventDefault();
  }

  private _onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  private _handleInput() {
    const p = this.player;
    if (!p) return;
    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) p.moveLeft();
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) p.moveRight(CANVAS_WIDTH);
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) p.moveUp();
    if (this.keys["ArrowDown"] || this.keys["KeyS"]) p.moveDown(CANVAS_HEIGHT);

    // Auto-fire
    const now = Date.now();
    if (now - this.lastFire > PLAYER_FIRE_RATE) {
      this._firePlayer();
      this.lastFire = now;
    }
  }

  private _firePlayer() {
    const p = this.player;
    if (!p) return;
    if (p.doubleShot) {
      this.playerBullets.push(new PlayerBullet(p.x - 12, p.y - p.height / 2, true));
      this.playerBullets.push(new PlayerBullet(p.x + 12, p.y - p.height / 2, true));
    } else {
      this.playerBullets.push(new PlayerBullet(p.x, p.y - p.height / 2));
    }
    playShoot();
  }

  // ─── Initialization ───────────────────────────────────────────────────────

  private _initStars() {
    this.stars = Array.from({ length: STAR_COUNT }, () => new Star());
  }

  // ─── Spawn ───────────────────────────────────────────────────────────────

  private _spawnEnemy() {
    const now = Date.now();
    const spawnInterval = Math.max(400, 1600 - (this.level - 1) * 100);
    if (now - this.lastEnemySpawn < spawnInterval) return;
    this.lastEnemySpawn = now;

    const roll = Math.random();
    let type: EnemyType = "basic";
    if (this.level >= 3 && roll > 0.75) {
      type = "tank";
    } else if (this.level >= 2 && roll > 0.5) {
      type = "fast";
    }

    const x = Math.random() * (CANVAS_WIDTH - 80) + 40;
    this.enemies.push(new Enemy(x, -40, type, this.level));
  }

  private _maybeSpawnPowerUp(x: number, y: number) {
    if (Math.random() > POWERUP_CHANCE) return;
    const types: PowerUpType[] = ["doubleShot", "shield", "heal"];
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push(new PowerUp(x, y, type));
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  private _checkCollisions() {
    const p = this.player;
    if (!p) return;

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
            this._explode(enemy.x, enemy.y, enemy.color, enemy.type === "tank");
            this._maybeSpawnPowerUp(enemy.x, enemy.y);
          }
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.enemyBullets) {
      if (!bullet.active) continue;
      if (rectsOverlap(
        bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        bullet.active = false;
        const hit = p.takeDamage();
        if (hit) {
          playPlayerHit();
          this._explode(p.x, p.y, "#5bc0eb", false);
          if (p.hp <= 0) this._gameOver();
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
          this._explode(enemy.x, enemy.y, enemy.color, true);
          if (p.hp <= 0) this._gameOver();
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

  private _checkLevel() {
    const now = Date.now();
    if (now - this.levelStartTime >= LEVEL_DURATION * this.level) {
      this.level++;
      this.levelStartTime = now;
      playLevelUp();
    }
  }

  // ─── Enemy Shooting ───────────────────────────────────────────────────────

  private _enemyShoot() {
    if (!this.player) return;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (enemy.canShoot(this.level)) {
        enemy.resetShot();
        this.enemyBullets.push(new EnemyBullet(
          enemy.x, enemy.y + enemy.height / 2,
          this.player.x, this.player.y,
        ));
      }
    }
  }

  // ─── Game Over ────────────────────────────────────────────────────────────

  private _gameOver() {
    this.state = "gameover";
    if (this.score > this.highScore) {
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
      if (this.state === "playing") {
        this._loop();
        // Notify React for HUD ~20fps
        if (this.frameCount % 3 === 0) {
          this.onHUDUpdate?.(this.getHUD());
        }
      }
    });
  }

  private _update() {
    if (this.state !== "playing") return;

    this._handleInput();
    this._checkLevel();
    this._spawnEnemy();
    this._enemyShoot();

    this.stars.forEach(s => s.update());
    this.player?.updatePowerUps();
    this.playerBullets.forEach(b => b.update());
    this.enemyBullets.forEach(b => b.update());
    this.enemies.forEach(e => e.update());
    this.particles.forEach(p => p.update());
    this.powerUps.forEach(pu => pu.update());

    this._checkCollisions();

    // Prune inactive
    this.playerBullets = this.playerBullets.filter(b => b.active);
    this.enemyBullets = this.enemyBullets.filter(b => b.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.particles = this.particles.filter(p => p.active);
    this.powerUps = this.powerUps.filter(pu => pu.active);
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────

  private _draw() {
    const ctx = this.ctx;
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = "#050a14";
    ctx.fillRect(0, 0, W, H);

    // Stars
    this.stars.forEach(s => s.draw(ctx));

    if (this.state !== "playing") return;

    // Game objects
    this.powerUps.forEach(pu => pu.draw(ctx));
    this.playerBullets.forEach(b => b.draw(ctx));
    this.enemyBullets.forEach(b => b.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
    this.player?.draw(ctx);
  }
}
