// Synthesized "piece placement" sound using the Web Audio API.
// No audio files needed -> works offline and adds no network/loading cost.

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Mobile browsers suspend audio until a user gesture. Call this from the first
// tap so later programmatic sounds are allowed to play.
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') {
    void c.resume();
  }
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

// A short percussive "clack" like a wooden stone hitting the board.
// `capture` makes it a touch louder / lower for taking a piece.
export function playPlaceSound(capture = false): void {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();

  const now = c.currentTime;
  const master = c.createGain();
  master.gain.value = capture ? 0.5 : 0.38;
  master.connect(c.destination);

  // 1) Noise burst for the "clack" transient.
  const dur = 0.09;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // exponentially decaying white noise
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
  }
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = c.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = capture ? 1400 : 1900;
  bandpass.Q.value = 0.9;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  noise.connect(bandpass).connect(noiseGain).connect(master);

  // 2) Short low "thock" body so it sounds like wood, not just static.
  const osc = c.createOscillator();
  osc.type = 'triangle';
  const baseFreq = capture ? 150 : 210;
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.07);

  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.9, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(oscGain).connect(master);

  noise.start(now);
  noise.stop(now + dur);
  osc.start(now);
  osc.stop(now + 0.12);
}
