import "server-only";
import { DEFAULT_REPLY_MODEL, type ReplyModel } from "@/lib/ai/models";

/**
 * 댓글 하나에 대해 자연스러운 답글 초안을 생성한다. 유튜브 개발자 정책(III.I.2조)이 요구하는
 * "사전의 명시적 동의"는 화면에서 사람이 이 초안을 검토하고 직접 "답변승인"을 눌러야 실제로
 * 올라가는 흐름으로 충족한다 — 여기서는 초안만 만든다.
 */
export async function generateCommentReply(params: {
  videoTitle: string;
  commentAuthor: string | null;
  commentText: string;
  link: string | null;
  customInstructions: string | null;
  apiKey: string;
  model?: ReplyModel | string;
}): Promise<string> {
  const { videoTitle, commentAuthor, commentText, link, customInstructions, apiKey, model } = params;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_REPLY_MODEL,
      messages: [
        {
          role: "system",
          content: [
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
            .join("\n"),
        },
        {
          role: "user",
          content: `영상 제목: ${videoTitle}\n댓글 작성자: ${commentAuthor ?? "익명"}\n댓글 내용: ${commentText}`,
        },
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
