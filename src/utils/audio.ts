// Tactical Web Audio & Background Mobile Audio Engine for PanicGuard

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Synthesizes a raw PCM WAV Data URI dynamically without requiring any external MP3/WAV assets.
 */
function generateWavDataUri(
  sampleRate: number,
  durationSeconds: number,
  sampleGenerator: (time: number, index: number) => number
): string {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF Chunk
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");

  // Format Chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // Data Chunk
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Write samples (16-bit signed PCM)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const rawVal = sampleGenerator(t, i);
    const clamped = Math.max(-1, Math.min(1, rawVal));
    const intVal = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, Math.floor(intVal), true);
    offset += 2;
  }

  // Convert buffer to base64
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

class AlarmSoundEngine {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private alarmInterval: number | null = null;
  private isGuardSirenPlaying = false;
  private guardVibrationInterval: number | null = null;
  private muted = false;

  // Dedicated HTML5 Audio elements for mobile lock-screen & background playback
  private bgAudioElement: HTMLAudioElement | null = null;
  private silentWavUri: string | null = null;
  private sirenWavUri: string | null = null;
  private isBackgroundGuardModeActive = false;

  constructor() {
    this.initAudioAssets();
  }

  private initAudioAssets() {
    if (typeof window === "undefined") return;

    try {
      // 1. Silent keepalive carrier WAV (1 second silent loop)
      this.silentWavUri = generateWavDataUri(11025, 1.0, () => 0);

      // 2. High-urgency Tactical Siren WAV (2.0 seconds looping wail from 750Hz to 1600Hz)
      const sampleRate = 22050;
      const duration = 2.0;
      let phase = 0;
      this.sirenWavUri = generateWavDataUri(sampleRate, duration, (t) => {
        const freq = 800 + 750 * Math.sin(2 * Math.PI * 1.5 * t);
        phase += (2 * Math.PI * freq) / sampleRate;
        const sine = Math.sin(phase);
        const saw = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
        const envelope = 0.85;
        return (0.6 * sine + 0.4 * saw) * envelope;
      });

      // Initialize the background audio element
      this.bgAudioElement = new Audio();
      this.bgAudioElement.loop = true;
      this.bgAudioElement.preload = "auto";
      this.bgAudioElement.src = this.silentWavUri;
    } catch (e) {
      console.warn("Could not pre-synthesize audio assets:", e);
    }
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.isAlarmPlaying) {
      this.stopAlarm();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Enables the Mobile Background Keep-Alive Audio Engine.
   */
  public enableBackgroundGuardMode() {
    this.isBackgroundGuardModeActive = true;
    this.initContext();

    if (this.bgAudioElement && this.silentWavUri) {
      if (!this.isGuardSirenPlaying) {
        if (this.bgAudioElement.src !== this.silentWavUri) {
          this.bgAudioElement.src = this.silentWavUri;
        }
        this.bgAudioElement.volume = 0.01;
        this.bgAudioElement.loop = true;
        this.bgAudioElement.play().catch(() => {});
      }
    }

    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "PanicGuard Táctico",
          artist: "Guardia en Turno - Canal Activo",
          album: "Sistema de Alerta Móvil",
        });
        navigator.mediaSession.playbackState = "playing";
      } catch {}
    }
  }

  /**
   * Disables background guard keepalive mode (e.g. when going off-duty)
   */
  public disableBackgroundGuardMode() {
    this.isBackgroundGuardModeActive = false;
    this.stopGuardTacticalLoop();
    if (this.bgAudioElement) {
      try {
        this.bgAudioElement.pause();
      } catch {}
    }
  }

  /**
   * Plays a distinct double high-low warning pulse (Dispatch Bell/Siren for Central / Terminal)
   */
  public playAlertNotification() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Pulse 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.25);

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.25);

      // Pulse 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(987.77, now + 0.28);
      osc2.frequency.exponentialRampToValueAtTime(493.88, now + 0.55);

      gain2.gain.setValueAtTime(0.35, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.28);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }

  /**
   * Starts a continuous emergency strobe pulse for Central / Terminal
   */
  public startEmergencySiren() {
    if (this.muted || this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;
    this.playAlertNotification();

    this.alarmInterval = window.setInterval(() => {
      if (this.isAlarmPlaying && !this.muted) {
        this.playAlertNotification();
      }
    }, 1800);
  }

  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  public playSuccessTone() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  /**
   * Single-source High-urgency tactical siren & vibration for Security Guards on mobile.
   * Plays cleanly through ONE audio channel with zero duplication or echo.
   */
  public playGuardTacticalSiren() {
    let playedHtml5 = false;

    // 1. Play through HTML5 Audio element (works on mobile lockscreen & background)
    if (this.bgAudioElement && this.sirenWavUri) {
      try {
        if (this.bgAudioElement.src !== this.sirenWavUri) {
          this.bgAudioElement.src = this.sirenWavUri;
        }
        this.bgAudioElement.volume = 1.0;
        this.bgAudioElement.loop = true;
        this.bgAudioElement.play().catch(() => {});
        playedHtml5 = true;
      } catch {}
    }

    // 2. Only use Web Audio API if HTML5 audio is unavailable
    if (!playedHtml5) {
      try {
        const ctx = this.initContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(1500, now + 0.35);
        osc.frequency.linearRampToValueAtTime(750, now + 0.7);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.7);
      } catch (e) {
        console.warn("Guard audio error:", e);
      }
    }

    // 3. Trigger phone tactile vibration pattern
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 800]);
      } catch {}
    }
  }

  /**
   * Starts a continuous emergency siren + vibration loop on the guard's phone
   * Continues until guard takes action (e.g. Voy en Camino) or emergency is resolved.
   */
  public startGuardTacticalLoop() {
    if (this.isGuardSirenPlaying) return;
    this.isGuardSirenPlaying = true;
    
    // Start the single continuous siren
    this.playGuardTacticalSiren();

    // Re-trigger vibration pulse periodically without re-creating audio streams
    if (this.guardVibrationInterval) {
      clearInterval(this.guardVibrationInterval);
    }

    this.guardVibrationInterval = window.setInterval(() => {
      if (this.isGuardSirenPlaying && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([500, 200, 500, 200, 800]);
        } catch {}
      }
    }, 2500);
  }

  /**
   * Stops the guard tactical loop and restores silent background keepalive
   */
  public stopGuardTacticalLoop() {
    this.isGuardSirenPlaying = false;
    if (this.guardVibrationInterval) {
      clearInterval(this.guardVibrationInterval);
      this.guardVibrationInterval = null;
    }

    // Return HTML5 audio element to silent carrier loop to keep background thread awake
    if (this.bgAudioElement) {
      try {
        if (this.isBackgroundGuardModeActive && this.silentWavUri) {
          this.bgAudioElement.src = this.silentWavUri;
          this.bgAudioElement.volume = 0.01;
          this.bgAudioElement.loop = true;
          this.bgAudioElement.play().catch(() => {});
        } else {
          this.bgAudioElement.pause();
        }
      } catch {}
    }
  }
}

export const alarmSound = new AlarmSoundEngine();
