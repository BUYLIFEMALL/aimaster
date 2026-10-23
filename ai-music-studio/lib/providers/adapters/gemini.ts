import "server-only";
import { composePrompt, type ProviderAdapter } from "../types";
import { callLyria } from "../musicCalls";

// Google Lyria (Gemini API interactions) — 2026-10-23 공식 문서(ai.google.dev/gemini-api/docs/music-generation) 기준.
// 호출 자체는 공용 기준 코드 `music-sync-calls`(../musicCalls.ts, 쇼츠가 사본 사용). 여기서는 입력 만들기·비용 문구만.
// 한 번에 끝나는 호출이라 서버가 응답 뒤(waitUntil)에서 기다린다. 유료 생성이므로 자동 재시도하지 않는다(이중 과금 방지).
export const geminiAdapter: ProviderAdapter = {
  synchronous: true,
  async start(model, input, apiKey) {
    const text = composePrompt(input, { withLyrics: true, withDuration: model.durationControl });
    // v1.06 이미지(최대 MAX_IMAGES장)가 있으면 input을 텍스트+이미지 묶음으로, WAV를 고르면 response_format.mime_type(API 참조 AudioResponseFormat)
    const images = model.imageInput ? (input.images ?? []) : [];
    const payloadInput = images.length
      ? [{ type: "text", text: text.slice(0, 8000) }, ...images.map((im) => ({ type: "image", mime_type: im.mimeType, data: im.data }))]
      : text.slice(0, 8000);
    const wav = !!model.wavOutput && input.format === "wav";
    const out = await callLyria({ model: model.model, input: payloadInput, wav }, apiKey);
    return {
      kind: "done",
      files: [{ data: out.data, contentType: out.contentType }],
      lyricsOut: out.text,
      actual: `정액 ${model.model === "lyria-3-clip-preview" ? "$0.04(30초)" : "$0.08(1곡)"} — Gemini API 가격표${images.length ? ` · 이미지 ${images.length}장` : ""}${wav ? " · WAV" : ""}`,
    };
  },
};
