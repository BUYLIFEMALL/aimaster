import "server-only";
import { DEFAULT_SUNO_MODEL, checkSunoGenerationStatus, requestSunoGeneration } from "@/lib/ai/suno";
import { callElevenLabsMusic, callLyria } from "@/lib/ai/musicCalls";
import { audioDurationSeconds } from "@/lib/audioDuration";
export { BGM_MODELS, DEFAULT_BGM_MODEL, isBgmModel, type BgmModelId } from "@/lib/bgmModels";

// 2026-10-23 v1.39: 자체 Suno 코드(V4_5 고정 — sunoapi.org에서 V5_5 이하는 지원 종료)를
// 공용 기준 코드 사본(src/lib/ai/suno.ts, 기준 music/lib/ai/suno.ts)으로 바꿨다. 모델은 공용 기본값(V6).
// 이 파일은 기존 호출부(lib/actions/music.ts)가 그대로 쓰도록 함수 이름·결과 모양만 유지한다.

// 쇼츠는 폴링으로 완료를 확인한다. 콜백 주소는 예전처럼 메인 사이트로 둔다(실제 처리와 무관).
const CALLBACK_ORIGIN = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 2026-10-23 v1.40 배경음악 모델 고르기(배경음악 공용화 4단계). Suno는 2곡·상태 확인(폴링), Lyria·ElevenLabs는 요청 안에서 1곡을 바로 받는다
// (공용 기준 코드 `music-sync-calls` 사본 `musicCalls.ts`). 모델·단가는 AI 음악 스튜디오 catalog와 같은 값.
// 모델 목록은 화면도 쓰므로 src/lib/bgmModels.ts(서버 전용 아님)에 둔다.
const BGM_SECONDS = 60;

export interface RequestMusicInput {
  title: string;
  bgmPrompt: string;
  style: string;
  negativeTags: string;
}

/** Suno에 BGM 생성을 요청하고 taskId를 받는다. 실제 생성은 비동기라 별도로 폴링해야 한다. */
export async function requestBackgroundMusic(input: RequestMusicInput, apiKey: string, model: string = DEFAULT_SUNO_MODEL): Promise<string> {
  return requestSunoGeneration(
    {
      prompt: input.bgmPrompt,
      title: input.title,
      styleDescription: input.style,
      excludeStyles: input.negativeTags,
      instrumental: true,
      model,
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

/** 연주곡 설명 한 문장(Lyria·ElevenLabs는 설명 하나만 받는다) */
function syncPrompt(input: RequestMusicInput): string {
  return [
    input.bgmPrompt.trim(),
    input.style.trim() && `Style: ${input.style.trim()}`,
    input.negativeTags.trim() && `Avoid: ${input.negativeTags.trim()}`,
    "Instrumental background music only, no vocals.",
    `Length: about ${BGM_SECONDS} seconds.`,
  ].filter(Boolean).join("\n\n").slice(0, 4000);
}

/** Lyria·ElevenLabs: 요청 안에서 연주곡 1곡을 바로 받는다(자동 재시도 없음 — 이중 과금 방지) */
export async function generateSyncBackgroundMusic(
  model: "lyria:lyria-3.5" | "elevenlabs:music_v2_5",
  input: RequestMusicInput,
  apiKey: string,
): Promise<{ data: Uint8Array; contentType: string; durationSeconds: number | null }> {
  if (model === "lyria:lyria-3.5") {
    const out = await callLyria({ model: "lyria-3.5", input: syncPrompt(input) }, apiKey);
    // v1.42 Lyria는 길이를 알려 주지 않아 파일 머리글로 계산(못 읽으면 null)
    return { data: out.data, contentType: out.contentType, durationSeconds: audioDurationSeconds(out.data, out.contentType) };
  }
  const out = await callElevenLabsMusic(
    { prompt: syncPrompt(input), music_length_ms: BGM_SECONDS * 1000, model_id: "music_v2_5", force_instrumental: true },
    apiKey,
  );
  // v1.42 요청한 길이 대신 실제 파일 길이(못 읽으면 요청 길이)
  return { data: out.data, contentType: out.contentType, durationSeconds: audioDurationSeconds(out.data, out.contentType) ?? BGM_SECONDS };
}
