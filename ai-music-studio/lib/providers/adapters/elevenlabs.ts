import "server-only";
import { composePrompt, providerError, type ProviderAdapter } from "../types";

// ElevenLabs Eleven Music — 2026-10-23 공식 문서(elevenlabs.io/docs/api-reference/music/compose) 기준.
// POST /v1/music?output_format=mp3_44100_192 { prompt, music_length_ms(3000~600000), model_id, force_instrumental } → 음원 바이트.
// 가사는 prompt 안에 함께 넣는다(작곡 계획 composition_plan은 2차). 자동 재시도 없음(이중 과금 방지).
const ENDPOINT = "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192";
const TIMEOUT_MS = 240_000;

export const elevenlabsAdapter: ProviderAdapter = {
  synchronous: true,
  async start(model, input, apiKey) {
    const prompt = composePrompt(input, { withLyrics: true, withDuration: false });
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({
        prompt: prompt.slice(0, 4000),
        music_length_ms: Math.min(600_000, Math.max(3_000, input.durationS * 1000)),
        model_id: model.model,
        force_instrumental: input.instrumental,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw providerError("ElevenLabs Music", res.status, await res.text());
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1000) throw new Error("ElevenLabs Music가 빈 음원을 돌려주었습니다. 다시 시도해 주세요.");
    return { kind: "done", files: [{ data: buf, contentType: res.headers.get("content-type") || "audio/mpeg", durationS: input.durationS }] };
  },
};
