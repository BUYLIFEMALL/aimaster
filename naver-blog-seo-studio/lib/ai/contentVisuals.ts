import "server-only";

export const CONTENT_IMAGE_SLOTS = ["content-1", "content-2", "content-3"] as const;
export type ContentImageSlot = typeof CONTENT_IMAGE_SLOTS[number];

export type ContentVisual = {
  slot: ContentImageSlot;
  sentence: string;
  prompt: string;
  path?: string;
  mimeType?: string;
  model?: string;
};

function cleanSentence(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 360) : "";
}

function fallbackVisuals(body: string, count: 2 | 3): ContentVisual[] {
  const sentences = body.replace(/\s+/g, " ").match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [];
  const candidates = sentences.map(cleanSentence).filter((sentence) => sentence.length >= 28 && sentence.length <= 360);
  const fallback = cleanSentence(body.slice(0, 240));
  const selected: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const position = Math.min(candidates.length - 1, Math.max(0, Math.floor(((index + 1) * candidates.length) / (count + 1))));
    const sentence = candidates.find((candidate, candidateIndex) => candidateIndex >= position && !selected.includes(candidate))
      ?? candidates.find((candidate) => !selected.includes(candidate))
      ?? (selected.length === 0 ? fallback : "");
    if (sentence) selected.push(sentence);
  }
  if (selected.length !== count) throw new Error(`본문에서 이미지와 연결할 서로 다른 핵심 문장 ${count}개를 찾지 못했습니다.`);

  return selected.map((sentence, index) => ({
    slot: CONTENT_IMAGE_SLOTS[index],
    sentence,
    prompt: `One photorealistic Korean Naver blog editorial scene illustrating this exact Korean key sentence: ${sentence}. One unified scene, documentary-quality real-world photography, 16:9 landscape, no text, logo, watermark, collage, split screen, infographic, or illustration.`,
  }));
}

export async function selectContentVisuals(params: { apiKey: string; topic: string; title: string; body: string; model: string; count: 2 | 3 }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `You are a Korean blog visual editor. Return JSON only. Choose exactly ${params.count} different complete sentences from the supplied body. Each must be a meaningful, visually depictable key sentence, preferably from different sections. Copy the sentence exactly. For each, create one detailed English prompt for a single photorealistic 16:9 editorial scene that expresses only that sentence. Korean/East Asian people by default where people are appropriate. No text, logo, watermark, collage, split screen, infographic, illustration, or made-up facts. Format: {"visuals":[{"sentence":"...","prompt":"..."}]}` },
        { role: "user", content: `Topic: ${params.topic}\nTitle: ${params.title}\n\nBody:\n${params.body.slice(0, 12000)}` },
      ],
    }),
  });
  if (!response.ok) {
    console.warn("[content-visuals] OpenAI sentence analysis failed; using safe body fallback", { status: response.status });
    return fallbackVisuals(params.body, params.count);
  }
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) return fallbackVisuals(params.body, params.count);
  try {
    const parsed = JSON.parse(raw) as { visuals?: Array<{ sentence?: unknown; prompt?: unknown }> };
    const normalizedBody = params.body.replace(/\s+/g, " ");
    const visuals = (parsed.visuals ?? []).slice(0, params.count).map((item, index) => ({
      slot: CONTENT_IMAGE_SLOTS[index],
      sentence: cleanSentence(item.sentence),
      prompt: cleanSentence(item.prompt),
    })).filter((item) => item.sentence && item.prompt && normalizedBody.includes(item.sentence));
    if (visuals.length === params.count && new Set(visuals.map((item) => item.sentence)).size === params.count) return visuals as ContentVisual[];
  } catch (error) {
    console.warn("[content-visuals] OpenAI response parsing failed; using safe body fallback", { error: error instanceof Error ? error.message : String(error) });
  }
  return fallbackVisuals(params.body, params.count);
}
