/**
 * Web Audio API procedural sound engine for FLYBRAIN: Neural Odyssey
 * Requires no external audio files or network requests.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Wing buzz continuous nodes
  private wingOsc: OscillatorNode | null = null;
  private wingLfo: OscillatorNode | null = null;
  private wingGain: GainNode | null = null;
  private wingFilter: BiquadFilterNode | null = null;

  // Ambient drone continuous nodes
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.6, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public startFlightAudio() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Stop existing if any
    this.stopFlightAudio();

    try {
      // 1. Wing buzzing oscillator (fruit flies flap wings around 200-240 Hz)
      this.wingOsc = this.ctx.createOscillator();
      this.wingOsc.type = 'sawtooth';
      this.wingOsc.frequency.setValueAtTime(210, this.ctx.currentTime);

      // LFO for wing stroke texture flutter
      this.wingLfo = this.ctx.createOscillator();
      this.wingLfo.frequency.setValueAtTime(28, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(25, this.ctx.currentTime);
      this.wingLfo.connect(lfoGain);
      lfoGain.connect(this.wingOsc.frequency);

      // Lowpass filter to soften the harsh sawtooth into organic insect hum
      this.wingFilter = this.ctx.createBiquadFilter();
      this.wingFilter.type = 'lowpass';
      this.wingFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.wingFilter.Q.setValueAtTime(2, this.ctx.currentTime);

      this.wingGain = this.ctx.createGain();
      this.wingGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.wingOsc.connect(this.wingFilter);
      this.wingFilter.connect(this.wingGain);
      this.wingGain.connect(this.masterGain);

      this.wingOsc.start();
      this.wingLfo.start();

      // 2. Ambient celestial drone
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sine';
      this.ambientOsc1.frequency.setValueAtTime(110, this.ctx.currentTime); // A2

      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'triangle';
      this.ambientOsc2.frequency.setValueAtTime(164.81, this.ctx.currentTime); // E3

      const ambientFilter = this.ctx.createBiquadFilter();
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.ambientOsc1.connect(ambientFilter);
      this.ambientOsc2.connect(ambientFilter);
      ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateFlightSpeed(speedRatio: number, isBoosting: boolean) {
    if (!this.ctx || !this.wingOsc || !this.wingGain || !this.wingFilter) return;

    try {
      const targetFreq = 190 + speedRatio * 90 + (isBoosting ? 65 : 0);
      const targetVolume = isBoosting ? 0.16 : 0.08 + speedRatio * 0.06;
      const targetFilter = 600 + speedRatio * 600 + (isBoosting ? 800 : 0);

      const t = this.ctx.currentTime;
      this.wingOsc.frequency.setTargetAtTime(targetFreq, t, 0.08);
      this.wingGain.gain.setTargetAtTime(this.isMuted ? 0 : targetVolume, t, 0.08);
      this.wingFilter.frequency.setTargetAtTime(targetFilter, t, 0.08);
    } catch {
      // Ignore audio update errors
    }
  }

  public stopFlightAudio() {
    try {
      if (this.wingOsc) {
        this.wingOsc.stop();
        this.wingOsc.disconnect();
        this.wingOsc = null;
      }
      if (this.wingLfo) {
        this.wingLfo.stop();
        this.wingLfo.disconnect();
        this.wingLfo = null;
      }
      if (this.ambientOsc1) {
        this.ambientOsc1.stop();
        this.ambientOsc1.disconnect();
        this.ambientOsc1 = null;
      }
      if (this.ambientOsc2) {
        this.ambientOsc2.stop();
        this.ambientOsc2.disconnect();
        this.ambientOsc2 = null;
      }
    } catch {
      // Ignore
    }
  }

  public playNectarChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [880, 1108.73, 1318.51, 1661.22]; // A5, C#6, E6, G#6 shimmering major 7th
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.045);

      gain.gain.setValueAtTime(0.001, t + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.18, t + idx * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.045 + 0.55);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t + idx * 0.045);
      osc.stop(t + idx * 0.045 + 0.6);
    });
  }

  public playRingWhoosh() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Chord chime
    [523.25, 659.25, 783.99, 1046.50].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.35);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  public playBoostSound() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.4);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.4);
    filter.Q.setValueAtTime(3, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.48);
  }

  public playNearMiss() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.3);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playNeuralPulse() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Sci-fi bio-electric pulse sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.6);

    filter.type = 'peaking';
    filter.frequency.setValueAtTime(600, t);
    filter.gain.setValueAtTime(12, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.72);
  }

  public playUiClick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playVictoryFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);

      gain.gain.setValueAtTime(0.001, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.2, t + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.75);
    });
  }

  public playLaserAblate() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playThreatPulse() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  public playEscapeTrigger() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.27);
  }

  public playGiantFiberSpike() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Sharp high-voltage bio-electric spike click & pulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1450, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playPredatorImpact() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Heavy kinetic strike impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }
}

export const sound = new SoundEngine();
