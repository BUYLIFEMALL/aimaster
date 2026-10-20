import "server-only";
import { DEFAULT_REPLY_MODEL, getReplyModelProvider } from "@/lib/ai/models";

/** Gemini REST 에러 응답을 사람이 읽기 쉬운 한글 메시지로 바꾼다(shots/src/lib/ai/script.ts와 동일). */
function describeGeminiError(status: number, errorBody: string): string {
  let reason = "";
  try {
    const parsed = JSON.parse(errorBody) as { error?: { status?: string; message?: string } };
    reason = parsed.error?.status ?? "";
  } catch {
    // JSON이 아니면 무시하고 원본 메시지를 그대로 보여준다.
  }
  if (status === 429 || reason === "RESOURCE_EXHAUSTED") {
    return "Gemini API 결제 크레딧이 소진되었습니다. 설정에서 크레딧이 남아있는 다른 Gemini API 키로 교체해주세요.";
  }
  if (status === 400 && errorBody.includes("API_KEY_INVALID")) {
    return "Gemini API 키가 유효하지 않습니다. 설정에서 API 키를 다시 확인해주세요.";
  }
  return `Gemini 요청이 실패했습니다. (${status}) ${errorBody}`;
}

function buildSystemPrompt(link: string | null, customInstructions: string | null): string {
  return [
    "당신은 인스타그램 비즈니스 계정을 운영하는 상담원입니다. 고객이 DM(다이렉트 메시지)으로",
    "보낸 문의에 자연스럽고 친절한 1:1 상담 말투로 답하세요.",
    "",
    "규칙:",
    "- 고객이 실제로 물어본 내용에 구체적으로 답하세요(뻔한 인사말 반복 금지).",
    "- 이 대화의 시작 부분에는 이미 별도로 \"이 계정은 AI 자동 응답을 쓴다\"는 고지 메시지가",
    "  먼저 나갔습니다. 답장 본문에서 \"저는 AI입니다\"류의 문구를 또 반복하지 마세요.",
    "- 고객 메시지와 같은 언어로 답하세요(한국어 메시지면 한국어로).",
    "- 이모지는 0~1개만, 과하지 않게.",
    "- 2~4문장 이내로, 채팅 대화처럼 짧게 작성하세요.",
    "- 가격/재고/배송 등 실시간으로 바뀔 수 있는 정보를 확신 없이 단정하지 말고, 확실하지 않으면",
    "  \"정확한 안내를 위해 확인 후 다시 알려드릴게요\" 같은 식으로 여지를 두세요.",
    link ? `- 답장 안에 자연스럽게 이 링크를 포함하세요: ${link} (링크만 뚝 떼서 붙이지 말고, 문맥에 맞게 자연스럽게 소개하세요).` : "",
    customInstructions ? `- 추가 지시사항: ${customInstructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateWithOpenAI(model: string, systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // GPT-5.6 계열은 temperature를 기본값(1) 외에는 지원하지 않아(2026-08-24 실제 호출로
      // 확인, 400 Unsupported value) 아예 지정하지 않는다 — gpt-4o 등 구형 모델도 기본값
      // 그대로 잘 동작한다.
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

/** competitor-analysis/lib/ai/report.ts와 동일한 실사용 검증 패턴(모델명/엔드포인트/헤더). */
async function generateWithAnthropic(model: string, systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Anthropic 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  // claude-sonnet-5는 확장 사고(extended thinking) 블록을 먼저 반환할 수 있어, content[0]이
  // 아니라 type === "text"인 블록을 찾아야 한다(competitor-analysis에서 실제로 재현/확인된 버그).
  const textBlock = (json.content ?? []).find((block: { type: string; text?: string }) => block.type === "text");
  const text: string = textBlock?.text ?? "";
  if (!text) throw new Error("Claude 응답에서 답장을 찾지 못했습니다. 다시 시도해주세요.");
  return text.trim();
}

/** shots/src/lib/ai/script.ts와 동일한 실사용 검증 패턴(엔드포인트/요청 형식). */
async function generateWithGemini(model: string, systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(describeGeminiError(response.status, errorBody));
  }
  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini 응답에서 답장을 찾지 못했습니다. 다시 시도해주세요.");
  return text;
}

/**
 * 수신 DM 1건에 대해 자연스러운 답장 초안을 생성한다. 이 저장소는 기본값을 "검토 후 발송"으로
 * 정했으므로, 사람이 이 초안을 검토(웹 화면 또는 텔레그램 버튼)하고 승인해야 실제로 발송된다 —
 * (선택) 자동 발송을 켠 경우에만 검토 없이 바로 나간다. 여기서는 초안만 만든다.
 *
 * 선택된 모델(OpenAI/Anthropic/Gemini)에 맞는 API를 호출한다 — apiKey는 그 provider의 키여야
 * 한다(어떤 provider인지는 lib/ai/models.ts의 getReplyModelProvider()로 판정).
 */
export async function generateDmReply(params: {
  senderUsername: string | null;
  messageText: string;
  link: string | null;
  customInstructions: string | null;
  apiKey: string;
  model?: string;
}): Promise<string> {
  const { senderUsername, messageText, link, customInstructions, apiKey, model: modelInput } = params;
  const model = modelInput || DEFAULT_REPLY_MODEL;
  const provider = getReplyModelProvider(model);

  const systemPrompt = buildSystemPrompt(link, customInstructions);
  const userPrompt = `고객(${senderUsername ?? "익명"})이 보낸 DM: ${messageText}`;

  if (provider === "anthropic") return generateWithAnthropic(model, systemPrompt, userPrompt, apiKey);
  if (provider === "gemini") return generateWithGemini(model, systemPrompt, userPrompt, apiKey);
  return generateWithOpenAI(model, systemPrompt, userPrompt, apiKey);
}
