import "server-only";
import { DEFAULT_SUNO_MODEL, checkSunoGenerationStatus, requestSunoGeneration } from "@/lib/ai/suno";

// 2026-10-23 v1.39: 자체 Suno 코드(V4_5 고정 — sunoapi.org에서 V5_5 이하는 지원 종료)를
// 공용 기준 코드 사본(src/lib/ai/suno.ts, 기준 music/lib/ai/suno.ts)으로 바꿨다. 모델은 공용 기본값(V6).
// 이 파일은 기존 호출부(lib/actions/music.ts)가 그대로 쓰도록 함수 이름·결과 모양만 유지한다.

// 쇼츠는 폴링으로 완료를 확인한다. 콜백 주소는 예전처럼 메인 사이트로 둔다(실제 처리와 무관).
const CALLBACK_ORIGIN = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export interface RequestMusicInput {
  title: string;
  bgmPrompt: string;
  style: string;
  negativeTags: string;
}

/** Suno에 BGM 생성을 요청하고 taskId를 받는다. 실제 생성은 비동기라 별도로 폴링해야 한다. */
export async function requestBackgroundMusic(input: RequestMusicInput, apiKey: string): Promise<string> {
  return requestSunoGeneration(
    {
      prompt: input.bgmPrompt,
      title: input.title,
      styleDescription: input.style,
      excludeStyles: input.negativeTags,
      instrumental: true,
      model: DEFAULT_SUNO_MODEL,
      callbackOrigin: CALLBACK_ORIGIN,
    },
    apiKey,
  );
}

export interface MusicTrack {
  audioUrl: string;
  imageUrl: string | null;
  title: string | null;
  durationSeconds: number | null;
}

export type MusicGenerationStatus =
  | { state: "processing" }
  | { state: "ready"; tracks: MusicTrack[] }
  | { state: "failed"; error: string };

/** taskId로 생성 상태를 조회한다. 완료(SUCCESS)면 트랙 목록(보통 2개)을 반환한다. */
export async function checkMusicGenerationStatus(
  taskId: string,
  apiKey: string,
): Promise<MusicGenerationStatus> {
  const result = await checkSunoGenerationStatus(taskId, apiKey);
  if (result.state !== "ready") return result;

  const tracks: MusicTrack[] = result.tracks
    .map((t) => ({
      audioUrl: t.audio_url || t.stream_audio_url || "",
      imageUrl: t.image_url ?? null,
      title: t.title ?? null,
      durationSeconds: t.duration ?? null,
    }))
    .filter((t) => t.audioUrl);
  if (tracks.length === 0) {
    return { state: "failed", error: "Suno가 완료됐지만 오디오 URL을 찾지 못했습니다." };
  }
  return { state: "ready", tracks };
}
