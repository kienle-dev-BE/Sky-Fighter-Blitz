
// Web Audio API sound effects — no external files needed

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playShoot() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.06);
    gain.gain.setValueAtTime(0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.08);
  } catch (_) {}
}

export function playExplosion(big = false) {
  try {
    const ac = getCtx();
    const bufferSize = ac.sampleRate * (big ? 0.4 : 0.25);
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const gain = ac.createGain();
    source.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(big ? 0.5 : 0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (big ? 0.4 : 0.25));
    source.start(ac.currentTime);
  } catch (_) {}
}

/** Large layered explosion when the player ship is destroyed (game over sequence). */
export function playPlayerGameOverExplosion() {
  try {
    const ac = getCtx();
    const t0 = ac.currentTime;
    const dur = 0.58;
    const bufferSize = ac.sampleRate * dur;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 0.75);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + dur);
    const g1 = ac.createGain();
    g1.gain.setValueAtTime(0.58, t0);
    g1.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g1);
    g1.connect(ac.destination);
    src.start(t0);

    const osc = ac.createOscillator();
    const g2 = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t0);
    osc.frequency.exponentialRampToValueAtTime(22, t0 + 0.48);
    g2.gain.setValueAtTime(0.42, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.52);
    osc.connect(g2);
    g2.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.54);

    const osc2 = ac.createOscillator();
    const g3 = ac.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(140, t0 + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(40, t0 + 0.22);
    g3.gain.setValueAtTime(0, t0);
    g3.gain.linearRampToValueAtTime(0.12, t0 + 0.04);
    g3.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    osc2.connect(g3);
    g3.connect(ac.destination);
    osc2.start(t0);
    osc2.stop(t0 + 0.3);
  } catch (_) {}
}

/** Short low thud when the game over screen appears after ship destruction. */
export function playGameOverImpact() {
  try {
    const ac = getCtx();
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(55, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + 0.18);
    g.gain.setValueAtTime(0.22, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.36);
  } catch (_) {}
}

export function playPowerUp() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.frequency.setValueAtTime(660, ac.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ac.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.35);
  } catch (_) {}
}

export function playPlayerHit() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ac.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
  } catch (_) {}
}

export function playLevelUp() {
  try {
    const ac = getCtx();
    [440, 550, 660, 880].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ac.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (_) {}
}
