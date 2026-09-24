// Synthetic Cinematic Boot Sound for NewGame+ (gameFlix V3)
// Powered by Web Audio API — 100% offline, zero external dependencies

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export interface BootSoundOptions {
  volume?: number; // 0.0 to 1.0
  enabled?: boolean;
}

/**
 * Plays a warm, cinematic console startup chime and whoosh chord.
 * Frequencies are chosen to deliver a rich, resonant chord (Csus2 / Cadd9)
 * with a subtle air sweep and crystal harmonic tail.
 */
export function playBootSound(options: BootSoundOptions = {}): void {
  const { volume = 0.4, enabled = true } = options;
  if (!enabled || volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), now);
  masterGain.connect(ctx.destination);

  // 1. Deep Sub-bass foundation (D2 ~ 73.4 Hz)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(73.4, now);
  subOsc.frequency.exponentialRampToValueAtTime(70.0, now + 1.8);
  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.linearRampToValueAtTime(0.28, now + 0.12);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  subOsc.connect(subGain);
  subGain.connect(masterGain);
  subOsc.start(now);
  subOsc.stop(now + 1.85);

  // 2. Warm Cinematic Chord Harmonics (D3, A3, E4, F#4) - Rich Major 9th
  const chordNotes = [
    { freq: 146.83, type: "triangle" as OscillatorType, vol: 0.22, decay: 2.1 }, // D3
    { freq: 220.00, type: "sine" as OscillatorType, vol: 0.18, decay: 2.2 },     // A3
    { freq: 329.63, type: "sine" as OscillatorType, vol: 0.16, decay: 2.3 },     // E4
    { freq: 369.99, type: "triangle" as OscillatorType, vol: 0.14, decay: 2.4 }, // F#4
    { freq: 587.33, type: "sine" as OscillatorType, vol: 0.10, decay: 2.2 },     // D5
  ];

  chordNotes.forEach(({ freq, type, vol, decay }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    // Slight detune for analog warmth
    osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  });

  // 3. Cinematic Whoosh Sweep (Filtered Noise)
  try {
    const bufferSize = ctx.sampleRate * 1.2; // 1.2 seconds of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.55);
    filter.frequency.exponentialRampToValueAtTime(800, now + 1.2);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.35);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(now);
    noise.stop(now + 1.2);
  } catch (err) {
    console.warn("Boot sound noise sweep error:", err);
  }

  // 4. Crystal Shimmer Climax (High harmonic bell chime at ~0.5s)
  const bellTime = now + 0.45;
  const bellFreqs = [1174.66, 1760.00]; // D6, A6
  bellFreqs.forEach((freq) => {
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();

    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(freq, bellTime);

    bellGain.gain.setValueAtTime(0.0001, bellTime);
    bellGain.gain.linearRampToValueAtTime(0.06, bellTime + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 1.2);

    bellOsc.connect(bellGain);
    bellGain.connect(masterGain);

    bellOsc.start(bellTime);
    bellOsc.stop(bellTime + 1.25);
  });
}
