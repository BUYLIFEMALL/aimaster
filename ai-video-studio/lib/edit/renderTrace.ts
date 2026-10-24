// v1.23 `?render=trace` — 맥에서 장면 하나가 57초~5분 넘게 멈추는 곳을 단계별로 가르는 장치(PLAN_20261024_EDIT_RENDER_SPEED.md §10).
// 렌더 한 바퀴: 장면 시작(시간 옮김) → 장면 대기(delayRender, 영상 꺼내기) → 화면 합성(createLayer) → 인코더 넘기기 → 다음 장면 시작
//  - 장면 시작: 편집 장면 컴포넌트가 프레임이 바뀔 때 markFrameStart()
//  - 대기 풀림: 렌더 중 50ms마다 window.remotion_renderReady를 읽어 poll()
//  - 합성 끝: renderMediaOnWeb의 onFrame → composed()
//  - 넘기기 끝: 다음 장면 시작 시각

export type TracePhase = "wait" | "compose" | "encode" | "idle";
export const TRACE_SLOW_MS = 2000;
export const TRACE_WATCH_MS = 5000;

export interface FrameTiming { frame: number; waitMs: number; composeMs: number; encodeMs: number }
export interface TraceTotals { waitMs: number; composeMs: number; encodeMs: number; slowFrames: number }

/** 시각을 받아 장면별 단계 시간을 계산(시각은 밖에서 넣어 시험 가능) */
export class RenderTrace {
  phase: TracePhase = "idle";
  frame = -1;
  lastEventAt: number;
  totals: TraceTotals = { waitMs: 0, composeMs: 0, encodeMs: 0, slowFrames: 0 };
  private startAt = 0;
  private readyAt = 0;
  private composedAt = 0;

  constructor(now: number, private readonly onSlow: (t: FrameTiming) => void) {
    this.lastEventAt = now;
  }

  /** 새 장면 시작 = 앞 장면 넘기기 끝 */
  frameStart(frame: number, now: number) {
    if (frame === this.frame) return;
    if (this.phase === "encode") this.finish(now);
    this.frame = frame;
    this.startAt = now;
    this.readyAt = 0;
    this.phase = "wait";
    this.lastEventAt = now;
  }

  /** 장면 대기가 풀렸는지(50ms마다) */
  poll(ready: boolean, now: number) {
    if (this.phase === "wait" && ready) {
      this.readyAt = now;
      this.phase = "compose";
      this.lastEventAt = now;
    }
  }

  /** 화면 합성 끝(onFrame) */
  composed(now: number) {
    if (this.phase === "wait") this.readyAt = now; // 대기가 50ms보다 짧아 못 본 경우 — 대기 0으로 본다
    if (this.phase !== "wait" && this.phase !== "compose") return;
    this.composedAt = now;
    this.phase = "encode";
    this.lastEventAt = now;
  }

  /** 렌더가 끝났을 때 마지막 장면 마무리 */
  end(now: number) {
    if (this.phase === "encode") this.finish(now);
    this.phase = "idle";
  }

  private finish(now: number) {
    const t: FrameTiming = {
      frame: this.frame,
      waitMs: Math.round(this.readyAt - this.startAt),
      composeMs: Math.round(this.composedAt - this.readyAt),
      encodeMs: Math.round(now - this.composedAt),
    };
    this.totals.waitMs += t.waitMs;
    this.totals.composeMs += t.composeMs;
    this.totals.encodeMs += t.encodeMs;
    if (t.waitMs > TRACE_SLOW_MS || t.composeMs > TRACE_SLOW_MS || t.encodeMs > TRACE_SLOW_MS) {
      this.totals.slowFrames++;
      this.onSlow(t);
    }
  }

  /** 5초 넘게 아무 단계도 안 바뀌었으면 지금 어디서 기다리는지 */
  stuck(now: number): { phase: TracePhase; frame: number; sinceMs: number } | null {
    const sinceMs = now - this.lastEventAt;
    if (this.phase === "idle" || sinceMs < TRACE_WATCH_MS) return null;
    return { phase: this.phase, frame: this.frame, sinceMs: Math.round(sinceMs) };
  }
}

export const PHASE_NAMES: Record<TracePhase, string> = { wait: "장면 대기(delayRender)", compose: "화면 합성(createLayer)", encode: "인코더 넘기기", idle: "없음" };

// 렌더 중에만 켜지는 하나뿐인 장치 — 편집 장면 컴포넌트가 같은 페이지에서 부른다
let active: RenderTrace | null = null;
export function setActiveTrace(t: RenderTrace | null) { active = t; }
export function markFrameStart(frame: number) { active?.frameStart(frame, performance.now()); }
