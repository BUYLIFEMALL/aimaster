import "server-only";

const SUNO_BASE = "https://api.sunoapi.org";
export const DEFAULT_SUNO_MODEL = "V4_5";

export interface RequestSunoGenerationInput {
  prompt: string; // 보컬판: 가사 전문 / 인스트루멘탈판: BGM 프롬프트
  title: string;
  styleDescription: string;
  excludeStyles: string;
  instrumental: boolean;
  model?: string;
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
