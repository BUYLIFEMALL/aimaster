import "server-only";

export type ContentVisual = {
  slot: "content-1" | "content-2";
  sentence: string;
  prompt: string;
  path?: string;
  mimeType?: string;
  model?: string;
};

function cleanSentence(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 360) : "";
}

function fallbackVisuals(body: string): ContentVisual[] {
  const sentences = body.replace(/\s+/g, " ").match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [];
  const candidates = sentences.map(cleanSentence).filter((sentence) => sentence.length >= 28 && sentence.length <= 360);
  const first = candidates[Math.min(1, candidates.length - 1)] ?? cleanSentence(body.slice(0, 240));
  const second = candidates.find((sentence, index) => index >= Math.floor(candidates.length / 2) && sentence !== first) ?? candidates.at(-1) ?? first;
  if (!first || !second || first === second) throw new Error("본문에서 이미지와 연결할 서로 다른 핵심 문장 2개를 찾지 못했습니다.");
  return [first, second].map((sentence, index) => ({
    slot: index === 0 ? "content-1" as const : "content-2" as const,
    sentence,
    prompt: `One photorealistic Korean Naver blog editorial scene illustrating this exact Korean key sentence: ${sentence}. One unified scene, documentary-quality real-world photography, 16:9 landscape, no text, logo, watermark, collage, split screen, infographic, or illustration.`,
  }));
}

export async function selectContentVisuals(params: { apiKey: string; topic: string; title: string; body: string; model: string }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a Korean blog visual editor. Return JSON only. Choose exactly two different complete sentences from the supplied body. Each must be a meaningful, visually depictable key sentence, preferably from different sections. Copy the sentence exactly. For each, create one detailed English prompt for a single photorealistic 16:9 editorial scene that expresses only that sentence. Korean/East Asian people by default where people are appropriate. No text, logo, watermark, collage, split screen, infographic, illustration, or made-up facts. Format: {\"visuals\":[{\"sentence\":\"...\",\"prompt\":\"...\"},{\"sentence\":\"...\",\"prompt\":\"...\"}]}" },
        { role: "user", content: `Topic: ${params.topic}\nTitle: ${params.title}\n\nBody:\n${params.body.slice(0, 12000)}` },
      ],
    }),
  });
  if (!response.ok) {
    console.warn("[content-visuals] OpenAI sentence analysis failed; using safe body fallback", { status: response.status });
    return fallbackVisuals(params.body);
  }
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) return fallbackVisuals(params.body);
  try {
    const parsed = JSON.parse(raw) as { visuals?: Array<{ sentence?: unknown; prompt?: unknown }> };
    const normalizedBody = params.body.replace(/\s+/g, " ");
    const visuals = (parsed.visuals ?? []).map((item, index) => ({
      slot: index === 0 ? "content-1" as const : "content-2" as const,
      sentence: cleanSentence(item.sentence),
      prompt: cleanSentence(item.prompt),
    })).filter((item) => item.sentence && item.prompt && normalizedBody.includes(item.sentence));
    if (visuals.length === 2 && visuals[0].sentence !== visuals[1].sentence) return visuals as ContentVisual[];
  } catch (error) {
    console.warn("[content-visuals] OpenAI response parsing failed; using safe body fallback", { error: error instanceof Error ? error.message : String(error) });
  }
  return fallbackVisuals(params.body);
}
