import "server-only";
import { providerError, type ProviderAdapter } from "../types";

// Mureka (platform.mureka.ai) — 2026-10-23 공식 MCP 서버 소스(github.com/SkyworkAI/Mureka-mcp mureka_mcp/api.py)와 API 문서 목록 기준.
// 보컬곡  POST https://api.mureka.ai/v1/song/generate         { lyrics, model, prompt } → { id }
//          GET  /v1/song/query/{id}                            → { status, choices[].url }
// 연주곡  POST /v1/instrumental/generate                       { model, prompt }       → { id }
//          GET  /v1/instrumental/query/{id}
// 상태 succeeded=완료, failed·cancelled·timeouted=실패, 그 밖(preparing 등)=진행 중. 웹훅이 없어 화면·목록 조회가 상태를 확인한다.
// ⚠️ 2026-10-23 코드만 작성 — 실제 호출 시험 전(선불 $30 충전 필요). catalog의 MUREKA_ENABLED=false 동안 화면·서버에 나오지 않는다.
//    켤 때: 실제 1곡 생성으로 choices 칸(url·duration 단위)과 모델 이름을 확인한다.
const BASE = "https://api.mureka.ai";
const AUTH = (key: string) => ({ Authorization: `Bearer ${key}` });
const FAILED = new Set(["failed", "cancelled", "timeouted"]);

export const murekaAdapter: ProviderAdapter = {
  synchronous: false,
  async start(model, input, apiKey) {
    const kind = input.instrumental ? "instrumental" : "song";
    const prompt = [input.prompt.trim(), input.language && input.language !== "auto" ? `Language: ${input.language}` : ""].filter(Boolean).join(", ").slice(0, 1000);
    const body = input.instrumental
      ? { model: model.model, prompt }
      : { model: model.model, prompt, lyrics: input.lyrics.trim().slice(0, 3000) };
    const res = await fetch(`${BASE}/v1/${kind}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH(apiKey) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("Mureka", res.status, await res.text());
    const json = (await res.json()) as { id?: string | number };
    if (json.id === undefined || json.id === null || String(json.id) === "") throw new Error("Mureka가 작업 번호를 돌려주지 않았습니다.");
    return { kind: "queued", taskId: String(json.id), meta: { kind } };
  },
  async poll(_model, taskId, meta, apiKey) {
    const kind = meta.kind === "instrumental" ? "instrumental" : "song";
    const res = await fetch(`${BASE}/v1/${kind}/query/${encodeURIComponent(taskId)}`, {
      headers: AUTH(apiKey),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("Mureka 상태 확인", res.status, await res.text());
    const json = (await res.json()) as { status?: string; failed_reason?: string; choices?: { url?: string; flac_url?: string; duration?: number }[] };
    const status = json.status ?? "";
    if (FAILED.has(status)) return { state: "failed", error: `Mureka 생성 실패(${status})${json.failed_reason ? `: ${String(json.failed_reason).slice(0, 300)}` : ""}` };
    if (status !== "succeeded") return { state: "processing" };
    const files = (json.choices ?? []).filter((c) => typeof c.url === "string" && c.url).map((c) => ({ url: c.url as string, contentType: "audio/mpeg" }));
    if (!files.length) return { state: "failed", error: "Mureka 결과에 음원 주소가 없습니다." };
    return { state: "done", files };
  },
};
