// 후기·문의·FAQ(D13) 입력 검사와 표시 도우미 — DB 제약(0033)과 같은 기준
export const MAX_REVIEW_BODY = 2000;
export const MIN_REVIEW_BODY = 5;
export const MAX_INQUIRY_TITLE = 100;
export const MAX_INQUIRY_BODY = 2000;
export const MAX_ANSWER = 3000;
export const MAX_REPLY = 2000;
export const MAX_FAQ_QUESTION = 200;
export const MAX_FAQ_ANSWER = 3000;
export const MAX_FAQ_CATEGORY = 20;

export type InquiryKind = "product" | "personal";
export const INQUIRY_KIND_LABEL: Record<InquiryKind, string> = { product: "상품 문의", personal: "1:1 문의" };

export type Ok<T> = { ok: true; value: T };
export type Fail = { ok: false; error: string };

function text(v: unknown): string {
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
}

export function validateReview(form: { rating: unknown; body: unknown }): Ok<{ rating: number; body: string }> | Fail {
  const rating = Number(form.rating);
  const body = text(form.body);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "별점을 1~5개 사이로 골라 주세요." };
  if (body.length < MIN_REVIEW_BODY) return { ok: false, error: `후기는 ${MIN_REVIEW_BODY}자 이상 써 주세요.` };
  if (body.length > MAX_REVIEW_BODY) return { ok: false, error: `후기는 ${MAX_REVIEW_BODY.toLocaleString()}자까지입니다.` };
  return { ok: true, value: { rating, body } };
}

export function validateInquiry(form: { title: unknown; body: unknown; secret: unknown }): Ok<{ title: string; body: string; is_secret: boolean }> | Fail {
  const title = text(form.title);
  const body = text(form.body);
  if (!title) return { ok: false, error: "문의 제목을 넣어 주세요." };
  if (title.length > MAX_INQUIRY_TITLE) return { ok: false, error: `제목은 ${MAX_INQUIRY_TITLE}자까지입니다.` };
  if (!body) return { ok: false, error: "문의 내용을 넣어 주세요." };
  if (body.length > MAX_INQUIRY_BODY) return { ok: false, error: `문의 내용은 ${MAX_INQUIRY_BODY.toLocaleString()}자까지입니다.` };
  return { ok: true, value: { title, body, is_secret: form.secret === "on" || form.secret === true } };
}

/** 운영자 답변·답글 — 비우면 null(답변 지움) */
export function validateAnswer(v: unknown, max: number): Ok<string | null> | Fail {
  const t = text(v);
  if (t.length > max) return { ok: false, error: `답변은 ${max.toLocaleString()}자까지입니다.` };
  return { ok: true, value: t || null };
}

export function validateFaq(form: { category: unknown; question: unknown; answer: unknown; sort: unknown; published: unknown }):
  Ok<{ category: string; question: string; answer: string; sort: number; is_published: boolean }> | Fail {
  const category = text(form.category);
  const question = text(form.question);
  const answer = text(form.answer);
  const sort = Number(form.sort ?? 0);
  if (category.length > MAX_FAQ_CATEGORY) return { ok: false, error: `분류는 ${MAX_FAQ_CATEGORY}자까지입니다.` };
  if (!question) return { ok: false, error: "질문을 넣어 주세요." };
  if (question.length > MAX_FAQ_QUESTION) return { ok: false, error: `질문은 ${MAX_FAQ_QUESTION}자까지입니다.` };
  if (!answer) return { ok: false, error: "답변을 넣어 주세요." };
  if (answer.length > MAX_FAQ_ANSWER) return { ok: false, error: `답변은 ${MAX_FAQ_ANSWER.toLocaleString()}자까지입니다.` };
  if (!Number.isInteger(sort) || sort < -9999 || sort > 9999) return { ok: false, error: "순서는 -9999~9999 사이 정수로 넣어 주세요." };
  return { ok: true, value: { category, question, answer, sort, is_published: form.published === "on" || form.published === true } };
}

/** 별점 글자(★★★★☆) */
export function stars(rating: number): string {
  const n = Math.min(5, Math.max(0, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** 이름 가리기 — DB 함수 mall_builder_mask_name과 같은 규칙(화면에서 운영자 목록을 손님 눈으로 볼 때 사용) */
export function maskName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  return t ? t[0] + "**" : "손님";
}

/** 후기를 쓸 수 있는 주문 상태 */
export function canReview(orderStatus: string, qty: number, cancelledQty: number, productId: string | null): boolean {
  return (orderStatus === "delivered" || orderStatus === "confirmed") && qty - cancelledQty > 0 && !!productId;
}

/** FAQ를 분류별로 묶는다(분류 없는 것은 「일반」, 입력 순서 유지) */
export function groupFaqs<T extends { category: string }>(faqs: T[]): { category: string; items: T[] }[] {
  const out: { category: string; items: T[] }[] = [];
  for (const f of faqs) {
    const c = f.category || "일반";
    let g = out.find((x) => x.category === c);
    if (!g) { g = { category: c, items: [] }; out.push(g); }
    g.items.push(f);
  }
  return out;
}
