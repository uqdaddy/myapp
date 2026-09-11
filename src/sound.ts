// Synthesized "wooden clack" for placing a piece — no audio files, works
// offline. Deliberately tone-free (pure filtered noise transient) so it sounds
// like wood hitting wood, not a beep. Always plays; volume is the device's job.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Mobile browsers keep audio suspended until a user gesture. Call this from the
// first tap so later programmatic sounds are allowed to play.
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

// A short percussive wood "clack": a burst of noise shaped by a band-pass
// filter and an extremely fast decay envelope. `capture` makes it a touch
// deeper/louder for taking a piece.
//
// Robustness: the AudioContext can be `suspended` (mobile, or after a tab
// regains focus). resume() is asynchronous, so a sound scheduled while the
// context is still suspended is silently dropped — this was the cause of the
// intermittent "sometimes no clack" in Janggi (esp. on AI moves). We resume
// and, if the context isn't running yet, retry once after resume resolves.
export function playPlaceSound(capture = false): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'running') {
    emitClack(c, capture);
    return;
  }
  // Suspended: resume() is async, so emit only once it's actually running,
  // otherwise the sound is dropped. This fixes the intermittent Janggi clack.
  void c
    .resume()
    .then(() => emitClack(c, capture))
    .catch(() => {});
}

function emitClack(c: AudioContext, capture: boolean): void {
  const now = c.currentTime;
  const dur = 0.055; // very short = "click/clack", not a tone

  // Noise source.
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    // white noise with a steep exponential decay -> transient "tap"
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 5);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;

  // Band-pass around the woody knock region; two filters stacked for a tighter,
  // more "solid" character without introducing a clear pitch.
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = capture ? 1100 : 1500;
  bp.Q.value = 1.1;

  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 500; // cut low rumble so it reads as a crisp clack

  const gain = c.createGain();
  const peak = capture ? 0.6 : 0.5;
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);

  noise.connect(hp).connect(bp).connect(gain).connect(c.destination);
  noise.start(now);
  noise.stop(now + dur);
}
