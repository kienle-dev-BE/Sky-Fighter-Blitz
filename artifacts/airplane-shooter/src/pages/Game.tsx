
import { useEffect, useRef, useState, useCallback } from "react";
import { GameManager, GameState, HUD } from "../game/GameManager";
import { CANVAS_WIDTH, CANVAS_HEIGHT, POWERUP_DURATION } from "../game/constants";

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

function HUDOverlay({ hud, level }: { hud: HUD; level: number }) {
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
      {/* Left: HP */}
      <div>
        <HeartBar hp={hud.hp} maxHp={hud.maxHp} />
        <div style={{ color: "#aaa", fontSize: 10, marginTop: 2 }}>LIVES</div>
      </div>

      {/* Center: Score + Level */}
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 2, textShadow: "0 0 12px #5bc0eb" }}>
          {hud.score.toString().padStart(6, "0")}
        </div>
        <div style={{ color: "#5bc0eb", fontSize: 11, fontWeight: 700, letterSpacing: 3 }}>SCORE</div>
        <div style={{
          marginTop: 4,
          background: "linear-gradient(90deg, #1a4a7a, #3a8fd1)",
          borderRadius: 8,
          padding: "2px 10px",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          LVL {level}
        </div>
      </div>

      {/* Right: Power-ups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        {hud.doubleShot && (
          <PowerUpBar label="2x SHOT" color="#00e5ff" timeLeft={hud.doubleShotTimeLeft} total={POWERUP_DURATION} />
        )}
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
      background: "rgba(5,10,20,0.88)",
      zIndex: 20, gap: 16,
    }}>
      <div style={{ fontSize: 14, letterSpacing: 6, color: "#5bc0eb", fontWeight: 700 }}>
        SKY COMMANDER
      </div>
      <div style={{
        fontSize: 44, fontWeight: 900, color: "#fff",
        textShadow: "0 0 30px #5bc0eb",
        letterSpacing: 4,
        lineHeight: 1,
      }}>
        AIRFORCE
      </div>
      <div style={{ fontSize: 14, letterSpacing: 4, color: "#3a8fd1", fontWeight: 700 }}>
        SHOOTER
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#88aacc", textAlign: "center", letterSpacing: 1 }}>
        <div><span style={{ color: "#5bc0eb" }}>WASD / ↑↓←→</span> — Move</div>
        <div><span style={{ color: "#5bc0eb" }}>AUTO-FIRE</span> — Continuous shooting</div>
        <div><span style={{ color: "#2ecc71" }}>Gems</span> — Power-ups: double shot, shield, heal</div>
      </div>

      {highScore > 0 && (
        <div style={{ fontSize: 13, color: "#f39c12", fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>
          HIGH SCORE: {highScore.toString().padStart(6, "0")}
        </div>
      )}

      <button
        onClick={onStart}
        style={{
          marginTop: 20,
          padding: "14px 44px",
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: 4,
          background: "linear-gradient(135deg, #1a4a7a, #3a8fd1)",
          color: "#fff",
          border: "2px solid #5bc0eb",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(91,192,235,0.4)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(91,192,235,0.8)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(91,192,235,0.4)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        START GAME
      </button>

      <div style={{ fontSize: 10, color: "#334", marginTop: 8, letterSpacing: 2 }}>
        EVERY 30s = NEW LEVEL — ENEMIES SHOOT AT LVL 2+
      </div>
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
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 2 }}>REACHED LEVEL {level}</div>
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

// ─── Main Game Component ──────────────────────────────────────────────────────

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<GameManager | null>(null);
  const [gameState, setGameState] = useState<GameState>("start");
  const [hud, setHud] = useState<HUD>({
    score: 0, level: 1, hp: 3, maxHp: 3,
    doubleShot: false, shieldActive: false,
    doubleShotTimeLeft: 0, shieldTimeLeft: 0,
  });
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const manager = new GameManager(canvas);
    managerRef.current = manager;
    setHighScore(manager.highScore);

    // Draw the star background immediately (start screen)
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#050a14";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    manager.onHUDUpdate = (h) => {
      setHud({ ...h });
    };

    manager.onStateChange = (state) => {
      setGameState(state);
      if (state === "gameover") {
        setFinalScore(manager.score);
        setFinalLevel(manager.level);
        setHighScore(manager.highScore);
      }
    };

    // Start star animation on start screen
    let frame: number;
    const drawStart = () => {
      if (manager.state === "start" || manager.state === "gameover") {
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
          }}
        />

        {/* HUD */}
        {gameState === "playing" && (
          <HUDOverlay hud={hud} level={hud.level} />
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
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020509; }
      `}</style>
    </div>
  );
}
