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
  const siteUrl = SUNO_CALLBACK_ORIGIN;

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
      defaultParamFlag: true, // 2026-10-21 문서에는 없지만 예전 실험(위 주석)에서 있어야 안정적이었다. 모르는 항목은 무시된다.
      audioId: input.audioId,
      ...(input.sourceTaskId ? { taskId: input.sourceTaskId } : {}),
      continueAt: input.continueAt,
      style: input.styleDescription.slice(0, 1000),
      title: input.title.slice(0, 100),
      instrumental: input.instrumental,
      ...(input.instrumental || !input.prompt ? {} : { prompt: input.prompt.slice(0, 5000) }),
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

export interface RequestSunoVocalRemovalInput {
  audioId: string; // 보컬/반주 분리할 오디오의 Suno ID (music_track_variants.suno_audio_id)
  // 2026-10-21 문서: 기존 Suno 곡을 쓸 때 taskId와 audioId가 「둘 다 필수」다(예전 코드는 audioId만 보냈다).
  sourceTaskId: string; // 원곡 생성 작업 ID (music_tracks.task_id)
}

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
      type: "separate_vocal",
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
    vocal_removal_info?: {
      vocal_url?: string;
      instrumental_url?: string;
      origin_url?: string;
    };
  };
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

/** 문서와 실제 응답이 달랐던 이력이 있어(위 주석 참고) 여러 경로를 순서대로 확인한다. */
export function extractSunoWavUrl(payload: SunoWavCallbackPayload): string | undefined {
  return payload.data?.audioWavUrl || payload.data?.response?.audioWavUrl;
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
