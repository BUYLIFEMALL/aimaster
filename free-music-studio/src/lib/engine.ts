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
  modelsDir?: string; // 0.5.0부터 모델 저장 폴더
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
  system: {
    os: string;
    cpu: string;
    gpu: string;
    vramGb: number | null;
    ramGb: number | null;
    freeGb: number | null;
    freePath: string;
    installedModels: string[];
    // 엔진 inspectSystem이 함께 보내는 칸(옛 엔진엔 없을 수 있음) — 시스템 정보 표(원본 host-profile 참고)
    cores?: number | null;
    driver?: string;
    gpuVendor?: string;
    platform?: string;
    arch?: string;
    ffmpeg?: boolean;
    computeCapability?: string; // 0.6.9+
    bf16?: boolean | null; // 0.6.9+
  };
  check: { verdict: CheckStatus; headline: string; items: CheckItem[] };
  options: QualityOption[];
  selected: string;
  // 0.2.0+: license·supported·reason, YuE2는 installed(받아 둠)·downloadGb(더 받을 크기)·profile(구성)도
  // 0.4.0+: 추가 엔진은 kind(노래·연주곡)·licenseName·licenseCondition(조건부 상업용)·hfToken·gatedUrl도
  engines: {
    id: string;
    name: string;
    note: string;
    selected: boolean;
    license?: "commercial" | "noncommercial";
    supported?: boolean;
    reason?: string;
    installed?: boolean;
    downloadGb?: number | null;
    profile?: string;
    kind?: "both" | "vocal" | "instrumental";
    licenseName?: string;
    licenseCondition?: string;
    hfToken?: boolean;
    gatedUrl?: string;
  }[];
};

export type SongForEngine = { style_prompt: string; lyrics: string; duration_sec: number };

export type TaskState = { state: "running" } | { state: "done"; file: string } | { state: "failed"; error: string };

// ── 순수 함수(시험 tests/engine.test.mjs) ─────────────────────────

/** 엔진(ACE-Step)에 보낼 가사 언어 — 가사 글자로 판단(한글이면 한국어, 일본어·중국어·스페인어 등 50개, 모르면 영어). lib/lyricLanguages.ts */
export function vocalLanguage(lyrics: string): string {
  return detectLyricLanguage(lyrics);
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
  let results: unknown = (item as { result?: unknown }).result;
  if (typeof results === "string") {
    try {
      results = JSON.parse(results);
    } catch {
      results = null;
    }
  }
  const first = Array.isArray(results) ? (results[0] as { file?: unknown; error?: unknown }) : null;
  if (status === 2) {
    // 음악 엔진이 알려 준 실패 이유를 붙인다(엔진 runner.mjs와 같은 규칙 — 2026-11-04 마스터PC cp949 오류를 이것으로 찾음)
    const reason = first && typeof first.error === "string" ? first.error.replace(/\s+/g, " ").trim().slice(0, 400) : "";
    return { state: "failed", error: reason ? `음악 엔진이 곡을 만들지 못했습니다 — ${reason}` : "음악 엔진이 곡을 만들지 못했습니다. 가사·스타일을 줄여 다시 시도해 주세요." };
  }
  if (status !== 1) return { state: "running" };
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

/** 앨범 그림을 노래 저장 폴더에 넣을 수 있는 엔진인가(0.6.7+) */
export function hasArt(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("art");
}

/** 앨범 그림을 내 PC 노래 저장 폴더에 「곡 제목.png」로 저장한다(0.6.7+). 저장한 파일 경로를 돌려준다. */
export async function saveArtToLibrary(title: string, base64: string, mimeType: string): Promise<string> {
  const res = await call("/library/art", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, base64, mimeType }),
  });
  const data = await res.json().catch(() => null);
  return typeof data?.path === "string" ? data.path : "";
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

/** 보관함 곡 번호와 곡마다 원음 형식(0.1.4+, 옛 엔진은 모두 mp3), 표지가 있는 곡(0.6.8+, 옛 엔진은 빈 목록) */
export async function listLibraryFormats(): Promise<{ ids: Set<string>; formats: Record<string, string>; arts: Set<string> }> {
  const res = await call("/library");
  const data = await res.json();
  return {
    ids: new Set(Array.isArray(data?.ids) ? data.ids : []),
    formats: data?.formats && typeof data.formats === "object" ? data.formats : {},
    arts: new Set(Array.isArray(data?.arts) ? data.arts : []),
  };
}

/** 곡 표지를 보여 주고 MP3에 넣는 엔진인가(0.6.8+) */
export function hasCover(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("cover");
}

/** 곡 파형을 줄 수 있는 엔진인가(0.6.9+) */
export function hasWaveform(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("waveform");
}

/** 이 곡의 표지를 바꾼다(엔진 0.6.9+, 원본 「앨범아트 업로드」) — 화면이 1:1·형식·크기를 먼저 확인한다 */
export async function setTrackArt(id: string, file: Blob): Promise<void> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  await call(`/library/${id}/art`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64: btoa(bin), mimeType: file.type || "image/png" }) }, 60_000);
}

// ── 앨범 그림(엔진 0.7.3, v1.35) — 노래 저장 폴더 안 Albums/<앨범 번호> ──────────────
/** 앨범 그림을 내 PC에 보관하는 엔진인가(0.7.3+) */
export function hasAlbums(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("albums");
}
/** 이 PC에 그림이 있는 앨범 번호 */
export async function listAlbumImages(): Promise<string[]> {
  const res = await call("/library/albums");
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.ids) ? data.ids.filter((x: unknown): x is string => typeof x === "string") : [];
}
/** 앨범 그림 저장(같은 앨범이면 바꿈) */
export async function saveAlbumImage(id: string, base64: string, mimeType: string): Promise<void> {
  await call(`/library/albums/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64, mimeType }) }, 60_000);
}
/** 앨범 그림 파일(Blob) — 화면에 보이거나 곡 표지로 복사할 때 */
export async function fetchAlbumImage(id: string): Promise<Blob> {
  const res = await call(`/library/albums/${id}`, {}, 30_000);
  return res.blob();
}
export async function deleteAlbumImage(id: string): Promise<void> {
  await call(`/library/albums/${id}`, { method: "DELETE" });
}
/** Blob → base64(엔진에 그림을 넘길 때) */
export async function blobToBase64(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 보관함 곡의 파형 — peaks(1600칸, 0~1)·duration(초). 엔진 0.6.9+ */
export async function getWaveform(id: string): Promise<{ peaks: number[]; duration: number }> {
  const res = await call(`/library/${id}/waveform`, {}, 150_000);
  const data = await res.json().catch(() => ({}));
  if (!Array.isArray(data?.peaks)) throw new EngineError(data?.error || "파형을 읽지 못했습니다.");
  return { peaks: data.peaks.map((v: unknown) => (typeof v === "number" ? v : 0)), duration: Number(data.duration) || 0 };
}

/** 보관함 곡의 표지 그림을 브라우저 안 주소로(0.6.8+). 다 쓰면 URL.revokeObjectURL. */
export async function fetchLibraryArt(id: string): Promise<string> {
  const res = await call(`/library/${id}/art`, {}, 30_000);
  return URL.createObjectURL(await res.blob());
}

/** 보관함 음원을 브라우저 안 주소로. 기본은 원음(FLAC 등), format "mp3"면 엔진이 320kbps로 바꿔 준다. */
export async function fetchLibraryFile(id: string, format?: "mp3", opts: { cover?: boolean } = {}): Promise<{ url: string; ext: string }> {
  // cover: 원음 내려받기에 표지를 넣어 달라(엔진 0.7.4+, B-7 — 옛 엔진은 무시하고 원음 그대로)
  const res = await call(`/library/${id}${format ? "?format=mp3" : opts.cover ? "?cover=1" : ""}`, {}, 300_000);
  const ext = format ?? res.headers.get("x-audio-format") ?? "mp3";
  return { url: URL.createObjectURL(await res.blob()), ext };
}

export async function fetchLibraryAudio(id: string): Promise<string> {
  return (await fetchLibraryFile(id)).url;
}

/** 보관함 곡을 파일로 내려받는다(원음 또는 MP3 320kbps). */
export async function downloadFromLibrary(id: string, title: string, format?: "mp3"): Promise<void> {
  const f = await fetchLibraryFile(id, format, { cover: !format });
  const a = document.createElement("a");
  a.href = f.url;
  a.download = `${title}.${f.ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(f.url), 60_000);
}

/** 보관함에서 지우기 — 엔진 0.6.9부터 보관함 밖·모델 폴더·링크 파일은 지우지 않고 skipped로 돌려준다(옛 엔진은 빈 배열) */
export async function deleteFromLibrary(id: string): Promise<{ skipped: string[] }> {
  const res = await call(`/library/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  return { skipped: Array.isArray(data?.skipped) ? data.skipped.filter((s: unknown) => typeof s === "string") : [] };
}

// ── 작업 대기열(엔진 0.1.6+) ─────────────────────────────────
// 엔진이 차례로 만들고 보관함에 저장한다. 끝난 작업의 「모든 음악」 기록은 사이트가 남긴다(QueueSync).

export type QueueStatus = "queued" | "running" | "done" | "failed" | "cancelled" | "interrupted";
export type QueueTrack = { id: string; song_id: string | null; style_prompt: string; lyrics: string; duration_sec: number; device: string; kind: "text2music" | "cover" | "repaint" | "master" | "stems" | "align" | "art"; parent_id?: string | null; project_id?: string | null };
export type QueueJob = {
  id: string;
  kind: QueueTrack["kind"];
  title: string;
  track: QueueTrack;
  status: QueueStatus;
  stage: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: { trackId: string; ext: string; sourceId?: string; timing?: unknown; review?: number; variantId?: string; model?: string; seconds?: number; vramPeakGb?: number };
  recorded: boolean;
  engine?: MusicEngineId; // 엔진 0.2.0+
  license?: TrackLicense;
};

// ── 음악 엔진 고르기(엔진 0.2.0+) ──────────────────────────────
// ACE-Step = 상업용 사용 가능(기본), YuE2 = 비상업용(CC BY-NC 4.0 — 수익 영상·판매 불가, 2026-11-04 주인님 결정: 회원도 쓰되 구분 표시)
// v1.12(엔진 0.4.0): 공개된 모델을 더 넣고 「상업용」·「개인용」 두 묶음으로 나눔(2026-11-04 주인님: 「다 넣고 개인용과 상업용으로 나누면 되잖아」)
export type MusicEngineId = "acestep" | "yue2" | "heartmula" | "stableaudio3" | "levo2" | "minimax3";
export type TrackLicense = "commercial" | "noncommercial";
export const LICENSE_LABEL: Record<TrackLicense, string> = { commercial: "상업용", noncommercial: "비상업용" };

export type MusicEngineInfo = {
  id: MusicEngineId;
  name: string;
  license: TrackLicense;
  /** 노래(가사) · 연주곡 · 둘 다 */
  kind: "both" | "vocal" | "instrumental";
  desc: string;
  /** 비상업 동의 문구(개인용 엔진) / 조건부 상업용 조건 */
  terms?: string;
  /** 처음 받는 대략 크기(GB) */
  firstGb?: number;
  /** 회원 본인 Hugging Face 토큰이 있어야 모델을 받음 */
  hfToken?: boolean;
  gatedUrl?: string;
  /**
   * 한국어 가사(노래 엔진만) — 주인님 지시(2026-11-04): 「한글지원 안되는 모델은 선택지에서 제외」.
   * "no"는 고르기 목록에서 뺀다(지난 곡 이름 표시용으로만 남김), "untested"는 마스터PC 시험 전 안내.
   */
  korean?: "yes" | "no" | "untested";
  /** 이보다 그래픽 메모리가 작은 PC에서는 고르기 목록에서 뺀다(엔진 목록과 같은 값 — 옛 엔진이 「된다」고 알려도 사이트에서 막음) */
  minVramGb?: number;
};

/** 이 PC 그래픽 메모리로 그 엔진을 쓰기 어려운가(값을 모르면 막지 않음) */
export const tooLittleVram = (e: MusicEngineInfo, vramGb: number | null | undefined) => !!e.minVramGb && vramGb != null && vramGb < e.minVramGb;

/** 엔진 목록(엔진 쪽 engine/src/pyengines-catalog.json·yue2와 같은 분류) */
export const MUSIC_ENGINES: MusicEngineInfo[] = [
  { id: "acestep", name: "ACE-Step 1.5", license: "commercial", kind: "both", desc: "수익 영상·판매에도 쓸 수 있습니다. 노래·연주곡·커버·부분 수정.", korean: "yes" },
  { id: "heartmula", name: "HeartMuLa 3B", license: "commercial", kind: "vocal", desc: "노래 만들기. 여러 언어. Apache 2.0이라 수익 영상·판매에도 쓸 수 있습니다.", firstGb: 27, korean: "yes" },
  {
    id: "stableaudio3",
    name: "Stable Audio 3",
    license: "commercial",
    kind: "instrumental",
    desc: "연주곡·배경음악(노래 없음), 최대 6분 20초. 상업용은 연매출 100만 달러 미만일 때 무료.",
    terms: "Stability AI 커뮤니티 라이선스: 연매출 100만 달러(약 13억 원) 이상인 개인·회사는 Stability AI와 따로 계약해야 상업용으로 쓸 수 있습니다.",
    firstGb: 15,
    hfToken: true,
    gatedUrl: "https://huggingface.co/stabilityai/stable-audio-3-medium",
  },
  {
    id: "minimax3",
    name: "MiniMax Music 3",
    license: "commercial",
    kind: "vocal",
    desc: "가사 정확도 평가 1위 모델. 노래 최대 5분. 상업용(조건부). 그래픽 메모리 24GB 이상 PC 전용(16GB에서는 3분 곡이 1시간 넘게 걸림).",
    minVramGb: 24,
    terms: "MiniMax-Music3 커뮤니티 라이선스: 상업용으로 쓸 때 영상·서비스 설명에 「MiniMax-Music3」로 만들었음을 표시하고, 공개할 때 AI로 만든 곡임을 밝혀 주세요(연매출 2천만 달러 초과 시 MiniMax 허가 필요).",
    firstGb: 35,
    korean: "untested",
  },
  { id: "yue2", name: "YuE2", license: "noncommercial", kind: "vocal", desc: "노래 음질이 좋은 모델입니다. 개인 감상·비수익 용도만(CC BY-NC 4.0).", terms: "YuE2로 만든 곡은 비상업용입니다. 유튜브 수익 영상·광고·판매·납품에 쓰면 저작권 조건(CC BY-NC 4.0) 위반입니다.", firstGb: 8, korean: "yes" },
  {
    id: "levo2",
    name: "LeVo 2",
    license: "noncommercial",
    kind: "vocal",
    desc: "중국어·영어 노래 전용(한국어 가사는 부르지 못합니다). 학술·연구·교육 목적만.",
    korean: "no",
    terms: "LeVo 2(SongGeneration) 라이선스는 학술·연구·교육 목적만 허용하고 어떤 상업·제작 용도도 금지합니다. 판매·수익 영상·납품에 쓸 수 없습니다.",
    firstGb: 33,
  },
];
export const engineInfo = (id: MusicEngineId | undefined) => MUSIC_ENGINES.find((e) => e.id === (id ?? "acestep")) ?? MUSIC_ENGINES[0];
export const licenseOfEngine = (e: MusicEngineId): TrackLicense => engineInfo(e).license;

/** 이 PC 엔진에서 고를 수 있는 엔진(ACE-Step은 늘, 나머지는 엔진이 「된다」고 알린 것만, 한국어를 못 부르는 노래 엔진은 빼고) */
export function availableEngines(status: EngineStatus | null): MusicEngineInfo[] {
  return MUSIC_ENGINES.filter((e) => e.korean !== "no" && !tooLittleVram(e, status?.quality?.vramGb) && (e.id === "acestep" || !!status?.features?.includes(e.id)));
}

/** 이 PC 엔진이 YuE2를 쓸 수 있는가(엔진 0.2.0+ · 윈도우 NVIDIA 8GB+) */
export function hasYue2(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("yue2");
}

/** 개인용 엔진 동의 저장 키(엔진마다 따로 — YuE2는 예전 키 그대로) */
export const consentKey = (id: MusicEngineId) => `fms-${id}-noncommercial-consent`;

/** 회원 본인 Hugging Face 토큰(없으면 null) — 엔진이 모델을 처음 받을 때만 씀 */
export async function fetchHfToken(): Promise<string | null> {
  const r = await fetch("/api/settings/hf-token", { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return null;
  const j = await r.json().catch(() => null);
  return typeof j?.token === "string" && j.token ? j.token : null;
}

/** 받은 추가 엔진 모델·실행 환경 지우기(엔진 0.4.0+) */
export async function removeEngineModel(id: MusicEngineId): Promise<void> {
  await call(`/engines/${id}/remove`, { method: "POST" });
}

// ── 저장 공간(엔진 0.5.0, 플랜 docs/PLAN_20261104_MODEL_STORAGE.md) ──
export type StorageItem = {
  id: string;
  engine: string;
  label: string;
  path: string;
  bytes: number;
  removable: boolean;
  inUse: boolean;
  note: string;
  reGb?: number;
};
export type StorageReport = { dir: string; isDefault: boolean; freeBytes: number | null; totalBytes: number; moving: boolean; stage: string; items: StorageItem[] };

/** 저장 공간 관리가 되는 엔진인가(0.5.0+) */
export function hasStorage(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("storage");
}
export const gb = (bytes: number | null | undefined) => (bytes == null ? "확인 불가" : `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1)}GB`);

/** 항목별 실제 크기(엔진이 폴더를 재므로 수십 GB면 몇 초 걸림) */
export async function getStorage(): Promise<StorageReport> {
  return (await call("/storage", {}, 120_000)).json();
}
export async function removeStorageItem(id: string): Promise<{ partial: boolean }> {
  return (await call("/storage/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }, 120_000)).json();
}
/** 모델 저장 폴더 바꾸기 — move: 받은 모델 옮기기 · fresh: 새로 받기. 엔진이 바로 답하고 뒤에서 옮긴다(상태 문구로 진행 표시) */
export async function moveModelsFolder(path: string, mode: "move" | "fresh"): Promise<{ dir: string }> {
  return (await call("/storage/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, mode }) }, 120_000)).json();
}

export const QUEUE_LABEL: Record<QueueStatus, string> = { queued: "대기 중", running: "만드는 중", done: "완료", failed: "실패", cancelled: "취소됨", interrupted: "중단됨" };

/** 작업 대기열이 있는 엔진인가(0.1.6+) */
export function hasQueue(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("queue");
}

/** 대기 중·만드는 중인 작업 수 */
export const activeCount = (jobs: QueueJob[]) => jobs.filter((j) => j.status === "queued" || j.status === "running").length;

export async function listQueue(): Promise<QueueJob[]> {
  const data = await (await call("/queue")).json();
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

/** 노래 만들기를 대기열에 넣는다(곡 번호는 여기서 만들어 보관함 파일 이름·기록에 같이 쓴다). */
export async function enqueueSong(
  song: SongForEngine,
  info: { title: string; songId: string | null; device: string },
  quality?: EngineQuality | null,
  engine: MusicEngineId = "acestep",
  hfToken?: string | null
): Promise<QueueJob> {
  const track: QueueTrack = { id: crypto.randomUUID(), song_id: info.songId, style_prompt: song.style_prompt, lyrics: song.lyrics, duration_sec: song.duration_sec, device: info.device, kind: "text2music" };
  const res = await call("/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // engine은 ACE-Step이 아닐 때만 보낸다(옛 엔진은 모르는 칸을 그냥 무시하지만, 상업용이 기본). 토큰은 엔진 메모리에만(대기열 파일에 안 남음)
    body: JSON.stringify({ kind: "text2music", title: info.title, track, task: buildTaskBody(song, info.device, quality), ...(engine !== "acestep" ? { engine } : {}), ...(hfToken ? { hfToken } : {}) }),
  });
  return (await res.json()).job;
}

// ── 마스터링(엔진 0.6.9+, 원본 boks-music mastering.mjs) ─────────────
// 엔진 0.8.2+: 소리 색깔(tone, AI 마스터링 스튜디오의 EQ·포화·압축·폭)·-16·-18 LUFS — 프리셋은 src/lib/masterPresets.ts
export type MasterOptions = { targetLufs: MasterLufs; truePeak: -2 | -1 | -0.5 | 0; character: "balanced" | "gentle" | "punchy"; tone?: MasterTone };
export const MASTER_DEFAULTS: MasterOptions = { targetLufs: -10, truePeak: -1, character: "balanced" };
export const MASTER_LUFS_LABEL: Record<MasterOptions["targetLufs"], string> = { [-18]: "-18 LUFS · 클래식·명상(강약 최대)", [-16]: "-16 LUFS · 팟캐스트·잔잔한 곡", [-14]: "-14 LUFS · 유튜브·스포티파이 기준", [-12]: "-12 LUFS · 조금 크게", [-10]: "-10 LUFS · 기본(요즘 음원 크기)", [-8]: "-8 LUFS · 아주 크게" };
export const MASTER_CHARACTER_LABEL: Record<MasterOptions["character"], string> = { balanced: "균형(기본)", gentle: "부드럽게 — 강약 살림", punchy: "강하게 — 단단한 소리" };

/** 소리 색깔·-16/-18 LUFS를 받는가(엔진 0.8.2+) */
export function hasMasterTone(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("master-tone");
}

/** 이 엔진이 마스터링을 할 수 있는가(0.6.9+, ffmpeg 있음) */
export function hasMastering(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("master");
}

/** 보관함 곡을 마스터링 대기열에 넣는다 — 결과는 새 곡(「제목 (마스터링)」, 원곡 번호 연결, 사용 범위는 원곡 그대로) */
export async function enqueueMaster(
  source: { id: string; title: string; style_prompt: string; lyrics: string; duration_sec: number; device: string; license: "commercial" | "noncommercial"; song_id: string | null },
  options: MasterOptions
): Promise<QueueJob> {
  const track: QueueTrack = { id: crypto.randomUUID(), song_id: source.song_id, style_prompt: source.style_prompt, lyrics: source.lyrics, duration_sec: source.duration_sec, device: source.device, kind: "master", parent_id: source.id };
  const title = `${source.title} (마스터링)`.slice(0, 80);
  const res = await call("/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "master", title, track, task: { sourceId: source.id, options }, license: source.license }),
  });
  return (await res.json()).job;
}

/** 이 엔진이 YuE2 커버(원곡 멜로디 받아 적기)를 할 수 있는가(0.8.0+, 윈도우 + NVIDIA 8GB 이상) */
export function hasYue2Cover(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("yue2cover");
}

/** 가져온 음악 커버·부분 수정을 대기열에 넣는다(원곡 파일은 회원 PC 엔진으로만, 60MB까지). */
export async function enqueueEdit(
  source: File,
  opts: EditOptions,
  sourceSec: number,
  info: { title: string; device: string; parentId?: string | null; engine?: "acestep" | "yue2"; projectId?: string | null },
  quality?: EngineQuality | null
): Promise<QueueJob> {
  const track: QueueTrack = { id: crypto.randomUUID(), song_id: null, style_prompt: opts.style_prompt, lyrics: opts.lyrics, duration_sec: Math.round(sourceSec), device: info.device, kind: opts.mode, parent_id: info.parentId ?? null, ...(info.projectId ? { project_id: info.projectId } : {}) };
  const form = new FormData();
  // 엔진 0.8.0: 커버는 YuE2도(원곡 멜로디 받아 적기, 비상업) — ACE-Step일 때는 옛 엔진과 같게 engine 칸을 보내지 않는다
  form.append("meta", JSON.stringify({ kind: opts.mode, title: info.title, track, fields: buildEditFields(opts, sourceSec, quality), ...(info.engine === "yue2" ? { engine: "yue2" } : {}) }));
  form.append("src_audio", source, source.name);
  const res = await call("/queue/edit", { method: "POST", body: form }, 180_000);
  return (await res.json()).job;
}

export async function cancelJob(id: string) {
  await call(`/queue/${id}/cancel`, { method: "POST" });
}
export async function rerunJob(id: string) {
  await call(`/queue/${id}/rerun`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackId: crypto.randomUUID() }) });
}
export async function dismissJob(id: string) {
  await call(`/queue/${id}`, { method: "DELETE" });
}
export async function markJobRecorded(id: string) {
  await call(`/queue/${id}/recorded`, { method: "POST" });
}

/** 끝난 작업 → 「모든 음악」 기록 본문(/api/tracks) */
export function trackRecordOf(job: QueueJob) {
  return { ...job.track, title: job.title, license: job.license ?? licenseOfEngine(job.engine ?? "acestep") };
}

// ── Stem 분리(엔진 0.6.9+, 원본 boks-music runner.py stems) ─────────────
export type StemMode = "two" | "multi";
export const STEM_MODE_LABEL: Record<StemMode, string> = { two: "2트랙 — 보컬 / 반주", multi: "6트랙 — 보컬·드럼·베이스·기타·피아노·그 외" };
export type StemBatch = { id: string; mode: StemMode; createdAt: string; dir: string; device: string; files: { label: string; size: number; missing: boolean }[] };

/** 이 엔진이 Stem 분리를 할 수 있는가(0.6.9+, 윈도우) */
export function hasStems(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("stems");
}
/** 보관함 곡을 Stem 분리 대기열에 넣는다 — 결과는 곡이 아니라 노래 저장 폴더 「Stem」의 WAV */
export async function enqueueStems(source: { id: string; title: string; style_prompt: string; lyrics: string; duration_sec: number; device: string; song_id: string | null; license: "commercial" | "noncommercial" }, mode: StemMode): Promise<QueueJob> {
  const track: QueueTrack = { id: crypto.randomUUID(), song_id: source.song_id, style_prompt: source.style_prompt, lyrics: source.lyrics, duration_sec: source.duration_sec, device: source.device, kind: "stems", parent_id: source.id };
  const title = `${source.title} (${mode === "multi" ? "6트랙" : "2트랙"} Stem)`.slice(0, 80);
  const res = await call("/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "stems", title, track, task: { sourceId: source.id, mode }, license: source.license }) });
  return (await res.json()).job;
}
export async function listStems(sourceId: string): Promise<StemBatch[]> {
  return (await (await call(`/library/${sourceId}/stems`)).json()).stems ?? [];
}
/** n번째 트랙 WAV를 브라우저 안 주소로(다 쓰면 URL.revokeObjectURL) */
export async function fetchStemFile(sourceId: string, stemId: string, n: number): Promise<string> {
  const res = await call(`/library/${sourceId}/stems/${stemId}/${n}`, {}, 300_000);
  return URL.createObjectURL(await res.blob());
}
export async function deleteStems(sourceId: string, stemId: string) {
  await call(`/library/${sourceId}/stems/${stemId}`, { method: "DELETE" });
}

// ── 가사 자동 맞추기(엔진 0.6.9+, 원본 boks-music lyric-alignment) ─────────────
/** 이 엔진이 가사 시간을 자동으로 맞출 수 있는가(0.6.9+, 윈도우·ffmpeg) */
export function hasAlign(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("align");
}
/** 보관함 곡의 가사 시간 자동 맞추기를 대기열에 넣는다 — 끝나면 사이트가 곡 기록의 가사 시간에 저장(직접 맞춘 시작점은 유지) */
export async function enqueueAlign(source: { id: string; title: string; style_prompt: string; lyrics: string; duration_sec: number; device: string; song_id: string | null; license: "commercial" | "noncommercial"; lyric_timing?: unknown }): Promise<QueueJob> {
  const track: QueueTrack = { id: crypto.randomUUID(), song_id: source.song_id, style_prompt: source.style_prompt, lyrics: source.lyrics, duration_sec: source.duration_sec, device: source.device, kind: "align", parent_id: source.id };
  const title = `${source.title} (가사 시간)`.slice(0, 80);
  const res = await call("/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "align", title, track, task: { sourceId: source.id, lyrics: source.lyrics, previousTiming: source.lyric_timing ?? null }, license: source.license }) });
  return (await res.json()).job;
}

// ── 내 PC 앨범 그림(엔진 0.7.0+, 원본 boks-music image-engine) ─────────────
export type ImageVariant = {
  id: string;
  family: string;
  familyName: string;
  quant: string;
  note: string;
  minVramGB: number;
  recVramGB: number;
  steps: number;
  modelBytes: number;
  weightsGB: number;
  status: "available" | "slow" | "unavailable";
  reason: string;
  installed: boolean;
  downloadBytes: number;
  recommended?: boolean;
  familyRecommended?: boolean;
  /** 엔진 0.7.8: 최소는 넘지만 권장 그래픽 메모리보다 작음(실패할 수 있음, reason에 안내) */
  tight?: boolean;
};
export type ImageModelState = {
  build: { id: string; label: string } | null;
  reason: string;
  hardware: { gpuGB: number; ramGB: number; diskGB: number; shared: boolean; unknownVram: boolean };
  recommendedId: string | null;
  families: { id: string; name: string; vendor: string; license: string; parameters: string; description: string; variants: ImageVariant[] }[];
  engineInstalled: boolean;
  installed: string[];
  defaultId: string | null;
  /** 그림 모델 폴더(0.7.1+) — 기본은 모델 저장 폴더 안 */
  dir?: string;
  isDefault?: boolean;
  moving?: { done: number; total: number } | null;
  moveError?: string;
};
/** 이 엔진이 내 PC에서 앨범 그림을 그릴 수 있는가(0.7.0+) */
export function hasLocalArt(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("local-art");
}
export async function getImageModels(): Promise<ImageModelState> {
  return (await call("/image-models")).json();
}
export async function setDefaultImageModel(id: string) {
  await call(`/image-models/${encodeURIComponent(id)}/default`, { method: "POST" });
}
/** 그림 모델만 다른 폴더로(0.7.1+) — 고른 폴더 안 「ImageModels」(엔진 0.7.2, 0.7.1은 「AIMaster-ImageModels」). 뒤에서 옮기므로 getImageModels().moving으로 지켜본다 */
export async function moveImageModelsFolder(path: string, mode: "move" | "fresh"): Promise<{ dir: string }> {
  return (await call("/image-models/folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, mode }) })).json();
}
export async function removeImageModel(id: string) {
  await call(`/image-models/${encodeURIComponent(id)}`, { method: "DELETE" });
}
/** 내 PC 그림 작업을 대기열에 넣는다 — 처음이면 엔진·모델을 받는다. 결과 PNG는 fetchLocalArt(작업 번호) */
/**
 * 처음 고를 내 PC 그림 판 — 기본으로 정한 판 → 받아 둔 판 중 추천 판 → 받아 둔 판 중 「메모리 빠듯」 아닌 판 → 받아 둔 첫 판 → 추천 판.
 * 엔진 0.7.9 pickImageVariant와 같은 규칙(권장보다 메모리가 작은 PC에서 받아 둔 BF16이 먼저 골라져 실패하던 것, 2026-11-09).
 */
export function pickLocalArtVariant(s: Pick<ImageModelState, "defaultId" | "installed" | "recommendedId" | "families">): string {
  if (s.defaultId) return s.defaultId;
  if (s.recommendedId && s.installed.includes(s.recommendedId)) return s.recommendedId;
  const rows = s.families.flatMap((f) => f.variants);
  const ok = s.installed.find((id) => {
    const r = rows.find((x) => x.id === id);
    return !!r && r.status === "available" && !r.tight;
  });
  return ok || s.installed[0] || s.recommendedId || "";
}

export async function enqueueLocalArt(info: { title: string; songId: string | null; style: string; lyrics: string }, prompt: string, variantId?: string): Promise<QueueJob> {
  const track: QueueTrack = { id: crypto.randomUUID(), song_id: info.songId, style_prompt: info.style, lyrics: info.lyrics, duration_sec: 0, device: "", kind: "art" };
  const res = await call("/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "art", title: `${info.title || "앨범 그림"} (그림)`.slice(0, 80), track, task: { prompt, ...(variantId ? { variantId } : {}) } }),
  });
  return (await res.json()).job;
}
/** 그린 그림을 base64로(하루 보관) */
export async function fetchLocalArt(jobId: string): Promise<{ base64: string; mimeType: string }> {
  const buf = await (await call(`/image-art/${jobId}`, {}, 60_000)).arrayBuffer();
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { base64: btoa(s), mimeType: "image/png" };
}

// ── 플레이리스트 영상(엔진 0.6.9+, 원본 boks-music video-render) ─────────────
export type VideoSessionStatus = "analyzing" | "rendering" | "finishing" | "done" | "failed" | "cancelled";
export type VideoChapter = { start: number; title: string; trackId: string };
export type VideoRecord = {
  id: string;
  title: string;
  file: string;
  createdAt: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: "mp4" | "mov";
  repeat: number;
  template: string;
  trackIds: string[];
  chapters: VideoChapter[];
  loudness: string;
  encoder: { encoder: string; hardware: boolean; codec: string };
  missing?: boolean;
};
export type VideoSession = {
  id: string;
  title: string;
  status: VideoSessionStatus;
  stage: string;
  progress: number;
  error: string | null;
  options: { width: number; height: number; fps: number; repeat: number; format: "mp4" | "mov"; normalize: boolean };
  tracks: { id: string; title: string; duration: number | null }[];
  timing: { cycleDuration: number; cycleFrames: number; alignedCycleDuration: number; duration: number; frames: number } | null;
  bitrate: number | null;
  written: number;
  video: VideoRecord | null;
};

/** 이 엔진이 플레이리스트 영상을 만들 수 있는가(0.6.9+, ffmpeg 있음) */
export function hasVideo(status: EngineStatus | null): boolean {
  return !!status?.features?.includes("video");
}
export async function startVideo(body: { title: string; template: string; tracks: { id: string; title: string }[]; options: Record<string, unknown> }): Promise<VideoSession> {
  const res = await call("/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json()).session;
}
export async function getVideoSession(id: string): Promise<VideoSession> {
  return (await (await call(`/video/${id}`)).json()).session;
}
export async function getVideoAnalysis(id: string, index: number): Promise<unknown> {
  return (await call(`/video/${id}/analysis/${index}`, {}, 60_000)).json();
}
/** 그림 조각 올리기 — offset은 지금까지 보낸 크기 */
export async function uploadVideoChunk(id: string, offset: number, bytes: Uint8Array): Promise<number> {
  const res = await call(`/video/${id}/chunk`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Offset": String(offset) }, body: bytes as BodyInit }, 120_000);
  return (await res.json()).written;
}
export async function finishVideo(id: string, report: { frames: number; written: number; hardware: boolean; codec: string }): Promise<VideoSession> {
  const res = await call(`/video/${id}/finish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) });
  return (await res.json()).session;
}
export async function cancelVideo(id: string) {
  await call(`/video/${id}/cancel`, { method: "POST" });
}
export async function listVideos(): Promise<{ videos: VideoRecord[]; dir: string }> {
  return (await call("/videos")).json();
}
/** <video>로 바로 재생하는 주소(머리글을 못 붙여 연결 토큰을 주소에 — 내 PC 127.0.0.1에서만 쓰임) */
export function videoFileUrl(id: string): string {
  return `${ENGINE_URL}/videos/${id}/file?t=${encodeURIComponent(getToken() ?? "")}`;
}
export async function deleteVideo(id: string, removeFile: boolean): Promise<{ fileRemoved: boolean }> {
  return (await call(`/videos/${id}${removeFile ? "?file=1" : ""}`, { method: "DELETE" })).json();
}
export async function revealVideoFolder() {
  await call("/videos/reveal", { method: "POST" });
}

/** 완성 음원을 받아 브라우저 안 주소(blob:)로 돌려준다. 재생·내려받기에 같이 쓴다. */
export async function fetchAudio(file: string): Promise<string> {
  const res = await call(file, {}, 120_000);
  return URL.createObjectURL(await res.blob());
}import type { MasterLufs, MasterTone } from "@/lib/masterPresets";
import { detectLyricLanguage } from "./lyricLanguages";

