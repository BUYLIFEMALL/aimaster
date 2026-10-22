import "server-only";
import { providerError, type ProviderAdapter } from "../types";
import type { GenerationInput, MusicModel } from "../catalog";

// Replicate 공식 모델 예측 — 2026-10-23 공식 문서(replicate.com/docs/reference/http) 기준.
// 제출 POST /v1/models/{owner}/{name}/predictions { input } → 조회 GET /v1/predictions/{id}.
// 상태 starting·processing·succeeded·failed·canceled. 결과 output은 음원 주소 문자열(배열일 수도 있음).
// 결과·입력은 1시간 뒤 Replicate에서 지워지므로 완료되면 바로 우리 저장소로 옮긴다.
const API = "https://api.replicate.com/v1";
const AUTH = (key: string) => ({ Authorization: `Bearer ${key}` });

function inputFor(model: MusicModel, input: GenerationInput): Record<string, unknown> {
  const prompt = input.prompt.trim();
  switch (model.model) {
    case "minimax/music-2.5":
      return { lyrics: input.lyrics.trim().slice(0, 3500), prompt: prompt.slice(0, 2000) };
    case "google/lyria-2":
      return { prompt: prompt.slice(0, 2000) };
    case "stability-ai/stable-audio-2.5":
      return { prompt: prompt.slice(0, 2000), duration: input.durationS };
    default:
      return { prompt };
  }
}

export const replicateAdapter: ProviderAdapter = {
  synchronous: false,
  async start(model, input, apiKey) {
    const res = await fetch(`${API}/models/${model.model}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH(apiKey) },
      body: JSON.stringify({ input: inputFor(model, input) }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("Replicate", res.status, await res.text());
    const json = (await res.json()) as { id?: string; status?: string; error?: unknown };
    if (!json.id) throw new Error("Replicate가 작업 번호를 돌려주지 않았습니다.");
    return { kind: "queued", taskId: json.id };
  },
  async poll(_model, taskId, _meta, apiKey) {
    const res = await fetch(`${API}/predictions/${encodeURIComponent(taskId)}`, {
      headers: AUTH(apiKey),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("Replicate 상태 확인", res.status, await res.text());
    const p = (await res.json()) as { status?: string; output?: unknown; error?: unknown };
    if (p.status === "failed" || p.status === "canceled") {
      return { state: "failed", error: `Replicate 생성 실패: ${String(p.error ?? p.status).slice(0, 300)}` };
    }
    if (p.status !== "succeeded") return { state: "processing" };
    const urls = (Array.isArray(p.output) ? p.output : [p.output]).filter((u): u is string => typeof u === "string" && u.startsWith("http"));
    if (!urls.length) return { state: "failed", error: "Replicate 결과에 음원 주소가 없습니다." };
    return { state: "done", files: urls.map((url) => ({ url, fetchHeaders: AUTH(apiKey) })) };
  },
};
