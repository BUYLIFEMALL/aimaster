import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// 4단계(2026-11-03, v1.05): 매물 광고 글·안내 문자 본문 초안. 회원 본인 Claude 키로 1회만 부른다(폴백·재시도 없음 — 회원 키 이중 과금 방지).
// 모델은 docs/AI_MODEL_CATALOG.md 「중가 균형」 기본값(실거래 프로그램 AI 총평과 같음). 보내는 것은 매물 칸·사무소 칸뿐(고객 개인정보 없음).
export const LISTING_DRAFT_MODEL = "claude-sonnet-5-5";

export type DraftInput = Record<string, string | number | null | undefined>;

export function draftFactsText(listing: DraftInput, office: DraftInput | null): string {
  const lines = Object.entries(listing).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "").map(([k, v]) => `${k}: ${v}`);
  const off = office ? Object.entries(office).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "").map(([k, v]) => `${k}: ${v}`) : [];
  return `[매물]\n${lines.join("\n")}\n[중개사무소]\n${off.join("\n") || "입력 안 함"}`;
}

export async function draftListing(apiKey: string, facts: string): Promise<{ ad: string; sms: string }> {
  const year = new Date().getFullYear();
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 });
  const res = await client.messages.create({
    model: LISTING_DRAFT_MODEL,
    max_tokens: 1500,
    system:
      `당신은 한국 공인중개사무소의 매물 광고 글을 돕는 보조입니다. 현재 연도는 ${year}년입니다. 연도 표기는 ${year}년 기준으로 하고 과거 연도를 현재처럼 쓰지 마세요.\n` +
      "주어진 칸의 값만 쓰고, 없는 사실(학군·개발 호재·시세 전망·수익률·주변 시설)을 지어내지 마세요. 값이 없는 항목은 언급하지 마세요.\n" +
      "허위·과장으로 보일 표현(최저가, 확정 수익, 수익 보장, 무조건, 100%, 급등 예정, 개발 확정)은 쓰지 마세요. 투자 권유를 하지 마세요.\n" +
      "쉬운 한국어로, 아래 두 제목을 그대로 쓰고 그 아래에 내용을 쓰세요. 다른 머리말·맺음말은 쓰지 마세요.\n" +
      "■ 매물 광고 글\n(포털·블로그용 6~10줄. 첫 줄은 한 줄 제목. 본문 끝에 중개사무소 명칭·소재지·연락처·등록번호·개업공인중개사 성명 중 주어진 것을 「중개사무소:」 줄로 적기)\n" +
      "■ 안내 문자 본문\n(관심고객에게 보낼 3~4줄. 「(광고)」 표시·사무소 이름·수신거부 문구는 프로그램이 자동으로 붙이므로 넣지 마세요)",
    messages: [{ role: "user", content: `<listing>\n${facts}\n</listing>` }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 않았습니다.");
  const text = res.content.filter((b) => b.type === "text").map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  const adMatch = text.split("■ 안내 문자 본문");
  const ad = (adMatch[0] ?? "").replace("■ 매물 광고 글", "").trim();
  const sms = (adMatch[1] ?? "").trim();
  if (!ad) throw new Error("AI 응답이 비었습니다.");
  return { ad, sms };
}
