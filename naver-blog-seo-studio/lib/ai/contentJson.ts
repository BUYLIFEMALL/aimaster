import "server-only";
import type { ContentProvider } from "./contentModels";

function extractJson(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed) as Record<string, unknown>;
}

export async function generateContentJson(params: { provider: ContentProvider; apiKey: string; model: string; system: string; user: string }) {
  const { provider, apiKey, model, system, user } = params;
  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 5000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`Claude 글 생성 요청에 실패했습니다. (${response.status})`);
    const data = await response.json() as { content?: { type?: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Claude가 본문 결과를 반환하지 않았습니다.");
    return extractJson(text);
  }

  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig: { responseMimeType: "application/json" } }),
    });
    if (!response.ok) throw new Error(`Gemini 글 생성 요청에 실패했습니다. (${response.status})`);
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini가 본문 결과를 반환하지 않았습니다.");
    return extractJson(text);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.65 }),
  });
  if (!response.ok) throw new Error(`OpenAI 글 생성 요청에 실패했습니다. (${response.status})`);
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI가 본문 결과를 반환하지 않았습니다.");
  return extractJson(text);
}
