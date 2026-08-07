export type VideoCallRingtoneKind = "incoming" | "outgoing";

type AudioContextConstructor = typeof AudioContext;

function getAudioContextClass(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const extended = window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? extended.webkitAudioContext ?? null;
}

/** WhatsApp-style incoming call melody (approximation), louder than the old beeps. */
const INCOMING_MELODY: Array<{ freq: number; startMs: number; durationMs: number }> =
  [
    { freq: 659, startMs: 0, durationMs: 120 },
    { freq: 784, startMs: 140, durationMs: 120 },
    { freq: 988, startMs: 280, durationMs: 180 },
    { freq: 784, startMs: 500, durationMs: 120 },
    { freq: 659, startMs: 640, durationMs: 160 },
  ];

class VideoCallRingtonePlayer {
  private ctx: AudioContext | null = null;
  private loopTimer: number | null = null;
  private running = false;
  private kind: VideoCallRingtoneKind | null = null;
  private activeNodes: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctx = getAudioContextClass();
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.92;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* gesture may be required */
      }
    }
  }

  start(kind: VideoCallRingtoneKind) {
    if (this.running && this.kind === kind) return;
    this.stop();
    this.running = true;
    this.kind = kind;
    void this.unlock().then(() => {
      if (this.ctx?.state === "suspended") {
        this.running = false;
        this.kind = null;
        return;
      }
      this.schedulePulse(kind);
    });
  }

  stop() {
    this.running = false;
    this.kind = null;
    if (this.loopTimer != null) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    for (const node of this.activeNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.activeNodes = [];
  }

  private schedulePulse(kind: VideoCallRingtoneKind) {
    if (!this.running || this.kind !== kind) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (kind === "incoming") {
      this.playMelody(ctx, this.masterGain);
      this.loopTimer = window.setTimeout(() => {
        this.schedulePulse(kind);
      }, 2400);
      return;
    }

    this.playSingleTone(ctx, this.masterGain, 425, 0.75, 0.12);
    this.loopTimer = window.setTimeout(() => {
      this.schedulePulse(kind);
    }, 2800);
  }

  private playMelody(ctx: AudioContext, destination: AudioNode) {
    const start = ctx.currentTime;
    for (const note of INCOMING_MELODY) {
      this.playSingleTone(
        ctx,
        destination,
        note.freq,
        0.85,
        note.durationMs / 1000,
        start + note.startMs / 1000,
      );
    }
  }

  private playSingleTone(
    ctx: AudioContext,
    destination: AudioNode,
    frequency: number,
    volume: number,
    durationSec: number,
    when = ctx.currentTime,
  ) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + durationSec + 0.05);
    this.activeNodes.push(oscillator);
    oscillator.onended = () => {
      this.activeNodes = this.activeNodes.filter((node) => node !== oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}

let sharedPlayer: VideoCallRingtonePlayer | null = null;

function getPlayer() {
  if (!sharedPlayer) {
    sharedPlayer = new VideoCallRingtonePlayer();
  }
  return sharedPlayer;
}

export function unlockVideoCallRingtone() {
  void getPlayer().unlock();
}

export function startVideoCallRingtone(kind: VideoCallRingtoneKind) {
  getPlayer().start(kind);
}

export function stopVideoCallRingtone() {
  getPlayer().stop();
}
