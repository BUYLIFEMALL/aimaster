// D29 AI 문의 답변 초안 — 응답 형식·프롬프트·정리(node --test 대상, DB·SDK 없음)
// 손님 이름·연락처는 보내지 않는다(문의 글·상품 정보·공개 FAQ·배송 정책·주문 상태만)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { z } from "zod";

export const InquiryDraftSchema = z.object({
  answer: z.string().describe("손님에게 보낼 답변 초안(존댓말, 일반 글)"),
  needs_check: z.array(z.string()).describe("운영자가 보내기 전에 확인할 것(자료에 없어 확실하지 않은 내용)"),
});
export type InquiryDraft = z.infer<typeof InquiryDraftSchema>;

export type InquiryFacts = {
  kind: "product" | "personal";
  title: string;
  body: string;
  storeName: string;
  product: { name: string; summary: string; description: string; price: number | null } | null;
  order: { status: string; created: string } | null;
  faqs: { question: string; answer: string }[];
  shipping: string[]; // 배송 정책 설명 줄
};

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

export function buildInquiryPrompt(f: InquiryFacts, year: number) {
  const system = [
    `당신은 한국 온라인 쇼핑몰 「${f.storeName}」의 고객 응대 담당입니다. 손님 문의에 보낼 답변 초안을 씁니다.`,
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다.]`,
    "아래 자료(상품 정보·자주 묻는 질문·배송 정책·주문 상태)에 있는 사실만으로 답합니다. 자료에 없는 재고·입고일·할인·환불 가능 여부·배송일은 약속하지 말고 「확인 후 안내드리겠습니다」로 쓰고 needs_check에 적습니다.",
    "정중한 존댓말, 인사 한 줄 → 답 → 마무리 한 줄. 600자 이내, 마크다운·HTML 없이 줄바꿈만.",
    "쇼핑몰 담당자가 직접 쓴 것처럼 씁니다. 「자료」「제가 가진 정보」「AI」 같은 말로 내부 사정을 드러내지 않고, 모르는 내용은 「담당 부서에 확인 후 안내드리겠습니다」처럼 씁니다.",
    "손님 개인정보를 묻거나 적지 않습니다. 다른 회사·경쟁 상품을 언급하지 않습니다.",
  ].join("\n");
  const lines: string[] = [];
  lines.push(`[문의 종류] ${f.kind === "product" ? "상품 문의" : "1:1 문의"}`);
  lines.push(`[문의 제목] ${cut(f.title, 200)}`);
  lines.push(`[문의 내용]\n${cut(f.body, 3000)}`);
  if (f.product) {
    lines.push(`[상품] ${f.product.name}${f.product.price != null ? ` · 판매가 ${f.product.price.toLocaleString()}원` : ""}`);
    if (f.product.summary) lines.push(`[상품 소개] ${cut(f.product.summary, 200)}`);
    if (f.product.description) lines.push(`[상품 설명]\n${cut(f.product.description, 3000)}`);
  }
  if (f.order) lines.push(`[관련 주문] 상태 ${f.order.status} · 주문일 ${f.order.created}`);
  if (f.shipping.length) lines.push(`[배송 정책]\n${f.shipping.slice(0, 5).join("\n")}`);
  if (f.faqs.length) lines.push(`[자주 묻는 질문]\n${f.faqs.slice(0, 30).map((q) => `Q. ${cut(q.question, 200)}\nA. ${cut(q.answer, 500)}`).join("\n")}`);
  return { system, user: lines.join("\n\n") };
}

export function cleanInquiryDraft(d: InquiryDraft, maxAnswer: number): InquiryDraft {
  return {
    answer: d.answer.replace(/\r\n/g, "\n").replace(/<[^>]*>/g, "").replace(/\*\*/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxAnswer),
    needs_check: (d.needs_check ?? []).map((s) => s.trim().slice(0, 120)).filter(Boolean).slice(0, 6),
  };
}
