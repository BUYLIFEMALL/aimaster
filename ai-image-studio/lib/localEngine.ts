// 내 PC(무료) 그림 — 회원 PC의 「AI 무료음악 엔진」(그림도 그림)에 직접 연결한다(D-3, 2026-11-09 주인님 「1안으로 진행해」).
// 그림 엔진·모델은 음악 프로그램과 같은 폴더(\AIMaster\ImageModels)를 그대로 쓰므로 다시 받지 않는다.
// 엔진 0.8.1+가 이 사이트(ai-image-studio.buylife.xyz)를 허용하고, 이 사이트에서는 그림 주소만 쓸 수 있다.
// 호출 형식은 free-music-studio/src/lib/engine.ts(getImageModels·enqueueLocalArt·fetchLocalArt·pickLocalArtVariant)와 같다 — 연동 부분만 맞춘다.

export const ENGINE_URL = "http://127.0.0.1:47821";
export const ENGINE_DOWNLOAD_URL = "https://free-music-studio.buylife.xyz/engine";
const TOKEN_KEY = "ais.localEngineToken";

export class LocalEngineError extends Error {
  constructor(message: string, public needPair = false) {
    super(message);
  }
}

export type LocalEngineStatus = { name: string; version: string; features?: string[]; device?: string };

export type ImageVariant = {
  id: string;
  family: string;
  familyName: string;
  quant: string;
  note: string;
  minVramGB: number;
  recVramGB: number;
  status: "available" | "slow" | "unavailable";
  reason: string;
  installed: boolean;
  downloadBytes: number;
  recommended?: boolean;
  tight?: boolean;
};
export type ImageModelState = {
  build: { id: string; label: string } | null;
  reason: string;
  recommendedId: string | null;
  families: { id: string; name: string; vendor: string; license: string; description: string; variants: ImageVariant[] }[];
  engineInstalled: boolean;
  installed: string[];
  defaultId: string | null;
};
export type LocalJob = { id: string; kind: string; status: "queued" | "running" | "done" | "failed" | "cancelled" | "interrupted"; stage: string; error?: string; result?: { model?: string; seconds?: number; vramPeakGb?: number | null } };

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

const OFFLINE = "내 PC 엔진이 켜져 있지 않습니다. 「AI 무료음악 엔진」을 설치·실행해 주세요.";

async function call(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(ENGINE_URL + path, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new LocalEngineError(OFFLINE);
  }
  if (res.status === 401 && path !== "/pair") {
    setToken(null);
    throw new LocalEngineError("PC 연결이 필요합니다. 엔진 창의 연결 코드 6자리를 넣어 주세요.", true);
  }
  if (res.status === 403) {
    const d = await res.json().catch(() => null);
    throw new LocalEngineError((d && d.error) || "엔진이 이 사이트를 허용하지 않습니다. 엔진을 0.8.1 이상으로 업데이트해 주세요.");
  }
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new LocalEngineError((d && typeof d.error === "string" && d.error) || `엔진 오류(${res.status})`);
  }
  return res;
}

/** 엔진 상태 — 꺼져 있으면 null */
export async function getStatus(): Promise<LocalEngineStatus | null> {
  try {
    const r = await fetch(`${ENGINE_URL}/status`, { signal: AbortSignal.timeout(3000) });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

/** 엔진 창의 6자리 연결 코드로 이 사이트를 연결 */
export async function pair(code: string): Promise<void> {
  const res = await call("/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim() }) });
  const { token } = await res.json();
  if (typeof token !== "string" || !token) throw new LocalEngineError("연결하지 못했습니다. 다시 시도해 주세요.");
  setToken(token);
}
export const unpair = () => setToken(null);

/** 내 PC 그림을 그릴 수 있는 엔진인가(0.7.0+ 그림, 0.8.1+ 이 사이트 허용) */
export const hasLocalArt = (s: LocalEngineStatus | null) => !!s?.features?.includes("local-art");
export function versionAtLeast(v: string | undefined, min: string): boolean {
  const a = String(v ?? "0").split(".").map(Number);
  const b = min.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return true;
}

export async function getImageModels(): Promise<ImageModelState> {
  return (await call("/image-models")).json();
}

/** 처음 고를 판 — 기본 판 → 받아 둔 추천 판 → 받아 둔 판 중 「메모리 빠듯」 아닌 판 → 받아 둔 첫 판 → 추천 판(음악 프로그램과 같은 규칙) */
export function pickVariant(s: Pick<ImageModelState, "defaultId" | "installed" | "recommendedId" | "families">): string {
  if (s.defaultId) return s.defaultId;
  if (s.recommendedId && s.installed.includes(s.recommendedId)) return s.recommendedId;
  const rows = s.families.flatMap((f) => f.variants);
  const ok = s.installed.find((id) => {
    const r = rows.find((x) => x.id === id);
    return !!r && r.status === "available" && !r.tight;
  });
  return ok || s.installed[0] || s.recommendedId || "";
}

/** 그림 작업을 엔진 대기열에 넣는다(처음이면 엔진이 그림 엔진·모델을 받는다) */
export async function enqueueArt(prompt: string, variantId?: string, title = "이미지 자동화 그림"): Promise<LocalJob> {
  const track = { id: crypto.randomUUID(), song_id: null, style_prompt: "", lyrics: "", duration_sec: 0, device: "", kind: "art" };
  const res = await call("/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "art", title: title.slice(0, 80), track, task: { prompt, ...(variantId ? { variantId } : {}) } }),
  });
  return (await res.json()).job;
}

export async function getJob(id: string): Promise<LocalJob | null> {
  const data = await (await call("/queue")).json();
  return (Array.isArray(data?.jobs) ? data.jobs : []).find((j: LocalJob) => j.id === id) ?? null;
}
export async function cancelJob(id: string) {
  await call(`/queue/${id}/cancel`, { method: "POST" });
}

/** 그린 PNG(엔진에 하루 보관) → Blob */
export async function fetchArt(jobId: string): Promise<Blob> {
  const buf = await (await call(`/image-art/${jobId}`, {}, 60_000)).arrayBuffer();
  return new Blob([buf], { type: "image/png" });
}
