import "server-only";
import { composePrompt, providerError, type ProviderAdapter } from "../types";

// Google Lyria (Gemini API interactions) — 2026-10-23 공식 문서(ai.google.dev/gemini-api/docs/music-generation) 기준.
// POST /v1beta/interactions { model, input, response_format:{type:"audio"} } → steps[].content[]에 audio(base64)·text(가사).
// 한 번에 끝나는 호출이라 서버가 응답 뒤(waitUntil)에서 기다린다. 유료 생성이므로 자동 재시도하지 않는다(이중 과금 방지).
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const TIMEOUT_MS = 240_000;

interface Part {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
  mimeType?: string;
}

/** 응답 모양이 조금 달라도 audio·text 조각을 모두 찾는다(steps[].content[], output_audio 등) */
function collectParts(node: unknown, out: Part[] = []): Part[] {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const n of node) collectParts(n, out);
    return out;
  }
  const obj = node as Record<string, unknown>;
  if ((obj.type === "audio" && typeof obj.data === "string") || (obj.type === "text" && typeof obj.text === "string")) {
    out.push(obj as Part);
    return out;
  }
  for (const v of Object.values(obj)) collectParts(v, out);
  return out;
}

export const geminiAdapter: ProviderAdapter = {
  synchronous: true,
  async start(model, input, apiKey) {
    const text = composePrompt(input, { withLyrics: true, withDuration: model.durationControl });
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ model: model.model, input: text.slice(0, 8000), response_format: { type: "audio" } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("Google Lyria", res.status, await res.text());
    const json = await res.json();
    const parts = collectParts(json);
    const audio = parts.find((p) => p.type === "audio" && p.data);
    if (!audio?.data) throw new Error("Google Lyria가 음원을 돌려주지 않았습니다(안전 필터에 걸렸을 수 있습니다 — 아티스트 이름·저작권 가사를 빼고 다시 시도해 주세요).");
    const lyricsOut = parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n")
      .trim();
    const mime = audio.mime_type || audio.mimeType || "audio/mpeg";
    return {
      kind: "done",
      files: [{ data: new Uint8Array(Buffer.from(audio.data, "base64")), contentType: mime }],
      lyricsOut: lyricsOut || undefined,
    };
  },
};
