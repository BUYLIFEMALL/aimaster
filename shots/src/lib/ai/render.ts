import "server-only";

const J2V_BASE = "https://api.json2video.com/v2";
const SEGMENT_SECONDS = 5;

export interface RenderSegmentInput {
  imageUrl: string;
  narration: string;
}

export interface BuildMovieInput {
  title: string;
  segments: RenderSegmentInput[];
  bgmAudioUrl?: string | null;
  voiceId: string;
  /**
   * json2video.com 대시보드 Connections에서 만든 ID. 실제로 지금까지 쓰던 시나리오는
   * 이 필드 없이(JSON2Video 자체 ElevenLabs 연동/크레딧으로) 공개 voice ID를 그대로 써서
   * 잘 동작했으므로 선택 사항으로 둔다 — 본인 계정의 비공개 커스텀 음성을 쓸 때만 필요.
   */
  connectionId?: string | null;
}

/**
 * Make.com "04썰쇼츠자동화-영상생성" 시나리오의 movie JSON 구조를 그대로 이식.
 * 장면 하나 안에 이미지 6장(각 5초) + voice(ElevenLabs TTS, 텍스트 직접 전달) + BGM + 자동 자막.
 */
export function buildMovieJson(input: BuildMovieInput): Record<string, unknown> {
  const totalDuration = input.segments.length * SEGMENT_SECONDS;
  const elements: Record<string, unknown>[] = [];

  input.segments.forEach((seg, i) => {
    const start = i * SEGMENT_SECONDS;
    elements.push({
      type: "image",
      start,
      duration: SEGMENT_SECONDS,
      src: seg.imageUrl,
      width: 1080,
      height: 1920,
      resize: "cover",
    });
    elements.push({
      type: "voice",
      start,
      duration: SEGMENT_SECONDS,
      text: seg.narration,
      model: "elevenlabs",
      voice: input.voiceId,
      ...(input.connectionId ? { connection: input.connectionId } : {}),
    });
  });

  if (input.bgmAudioUrl) {
    elements.push({
      type: "audio",
      src: input.bgmAudioUrl,
      start: 0,
      duration: totalDuration,
      volume: 0.5,
      "fade-out": 1,
    });
  }

  elements.push({
    type: "subtitles",
    language: "ko",
    settings: {
      style: "classic",
      "font-family": "Noto Sans KR",
      "font-size": 80,
      "word-color": "#FFD200",
      "outline-color": "#000000",
      "outline-width": 6,
      position: "center-center",
      "max-words-per-line": 2,
    },
  });

  return {
    comment: input.title,
    resolution: "custom",
    width: 1080,
    height: 1920,
    quality: "high",
    scenes: [{ comment: "Scene 1", elements }],
  };
}

/** JSON2Video에 렌더링을 요청하고 project id를 받는다. */
export async function createMovie(movieJson: Record<string, unknown>, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("JSON2Video API 키가 없습니다. 설정 > API 키 설정에서 본인의 JSON2Video API 키를 등록해주세요.");
  }

  const response = await fetch(`${J2V_BASE}/movies`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(movieJson),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`영상 렌더링 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { success?: boolean; project?: string };
  if (!data.success || !data.project) {
    throw new Error("영상 렌더링 요청이 실패했습니다: project id를 받지 못했습니다.");
  }
  return data.project;
}

export type RenderStatusResult =
  | { state: "processing" }
  | { state: "ready"; videoUrl: string }
  | { state: "failed"; error: string };

/** project id로 렌더링 상태를 조회한다. */
export async function checkRenderStatus(projectId: string, apiKey: string): Promise<RenderStatusResult> {
  if (!apiKey) {
    throw new Error("JSON2Video API 키가 없습니다. 설정 > API 키 설정에서 본인의 JSON2Video API 키를 등록해주세요.");
  }

  const response = await fetch(`${J2V_BASE}/movies?project=${projectId}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`렌더링 상태 조회에 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    movie?: { status?: string; url?: string; message?: string };
  };
  const status = data.movie?.status ?? "";

  if (status === "done") {
    if (!data.movie?.url) return { state: "failed", error: "완료됐지만 영상 URL을 찾지 못했습니다." };
    return { state: "ready", videoUrl: data.movie.url };
  }
  if (status === "error" || status === "timeout") {
    return { state: "failed", error: data.movie?.message || `렌더링 실패 (${status})` };
  }
  return { state: "processing" };
}
