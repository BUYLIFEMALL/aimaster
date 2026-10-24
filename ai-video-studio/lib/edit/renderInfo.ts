// v1.21 「영상 만들기」(브라우저 렌더) 남은 시간 안내·진단 — 맥(인텔)에서 5초 영상이 25분 걸린 사례(PLAN_20261024_EDIT_RENDER_SPEED.md)

export type RenderHw = "no-preference" | "prefer-software";

/** 주소 `?render=software`면 소프트웨어 인코딩(시험 스위치), 그 밖에는 기본값 */
export function renderHwFromParam(value: string | null | undefined): RenderHw {
  return value === "software" ? "prefer-software" : "no-preference";
}

/** 남은 시간(ms) → 「약 2분 5초」「약 40초」. 값이 없거나 아직 예측 전이면 빈 글자 */
export function formatEta(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `약 ${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `약 ${m}분 ${r}초` : `약 ${m}분`;
}

export const SLOW_AFTER_MS = 20_000;
export const SLOW_ETA_MS = 180_000;

/** 20초가 지났는데도 남은 예상이 3분을 넘으면 「이 PC에서는 오래 걸립니다」 안내 */
export function isSlowRender(elapsedMs: number, etaMs: number): boolean {
  return elapsedMs >= SLOW_AFTER_MS && etaMs > SLOW_ETA_MS;
}

/** 진단 한 줄(콘솔) — 그리기(rendered)와 인코딩(encoded) 중 어디가 막히는지 구분용 */
export function renderDiagnostics(d: { outcome: "done" | "error" | "aborted"; hw: RenderHw; elapsedMs: number; totalFrames: number; renderedFrames: number; encodedFrames: number; userAgent: string; cores: number }) {
  const sec = Math.round(d.elapsedMs / 100) / 10;
  return {
    outcome: d.outcome,
    hw: d.hw,
    seconds: sec,
    frames: `${d.renderedFrames}/${d.encodedFrames}/${d.totalFrames}`,
    fps: sec > 0 ? Math.round((d.encodedFrames / sec) * 10) / 10 : 0,
    lag: d.renderedFrames - d.encodedFrames,
    cores: d.cores,
    ua: d.userAgent.slice(0, 120),
  };
}
