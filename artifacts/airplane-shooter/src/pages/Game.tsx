
import { useEffect, useRef, useState, useCallback } from "react";
import { GameManager, GameState, HUD } from "../game/GameManager";
import { CANVAS_WIDTH, CANVAS_HEIGHT, POWERUP_DURATION, MAX_GUN_LEVEL } from "../game/constants";
import { preloadEnemySprites } from "../game/enemySprites";
import { preloadBossSprites } from "../game/bossSprites";
import { preloadPlayerSprite } from "../game/playerSprite";
import logoImg from "../assets/Logo/logo.png";
import menuBgImg from "../assets/Logo/BG.png";

// ─── HUD Components ──────────────────────────────────────────────────────────

function HeartBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: maxHp }).map((_, i) => (
        <svg key={i} width="22" height="22" viewBox="0 0 24 24" fill={i < hp ? "#e74c3c" : "#333"}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z" />
        </svg>
      ))}
    </div>
  );
}

function PowerUpBar({ label, color, timeLeft, total }: {
  label: string; color: string; timeLeft: number; total: number;
}) {
  const pct = Math.max(0, timeLeft / total) * 100;
  return (
    <div className="flex items-center gap-1">
      <span style={{ color, fontWeight: 700, fontSize: 11 }}>{label}</span>
      <div style={{ width: 48, height: 5, background: "#222", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.1s" }} />
      </div>
    </div>
  );
}

function HUDOverlay({ hud }: { hud: HUD }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {/* Left: HP + weapon */}
      <div>
        <HeartBar hp={hud.hp} maxHp={hud.maxHp} />
        <div style={{ color: "#aaa", fontSize: 10, marginTop: 2 }}>LIVES</div>
        <div style={{ color: "#f39c12", fontSize: 11, fontWeight: 800, marginTop: 6, letterSpacing: 1 }}>
          GUN {hud.gunLevel}/{hud.maxGunLevel}
        </div>
        <div style={{ color: "#666", fontSize: 9 }}>PERM (RUN)</div>
      </div>

      {/* Center: Score + Level */}
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 2, textShadow: "0 0 12px #5bc0eb" }}>
          {hud.score.toString().padStart(6, "0")}
        </div>
        <div style={{ color: "#5bc0eb", fontSize: 11, fontWeight: 700, letterSpacing: 3 }}>SCORE</div>
        <div style={{
          marginTop: 4,
          background: hud.bossFight
            ? "linear-gradient(90deg, #5a1a3a, #d13a8a)"
            : "linear-gradient(90deg, #1a2a5a, #3a6fd1)",
          borderRadius: 8,
          padding: "2px 10px",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          {hud.stageLabel}
        </div>
        {!hud.bossFight && hud.subMax > 0 && (
          <div style={{ fontSize: 10, color: "#aad4ff", marginTop: 3, letterSpacing: 1 }}>
            STAGE {hud.subWave}/{hud.subMax}
          </div>
        )}
        <div style={{ fontSize: 9, color: "#7ab0ff", marginTop: 3, letterSpacing: 2 }}>
          DEEP SPACE
        </div>
      </div>

      {/* Right: Power-ups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        {hud.shieldActive && (
          <PowerUpBar label="SHIELD" color="#2ecc71" timeLeft={hud.shieldTimeLeft} total={POWERUP_DURATION} />
        )}
      </div>
    </div>
  );
}

// ─── Start Screen ────────────────────────────────────────────────────────────

function StartScreen({ onStart, highScore }: { onStart: () => void; highScore: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: 20, gap: 16,
      backgroundImage: `linear-gradient(to bottom, rgba(5,10,20,0.68), rgba(5,10,20,0.85)), url(${menuBgImg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}>
      <img
        src={logoImg}
        alt="Sky Blitz"
        width={280}
        height={280}
        style={{
          width: "min(280px, 72vw)",
          height: "auto",
          maxHeight: "min(42vh, 320px)",
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 0 20px rgba(91,192,235,0.25))",
        }}
      />
      <div style={{ fontSize: 14, letterSpacing: 6, color: "#5bc0eb", fontWeight: 700 }}>
        ARCADE SHOOTER
      </div>
      <div style={{ fontSize: 14, letterSpacing: 4, color: "#3a8fd1", fontWeight: 700 }}>
        CLEAR 10 STAGES — BEAT EVERY BOSS
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#88aacc", textAlign: "center", letterSpacing: 1 }}>
        <div><span style={{ color: "#5bc0eb" }}>MOUSE</span> — Move ship</div>
        <div><span style={{ color: "#5bc0eb" }}>CLICK</span> — Shoot (faster clicks = faster fire)</div>
        <div><span style={{ color: "#2ecc71" }}>Gems</span> — shield, heal, gun power 0–{MAX_GUN_LEVEL} (fan ≤5)</div>
        <div style={{ marginTop: 4, fontSize: 11, color: "#6688aa", maxWidth: 380 }}>
          <span style={{ color: "#7ab0ff" }}>10 main levels</span> — waves like 1-1, 1-2… — clear each wave, then fight the boss (boss-01…10)
        </div>
      </div>

      {highScore > 0 && (
        <div style={{ fontSize: 13, color: "#f39c12", fontWeight: 700, letterSpacing: 2, marginTop: 6 }}>
          HIGH SCORE: {highScore.toString().padStart(6, "0")}
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        style={{
          marginTop: 22,
          padding: "16px 48px",
          fontSize: 17,
          fontWeight: 900,
          letterSpacing: 4,
          background: "linear-gradient(135deg, #1a3a7a, #3a8fe1)",
          color: "#fff",
          border: "2px solid #5bc0eb",
          borderRadius: 10,
          cursor: "pointer",
          boxShadow: "0 0 28px rgba(91,192,235,0.45)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 44px rgba(91,192,235,0.85)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(91,192,235,0.45)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        START
      </button>
    </div>
  );
}

// ─── Game Over Screen ────────────────────────────────────────────────────────

function GameOverScreen({
  score, highScore, level, onRestart,
}: {
  score: number; highScore: number; level: number; onRestart: () => void;
}) {
  const isNewHigh = score >= highScore && score > 0;
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "rgba(5,10,20,0.92)",
      zIndex: 20, gap: 12,
    }}>
      <div style={{ fontSize: 40, fontWeight: 900, color: "#e74c3c", textShadow: "0 0 30px #e74c3c", letterSpacing: 4 }}>
        GAME OVER
      </div>
      {isNewHigh && (
        <div style={{ fontSize: 14, color: "#f39c12", fontWeight: 700, letterSpacing: 3, animation: "pulse 1s infinite" }}>
          NEW HIGH SCORE!
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: 2 }}>
          {score.toString().padStart(6, "0")}
        </div>
        <div style={{ fontSize: 12, color: "#5bc0eb", letterSpacing: 3 }}>FINAL SCORE</div>
        <div style={{ fontSize: 13, color: "#f39c12", fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>
          BEST: {highScore.toString().padStart(6, "0")}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2 }}>MAIN LEVEL {level}</div>
      </div>

      <button
        onClick={onRestart}
        style={{
          marginTop: 20,
          padding: "14px 44px",
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: 4,
          background: "linear-gradient(135deg, #7a1a1a, #d13a3a)",
          color: "#fff",
          border: "2px solid #e74c3c",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(231,76,60,0.4)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(231,76,60,0.8)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(231,76,60,0.4)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

function VictoryScreen({
  score, highScore, onRestart,
}: {
  score: number; highScore: number; onRestart: () => void;
}) {
  const isNewHigh = score >= highScore && score > 0;
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "rgba(5,10,20,0.92)",
      zIndex: 20, gap: 12,
    }}>
      <div style={{ fontSize: 38, fontWeight: 900, color: "#2ecc71", textShadow: "0 0 28px #2ecc71", letterSpacing: 4 }}>
        CAMPAIGN CLEAR
      </div>
      <div style={{ fontSize: 14, color: "#5bc0eb", fontWeight: 700, letterSpacing: 2 }}>
        All 10 bosses defeated
      </div>
      {isNewHigh && (
        <div style={{ fontSize: 14, color: "#f39c12", fontWeight: 700, letterSpacing: 3, animation: "pulse 1s infinite" }}>
          NEW HIGH SCORE!
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: 2 }}>
          {score.toString().padStart(6, "0")}
        </div>
        <div style={{ fontSize: 12, color: "#5bc0eb", letterSpacing: 3 }}>FINAL SCORE</div>
        <div style={{ fontSize: 13, color: "#f39c12", fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>
          BEST: {highScore.toString().padStart(6, "0")}
        </div>
      </div>

      <button
        type="button"
        onClick={onRestart}
        style={{
          marginTop: 20,
          padding: "14px 44px",
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: 4,
          background: "linear-gradient(135deg, #1a5a3a, #2ecc71)",
          color: "#fff",
          border: "2px solid #2ecc71",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(46,204,113,0.45)",
          transition: "all 0.15s",
        }}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<GameManager | null>(null);
  const [gameState, setGameState] = useState<GameState>("start");
  const [hud, setHud] = useState<HUD>({
    score: 0, level: 1, subWave: 1, subMax: 5, stageLabel: "1-1",
    hp: 3, maxHp: 6,
    gunLevel: 0, maxGunLevel: MAX_GUN_LEVEL,
    bossFight: false,
    shieldActive: false,
    shieldTimeLeft: 0,
  });
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  /** Increments on each real damage hit so the red vignette remounts and replays. */
  const [damageFlashKey, setDamageFlashKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const manager = new GameManager(canvas);
    managerRef.current = manager;
    setHighScore(parseInt(localStorage.getItem("planeShooterHigh") || "0"));
    preloadEnemySprites().catch(() => {});
    preloadBossSprites().catch(() => {});
    preloadPlayerSprite().catch(() => {});

    // Draw the star background immediately (start screen)
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#050a14";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    manager.onHUDUpdate = (h) => {
      setHud({ ...h });
    };

    manager.onStateChange = (state) => {
      setGameState(state);
      if (state === "gameover" || state === "victory") {
        setFinalScore(manager.score);
        setFinalLevel(manager.level);
        setHighScore(parseInt(localStorage.getItem("planeShooterHigh") || "0"));
      }
    };

    manager.onPlayerDamaged = () => {
      setDamageFlashKey((k) => k + 1);
    };

    // Start star animation on start screen
    let frame: number;
    const drawStart = () => {
      if (manager.state === "start" || manager.state === "gameover" || manager.state === "victory") {
        // @ts-ignore — access private for initial draw
        manager["_update"]?.();
        // @ts-ignore
        manager["_draw"]?.();
        frame = requestAnimationFrame(drawStart);
      }
    };
    frame = requestAnimationFrame(drawStart);

    return () => {
      cancelAnimationFrame(frame);
      manager.destroy();
    };
  }, []);

  const handleStart = useCallback(() => {
    setDamageFlashKey(0);
    managerRef.current?.startGame();
  }, []);

  // Scale canvas to fit screen
  const scale = Math.min(
    (typeof window !== "undefined" ? window.innerWidth : CANVAS_WIDTH) / CANVAS_WIDTH,
    (typeof window !== "undefined" ? window.innerHeight : CANVAS_HEIGHT) / CANVAS_HEIGHT,
    1.3,
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020509",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(91,192,235,0.15), 0 0 0 1px rgba(91,192,235,0.1)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            imageRendering: "pixelated",
            touchAction: "none",
            cursor: gameState === "playing" ? "none" : "default",
          }}
        />

        {/* HUD */}
        {gameState === "playing" && (
          <HUDOverlay hud={hud} />
        )}

        {gameState === "playing" && damageFlashKey > 0 && (
          <div
            key={damageFlashKey}
            className="damage-vignette-flash"
            aria-hidden
          />
        )}

        {/* Screens */}
        {gameState === "start" && (
          <StartScreen onStart={handleStart} highScore={highScore} />
        )}
        {gameState === "gameover" && (
          <GameOverScreen
            score={finalScore}
            highScore={highScore}
            level={finalLevel}
            onRestart={handleStart}
          />
        )}
        {gameState === "victory" && (
          <VictoryScreen
            score={finalScore}
            highScore={highScore}
            onRestart={handleStart}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes damageVignette {
          0% { opacity: 0; }
          10% { opacity: 1; }
          22% { opacity: 0.28; }
          34% { opacity: 1; }
          46% { opacity: 0.22; }
          58% { opacity: 0.88; }
          72% { opacity: 0.18; }
          100% { opacity: 0; }
        }
        .damage-vignette-flash {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 15;
          border-radius: 4px;
          animation: damageVignette 0.9s ease-out forwards;
          box-shadow:
            inset 0 0 50px 18px rgba(230, 40, 40, 0.85),
            inset 0 0 140px 55px rgba(255, 60, 60, 0.4),
            0 0 0 3px rgba(255, 80, 80, 0.65);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020509; }
      `}</style>
    </div>
  );
}
