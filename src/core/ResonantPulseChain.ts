// /src/core/ResonantPulseChain.ts
export type PulseId = string;

export interface ResonantPulseChainHooks {
  onPulsePlayback: (id: PulseId) => void;
  onProgress: (index: number, total: number) => void;
  onFail: (index: number) => void;
  onComplete: () => void;
}

export interface ResonantPulseChainArgs extends ResonantPulseChainHooks {
  sequence: PulseId[];
  playbackGapMs?: number;
}

export class ResonantPulseChain {
  private readonly seq: PulseId[];
  private readonly gap: number;

  private index = 0;
  public playbackActive = false;

  private readonly onPulse: (id: PulseId) => void;
  private readonly onProgress: (index: number, total: number) => void;
  private readonly onFail: (index: number) => void;
  private readonly onComplete: () => void;

  constructor({ sequence, playbackGapMs = 600, onPulsePlayback, onProgress, onFail, onComplete }: ResonantPulseChainArgs) {
    this.seq = sequence;
    this.gap = playbackGapMs;

    this.onPulse = onPulsePlayback;
    this.onProgress = onProgress;
    this.onFail = onFail;
    this.onComplete = onComplete;
  }

  public async playTeach(): Promise<void> {
    this.playbackActive = true;

    for (let i = 0; i < this.seq.length; i++) {
      const id = this.seq[i];
      this.onPulse(id);
      this.onProgress(i + 1, this.seq.length);
      await this.delay(this.gap);
    }

    this.playbackActive = false;
    this.index = 0;
  }

  public acceptInput(id: PulseId): void {
    if (this.playbackActive) return;

    const expected = this.seq[this.index];
    if (id !== expected) {
      this.index = 0;
      this.onFail(this.index);
      return;
    }

    this.index++;

    if (this.index >= this.seq.length) {
      this.index = 0;
      this.onComplete();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}
