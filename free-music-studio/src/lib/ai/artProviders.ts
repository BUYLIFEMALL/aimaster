import "server-only";
// 앨범 그림 GPT Image·Replicate 호출 — 이미지 자동화 기준 프로그램(ai-image-studio lib/providers/adapters/openai.ts·replicate.ts, 2026-11-05)의
// 주소·요청 칸·응답 받는 법만 가져왔다(그림 설명은 이 프로그램 lib/albumArt.ts). 이중 과금을 막으려고 재시도하지 않는다.

export class ArtError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

/** GPT Image — 정사각형 1024, base64(b64_json)로만 돌아온다 */
export async function openaiImage(apiKey: string, model: string, prompt: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024", output_format: "png" }),
    signal: AbortSignal.timeout(130_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new ArtError("OpenAI API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 다시 등록해 주세요.", 400);
    if (res.status === 429) throw new ArtError("OpenAI 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도하거나 결제 상태를 확인해 주세요.", 429);
    throw new ArtError(`GPT Image가 그림을 만들지 못했습니다(${res.status}). ${String(data?.error?.message ?? "").slice(0, 160)}`);
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new ArtError("GPT Image가 그림을 돌려주지 않았습니다. 설명을 바꿔 다시 시도해 주세요.");
  return { base64: b64, mimeType: "image/png" };
}

/** Replicate(FLUX 2·Seedream·Z-Image·Recraft) — 모델별 정사각형 칸(input), 동기 대기 55초 + 상태 조회, 결과 주소에서 그림을 받아 base64로 */
export async function replicateImage(apiKey: string, model: string, prompt: string, input: Readonly<Record<string, string>> = { aspect_ratio: "1:1", output_format: "png" }): Promise<{ base64: string; mimeType: string }> {
  const auth = `Bearer ${apiKey.trim().replace(/^(Bearer|Token)\s+/i, "")}`;
  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json", Prefer: "wait=55" },
    body: JSON.stringify({ input: { prompt, ...input } }),
    signal: AbortSignal.timeout(70_000),
  });
  if (!res.ok) {
    if (res.status === 401) throw new ArtError("Replicate API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 다시 등록해 주세요.", 400);
    if (res.status === 402) throw new ArtError("Replicate 결제(크레딧)가 필요합니다. replicate.com 결제 상태를 확인해 주세요.", 402);
    if (res.status === 404) throw new ArtError("Replicate에서 이 모델을 찾지 못했습니다. 다른 모델을 골라 주세요.", 404);
    if (res.status === 422) throw new ArtError("Replicate 모델이 요청 칸을 받지 않았습니다. 다른 모델을 골라 주세요.", 422);
    throw new ArtError(`Replicate 요청이 실패했습니다(${res.status}).`);
  }
  let pred = await res.json();
  for (let i = 0; pred.status !== "succeeded" && i < 25; i++) {
    if (pred.status === "failed" || pred.status === "canceled") throw new ArtError(`Replicate 모델이 그림을 만들지 못했습니다. ${String(pred.error ?? "").slice(0, 160)}`);
    if (!pred.urls?.get) break;
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(pred.urls.get, { headers: { Authorization: auth } }).catch(() => null);
    if (poll?.ok) pred = await poll.json();
  }
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (pred.status !== "succeeded" || typeof url !== "string") throw new ArtError("Replicate 그림이 제때 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.", 504);
  const img = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!img.ok) throw new ArtError("만든 그림을 받아 오지 못했습니다. 다시 시도해 주세요.");
  return { base64: Buffer.from(await img.arrayBuffer()).toString("base64"), mimeType: img.headers.get("content-type") || "image/png" };
}
