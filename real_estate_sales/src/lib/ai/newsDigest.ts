import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { REPORT_SUMMARY_MODEL } from "./reportSummary";

// RQ-C 지역 뉴스 AI 요약(2026-11-09). 회원이 켤 때만, 회원 본인 Claude 키로 하루 1번(재시도 0 — 회원 키 이중 과금 방지).
// 보내는 것은 그날 새 기사의 지역·분류·제목·네이버 요약문뿐(본문·개인정보 없음). 모델은 주소 리포트 AI 총평과 같은 중가 균형.
export const NEWS_DIGEST_MODEL = REPORT_SUMMARY_MODEL;

export async function summarizeNews(apiKey: string, lines: string[]): Promise<string> {
  const year = new Date().getFullYear();
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 });
  const res = await client.messages.create({
    model: NEWS_DIGEST_MODEL,
    max_tokens: 600,
    system:
      `당신은 부동산 지역 뉴스를 짧게 정리하는 보조입니다. 현재 연도는 ${year}년입니다. 연도 표기는 ${year}년 기준으로 하고 과거 연도를 현재처럼 쓰지 마세요.\n` +
      "주어진 기사 제목·요약에 있는 내용만 쓰고, 없는 사실이나 가격 전망을 지어내지 마세요. 투자 권유·매수 추천·상승 단정은 쓰지 마세요.\n" +
      "쉬운 한국어 존댓말로 「- 」 목록 3줄 이내로만 답하세요. 머리말·맺음말은 쓰지 마세요.",
    messages: [{ role: "user", content: `<news>\n${lines.join("\n").slice(0, 6000)}\n</news>` }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 않았습니다.");
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
  if (!text) throw new Error("AI 응답이 비었습니다.");
  return text.slice(0, 1500);
}
