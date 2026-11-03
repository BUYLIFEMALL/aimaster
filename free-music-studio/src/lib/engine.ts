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
  features?: string[]; // 0.1.1부터 ["library"]
  libraryDir?: string;
  quality?: EngineQuality; // 0.1.4부터
};

/** 엔진이 그래픽 메모리에 맞춰 고른 음질 설정(engine/src/device.mjs qualityProfile) */
export type EngineQuality = {
  id?: string; // 0.1.5부터 구성 번호(max4b·max·xlturbo·high·standard·basic)
  name?: string;
  tier: "max" | "high" | "standard" | "basic";
  label: string;
  dit: string;
  lm: string | null;
  steps: number;
  offload: boolean;
  vramGb: number | null;
  ffmpeg: boolean;
};

/** 내 PC 보관함을 쓸 수 있는 엔진인가(0.1.0은 없음 — 엔진을 새로 받아야 함). */
export function hasLibrary(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("library");
}

/** PC 검사·구성 고르기를 쓸 수 있는 엔진인가(0.1.5+) */
export function hasSystemCheck(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("system");
}

export type CheckStatus = "ok" | "warn" | "fail";
export type CheckItem = { label: string; value: string; status: CheckStatus; note: string };
export type QualityOption = EngineQuality & {
  id: string;
  name: string;
  minVramGb: number;
  diskGb: number;
  supported: boolean;
  recommended: boolean;
  installed: boolean;
  reason: string;
};
/** 엔진 GET /system — PC 정밀 검사 결과(engine/src/device.mjs checkItems·qualityOptions) */
export type SystemReport = {
  system: { os: string; cpu: string; gpu: string; vramGb: number | null; ramGb: number | null; freeGb: number | null; freePath: string; installedModels: string[] };
  check: { verdict: CheckStatus; headline: string; items: CheckItem[] };
  options: QualityOption[];
  selected: string;
  engines: { id: string; name: string; note: string; selected: boolean }[];
};

export type SongForEngine = { style_prompt: string; lyrics: string; duration_sec: number };

export type TaskState = { state: "running" } | { state: "done"; file: string } | { state: "failed"; error: string };

// ── 순수 함수(시험 tests/engine.test.mjs) ─────────────────────────

/** 가사에 한글이 있으면 한국어로 부른다. 없으면 영어. */
export function vocalLanguage(lyrics: string): "ko" | "en" {
  return /[가-힣]/.test(lyrics) ? "ko" : "en";
}

/**
 * 생성 요청 본문. 한 곡씩(batch_size 1 — 기본 2는 시간이 두 배).
 * 음질 설정이 있는 엔진(0.1.4+)이면 무손실 FLAC 원음 + 그 설정의 생성 단계 수, 언어 모델은 띄운 경우만 켠다.
 * 옛 엔진은 예전대로 MP3(엔진 기본 128kbps), 언어 모델은 그래픽카드 모드에서만.
 */
export function buildTaskBody(song: SongForEngine, device: string, quality?: EngineQuality | null) {
  return {
    prompt: song.style_prompt.trim(),
    lyrics: song.lyrics.trim(),
    audio_duration: song.duration_sec,
    vocal_language: vocalLanguage(song.lyrics),
    thinking: quality ? !!quality.lm : device === "cuda" || device === "mps",
    batch_size: 1,
    audio_format: quality ? "flac" : "mp3",
    ...(quality ? { inference_steps: quality.steps } : {}),
  };
}

export type EditOptions =
  | { mode: "cover"; style_prompt: string; lyrics: string; strength: number }
  | { mode: "repaint"; style_prompt: string; lyrics: string; start: number; end: number };

/**
 * 가져온 음악(원곡 파일) 작업의 폼 칸 — 커버(스타일 바꾸기) 또는 일부만 다시 만들기.
 * 커버 세기는 0.2~1.0(높을수록 원곡을 많이 따름), 구간은 원곡 길이 안으로 자른다. 언어 모델은 이 작업에서 쓰이지 않는다.
 */
export function buildEditFields(opts: EditOptions, sourceSec: number, quality?: EngineQuality | null): Record<string, string> {
  const base: Record<string, string> = {
    task_type: opts.mode,
    prompt: opts.style_prompt.trim(),
    lyrics: opts.lyrics.trim(),
    vocal_language: vocalLanguage(opts.lyrics),
    thinking: "false",
    batch_size: "1",
    audio_format: quality ? "flac" : "mp3",
  };
  if (quality) base.inference_steps = String(quality.steps);
  if (opts.mode === "cover") {
    const s = Math.min(1, Math.max(0.2, Number.isFinite(opts.strength) ? opts.strength : 1));
    base.audio_cover_strength = s.toFixed(2);
  } else {
    const start = Math.max(0, Math.min(Math.floor(opts.start), Math.floor(sourceSec) - 1));
    const end = Math.max(start + 1, Math.min(Math.ceil(opts.end), Math.floor(sourceSec)));
    base.repainting_start = String(start);
    base.repainting_end = String(end);
    base.chunk_mask_mode = "explicit";
  }
  return base;
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

/** PC 정밀 검사(부를 때마다 새로 검사) */
export async function getSystemReport(): Promise<SystemReport> {
  return (await call("/system", {}, 30_000)).json();
}

/** 음악 모델 구성 바꾸기 — 엔진이 저장하고 음악 엔진을 다시 켠다(새 모델은 첫 생성 때 받음) */
export async function setQualityTier(tier: string): Promise<EngineQuality> {
  const res = await call("/quality", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) }, 30_000);
  return (await res.json()).quality;
}

export async function startTask(song: SongForEngine, device: string, quality?: EngineQuality | null): Promise<string> {
  const res = await call("/release_task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTaskBody(song, device, quality)),
  });
  const data = await res.json();
  const taskId = data?.data?.task_id;
  if (typeof taskId !== "string") throw new EngineError("음악 엔진이 작업을 받지 못했습니다.");
  return taskId;
}

/** 원곡 파일을 엔진에 올려 커버·부분 수정 작업을 시작한다(파일은 회원 PC 엔진으로만 간다, 60MB까지). */
export async function startEditTask(source: File, opts: EditOptions, sourceSec: number, quality?: EngineQuality | null): Promise<string> {
  const form = new FormData();
  for (const [k, v] of Object.entries(buildEditFields(opts, sourceSec, quality))) form.append(k, v);
  form.append("src_audio", source, source.name);
  const res = await call("/release_task", { method: "POST", body: form }, 180_000);
  const data = await res.json();
  const taskId = data?.data?.task_id;
  if (typeof taskId !== "string") throw new EngineError("음악 엔진이 작업을 받지 못했습니다.");
  return taskId;
}

/** 작업이 끝날 때까지 3초마다 확인한다. 끝나면 음원 주소, 실패·취소·시간 초과면 예외. */
export async function waitForTask(taskId: string, isCancelled: () => boolean, maxMs = 45 * 60_000): Promise<string> {
  const until = Date.now() + maxMs;
  while (!isCancelled()) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await checkTask(taskId);
    if (s.state === "failed") throw new EngineError(s.error);
    if (s.state === "done") return s.file;
    if (Date.now() > until) throw new EngineError("너무 오래 걸려 기다리기를 멈췄습니다. 엔진 창에 오류가 있는지 확인해 주세요.");
  }
  throw new EngineError("화면을 떠나 기다리기를 멈췄습니다.");
}

export async function checkTask(taskId: string): Promise<TaskState> {
  const res = await call("/query_result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id_list: [taskId] }),
  });
  return parseTaskState(await res.json(), taskId);
}

// ── 내 PC 보관함(엔진 0.1.1+) ─────────────────────────────────

/** 완성 음원을 엔진 저장 폴더에 복사해 둔다(0.1.2부터 파일 이름 = 곡 제목). */
export async function saveToLibrary(id: string, file: string, title: string): Promise<void> {
  await call("/library/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, file, title }),
  });
}

/** 저장 폴더를 고를 수 있는 엔진인가(0.1.2+) */
export function hasFolderPicker(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("folder");
}

/** PC에 「폴더 고르기」 창을 띄운다. 회원이 고를 때까지 기다린다(최대 10분). 취소하면 null. */
export async function pickFolder(): Promise<string | null> {
  const res = await call("/library/pick-folder", { method: "POST" }, 600_000);
  const data = await res.json();
  return typeof data?.path === "string" && data.path ? data.path : null;
}

/** 저장 폴더 바꾸기. move면 기존 노래를 새 폴더로 옮긴다(titles: 곡 번호 → 제목, 옛 번호 이름 파일용). */
export async function setLibraryFolder(path: string, move: boolean, titles: Record<string, string>) {
  const res = await call(
    "/library/folder",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, move, titles }) },
    300_000
  );
  return (await res.json()) as { dir: string; moved: number; failed: number };
}

/** 사이트 안 한글 폴더 고르기를 쓸 수 있는 엔진인가(0.1.3+) */
export function hasFolderBrowse(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("browse");
}

export type FolderEntry = { name: string; path: string };
export type FolderListing = { path: string; parent: string | null; dirs: FolderEntry[]; quick?: FolderEntry[]; drives?: FolderEntry[] };

/** PC 폴더 목록. path가 비면 자주 쓰는 폴더·드라이브. */
export async function browseFolders(path: string): Promise<FolderListing> {
  const res = await call(`/library/browse?path=${encodeURIComponent(path)}`);
  return (await res.json()) as FolderListing;
}

export async function makeFolder(parent: string, name: string): Promise<string> {
  const res = await call("/library/mkdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent, name }),
  });
  return (await res.json()).path as string;
}

/** 저장 폴더를 PC 탐색기로 연다. */
export async function revealLibraryFolder(): Promise<void> {
  await call("/library/reveal", { method: "POST" });
}

/** 이 PC 보관함에 있는 곡 번호들 */
export async function listLibrary(): Promise<Set<string>> {
  return (await listLibraryFormats()).ids;
}

/** 보관함 곡 번호와 곡마다 원음 형식(0.1.4+, 옛 엔진은 모두 mp3) */
export async function listLibraryFormats(): Promise<{ ids: Set<string>; formats: Record<string, string> }> {
  const res = await call("/library");
  const data = await res.json();
  return { ids: new Set(Array.isArray(data?.ids) ? data.ids : []), formats: data?.formats && typeof data.formats === "object" ? data.formats : {} };
}

/** 보관함 음원을 브라우저 안 주소로. 기본은 원음(FLAC 등), format "mp3"면 엔진이 320kbps로 바꿔 준다. */
export async function fetchLibraryFile(id: string, format?: "mp3"): Promise<{ url: string; ext: string }> {
  const res = await call(`/library/${id}${format ? "?format=mp3" : ""}`, {}, 300_000);
  const ext = format ?? res.headers.get("x-audio-format") ?? "mp3";
  return { url: URL.createObjectURL(await res.blob()), ext };
}

export async function fetchLibraryAudio(id: string): Promise<string> {
  return (await fetchLibraryFile(id)).url;
}

/** 보관함 곡을 파일로 내려받는다(원음 또는 MP3 320kbps). */
export async function downloadFromLibrary(id: string, title: string, format?: "mp3"): Promise<void> {
  const f = await fetchLibraryFile(id, format);
  const a = document.createElement("a");
  a.href = f.url;
  a.download = `${title}.${f.ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(f.url), 60_000);
}

export async function deleteFromLibrary(id: string): Promise<void> {
  await call(`/library/${id}`, { method: "DELETE" });
}

/** 완성 음원을 받아 브라우저 안 주소(blob:)로 돌려준다. 재생·내려받기에 같이 쓴다. */
export async function fetchAudio(file: string): Promise<string> {
  const res = await call(file, {}, 120_000);
  return URL.createObjectURL(await res.blob());
}
