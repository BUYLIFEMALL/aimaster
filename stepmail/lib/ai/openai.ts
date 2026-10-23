import "server-only";

/** OpenAI Chat Completions을 JSON 모드로 호출해서 파싱된 객체를 반환한다. */
export async function callOpenAiJson<T>(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<T> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: options?.model ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: options?.temperature ?? 1,
      max_tokens: options?.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI가 빈 응답을 반환했습니다.");

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("OpenAI 응답을 JSON으로 해석하지 못했습니다.");
  }
}

/** OpenAI Chat Completions을 일반 텍스트 모드로 호출한다 (가사·프롬프트 같은 순수 텍스트용). */
export async function callOpenAiText(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: options?.model ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options?.temperature ?? 1,
      max_tokens: options?.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI가 빈 응답을 반환했습니다.");
  return raw;
}
