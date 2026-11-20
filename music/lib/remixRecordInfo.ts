// 리믹스 결과 조회(record-info) — 음악 전용, 곡별 가사(prompt)까지 읽는다(2026-11-20 리믹스 가사 1차, Master msg_66e3a3384a9e·msg_5b192173fc65).
// 공용 기준 코드 lib/ai/suno.ts의 checkSunoGenerationStatus와 **같은 계약**(같은 주소·같은 요청 1회·키 없으면 예외·HTTP 오류면 예외·
// 상태 3가지 판정·빈 결과는 실패·시간 제한 없음)을 따르고, 곡별 결과에 prompt(문자열일 때만)를 더한다. 공용 파일·사본은 바꾸지 않는다.
// 아직 어디에도 연결하지 않는다. 런타임에 다른 모듈을 불러오지 않는다(server-only 파일과 분리, 시험에서 바로 불러오기 위해).
import type { SunoCallbackItem, SunoPollResult } from "@/lib/ai/suno";

export type RemixRecordItem = SunoCallbackItem & { prompt?: string };
export type RemixPollResult =
  | { state: "processing" }
  | { state: "ready"; tracks: RemixRecordItem[] }
  | { state: "failed"; error: string };

type RawItem = {
  id?: string;
  audioUrl?: string;
  audio_url?: string;
  streamAudioUrl?: string;
  stream_audio_url?: string;
  imageUrl?: string;
  image_url?: string;
  title?: string;
  duration?: number;
  prompt?: unknown;
};

/** record-info 응답 본문 → 결과. 판정·매핑은 checkSunoGenerationStatus와 같고 prompt만 더한다. */
export function parseRemixRecordInfo(data: { code?: number; data?: { status?: string; errorMessage?: string; response?: { sunoData?: RawItem[] } } }): RemixPollResult {
  const status = data.data?.status ?? "";
  if (status === "SUCCESS") {
    const sunoData = data.data?.response?.sunoData ?? [];
    const tracks: RemixRecordItem[] = sunoData.map((t) => {
      const item: RemixRecordItem = {
        id: t.id,
        audio_url: t.audioUrl ?? t.audio_url,
        stream_audio_url: t.streamAudioUrl ?? t.stream_audio_url,
        image_url: t.imageUrl ?? t.image_url,
        title: t.title,
        duration: t.duration,
      };
      if (typeof t.prompt === "string") item.prompt = t.prompt; // 문서상 후보 칸만, 문자열일 때만(그 밖 칸은 읽지 않음)
      return item;
    });
    if (tracks.length === 0) return { state: "failed", error: "Suno가 완료됐지만 오디오 URL을 찾지 못했습니다." };
    return { state: "ready", tracks };
  }
  if (status.includes("FAILED") || status === "SENSITIVE_WORD_ERROR" || status === "CALLBACK_EXCEPTION") {
    return { state: "failed", error: data.data?.errorMessage || `생성 실패 (${status})` };
  }
  return { state: "processing" };
}

export interface RemixRecordInfoDeps {
  fetch: typeof fetch;
  statusHint: (status: number) => string; // lib/ai/suno.ts의 sunoStatusHint를 호출부가 넘긴다
  base?: string;
}

/** checkSunoGenerationStatus와 같은 요청·오류 계약. */
export async function requestRemixRecordInfo(taskId: string, apiKey: string, deps: RemixRecordInfoDeps): Promise<RemixPollResult> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }
  const base = deps.base ?? "https://api.sunoapi.org";
  const response = await deps.fetch(`${base}/api/v1/generate/record-info?taskId=${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 상태 조회에 실패했습니다. (${response.status})${deps.statusHint(response.status)} ${errorBody}`);
  }
  return parseRemixRecordInfo(await response.json());
}

/** 공용 결과 형식으로 되돌림(prompt 제거) — 연결 전 비교·호환용 */
export function toSunoPollResult(r: RemixPollResult): SunoPollResult {
  if (r.state !== "ready") return r;
  return {
    state: "ready",
    tracks: r.tracks.map((t) => {
      const rest: RemixRecordItem = { ...t };
      delete rest.prompt;
      return rest;
    }),
  };
}
