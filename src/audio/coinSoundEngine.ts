/**
 * Procedural Web Audio API synthesizer for authentic Indian ₹1 coin acoustics:
 * 1. Whoosh (upward air sweep on launch)
 * 2. Chhan-Chhan (metallic spinning harmonic chime in flight)
 * 3. Ting (multi-partial metallic landing resonance + pitch turf thud)
 */

class CoinSoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.getContext();
  }

  public playWhoosh(enabled: boolean): void {
    if (!enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const duration = 0.28;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const envelope = Math.sin(progress * Math.PI);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1450, now + duration);
      filter.Q.value = 1.6;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + duration);
    } catch {
      // Ignore Web Audio failures in restricted environments
    }
  }

  public playFlipChime(enabled: boolean, powerRatio = 0.5): void {
    if (!enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Crisp metallic "CHHAN" dual-oscillator ring
      const baseFreq = 1950 + powerRatio * 680 + (Math.random() * 240 - 120);
      const harmonics = [
        { freq: baseFreq, gain: 0.042, type: 'triangle' as OscillatorType, dur: 0.075 },
        { freq: baseFreq * 1.48, gain: 0.025, type: 'sine' as OscillatorType, dur: 0.06 },
      ];

      harmonics.forEach((h) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = h.type;
        osc.frequency.setValueAtTime(h.freq, now);
        osc.frequency.exponentialRampToValueAtTime(h.freq * 1.04, now + h.dur);

        gain.gain.setValueAtTime(h.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + h.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + h.dur + 0.01);
      });
    } catch {
      // Ignore Web Audio failures
    }
  }

  public playLandTing(enabled: boolean, bounceStrength = 1): void {
    if (!enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const strength = Math.max(0.2, Math.min(1, bounceStrength));

      // 1. Subtle clay-turf thud on impact
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(165 * (0.85 + strength * 0.25), now);
      thudOsc.frequency.exponentialRampToValueAtTime(58, now + 0.065);
      thudGain.gain.setValueAtTime(0.14 * strength, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(now);
      thudOsc.stop(now + 0.075);

      // 2. Authentic Indian ₹1 ferritic-steel / brass multi-partial "TING"
      const partials = [
        { freq: 2560, amp: 0.22 * strength, decay: 0.42 * strength + 0.14, delay: 0 },
        { freq: 3340, amp: 0.16 * strength, decay: 0.36 * strength + 0.12, delay: 0.012 },
        { freq: 4280, amp: 0.11 * strength, decay: 0.28 * strength + 0.1, delay: 0.022 },
        { freq: 5890, amp: 0.055 * strength, decay: 0.18 * strength + 0.08, delay: 0.006 },
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now + p.delay);
        gain.gain.setValueAtTime(p.amp, now + p.delay);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + p.delay + p.decay);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + p.delay);
        osc.stop(now + p.delay + p.decay + 0.02);
      });
    } catch {
      // Ignore Web Audio failures
    }
  }

  public playSelectTick(enabled: boolean): void {
    if (!enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.04);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }
}

export const coinSoundEngine = new CoinSoundEngine();
