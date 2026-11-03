// 내 PC 엔진(engine/ 폴더, 연결 문 127.0.0.1:47821) 부르기 — 브라우저에서만 쓴다.
// 음원은 회원 PC에서 만들어지고 브라우저로 바로 받으므로 우리 서버를 거치지 않는다(플랜 §3).
// 형식 근거: ACE-Step 1.5 docs/en/API.md(release_task → query_result status 1/2 → /v1/audio).

export const ENGINE_URL = "http://127.0.0.1:47821";
const TOKEN_KEY = "fms-engine-token";

export type EngineStatus = {
  name: string;
  version: string;
  ready: boolean;
  stage: string;
  mode: string;
  device: string;
  note: string;
  error: string;
  paired: boolean;
};

export type SongForEngine = { style_prompt: string; lyrics: string; duration_sec: number };

export type TaskState = { state: "running" } | { state: "done"; file: string } | { state: "failed"; error: string };

// ── 순수 함수(시험 tests/engine.test.mjs) ─────────────────────────

/** 가사에 한글이 있으면 한국어로 부른다. 없으면 영어. */
export function vocalLanguage(lyrics: string): "ko" | "en" {
  return /[가-힣]/.test(lyrics) ? "ko" : "en";
}

/**
 * 생성 요청 본문. 한 곡씩(batch_size 1 — 기본 2는 시간이 두 배), MP3.
 * 언어 모델(thinking)은 그래픽카드 모드에서만 켠다 — CPU 모드 엔진은 언어 모델을 띄우지 않는다.
 */
export function buildTaskBody(song: SongForEngine, device: string) {
  return {
    prompt: song.style_prompt.trim(),
    lyrics: song.lyrics.trim(),
    audio_duration: song.duration_sec,
    vocal_language: vocalLanguage(song.lyrics),
    thinking: device === "cuda" || device === "mps",
    batch_size: 1,
    audio_format: "mp3",
  };
}

/** query_result 응답에서 내 작업 하나의 상태를 꺼낸다. result는 JSON 문자열(배열)이다. */
export function parseTaskState(body: unknown, taskId: string): TaskState {
  const list = (body as { data?: unknown })?.data;
  const item = Array.isArray(list) ? list.find((d) => d && (d as { task_id?: string }).task_id === taskId) : null;
  if (!item) return { state: "running" };
  const status = Number((item as { status?: unknown }).status);
  if (status === 2) return { state: "failed", error: "음악 엔진이 곡을 만들지 못했습니다. 가사·스타일을 줄여 다시 시도해 주세요." };
  if (status !== 1) return { state: "running" };
  let results: unknown = (item as { result?: unknown }).result;
  if (typeof results === "string") {
    try {
      results = JSON.parse(results);
    } catch {
      results = null;
    }
  }
  const first = Array.isArray(results) ? (results[0] as { file?: unknown }) : null;
  const file = first && typeof first.file === "string" ? first.file : "";
  // 연결 문은 /v1/audio만 넘겨 준다 — 다른 주소가 오면 받지 않는다.
  if (!file.startsWith("/v1/audio?")) return { state: "failed", error: "완성된 음원 주소를 찾지 못했습니다." };
  return { state: "done", file };
}

// ── 엔진 호출 ─────────────────────────────────────────────

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export class EngineError extends Error {
  constructor(message: string, readonly needPair = false) {
    super(message);
  }
}

const OFFLINE = "내 PC 엔진에 연결하지 못했습니다. 엔진 창이 켜져 있는지, 브라우저의 「로컬 네트워크 접근」을 허용했는지 확인해 주세요.";

async function call(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(ENGINE_URL + path, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new EngineError(OFFLINE);
  }
  if (res.status === 401 && path !== "/pair") {
    setToken(null); // 엔진을 새로 설치했거나 연결이 풀린 경우
    throw new EngineError("PC 연결이 풀렸습니다. 「내 PC 엔진」 화면에서 엔진 창의 연결 코드 6자리를 다시 넣어 주세요.", true);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new EngineError((data && typeof data.error === "string" && data.error) || `엔진 오류(${res.status})`);
  }
  return res;
}

/** 엔진 상태. 꺼져 있으면 null. */
export async function getEngineStatus(): Promise<EngineStatus | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/status`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? ((await res.json()) as EngineStatus) : null;
  } catch {
    return null;
  }
}

/** 엔진 창의 연결 코드 6자리로 이 브라우저를 연결한다. */
export async function pairEngine(code: string): Promise<void> {
  const res = await call("/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = await res.json();
  setToken(data.token);
}

export function forgetEngine() {
  setToken(null);
}

export async function startTask(song: SongForEngine, device: string): Promise<string> {
  const res = await call("/release_task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTaskBody(song, device)),
  });
  const data = await res.json();
  const taskId = data?.data?.task_id;
  if (typeof taskId !== "string") throw new EngineError("음악 엔진이 작업을 받지 못했습니다.");
  return taskId;
}

export async function checkTask(taskId: string): Promise<TaskState> {
  const res = await call("/query_result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id_list: [taskId] }),
  });
  return parseTaskState(await res.json(), taskId);
}

/** 완성 음원을 받아 브라우저 안 주소(blob:)로 돌려준다. 재생·내려받기에 같이 쓴다. */
export async function fetchAudio(file: string): Promise<string> {
  const res = await call(file, {}, 120_000);
  return URL.createObjectURL(await res.blob());
}
