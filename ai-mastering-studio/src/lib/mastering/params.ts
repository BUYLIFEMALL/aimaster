// 마스터링 설정값(파라미터)·프리셋·AI 응답 보정 — 서버·브라우저·테스트 공용 순수 코드

export interface MasteringParams {
  eq: { low: number; mid: number; high: number; q: number };
  saturation: { drive: number; harmonics: number };
  compressor: { threshold: number; ratio: number; attack: number; release: number };
  stereo: { width: number };
  limiter: { gain: number; ceiling: number; release: number };
}

/** 슬라이더(수동 조정) 허용 범위 */
export const RANGES = {
  eq: { low: [-12, 12, 0.5], mid: [-12, 12, 0.5], high: [-12, 12, 0.5], q: [0.1, 5, 0.1] },
  saturation: { drive: [0, 10, 0.5], harmonics: [0, 100, 1] },
  compressor: { threshold: [-40, 0, 1], ratio: [1, 10, 0.1], attack: [1, 100, 1], release: [10, 500, 10] },
  stereo: { width: [0, 200, 1] },
  limiter: { gain: [0, 12, 0.5], ceiling: [-3, -0.1, 0.1], release: [10, 500, 10] },
} as const;

/** AI가 제안할 때 지키게 하는 더 좁은 범위(과한 처리를 막는다) */
export const AI_RANGES = {
  eq: { low: [-6, 6], mid: [-6, 6], high: [-6, 6], q: [0.1, 5] },
  saturation: { drive: [0, 10], harmonics: [0, 100] },
  compressor: { threshold: [-40, -10], ratio: [1.2, 4], attack: [10, 100], release: [50, 500] },
  stereo: { width: [90, 130] },
  limiter: { gain: [0, 6], ceiling: [-3, -0.1], release: [30, 300] },
} as const;

export const DEFAULT_PARAMS: MasteringParams = {
  eq: { low: 0, mid: 0, high: 0, q: 1 },
  saturation: { drive: 0, harmonics: 0 },
  compressor: { threshold: -20, ratio: 2, attack: 15, release: 100 },
  stereo: { width: 100 },
  limiter: { gain: 1.5, ceiling: -1, release: 100 },
};

export interface Preset { id: string; name: string; en: string; description: string; params: MasteringParams }
const P = (eq: [number, number, number, number], sat: [number, number], comp: [number, number, number, number], width: number, lim: [number, number, number]): MasteringParams => ({
  eq: { low: eq[0], mid: eq[1], high: eq[2], q: eq[3] },
  saturation: { drive: sat[0], harmonics: sat[1] },
  compressor: { threshold: comp[0], ratio: comp[1], attack: comp[2], release: comp[3] },
  stereo: { width },
  limiter: { gain: lim[0], ceiling: lim[1], release: lim[2] },
});

/** 장르·용도별 12가지 사운드 프로필 */
export const PRESETS: Preset[] = [
  { id: "universal", name: "범용", en: "Universal", description: "깨끗하고 투명한 다이나믹 제어.", params: P([2.5, -1, 2.5, 0.7], [1.5, 15], [-18, 2, 30, 150], 105, [3.5, -1, 100]) },
  { id: "streaming", name: "스트리밍", en: "Streaming", description: "스포티파이·애플 뮤직 같은 스트리밍 서비스에 맞춘 음량.", params: P([1.5, 0, 1.5, 0.7], [0, 5], [-15, 2.5, 10, 100], 100, [2.5, -1, 120]) },
  { id: "club", name: "클럽용", en: "Club Ready", description: "서브 베이스와 단단한 저역 강화.", params: P([3.5, -1, 1.5, 1.2], [1.5, 40], [-20, 3, 15, 200], 105, [3, -0.3, 150]) },
  { id: "fire", name: "파이어", en: "Fire", description: "공격적인 리미팅과 중역 포화.", params: P([2, 1.5, 2.5, 1.5], [2.5, 70], [-22, 3.5, 5, 80], 110, [3.5, -0.5, 80]) },
  { id: "punch", name: "펀치", en: "Punch", description: "강한 킥을 위한 빠른 어택 압축.", params: P([2.5, 0.5, 1.5, 1], [1, 30], [-18, 3, 8, 60], 98, [3, -0.5, 100]) },
  { id: "clarity", name: "선명함", en: "Clarity", description: "깨끗한 고음과 트랜지언트 보존.", params: P([-1.5, -0.5, 3, 0.6], [0.5, 10], [-14, 1.8, 40, 100], 110, [1.5, -1, 150]) },
  { id: "podcast", name: "팟캐스트", en: "Podcast", description: "목소리 명료도와 존재감에 집중.", params: P([-1, 2, 0.5, 1.5], [0, 0], [-18, 2.5, 5, 100], 90, [2, -1.5, 200]) },
  { id: "vintage", name: "빈티지 온기", en: "Vintage Warmth", description: "미세한 하모닉 디스토션과 진공관 온기.", params: P([2, 1, -2, 0.8], [3, 90], [-18, 2, 50, 300], 95, [1.5, -0.5, 300]) },
  { id: "tape", name: "테이프", en: "Tape", description: "부드러운 테이프 압축과 새추레이션.", params: P([1.5, 0.5, -1, 0.7], [2, 60], [-20, 1.8, 40, 250], 98, [2, -0.5, 400]) },
  { id: "natural", name: "내추럴", en: "Natural", description: "다이나믹스를 지키는 최소한의 처리.", params: P([0, 0, 0, 1], [0, 0], [-12, 1.5, 30, 150], 100, [1, -1, 150]) },
  { id: "spatial", name: "공간감", en: "Spatial", description: "넓은 스테레오 이미지와 공간 깊이.", params: P([0.5, -1, 2, 1], [0.5, 20], [-16, 2, 20, 120], 130, [1.5, -1, 150]) },
  { id: "cinematic", name: "시네마틱", en: "Cinematic", description: "큰 스케일의 다이나믹스와 오케스트라 집중.", params: P([3, -1.5, 2.5, 0.5], [1.5, 40], [-24, 2.5, 20, 300], 120, [3, -0.3, 200]) },
];

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/** 슬라이더 범위 안으로 맞춘다(저장·복원·프리셋 적용용) */
export function clampParams(raw: unknown, ranges: Record<string, Record<string, readonly number[]>> = RANGES): MasteringParams {
  const o = (raw ?? {}) as Record<string, Record<string, unknown>>;
  const out: Record<string, Record<string, number>> = {};
  for (const group of Object.keys(DEFAULT_PARAMS) as (keyof MasteringParams)[]) {
    out[group] = {};
    for (const key of Object.keys(DEFAULT_PARAMS[group])) {
      const [lo, hi] = ranges[group][key];
      const def = (DEFAULT_PARAMS[group] as Record<string, number>)[key];
      out[group][key] = r1(clamp(o?.[group]?.[key], lo, hi, def));
    }
  }
  return out as unknown as MasteringParams;
}

/** AI 응답을 정리: { params, explanation } → 안전 범위로 보정 */
export function cleanAiPreset(raw: unknown): { params: MasteringParams; explanation: string } | null {
  const o = raw as { params?: unknown; explanation?: unknown } | null;
  if (!o || typeof o !== "object" || !o.params || typeof o.params !== "object") return null;
  const p = o.params as Record<string, unknown>;
  // 필수 그룹이 모두 있어야 한다
  for (const g of Object.keys(DEFAULT_PARAMS)) if (!p[g] || typeof p[g] !== "object") return null;
  return {
    params: clampParams(o.params, AI_RANGES as unknown as Record<string, Record<string, readonly number[]>>),
    explanation: typeof o.explanation === "string" ? o.explanation.trim().slice(0, 400) : "",
  };
}

/** 모델이 코드블록 등을 섞어 보내도 JSON만 꺼낸다. 실패하면 null */
export function extractJson(text: string): unknown | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch { /* 아래에서 중괄호 구간을 찾아본다 */ }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

/** AI에게 줄 프롬프트(연도 규칙 포함). 설명은 한국어. */
export function aiPresetPrompt(request: string, year: number) {
  const R = AI_RANGES;
  return {
    system:
      `You are an expert mastering engineer. [기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기와 트렌드는 ${year}년 기준으로 하세요. 과거 연도로 퇴행하지 마세요.] ` +
      `Analyze the user's sonic request and output precise DSP parameters plus a short technical explanation. WRITE THE EXPLANATION IN KOREAN (max 2 sentences). ` +
      `Respond with a single valid JSON value only, no markdown fences.`,
    user:
      `Sound request: "${request.slice(0, 400)}"\n\n` +
      `Return JSON exactly in this shape (numbers only, stay inside the ranges):\n` +
      `{"params":{` +
      `"eq":{"low":dB ${R.eq.low.join(" to ")},"mid":dB ${R.eq.mid.join(" to ")},"high":dB ${R.eq.high.join(" to ")},"q":mid-band Q ${R.eq.q.join(" to ")}},` +
      `"saturation":{"drive":${R.saturation.drive.join(" to ")},"harmonics":percent ${R.saturation.harmonics.join(" to ")}},` +
      `"compressor":{"threshold":dB ${R.compressor.threshold.join(" to ")},"ratio":${R.compressor.ratio.join(" to ")},"attack":ms ${R.compressor.attack.join(" to ")},"release":ms ${R.compressor.release.join(" to ")}},` +
      `"stereo":{"width":percent ${R.stereo.width.join(" to ")}},` +
      `"limiter":{"gain":dB boost ${R.limiter.gain.join(" to ")},"ceiling":dBFS ${R.limiter.ceiling.join(" to ")} (recommended -1.0),"release":ms ${R.limiter.release.join(" to ")}}` +
      `},"explanation":"한국어 설명"}`,
  };
}

/** 슬라이더 값 표시용 */
export const fmt = (v: number, step: number) => (step < 1 ? v.toFixed(1) : String(Math.round(v)));
