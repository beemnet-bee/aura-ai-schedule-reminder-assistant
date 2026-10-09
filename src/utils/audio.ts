/**
 * @file audio.ts
 * @description Zero-latency Web Audio API synthesizer for reminder notifications,
 * celebratory completion pops, conflict warnings, and base64 WAV playback for Gemini TTS.
 * Requires zero external audio file downloads and works offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a pleasant chime for reminder due notifications
 */
export function playNotificationChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  // Bright marimba/chime sequence: C6 -> E6 -> G6
  osc1.frequency.setValueAtTime(1046.5, now); // C6
  osc1.frequency.setValueAtTime(1318.51, now + 0.12); // E6
  osc1.frequency.setValueAtTime(1567.98, now + 0.24); // G6

  osc2.frequency.setValueAtTime(523.25, now); // C5
  osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
  osc2.frequency.setValueAtTime(783.99, now + 0.24); // G5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.75);
  osc2.stop(now + 0.75);
}

/**
 * Play an uplifting pop sound when completing a task
 */
export function playCompleteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

/**
 * Play a low gentle warning sound for schedule conflicts
 */
export function playAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.setValueAtTime(260, now + 0.1);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}

/**
 * Play base64 encoded WAV audio returned from Gemini TTS
 */
export function playBase64Audio(base64: string, onEnded?: () => void): HTMLAudioElement {
  const audio = new Audio(`data:audio/wav;base64,${base64}`);
  if (onEnded) {
    audio.onended = onEnded;
  }
  audio.play().catch((err) => {
    console.warn('Playback error or blocked by autoplay policy:', err);
  });
  return audio;
}
