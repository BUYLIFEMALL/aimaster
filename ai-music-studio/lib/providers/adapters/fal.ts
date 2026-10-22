import "server-only";
import { providerError, type ProviderAdapter } from "../types";
import type { GenerationInput, MusicModel } from "../catalog";

// fal.ai 대기열(queue) API — 2026-10-23 공식 문서(fal.ai/docs/model-endpoints/queue) 기준.
// 제출 POST https://queue.fal.run/{모델} → status_url·response_url을 그대로 저장해 쓴다(하위 경로 모델은 주소를 직접 만들면 405).
// 상태 IN_QUEUE·IN_PROGRESS·COMPLETED(실패면 error 포함). 결과의 audio.url(또는 audio_url)을 받는다.
const AUTH = (key: string) => ({ Authorization: `Key ${key}` });

function inputFor(model: MusicModel, input: GenerationInput): Record<string, unknown> {
  const lyrics = input.lyrics.trim();
  switch (model.model) {
    case "fal-ai/minimax-music/v2.6": {
      // prompt 10~2000자, lyrics 최대 3500자. 가사를 비우면 lyrics_optimizer로 설명에서 가사를 쓴다.
      const prompt = input.prompt.trim().padEnd(10, ".").slice(0, 2000);
      return input.instrumental
        ? { prompt, is_instrumental: true }
        : lyrics
          ? { prompt, lyrics: lyrics.slice(0, 3500) }
          : { prompt, lyrics_optimizer: true };
    }
    case "fal-ai/ace-step":
      return { tags: input.prompt.trim().slice(0, 1000), lyrics: input.instrumental ? "[inst]" : lyrics.slice(0, 4000), duration: input.durationS };
    case "fal-ai/stable-audio-25/text-to-audio":
      return { prompt: input.prompt.trim().slice(0, 2000), seconds_total: input.durationS };
    default:
      return { prompt: input.prompt.trim() };
  }
}

function audioUrl(json: Record<string, unknown>): string | null {
  const a = json.audio as unknown;
  if (typeof a === "string") return a;
  if (a && typeof a === "object" && typeof (a as { url?: unknown }).url === "string") return (a as { url: string }).url;
  if (typeof json.audio_url === "string") return json.audio_url;
  const af = json.audio_file as { url?: string } | undefined;
  return af?.url ?? null;
}

export const falAdapter: ProviderAdapter = {
  synchronous: false,
  async start(model, input, apiKey) {
    const res = await fetch(`https://queue.fal.run/${model.model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH(apiKey) },
      body: JSON.stringify(inputFor(model, input)),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("fal.ai", res.status, await res.text());
    const json = (await res.json()) as { request_id?: string; status_url?: string; response_url?: string };
    if (!json.request_id || !json.status_url || !json.response_url) throw new Error("fal.ai가 작업 번호를 돌려주지 않았습니다.");
    return { kind: "queued", taskId: json.request_id, meta: { status_url: json.status_url, response_url: json.response_url } };
  },
  async poll(_model, _taskId, meta, apiKey) {
    const statusUrl = String(meta.status_url ?? "");
    const responseUrl = String(meta.response_url ?? "");
    if (!statusUrl || !responseUrl) return { state: "failed", error: "fal.ai 작업 주소가 저장되지 않았습니다." };
    const s = await fetch(statusUrl, { headers: AUTH(apiKey), signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!s.ok) throw providerError("fal.ai 상태 확인", s.status, await s.text());
    const status = (await s.json()) as { status?: string; error?: string };
    if (status.status !== "COMPLETED") return { state: "processing" };
    if (status.error) return { state: "failed", error: `fal.ai 생성 실패: ${String(status.error).slice(0, 300)}` };
    const r = await fetch(responseUrl, { headers: AUTH(apiKey), signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!r.ok) return { state: "failed", error: providerError("fal.ai 결과", r.status, await r.text()).message };
    const url = audioUrl((await r.json()) as Record<string, unknown>);
    if (!url) return { state: "failed", error: "fal.ai 결과에 음원 주소가 없습니다." };
    return { state: "done", files: [{ url }] };
  },
};
