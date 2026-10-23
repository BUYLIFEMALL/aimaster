"use client";
import { EQ_FREQUENCIES } from "./eq";

/**
 * Web Audio 소리 경로: audio → 프리앰프 → EQ 8밴드 → 분석기 → 출력.
 * AudioContext와 MediaElementSource는 한 번만 만들고 목록이 비어도 닫지 않는다
 * (같은 <audio>에 소스를 두 번 만들 수 없어 재생목록을 비웠다가 다시 채우면 소리가 끊기던 원본 결함 방지).
 */
export class AudioEngine {
  readonly audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private pre: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private analyserNode: AnalyserNode | null = null;
  private gains: number[] = EQ_FREQUENCIES.map(() => 0);
  private preampDb = 0;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";
  }

  /** 사용자 동작(재생 클릭) 안에서 호출해야 한다 */
  ensure(): AnalyserNode | null {
    if (this.ctx) return this.analyserNode;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(this.audio);
      const pre = ctx.createGain();
      pre.gain.value = Math.pow(10, this.preampDb / 20);
      const filters = EQ_FREQUENCIES.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = "peaking";
        b.frequency.value = f;
        b.Q.value = 1.4;
        b.gain.value = this.gains[i] ?? 0;
        return b;
      });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      let node: AudioNode = source;
      node = node.connect(pre);
      for (const f of filters) node = node.connect(f);
      node.connect(analyser);
      analyser.connect(ctx.destination);
      this.ctx = ctx;
      this.pre = pre;
      this.filters = filters;
      this.analyserNode = analyser;
    } catch {
      this.ctx = null;
    }
    return this.analyserNode;
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume().catch(() => undefined);
  }

  get analyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  setEq(gains: number[]): void {
    this.gains = gains.slice(0, EQ_FREQUENCIES.length);
    this.filters.forEach((f, i) => { f.gain.value = this.gains[i] ?? 0; });
  }

  setPreamp(db: number): void {
    this.preampDb = db;
    if (this.pre) this.pre.gain.value = Math.pow(10, db / 20);
  }

  setVolume(v: number, muted: boolean): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
    this.audio.muted = muted;
  }

  setRate(r: number): void {
    this.audio.playbackRate = r;
    this.audio.defaultPlaybackRate = r;
  }

  dispose(): void {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
