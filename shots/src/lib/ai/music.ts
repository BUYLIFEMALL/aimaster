import "server-only";

const SUNO_BASE = "https://api.sunoapi.org";
const SUNO_MODEL = "V4_5"; // 기본 모델. 필요하면 나중에 선택 UI로 노출 가능.

export interface RequestMusicInput {
  title: string;
  bgmPrompt: string;
  style: string;
  negativeTags: string;
}

/** Suno에 BGM 생성을 요청하고 taskId를 받는다. 실제 생성은 비동기라 별도로 폴링해야 한다. */
export async function requestBackgroundMusic(input: RequestMusicInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Suno API 키가 없습니다. 설정 > API 키 설정에서 본인의 Suno API 키를 등록해주세요.");
  }

  const response = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      prompt: input.bgmPrompt,
      customMode: true,
      instrumental: true,
      model: SUNO_MODEL,
      title: input.title.slice(0, 80),
      style: input.style,
      negativeTags: input.negativeTags,
      // Suno는 콜백 URL을 필수로 요구하지만, 우리는 폴링으로 완료 여부를 확인하므로
      // 실제로 이 엔드포인트가 호출되는지 여부와 무관하게 동작한다.
      callBackUrl: `${process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz"}/api/webhooks/suno`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Suno 음악 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { code: number; msg: string; data?: { taskId?: string } };
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno 음악 생성 요청이 실패했습니다: ${data.msg ?? "알 수 없는 오류"}`);
  }
  return data.data.taskId;
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
    const tracks: MusicTrack[] = sunoData
      .map((t) => ({
        audioUrl: t.audioUrl || t.streamAudioUrl || "",
        imageUrl: t.imageUrl ?? null,
        title: t.title ?? null,
        durationSeconds: t.duration ?? null,
      }))
      .filter((t) => t.audioUrl);
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
