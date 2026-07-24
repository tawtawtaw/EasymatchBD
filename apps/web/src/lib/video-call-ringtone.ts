export type VideoCallRingtoneKind = "incoming" | "outgoing";

type AudioContextConstructor = typeof AudioContext;

function getAudioContextClass(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const extended = window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? extended.webkitAudioContext ?? null;
}

class VideoCallRingtonePlayer {
  private ctx: AudioContext | null = null;
  private loopTimer: number | null = null;
  private running = false;
  private kind: VideoCallRingtoneKind | null = null;
  private activeNodes: OscillatorNode[] = [];

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctx = getAudioContextClass();
    if (!Ctx) return null;
    this.ctx = new Ctx();
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  start(kind: VideoCallRingtoneKind) {
    if (this.running && this.kind === kind) return;
    this.stop();
    this.running = true;
    this.kind = kind;
    void this.unlock().then(() => this.schedulePulse(kind));
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
    if (!ctx) return;

    if (kind === "incoming") {
      this.playDualTone(ctx, 0.13);
      this.loopTimer = window.setTimeout(() => {
        if (!this.running || this.kind !== kind) return;
        this.playDualTone(ctx, 0.13);
        this.loopTimer = window.setTimeout(() => {
          this.schedulePulse(kind);
        }, 2600);
      }, 450);
      return;
    }

    this.playSingleTone(ctx, 425, 0.09, 0.55);
    this.loopTimer = window.setTimeout(() => {
      this.schedulePulse(kind);
    }, 3000);
  }

  private playDualTone(ctx: AudioContext, volume: number) {
    this.playSingleTone(ctx, 440, volume, 0.85);
    this.playSingleTone(ctx, 480, volume, 0.85);
  }

  private playSingleTone(
    ctx: AudioContext,
    frequency: number,
    volume: number,
    durationSec: number,
  ) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + durationSec);
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
