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
  if (!response.ok) throw new Error(`본문 핵심 문장 분석 요청이 실패했습니다. (${response.status})`);
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) throw new Error("본문 핵심 문장 분석 결과가 비어 있습니다.");
  const parsed = JSON.parse(raw) as { visuals?: Array<{ sentence?: unknown; prompt?: unknown }> };
  const visuals = (parsed.visuals ?? []).map((item, index) => ({
    slot: index === 0 ? "content-1" as const : "content-2" as const,
    sentence: cleanSentence(item.sentence),
    prompt: cleanSentence(item.prompt),
  })).filter((item) => item.sentence && item.prompt && params.body.includes(item.sentence));
  if (visuals.length !== 2 || visuals[0].sentence === visuals[1].sentence) throw new Error("서로 다른 본문 핵심 문장 2개를 고르지 못했습니다. 다시 시도해주세요.");
  return visuals as ContentVisual[];
}
