import "server-only";
import type { VocalGender } from "@/types/database.types";

const SUNO_BASE = "https://api.sunoapi.org";
export const DEFAULT_SUNO_MODEL = "V5_5";

/** "혼성"/미지정은 Suno API의 vocalGender 파라미터가 지원하지 않으므로 undefined로 둔다. */
export function toSunoVocalGender(gender: VocalGender | null): "m" | "f" | undefined {
  if (gender === "남성") return "m";
  if (gender === "여성") return "f";
  return undefined;
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL 환경변수가 설정되지 않았습니다 (Suno 콜백 주소 생성에 필요).");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      prompt: input.prompt,
      style: input.styleDescription,
      title: input.title.slice(0, 80),
      customMode: true,
      instrumental: input.instrumental,
      model: input.model ?? DEFAULT_SUNO_MODEL,
      negativeTags: input.excludeStyles,
      ...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
      callBackUrl: `${siteUrl}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
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
  // /generate의 prompt(가사 전문)와 필드명은 같지만 의미가 다르다 — extend의 prompt는
  // "Description of how the music should be extended"(문서 예시: "Extend the music with
  // more relaxing notes")다. 원곡 가사를 그대로 다시 넣으면 안 된다 — buildExtendDirection()로
  // 만든 "이어붙이는 방향" 설명 문장을 넣을 것.
  prompt?: string;
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL 환경변수가 설정되지 않았습니다 (Suno 콜백 주소 생성에 필요).");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/generate/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      defaultParamFlag: true,
      audioId: input.audioId,
      continueAt: input.continueAt,
      style: input.styleDescription,
      title: input.title.slice(0, 80),
      instrumental: input.instrumental,
      ...(input.instrumental ? {} : { prompt: input.prompt }),
      ...(input.excludeStyles ? { negativeTags: input.excludeStyles } : {}),
      ...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
      model: input.model ?? DEFAULT_SUNO_MODEL,
      callBackUrl: `${siteUrl}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 연장 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno 연장 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
}

export interface RequestSunoVocalRemovalInput {
  audioId: string; // 보컬/반주 분리할 오디오의 Suno ID (music_track_variants.suno_audio_id)
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL 환경변수가 설정되지 않았습니다 (Suno 콜백 주소 생성에 필요).");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/vocal-removal/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      audioId: input.audioId,
      type: "separate_vocal",
      callBackUrl: `${siteUrl}/api/webhooks/suno-vocal-removal`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno MR 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
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
    callbackType?: "text" | "first" | "complete";
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
    throw new Error(`Suno 상태 조회에 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    code: number;
    data?: {
      status?: string;
      errorMessage?: string;
      response?: {
        sunoData?: {
          id?: string;
          audioUrl?: string;
          streamAudioUrl?: string;
          imageUrl?: string;
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
      audio_url: t.audioUrl,
      stream_audio_url: t.streamAudioUrl,
      image_url: t.imageUrl,
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
