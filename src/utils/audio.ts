// Web Audio API emergency alarm synthesizer (no external audio files needed)

class AlarmSoundEngine {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private alarmInterval: number | null = null;
  private muted = false;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
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
   * Plays a distinct double high-low warning pulse (Dispatch Bell/Siren)
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
      osc1.frequency.setValueAtTime(880, now); // A5
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
      osc2.frequency.setValueAtTime(987.77, now + 0.28); // B5
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
   * Starts a continuous emergency strobe pulse (can be stopped when operator acknowledges)
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
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

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
   * High-urgency tactical siren specifically tuned for guards on mobile
   */
  public playGuardTacticalSiren() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      // Aggressive wail from 700Hz to 1400Hz and back
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.35);
      osc.frequency.linearRampToValueAtTime(700, now + 0.7);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);

      // Trigger hardware phone vibration if available
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([400, 150, 400, 150, 600]);
        } catch {}
      }
    } catch (e) {
      console.warn("Guard audio error:", e);
    }
  }
}

export const alarmSound = new AlarmSoundEngine();
