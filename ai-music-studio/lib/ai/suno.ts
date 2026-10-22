import "server-only";
import type { VocalGender } from "@/types/database.types";

// 2026-10-16 옛 vercel.app 삭제 대비: Suno 콜백은 요청마다 주소를 넘기므로 옛 주소 환경변수 대신 새 주소(같은 서버)로 고정한다.
const SUNO_CALLBACK_ORIGIN = "https://music-automation.buylife.xyz";

const SUNO_BASE = "https://api.sunoapi.org";
// 2026-10-21 sunoapi.org 최신 문서(docs/SUNOAPI_REFERENCE.md §1): V6 계열이 현재 모델, V5_5 이하는 지원 종료(하위 호환).
// 곡 연장은 원곡과 같은 모델이어야 해서 연장 요청에는 원곡의 suno_model을 그대로 넘긴다.
export const SUNO_MODELS = [
  { id: "V6", label: "V6 (기본·권장)", description: "표현력, 자연스러운 보컬, 풍부한 디테일" },
  { id: "V6_WILD", label: "V6 Wild", description: "더 대담하고 실험적인 표현" },
  { id: "V6_MINI", label: "V6 Mini", description: "가볍고 빠름, 품질과 속도의 균형" },
] as const;
export type SunoModel = (typeof SUNO_MODELS)[number]["id"];
export const DEFAULT_SUNO_MODEL: SunoModel = "V6";
export function isSunoModel(v: unknown): v is SunoModel {
  return SUNO_MODELS.some((m) => m.id === v);
}

/** 결과 다양성(variety, 0~4 정수, 문서 기본 1)과 가중치(0~1, 소수 둘째 자리)를 문서 범위로 맞춘다. */
export function clampVariety(v: unknown): number | undefined {
  const n = typeof v === "number" ? Math.round(v) : NaN;
  return Number.isFinite(n) ? Math.min(4, Math.max(0, n)) : undefined;
}
export function clampWeight(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.round(Math.min(1, Math.max(0, n)) * 100) / 100 : undefined;
}

/** 모델별 글자 수 한도(문서 §1). 넘기면 413/400으로 거절되므로 보내기 전에 자른다. */
function limitsFor(model: string) {
  return model === "V4" ? { prompt: 3000, style: 200, negative: 1000 } : { prompt: 5000, style: 1000, negative: 1000 };
}

/** sunoapi.org 응답 코드(문서 §4)를 회원이 알아볼 수 있는 한국어 안내로 바꾼다. */
export function sunoStatusHint(status: number): string {
  switch (status) {
    case 401:
      return " Suno API 키를 확인해 주세요(설정 > API 키 등록).";
    case 405:
    case 430:
      return " 요청이 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.";
    case 413:
      return " 가사나 스타일이 너무 깁니다. 줄여서 다시 시도해 주세요.";
    case 429:
      return " sunoapi.org 크레딧이 부족합니다. sunoapi.org에서 충전해 주세요.";
    case 455:
      return " sunoapi.org가 점검 중입니다. 잠시 뒤 다시 시도해 주세요.";
    default:
      return "";
  }
}

/** "혼성"/미지정은 Suno API의 vocalGender 파라미터가 지원하지 않으므로 undefined로 둔다. */
export function toSunoVocalGender(gender: VocalGender | null): "m" | "f" | undefined {
  if (gender === "남성") return "m";
  if (gender === "여성") return "f";
  return undefined;
}

/**
 * Suno가 웹훅/폴링으로 보내는 원문 에러 메시지를 사용자가 이해하기 쉬운 한글 안내로 바꾼다.
 * 알려진 패턴이 아니면 원문을 그대로 반환한다.
 *
 * "File fetch failed. Check access settings..." — 2026-08-29, 곡 완성 직후(약 1~2분 이내)
 * 연장(extend)을 시도했다가 Suno 서버 쪽에서 방금 만든 원본 오디오를 아직 못 찾아서 나는
 * 것으로 추정되는 오류를 확인했다(요청 자체는 defaultParamFlag:true로 이미 검증된 안전한
 * 형식이라 우리 쪽 파라미터 문제는 아님). 재현 확정은 아니라 원문도 함께 보여준다.
 */
export function translateSunoErrorMessage(raw: string): string {
  if (/file fetch failed/i.test(raw)) {
    return `원본 곡을 아직 Suno 서버에서 찾지 못했습니다(방금 생성된 곡이면 1~2분 정도 기다렸다가 다시 연장을 시도해주세요). 원본 오류: ${raw}`;
  }
  // 2026-10-21: Suno 영어 실패 문구를 한국어 안내로(원문은 뒤에 남김)
  if (/internal error/i.test(raw)) {
    return `Suno 서버 내부 오류로 실패했습니다. 크레딧은 환불되니 잠시 뒤 다시 시도해 주세요. (원문: ${raw})`;
  }
  if (/extending lyrics are empty|lyrics field/i.test(raw)) {
    return `Suno가 이어 부를 가사를 받아들이지 못했습니다. 크레딧은 환불되니 다시 시도해 주세요. (원문: ${raw})`;
  }
  if (/credits refunded/i.test(raw)) {
    return `Suno 작업이 실패했습니다. 크레딧은 환불됩니다. (원문: ${raw})`;
  }
  return raw;
}

export interface RequestSunoGenerationInput {
  prompt: string; // 보컬판: 가사 전문 / 인스트루멘탈판: BGM 프롬프트
  title: string;
  styleDescription: string;
  excludeStyles: string;
  instrumental: boolean;
  model?: string;
  // Suno API가 지원하는 보컬 성별 파라미터("m"|"f" 둘 뿐, 듀엣은 없음) — style 텍스트 안의
  // 성별 묘사만으로는 가끔 반영이 안 되는 문제가 있어서, 있으면 이 파라미터도 같이 보내
  // 이중으로 보장한다(docs.sunoapi.org 확인, 2026-08-15). "혼성"이거나 미지정이면 보내지 않는다.
  vocalGender?: "m" | "f";
  // 2026-10-21 문서의 custom 모드 선택값(§2): 결과 다양성 0~4, 스타일 준수·실험성 가중치 0~1.
  variety?: number;
  styleWeight?: number;
  weirdnessConstraint?: number;
  // 2026-10-21 V6 2차 ③: 내 페르소나(같은 목소리·스타일)로 만들기 — personaModel=style_persona(V5·V5_5·V6 계열).
  personaId?: string;
  // 2026-10-23 공용 사본(AI 음악 스튜디오)이 자기 웹훅으로 결과 신호를 받도록 콜백 주소를 바꿀 수 있게 한다. 비우면 이 앱(음악(SUNO)자동화) 주소.
  callbackOrigin?: string;
}

/**
 * Suno(서드파티 프록시 api.sunoapi.org)에 곡 생성을 요청하고 taskId를 받는다.
 * 실제 생성은 비동기라 완료되면 callBackUrl(/api/webhooks/suno)로 결과가 온다
 * (shots/src/lib/ai/music.ts의 폴링 방식과 달리, music 서브프로젝트는 웹훅 콜백 방식을 쓴다).
 */
export async function requestSunoGeneration(input: RequestSunoGenerationInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }

  // 콜백은 이 앱(music) 자기 자신의 /api/webhooks/suno로 와야 한다 — NEXT_PUBLIC_MAIN_SITE_URL
  // (buylife.xyz, AIMaster 루트 사이트)이 아니라 NEXT_PUBLIC_SITE_URL(이 서브프로젝트의 배포
  // 주소)을 써야 한다. threads/insta_auto_poster의 OAuth 콜백과 동일한 구분 원칙.
  const siteUrl = input.callbackOrigin ?? SUNO_CALLBACK_ORIGIN;

  const model = input.model ?? DEFAULT_SUNO_MODEL;
  const limit = limitsFor(model);
  const variety = clampVariety(input.variety);
  const styleWeight = clampWeight(input.styleWeight);
  const weirdness = clampWeight(input.weirdnessConstraint);
  const response = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      // custom 모드의 prompt는 그대로 가사로 불린다(연주곡은 BGM 설명). 문서상 lyrics가 있으면 lyrics가 우선이지만,
      // prompt만으로 모든 모델에서 같게 동작해 기존처럼 prompt 하나로 보낸다. 모델별 글자 수 한도에 맞춰 자른다.
      prompt: input.prompt.slice(0, limit.prompt),
      style: input.styleDescription.slice(0, limit.style),
      title: input.title.slice(0, 80),
      customMode: true,
      instrumental: input.instrumental,
      model,
      negativeTags: input.excludeStyles.slice(0, limit.negative),
      ...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
      ...(variety != null ? { variety } : {}),
      ...(styleWeight != null ? { styleWeight } : {}),
      ...(weirdness != null ? { weirdnessConstraint: weirdness } : {}),
      ...(input.personaId ? { personaId: input.personaId, personaModel: "style_persona" } : {}),
      callBackUrl: `${siteUrl}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 생성 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno 생성 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
}

export interface RequestSunoExtendInput {
  audioId: string; // 연장할 특정 오디오의 Suno ID (music_track_variants.suno_audio_id)
  continueAt: number; // 몇 초 지점부터 이어붙일지(0보다 크고 원본 길이보다 작아야 함)
  title: string;
  styleDescription: string;
  excludeStyles?: string;
  instrumental: boolean;
  // 2026-10-21 문서 갱신: extend의 prompt·lyrics는 이제 이어 붙일 구간의 「가사」로 불린다(예전 문서는 "연장 방향 설명"이었다).
  // 그래서 영어 지시문이 아니라 generateExtendLyrics()로 만든 새 가사 구간을 넣는다. 연주곡이면 보내지 않는다.
  prompt?: string;
  sourceTaskId?: string; // 원곡 생성 작업 ID(문서상 선택값 — 함께 보내면 원곡을 정확히 가리킨다)
  vocalGender?: "m" | "f";
  model?: string;
}

/**
 * extend API의 prompt(보컬판에만 보낸다 — 문서상 instrumental:true면 prompt 제공 자체가
 * 금지됨)에 넣을 "어떻게 이어붙일지" 설명 문장을 만든다. 처음엔 원곡 가사 전문
 * (original.prompt_text)을 그대로 재사용했는데, 문서를 다시 정확히 읽어보니 extend의
 * prompt는 원곡 재전송이 아니라 이어붙는 방향에 대한 지시문이었다(2026-08-15, 사용자가
 * "가사는 동일할텐데?"라고 지적해서 재확인 후 발견) — 원곡 가사를 그대로 보내면 Suno가
 * 이미 있는 내용을 반복하거나 요청 의도를 오해할 수 있다.
 */
/** @deprecated 2026-10-21부터 연장 prompt는 가사로 불린다 — generateExtendLyrics()를 쓴다. 쓰는 곳 없음(이력 보존용). */
export function buildExtendDirection(lang: string): string {
  return `Continue this song naturally into a new section (an additional verse, bridge, or outro) that fits the same story, emotion, and musical style as before, written in ${lang}. Do not repeat the existing lyrics verbatim.`;
}

/**
 * Suno `/api/v1/generate/extend` — 이미 완성된 곡(특정 audioId)을 이어서 연장한다.
 * 처음엔 defaultParamFlag:false(원본 파라미터 자동 재사용)로 구현했는데 실제로 호출해보니
 * "Audio generation failed, please try again later." 로 계속 실패했다(2026-08-15,
 * 웹훅 콜백에 실린 msg를 그대로 저장해둔 걸 확인). generate/generate 재생성처럼 defaultParamFlag:
 * true로 continueAt/style/title/prompt를 전부 명시적으로 넘기는 방식이 우리가 이미 쓰고 있는
 * 다른 Suno 호출들과 동일하게 안정적으로 동작해서 이 방식으로 바꿨다.
 */
export async function requestSunoExtend(input: RequestSunoExtendInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const siteUrl = SUNO_CALLBACK_ORIGIN;

  const response = await fetch(`${SUNO_BASE}/api/v1/generate/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      // 2026-10-21: 최신 문서에 없는 defaultParamFlag는 V6 연장에서 빼 본다(있으면 V6가 우리 가사를 읽지 않는 것으로 의심 —
      // 3회 연속 "extending lyrics are empty…" 실패). 예전 V5_5 곡 연장은 원곡 모델로 가므로 그때만 남긴다.
      ...(input.model && !input.model.startsWith("V6") ? { defaultParamFlag: true } : {}),
      audioId: input.audioId,
      ...(input.sourceTaskId ? { taskId: input.sourceTaskId } : {}),
      continueAt: input.continueAt,
      style: input.styleDescription.slice(0, 1000),
      title: input.title.slice(0, 100),
      instrumental: input.instrumental,
      // 2026-10-21 실제 호출: V6 연장에서 prompt만 보내면 "extending lyrics are empty… check the lyrics field"로 실패(크레딧 환불).
      // V6 계열은 lyrics 칸을 읽으므로 같은 가사를 prompt·lyrics 둘 다에 넣는다(옛 모델은 prompt를 읽음).
      ...(input.instrumental || !input.prompt
        ? {}
        : (() => {
            // GPT가 줄 끝에 공백 두 칸(마크다운 줄바꿈)을 붙여 「malformed」로 거절되는 것을 막는다(2026-10-21 실호출 원인 조사).
            const lyrics = input.prompt
              .split("\n")
              .map((l) => l.trimEnd())
              .join("\n")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
              .slice(0, 5000);
            return { prompt: lyrics, lyrics };
          })()),
      ...(input.excludeStyles ? { negativeTags: input.excludeStyles.slice(0, 1000) } : {}),
      ...(input.vocalGender && !input.instrumental ? { vocalGender: input.vocalGender } : {}),
      model: input.model ?? DEFAULT_SUNO_MODEL,
      callBackUrl: `${siteUrl}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 연장 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno 연장 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
}

export interface RequestSunoReplaceSectionInput {
  sourceTaskId: string; // 원곡 생성 작업 ID
  audioId: string; // 다시 만들 곡의 Suno 오디오 ID
  title: string;
  tags: string; // 스타일
  negativeTags?: string;
  sectionLyrics: string; // 바꿀 구간에서 부를 가사(연주곡이면 구간 설명)
  fullLyrics: string; // 바뀐 구간을 넣은 곡 전체 가사
  startS: number;
  endS: number;
  vocalGender?: "m" | "f";
  personaId?: string;
}

/**
 * Suno `/api/v1/generate/replace-section` — 완성곡의 한 구간(10초 이상·곡 길이 50% 이하)만 새로 만든다(2026-10-21 V6 2차 ④).
 * 기존 곡 모드: taskId+audioId를 보내고 model·uploadUrl은 보내지 않는다. 콜백은 곡 생성과 같은 형식이라 /api/webhooks/suno가 받는다.
 */
export async function requestSunoReplaceSection(input: RequestSunoReplaceSectionInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  // 연장과 같은 이유로 줄 끝 공백·빈 줄을 정리한다(「malformed」 거절 방지).
  const clean = (t: string) =>
    t
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 5000);
  const sectionLyrics = clean(input.sectionLyrics);
  const response = await fetch(`${SUNO_BASE}/api/v1/generate/replace-section`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      taskId: input.sourceTaskId,
      audioId: input.audioId,
      prompt: sectionLyrics,
      lyrics: sectionLyrics,
      tags: input.tags.slice(0, 1000),
      title: input.title.slice(0, 100),
      infillStartS: Math.round(input.startS * 100) / 100,
      infillEndS: Math.round(input.endS * 100) / 100,
      fullLyrics: clean(input.fullLyrics),
      ...(input.negativeTags ? { negativeTags: input.negativeTags.slice(0, 1000) } : {}),
      ...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
      ...(input.personaId ? { personaId: input.personaId, personaModel: "style_persona" } : {}),
      callBackUrl: `${SUNO_CALLBACK_ORIGIN}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 구간 다시 만들기 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }
  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno 구간 다시 만들기 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}${sunoStatusHint(data.code)}`);
  }
  return data.data.taskId;
}

// 2026-10-21 Suno V6 3차 ⑦⑧: Suno 커버 이미지·뮤직비디오(MP4). 두 기능 모두 결과를 /api/webhooks/suno-media로 받는다.
export type SunoMediaKind = "suno_cover" | "video";

/**
 * Suno `/api/v1/suno/cover/generate` — 곡 작업(taskId)의 커버 이미지(보통 2장). 곡 작업당 1번만 가능하며,
 * 이미 만든 곡이면 400과 기존 작업 번호를 돌려준다 → 그 번호를 그대로 받아 결과를 이어 받는다.
 */
export async function requestSunoCover(sourceTaskId: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  const response = await fetch(`${SUNO_BASE}/api/v1/suno/cover/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ taskId: sourceTaskId, callBackUrl: `${SUNO_CALLBACK_ORIGIN}/api/webhooks/suno-media` }),
  });
  const data = (await response.json().catch(() => null)) as { code?: number; msg?: string; data?: { taskId?: string } } | null;
  if (data?.data?.taskId && (data.code === 200 || data.code === 400)) return data.data.taskId;
  const code = data?.code ?? response.status;
  throw new Error(`Suno 커버 요청이 실패했습니다. (${code})${sunoStatusHint(code)} ${data?.msg ?? ""}`.trim());
}

/** Suno `/api/v1/mp4/generate` — 특정 곡(taskId+audioId)의 뮤직비디오 MP4. author·domainName은 영상에 표시되는 이름(각 50자). */
export async function requestSunoVideo(
  input: { sourceTaskId: string; audioId: string; author?: string },
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  const author = input.author?.trim().slice(0, 50);
  const response = await fetch(`${SUNO_BASE}/api/v1/mp4/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      taskId: input.sourceTaskId,
      audioId: input.audioId,
      ...(author ? { author } : {}),
      callBackUrl: `${SUNO_CALLBACK_ORIGIN}/api/webhooks/suno-media`,
    }),
  });
  const data = (await response.json().catch(() => null)) as { code?: number; msg?: string; data?: { taskId?: string } } | null;
  if (data?.code === 200 && data.data?.taskId) return data.data.taskId;
  const code = data?.code ?? response.status;
  throw new Error(`Suno 뮤직비디오 요청이 실패했습니다. (${code})${sunoStatusHint(code)} ${data?.msg ?? ""}`.trim());
}

export type SunoMediaPollResult =
  | { status: "pending" }
  | { status: "completed"; urls: string[] }
  | { status: "failed"; message: string };

/** 결과가 콜백으로 오지 않았을 때 상태 조회(/suno/cover/record-info, /mp4/record-info). 응답 칸 이름이 문서마다 달라 여러 이름을 함께 읽는다. */
export async function checkSunoMediaStatus(kind: SunoMediaKind, taskId: string, apiKey: string): Promise<SunoMediaPollResult> {
  const path = kind === "suno_cover" ? "/api/v1/suno/cover/record-info" : "/api/v1/mp4/record-info";
  const response = await fetch(`${SUNO_BASE}${path}?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as { code?: number; msg?: string; data?: Record<string, unknown> } | null;
  const d = (body?.data ?? {}) as Record<string, unknown>;
  const resp = (d.response ?? {}) as Record<string, unknown>;
  const state = String(d.successFlag ?? d.status ?? "");
  const pick = (...vals: unknown[]) => vals.find((v) => v != null);
  const urls =
    kind === "suno_cover"
      ? ((pick(resp.images, d.images) as string[] | undefined) ?? [])
      : [pick(resp.videoUrl, resp.video_url, d.videoUrl, d.video_url) as string | undefined].filter((u): u is string => !!u);
  if (urls.length) return { status: "completed", urls };
  // 커버: successFlag 0 대기·1 성공·2 생성 중·3 실패 / 영상: PENDING·SUCCESS·CREATE_TASK_FAILED·GENERATE_MP4_FAILED·CALLBACK_EXCEPTION
  // (CALLBACK_EXCEPTION은 콜백만 실패한 경우라 위에서 영상 주소가 있으면 이미 완료로 처리된다)
  if (state === "3" || /FAILED|EXCEPTION/.test(state) || (body?.code && body.code !== 200)) {
    return { status: "failed", message: String(d.errorMessage ?? body?.msg ?? "Suno가 결과를 만들지 못했습니다.") };
  }
  return { status: "pending" };
}

export interface RequestSunoRemixInput {
  uploadUrl: string; // 리믹스할 원곡 오디오 URL(업로드본 또는 기존 variant의 audio_url)
  title: string; // Suno title(예: "{원곡 제목} Remix")
  styleDescription: string; // GPT가 만든 이번 리믹스 스타일
  prompt?: string; // 가사(보컬판일 때만 — instrumental이면 보내지 않는다)
  instrumental: boolean;
  styleWeight?: number; // 0~1
  weirdnessConstraint?: number; // 0~1
  audioWeight?: number; // 0~1
  vocalGender?: "m" | "f";
  model?: string;
  // Suno 문서상 "duration"은 선택값이고 V5_5 + customMode:true에서만 적용되며 범위는 10~360초다.
  // 실제로 호출해보니(2026-08-17) 이 값을 안 넣으면 원곡이 3분짜리여도 결과가 33초짜리로 아주
  // 짧게 나오는 문제가 있었다(문서에 이 기본 동작이 명시돼 있지 않아 실사용 테스트로 발견) —
  // 그래서 항상 명시적으로 넘긴다.
  durationSeconds: number;
}

/**
 * Suno `/api/v1/generate/upload-cover` — 업로드한(또는 기존에 생성한) 오디오를 새 스타일로
 * 커버/리믹스한다. docs.sunoapi.org로 콜백 페이로드를 확인한 결과 /generate와 완전히 동일한
 * {code, msg, data:{callbackType, task_id, data:[...]}} 구조(text→first→complete)라서, 별도
 * 웹훅 라우트를 만들지 않고 기존 /api/webhooks/suno가 task_id로 music_track_remixes도 함께
 * 조회하도록 확장했다(2026-08-17, Suno 공식 문서 확인 완료).
 */
export async function requestSunoRemix(input: RequestSunoRemixInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const siteUrl = SUNO_CALLBACK_ORIGIN;

  const response = await fetch(`${SUNO_BASE}/api/v1/generate/upload-cover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      uploadUrl: input.uploadUrl,
      style: input.styleDescription,
      title: input.title.slice(0, 80),
      customMode: true,
      instrumental: input.instrumental,
      model: input.model ?? DEFAULT_SUNO_MODEL,
      duration: input.durationSeconds,
      ...(input.instrumental ? {} : { prompt: input.prompt }),
      ...(input.styleWeight != null ? { styleWeight: input.styleWeight } : {}),
      ...(input.weirdnessConstraint != null ? { weirdnessConstraint: input.weirdnessConstraint } : {}),
      ...(input.audioWeight != null ? { audioWeight: input.audioWeight } : {}),
      ...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
      callBackUrl: `${siteUrl}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 리믹스 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno 리믹스 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
}

export type SunoRemixMode = "add_vocals" | "add_instrumental" | "mashup";

const REMIX_MODE_PATH: Record<SunoRemixMode, string> = {
  add_vocals: "/api/v1/generate/add-vocals",
  add_instrumental: "/api/v1/generate/add-instrumental",
  mashup: "/api/v1/generate/mashup",
};
const REMIX_MODE_LABEL: Record<SunoRemixMode, string> = {
  add_vocals: "보컬 추가",
  add_instrumental: "반주 추가",
  mashup: "매시업",
};
// 보컬·반주 추가는 negativeTags가 필수다(docs.sunoapi.org 2026-10-21). 회원이 따로 정하지 않으면 품질 저하 요소만 뺀다.
const DEFAULT_NEGATIVE_TAGS = "Low quality, Distorted, Noise";

export interface RequestSunoRemixModeInput {
  mode: SunoRemixMode;
  uploadUrls: string[]; // 보컬·반주 추가는 1개, 매시업은 2개(공개로 받을 수 있는 주소 — 서명 주소)
  title: string;
  style: string; // 반주 추가는 tags 칸으로 보낸다
  lyrics?: string; // 가사(없으면 prompt로 분위기 지시만)
  prompt?: string;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  model?: string;
  durationSeconds?: number; // 매시업만(10~360초)
}

/**
 * Suno V6 3차 ⑤⑥(2026-10-21): 보컬 추가(`/generate/add-vocals`)·반주 추가(`/generate/add-instrumental`)·
 * 매시업(`/generate/mashup`). 세 기능 모두 콜백이 곡 생성과 같은 형식(text→first→complete)이라
 * 리믹스와 같이 /api/webhooks/suno가 task_id로 music_track_remixes를 찾아 저장한다.
 */
export async function requestSunoRemixMode(input: RequestSunoRemixModeInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const label = REMIX_MODE_LABEL[input.mode];
  const style = input.style.slice(0, 1000);
  const common = {
    title: input.title.slice(0, 80),
    model: input.model ?? DEFAULT_SUNO_MODEL,
    ...(input.lyrics ? { lyrics: input.lyrics.slice(0, 5000) } : {}),
    ...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
    ...(input.styleWeight != null ? { styleWeight: input.styleWeight } : {}),
    ...(input.weirdnessConstraint != null ? { weirdnessConstraint: input.weirdnessConstraint } : {}),
    ...(input.audioWeight != null ? { audioWeight: input.audioWeight } : {}),
    callBackUrl: `${SUNO_CALLBACK_ORIGIN}/api/webhooks/suno`,
  };
  const negativeTags = (input.negativeTags?.trim() || DEFAULT_NEGATIVE_TAGS).slice(0, 1000);
  let body: Record<string, unknown>;
  if (input.mode === "mashup") {
    if (input.uploadUrls.length !== 2) throw new Error("매시업은 원곡 2곡이 필요합니다.");
    body = {
      ...common,
      uploadUrlList: input.uploadUrls,
      style,
      ...(input.prompt && !input.lyrics ? { prompt: input.prompt.slice(0, 5000) } : {}),
      ...(input.durationSeconds ? { duration: input.durationSeconds } : {}),
    };
  } else if (input.mode === "add_vocals") {
    body = {
      ...common,
      uploadUrl: input.uploadUrls[0],
      style,
      negativeTags,
      ...(input.prompt && !input.lyrics ? { prompt: input.prompt.slice(0, 5000) } : {}),
    };
  } else {
    body = { ...common, uploadUrl: input.uploadUrls[0], tags: style, negativeTags };
  }

  const response = await fetch(`${SUNO_BASE}${REMIX_MODE_PATH[input.mode]}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno ${label} 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }
  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno ${label} 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}${sunoStatusHint(data.code)}`);
  }
  return data.data.taskId;
}

export interface RequestSunoVocalRemovalInput {
  audioId: string; // 보컬/반주 분리할 오디오의 Suno ID (music_track_variants.suno_audio_id)
  // 2026-10-21 문서: 기존 Suno 곡을 쓸 때 taskId와 audioId가 「둘 다 필수」다(예전 코드는 audioId만 보냈다).
  sourceTaskId: string; // 원곡 생성 작업 ID (music_tracks.task_id)
  // 2026-10-21 V6 1차 ②: separate_vocal(MR, 10크레딧) | split_stem(악기별 최대 12트랙, 50크레딧 — 다시 요청해도 매번 과금).
  type?: "separate_vocal" | "split_stem";
}

/** split_stem 콜백의 vocal_removal_info 항목 이름(문서 2026-10-21)과 화면 이름표. */
export const SUNO_STEMS = [
  { key: "vocal", label: "리드 보컬" },
  { key: "backing_vocals", label: "백보컬" },
  { key: "drums", label: "드럼" },
  { key: "bass", label: "베이스" },
  { key: "guitar", label: "기타" },
  { key: "keyboard", label: "키보드" },
  { key: "percussion", label: "퍼커션" },
  { key: "strings", label: "현악기" },
  { key: "synth", label: "신스" },
  { key: "fx", label: "효과음(FX)" },
  { key: "brass", label: "금관악기" },
  { key: "woodwinds", label: "목관악기" },
] as const;

/**
 * Suno `/api/v1/vocal-removal/generate` — "MR(보컬제거) 만들기". type을 지정 안 하면
 * 기본값 "separate_vocal"이라 보컬(vocal_url)/반주(instrumental_url) 딱 두 트랙만 돌려준다
 * (split_stem 계열은 악기별로 더 세분화하는데, 우리가 원하는 건 MR 한 장이라 필요 없다).
 * 이 API의 웹훅 콜백은 generate/extend와 페이로드 구조가 완전히 달라서(callbackType도,
 * data 배열도 없음) 별도 웹훅 라우트(/api/webhooks/suno-vocal-removal)에서 처리한다.
 */
export async function requestSunoVocalRemoval(input: RequestSunoVocalRemovalInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const siteUrl = SUNO_CALLBACK_ORIGIN;

  const response = await fetch(`${SUNO_BASE}/api/v1/vocal-removal/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      taskId: input.sourceTaskId,
      audioId: input.audioId,
      type: input.type ?? "separate_vocal",
      callBackUrl: `${siteUrl}/api/webhooks/suno-vocal-removal`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno MR 생성 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno MR 생성 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
}

// vocal-removal 웹훅 콜백 페이로드(docs.sunoapi.org 확인 완료) — generate/extend와 달리
// callbackType이나 data 배열이 없고, vocal_removal_info 안에 바로 URL이 들어온다.
export interface SunoVocalRemovalCallbackPayload {
  code: number;
  msg?: string;
  data?: {
    task_id?: string;
    // separate_vocal: instrumental_url·vocal_url / split_stem: vocal_url·backing_vocals_url·drums_url … (SUNO_STEMS의 key + "_url")
    vocal_removal_info?: {
      vocal_url?: string;
      instrumental_url?: string;
      origin_url?: string;
      [stemUrl: string]: string | undefined;
    };
  };
}

export type SunoVocalRemovalPollResult =
  | { state: "processing" }
  | { state: "ready"; info: Record<string, string | undefined> }
  | { state: "failed"; error: string };

/**
 * `GET /api/v1/vocal-removal/record-info` — 콜백을 그대로 믿지 않고 회원 키로 결과를 다시 받는다(2026-10-22).
 * 실제 응답(2026-10-22 확인): successFlag "SUCCESS", response에 vocalUrl·instrumentalUrl·backingVocalsUrl… 낙타 표기.
 * 콜백(vocal_removal_info)과 같은 밑줄 표기(vocal_url·backing_vocals_url…)로 바꿔 돌려준다.
 */
export async function checkSunoVocalRemovalStatus(taskId: string, apiKey: string): Promise<SunoVocalRemovalPollResult> {
  const response = await fetch(`${SUNO_BASE}/api/v1/vocal-removal/record-info?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Suno 분리 상태 조회에 실패했습니다. (${response.status})${sunoStatusHint(response.status)}`);
  }
  const data = (await response.json()) as {
    data?: { successFlag?: string; errorMessage?: string | null; response?: Record<string, unknown> };
  };
  const flag = String(data.data?.successFlag ?? "");
  if (flag === "SUCCESS") {
    const info: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(data.data?.response ?? {})) {
      if (!key.endsWith("Url") || typeof value !== "string" || !value) continue;
      info[`${key.slice(0, -3).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}_url`] = value;
    }
    return { state: "ready", info };
  }
  if (/FAILED|EXCEPTION/.test(flag)) {
    return { state: "failed", error: data.data?.errorMessage || `분리 실패 (${flag})` };
  }
  return { state: "processing" };
}

export interface RequestSunoWavConversionInput {
  sourceTaskId: string; // 원곡 생성 당시의 taskId (music_tracks.task_id)
  audioId: string; // 변환할 특정 오디오의 Suno ID (music_track_variants.suno_audio_id)
}

/**
 * Suno `/api/v1/wav/generate` — mp3 결과물을 고음질 WAV로 변환한다. taskId+audioId 둘 다로
 * 원본 오디오를 특정해야 한다(vocal-removal/extend는 audioId만으로 충분했는데 이 API는 다르다
 * — 2026-08-15 문서 확인). 완료되면 새 taskId(변환 작업 자체의 id)로 웹훅이 오거나,
 * checkSunoWavConversionStatus()로 폴링할 수 있다(vocal-removal과 달리 이 API는 상태 조회
 * 엔드포인트가 있다).
 */
export async function requestSunoWavConversion(input: RequestSunoWavConversionInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const siteUrl = SUNO_CALLBACK_ORIGIN;

  const response = await fetch(`${SUNO_BASE}/api/v1/wav/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      taskId: input.sourceTaskId,
      audioId: input.audioId,
      callBackUrl: `${siteUrl}/api/webhooks/suno-wav`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno WAV 변환 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno WAV 변환 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
}

// wav 웹훅 콜백 페이로드. 문서 예시는 data.audioWavUrl 바로 아래로 나와 있는데, 실제로
// 받아보니 code:200 + msg:"All generated successfully."(성공 메시지)인데도 data.audioWavUrl이
// 비어 있어서 실패로 잘못 처리된 사례가 있었다(2026-08-15) — GET /wav/record-info 응답처럼
// data.response.audioWavUrl에 들어있을 가능성이 높아 두 경로를 모두 허용한다.
export interface SunoWavCallbackPayload {
  code: number;
  msg?: string;
  data?: {
    task_id?: string;
    audioWavUrl?: string;
    response?: { audioWavUrl?: string };
  };
}

export type SunoWavPollResult =
  | { state: "processing" }
  | { state: "ready"; wavUrl: string }
  | { state: "failed"; error: string };

/** 웹훅이 도달하지 못했을 때 대비한 수동 동기화 — vocal-removal과 달리 이 API는 상태 조회가 된다. */
export async function checkSunoWavConversionStatus(taskId: string, apiKey: string): Promise<SunoWavPollResult> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/wav/record-info?taskId=${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno WAV 상태 조회에 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as {
    code: number;
    data?: {
      successFlag?: string;
      errorMessage?: string;
      response?: { audioWavUrl?: string };
    };
  };

  const status = data.data?.successFlag ?? "";

  if (status === "SUCCESS") {
    const wavUrl = data.data?.response?.audioWavUrl;
    if (!wavUrl) {
      return { state: "failed", error: "Suno가 완료됐지만 WAV URL을 찾지 못했습니다." };
    }
    return { state: "ready", wavUrl };
  }

  if (status === "CREATE_TASK_FAILED" || status === "GENERATE_WAV_FAILED" || status === "CALLBACK_EXCEPTION") {
    return { state: "failed", error: data.data?.errorMessage || `WAV 변환 실패 (${status})` };
  }

  return { state: "processing" };
}

// ─────────────────────────────────────────────────────────────
// 웹훅 콜백 페이로드 타입 (docs.sunoapi.org 확인 완료).
// callbackType은 "text"(가사만 준비) → "first"(1곡 완료) → "complete"(2곡 모두 완료) 순으로
// 여러 번 온다. 우리는 "complete"일 때만 최종 저장 처리한다.
export interface SunoCallbackItem {
  id?: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  title?: string;
  duration?: number;
}

export interface SunoCallbackPayload {
  code: number;
  msg?: string;
  data?: {
    callbackType?: "text" | "first" | "complete" | "error";
    task_id?: string;
    data?: SunoCallbackItem[];
  };
}

// ─────────────────────────────────────────────────────────────
// 웹훅이 도달하지 못하는 경우(로컬 개발 환경, 혹은 배포 환경에서도 드물게 콜백 유실)를
// 대비한 수동 동기화용 폴링. shots/src/lib/ai/music.ts의 checkMusicGenerationStatus()와
// 동일한 record-info 엔드포인트를 쓴다.
export type SunoPollResult =
  | { state: "processing" }
  | { state: "ready"; tracks: SunoCallbackItem[] }
  | { state: "failed"; error: string };

export async function checkSunoGenerationStatus(taskId: string, apiKey: string): Promise<SunoPollResult> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 상태 조회에 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as {
    code: number;
    data?: {
      status?: string;
      errorMessage?: string;
      response?: {
        // 문서는 snake_case(audio_url…), 예전 실제 응답은 camelCase(audioUrl…) — 둘 다 읽는다(2026-10-21).
        sunoData?: {
          id?: string;
          audioUrl?: string;
          audio_url?: string;
          streamAudioUrl?: string;
          stream_audio_url?: string;
          imageUrl?: string;
          image_url?: string;
          title?: string;
          duration?: number;
        }[];
      };
    };
  };

  const status = data.data?.status ?? "";

  if (status === "SUCCESS") {
    const sunoData = data.data?.response?.sunoData ?? [];
    const tracks: SunoCallbackItem[] = sunoData.map((t) => ({
      id: t.id,
      audio_url: t.audioUrl ?? t.audio_url,
      stream_audio_url: t.streamAudioUrl ?? t.stream_audio_url,
      image_url: t.imageUrl ?? t.image_url,
      title: t.title,
      duration: t.duration,
    }));
    if (tracks.length === 0) {
      return { state: "failed", error: "Suno가 완료됐지만 오디오 URL을 찾지 못했습니다." };
    }
    return { state: "ready", tracks };
  }

  if (status.includes("FAILED") || status === "SENSITIVE_WORD_ERROR" || status === "CALLBACK_EXCEPTION") {
    return { state: "failed", error: data.data?.errorMessage || `생성 실패 (${status})` };
  }

  return { state: "processing" };
}

/**
 * Suno `/api/v1/generate/get-timestamped-lyrics` — 곡의 단어별 시작·끝 시간(콜백 없이 즉시 응답, 2026-10-21 V6 1차 기능).
 * 단어 안에 줄바꿈과 [Verse 1] 같은 구간 표시가 섞여 온다 — lib/sunoAlign.ts가 줄 단위로 묶는다. 연주곡은 가사가 없다.
 */
export async function requestSunoTimestampedLyrics(
  input: { sourceTaskId: string; audioId: string },
  apiKey: string,
): Promise<{ word: string; startS: number; endS: number; success?: boolean }[]> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const response = await fetch(`${SUNO_BASE}/api/v1/generate/get-timestamped-lyrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ taskId: input.sourceTaskId, audioId: input.audioId }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 시간 가사 요청이 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody.slice(0, 200)}`);
  }
  const data = (await response.json()) as {
    code: number;
    msg?: string;
    data?: { alignedWords?: { word: string; startS: number; endS: number; success?: boolean }[] };
  };
  if (data.code !== 200) {
    throw new Error(`Suno 시간 가사 요청이 실패했습니다:${sunoStatusHint(data.code)} ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data?.alignedWords ?? [];
}

/**
 * Suno `/api/v1/generate/generate-persona` — 완성된 곡(taskId+audioId)의 목소리·스타일을 페르소나로 만든다(콜백 없이 즉시 personaId).
 * 분석 구간 vocalStart~vocalEnd는 10~30초. 같은 오디오로는 한 번만 만들 수 있다(409). V4 이상 곡만. (2026-10-21 V6 2차 ③)
 */
export async function requestSunoPersona(
  input: { sourceTaskId: string; audioId: string; name: string; description: string; style?: string; vocalStart?: number; vocalEnd?: number },
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const response = await fetch(`${SUNO_BASE}/api/v1/generate/generate-persona`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      taskId: input.sourceTaskId,
      audioId: input.audioId,
      name: input.name.slice(0, 80),
      description: input.description.slice(0, 1000),
      ...(input.style ? { style: input.style.slice(0, 200) } : {}),
      ...(input.vocalStart != null && input.vocalEnd != null ? { vocalStart: input.vocalStart, vocalEnd: input.vocalEnd } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as { code?: number; msg?: string; data?: { personaId?: string } } | null;
  if (body?.code === 409 || response.status === 409) {
    throw new Error("이 곡으로는 이미 페르소나를 만들었습니다(곡 하나당 한 번만 가능). 내 페르소나 목록에서 고르거나 다른 곡으로 만들어 주세요.");
  }
  if (!response.ok || body?.code !== 200 || !body.data?.personaId) {
    const code = body?.code ?? response.status;
    throw new Error(`Suno 페르소나 생성이 실패했습니다. (${code})${sunoStatusHint(code)} ${body?.msg ?? ""}`.trim());
  }
  return body.data.personaId;
}

/**
 * Suno `/api/v1/generate/credit` — 본인 Suno API 키에 남은 크레딧(정수)을 조회한다.
 * 실제 생성 요청과 무관한 단순 조회라 곡 생성 흐름과 완전히 분리해서 설정 페이지에서만 쓴다.
 * (docs.sunoapi.org 확인 완료, 2026-08-17)
 */
export async function checkSunoCredits(apiKey: string): Promise<number> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 위에서 본인의 Suno API 키를 먼저 등록해주세요.");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/generate/credit`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 크레딧 조회에 실패했습니다. (${response.status})${sunoStatusHint(response.status)} ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg?: string; data?: number };
  if (data.code !== 200 || typeof data.data !== "number") {
    throw new Error(`Suno 크레딧 조회에 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data;
}
