// v1.21 「영상 만들기」(브라우저 렌더) 남은 시간 안내·진단 — 맥(인텔)에서 5초 영상이 25분 걸린 사례(PLAN_20261024_EDIT_RENDER_SPEED.md)

export type RenderHw = "no-preference" | "prefer-software";

const renderSwitches = (value: string | null | undefined) => (value ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** 주소 `?render=software`(쉼표로 여러 개 가능)면 소프트웨어 인코딩(시험 스위치), 그 밖에는 기본값 */
export function renderHwFromParam(value: string | null | undefined): RenderHw {
  return renderSwitches(value).includes("software") ? "prefer-software" : "no-preference";
}

/** 맥(데스크톱 macOS) 크롬인가 — 아이폰·아이패드는 제외 */
export function isMacDesktop(userAgent: string): boolean {
  return /Macintosh|Mac OS X/.test(userAgent) && !/iPhone|iPad|iPod/.test(userAgent);
}

export type RenderDecode = "software" | "default";

/** v1.22 영상 디코딩 방식 — 맥 측정(PLAN §7)에서 장면 그리기가 한 장에 약 20초 걸려 맥은 소프트웨어 디코딩이 기본.
 *  `?render=hwdecode`는 예전 방식(비교용), `?render=softdecode`는 맥이 아니어도 소프트웨어 */
export function renderDecodeFromParam(value: string | null | undefined, userAgent: string): RenderDecode {
  const sw = renderSwitches(value);
  if (sw.includes("hwdecode")) return "default";
  if (sw.includes("softdecode")) return "software";
  return isMacDesktop(userAgent) ? "software" : "default";
}

/** `?render=verbose`면 렌더 라이브러리 자세한 로그(장면 추출·키프레임) */
export function renderVerboseFromParam(value: string | null | undefined): boolean {
  return renderSwitches(value).includes("verbose");
}

/** v1.23 시험 스위치(PLAN §10): trace = 단계별 시간, nopace = 쉬어가기 끄기, htmlcanvas = 크롬 새 그리기 방식 */
export function renderTestSwitches(value: string | null | undefined) {
  const sw = renderSwitches(value);
  return { trace: sw.includes("trace"), noPace: sw.includes("nopace"), htmlCanvas: sw.includes("htmlcanvas") };
}

/** 「멈추기」를 누르고 이만큼 지나도 안 끝나면 화면을 먼저 되돌린다(라이브러리 합성 단계는 중단 신호를 안 봄) */
export const STOP_GRACE_MS = 3000;
/** 장면이 이만큼 하나도 안 오르면 막힘 안내 */
export const STALL_MS = 30_000;

export function isStalled(nowMs: number, lastAdvanceAtMs: number): boolean {
  return nowMs - lastAdvanceAtMs >= STALL_MS;
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

/** 남은 시간(ms) — 전체 진행률(그리기 70%·인코딩 30%)과 지난 시간으로 계산.
 *  라이브러리 renderEstimatedTime은 그리기 속도만 보므로 인코딩에서 막히는 PC(맥 사례)에선 크게 짧게 나온다. 진행 3% 전엔 0(예측 안 함) */
export function etaFromProgress(elapsedMs: number, progress: number): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(progress) || progress < 0.03 || progress >= 1) return 0;
  return Math.round((elapsedMs * (1 - progress)) / progress);
}

export const SLOW_AFTER_MS = 20_000;
export const SLOW_ETA_MS = 180_000;

/** 20초가 지났는데도 남은 예상이 3분을 넘으면 「이 PC에서는 오래 걸립니다」 안내 */
export function isSlowRender(elapsedMs: number, etaMs: number): boolean {
  return elapsedMs >= SLOW_AFTER_MS && etaMs > SLOW_ETA_MS;
}

/** 진단 한 줄(콘솔) — 그리기(rendered)와 인코딩(encoded) 중 어디가 막히는지 구분용 */
export function renderDiagnostics(d: { outcome: "done" | "error" | "aborted"; hw: RenderHw; decode: RenderDecode; elapsedMs: number; totalFrames: number; renderedFrames: number; encodedFrames: number; userAgent: string; cores: number; switches?: string; phases?: { waitMs: number; composeMs: number; encodeMs: number; slowFrames: number } }) {
  const sec = Math.round(d.elapsedMs / 100) / 10;
  return {
    outcome: d.outcome,
    hw: d.hw,
    decode: d.decode,
    ...(d.switches ? { switches: d.switches } : {}),
    ...(d.phases ? { phases: d.phases } : {}),
    msPerFrame: d.renderedFrames > 0 ? Math.round(d.elapsedMs / d.renderedFrames) : 0,
    seconds: sec,
    frames: `${d.renderedFrames}/${d.encodedFrames}/${d.totalFrames}`,
    fps: sec > 0 ? Math.round((d.encodedFrames / sec) * 10) / 10 : 0,
    lag: d.renderedFrames - d.encodedFrames,
    cores: d.cores,
    ua: d.userAgent.slice(0, 120),
  };
}
