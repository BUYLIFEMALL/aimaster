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
    "당신은 유튜브 채널 운영자 본인입니다. 시청자가 남긴 댓글에 채널 운영자로서 직접",
    "답글을 다는 것처럼, 자연스럽고 사람 같은 말투로 짧게 답하세요.",
    "",
    "규칙:",
    "- 댓글 내용에 실제로 반응하세요(뻔한 인사말 반복 금지, \"좋은 댓글 감사합니다\" 같은",
    "  판에 박힌 문구는 쓰지 마세요).",
    "- 댓글과 같은 언어로 답하세요(한국어 댓글이면 한국어로).",
    "- 이모지는 0~1개만, 과하지 않게.",
    "- 2~3문장 이내로 짧게 작성하세요.",
    link ? `- 답글 안에 자연스럽게 이 링크를 포함하세요: ${link} (링크만 뚝 떼서 붙이지 말고, 문맥에 맞게 자연스럽게 소개하세요).` : "",
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
  if (!text) throw new Error("Claude 응답에서 답글을 찾지 못했습니다. 다시 시도해주세요.");
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
  if (!text) throw new Error("Gemini 응답에서 답글을 찾지 못했습니다. 다시 시도해주세요.");
  return text;
}

/**
 * 댓글 하나에 대해 자연스러운 답글 초안을 생성한다. 유튜브 개발자 정책(III.I.2조)이 요구하는
 * "사전의 명시적 동의"는 화면에서 사람이 이 초안을 검토하고 직접 "답변승인"을 눌러야 실제로
 * 올라가는 흐름으로 충족한다 — 여기서는 초안만 만든다.
 *
 * 선택된 모델(OpenAI/Anthropic/Gemini)에 맞는 API를 호출한다 — apiKey는 그 provider의 키여야
 * 한다(어떤 provider인지는 lib/ai/models.ts의 getReplyModelProvider()로 판단).
 */
export async function generateCommentReply(params: {
  videoTitle: string;
  commentAuthor: string | null;
  commentText: string;
  link: string | null;
  customInstructions: string | null;
  apiKey: string;
  model?: string;
}): Promise<string> {
  const { videoTitle, commentAuthor, commentText, link, customInstructions, apiKey, model: modelInput } = params;
  const model = modelInput || DEFAULT_REPLY_MODEL;
  const provider = getReplyModelProvider(model);

  const systemPrompt = buildSystemPrompt(link, customInstructions);
  const userPrompt = `영상 제목: ${videoTitle}\n댓글 작성자: ${commentAuthor ?? "익명"}\n댓글 내용: ${commentText}`;

  if (provider === "anthropic") return generateWithAnthropic(model, systemPrompt, userPrompt, apiKey);
  if (provider === "gemini") return generateWithGemini(model, systemPrompt, userPrompt, apiKey);
  return generateWithOpenAI(model, systemPrompt, userPrompt, apiKey);
}
