// 고객 문의(C4-3·C4-4). 경로·정리만 — 외부 호출 없음(tests/inquiry.test.mjs).
// 명세 2026-10-31 확인: 상품 문의 GET v5 onlineInquiries(7일·최대 50건), 답변 POST v4 onlineInquiries/{id}/replies(content·vendorId·replyBy)
// 고객센터 문의 GET v5 callCenterInquiries(NO_ANSWER 미답변·TRANSFER 미확인, 7일·최대 30건), 답변 POST v4 …/replies(+inquiryId·parentAnswerId, 2~1000자, 중복 불가)
// 미확인 처리 POST v4 …/confirms(confirmBy). 고객센터 미답변은 24시간이 지나면 쿠팡이 답변완료로 바꿔 API로 답할 수 없다.

const vendorBase = (version: string, vendorId: string, kind: string) => `/v2/providers/openapi/apis/api/${version}/vendors/${encodeURIComponent(vendorId)}/${kind}`;
export const onlineListPath = (vendorId: string) => vendorBase("v5", vendorId, "onlineInquiries");
export const centerListPath = (vendorId: string) => vendorBase("v5", vendorId, "callCenterInquiries");
export const onlineReplyPath = (vendorId: string, id: string) => `${vendorBase("v4", vendorId, "onlineInquiries")}/${encodeURIComponent(id)}/replies`;
export const centerReplyPath = (vendorId: string, id: string) => `${vendorBase("v4", vendorId, "callCenterInquiries")}/${encodeURIComponent(id)}/replies`;
export const centerConfirmPath = (vendorId: string, id: string) => `${vendorBase("v4", vendorId, "callCenterInquiries")}/${encodeURIComponent(id)}/confirms`;

export const INQUIRY_READ_GAP_SECONDS = 10;
export const REPLY_MIN = 2;
export const REPLY_MAX = 1000;
const ONLINE_PAGE = 50;
const CENTER_PAGE = 30;
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

/** 한국 날짜 기준 오늘 포함 7일. 명세는 「종료일 − 시작일 ≤ 7일」이지만 차이 7일은 실제로 400이 난다(2026-10-31 운영 확인) */
export function inquiryRange(nowMs: number): { from: string; to: string } {
  const day = (ms: number) => new Date(ms + KST_MS).toISOString().slice(0, 10);
  return { from: day(nowMs - 6 * DAY_MS), to: day(nowMs) };
}
export const onlineQuery = (vendorId: string, r: { from: string; to: string }) =>
  new URLSearchParams({ vendorId, answeredType: "NOANSWER", inquiryStartAt: r.from, inquiryEndAt: r.to, pageNum: "1", pageSize: String(ONLINE_PAGE) }).toString();
export const centerQuery = (status: "NO_ANSWER" | "TRANSFER", r: { from: string; to: string }) =>
  new URLSearchParams({ partnerCounselingStatus: status, inquiryStartAt: r.from, inquiryEndAt: r.to, pageNum: "1", pageSize: String(CENTER_PAGE) }).toString();

/** 고객센터 이관글에 섞이는 고객 정보를 가린다. 화면에도 AI에도 이 결과만 쓴다 */
export function redactInquiry(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !/고객명|연락처/.test(line))
    .join("\n")
    .replace(/0[\d*]{1,2}[-\s.]?[\d*]{3,4}[-\s.]?[\d*]{4}/g, "(연락처 가림)")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "(메일 가림)")
    .replace(/\d[\d*]{9,}/g, "(번호 가림)")
    .replace(/&lt;|&gt;/g, "")
    .trim();
}

export type InquiryRow = {
  kind: "product" | "center";
  id: string;
  question: string;
  at: string;
  itemName: string;
  sellerProductId: string;
  /** 고객센터 답변에 넣는 이관글 번호 */
  parentAnswerId: string;
  needsConfirm: boolean;
};

const s = (v: unknown) => (v == null ? "" : String(v)).trim();
const contentOf = (raw: unknown): Record<string, unknown>[] => {
  const c = (raw as { data?: { content?: unknown } })?.data?.content;
  return Array.isArray(c) ? c : [];
};
const totalOf = (raw: unknown, fallback: number) => {
  const t = (raw as { data?: { pagination?: { totalElements?: unknown } } })?.data?.pagination?.totalElements;
  return Number.isFinite(Number(t)) && t != null ? Number(t) : fallback;
};

export function normalizeOnline(raw: unknown): { rows: InquiryRow[]; total: number } {
  const rows = contentOf(raw).map((q) => ({
    kind: "product" as const,
    id: s(q.inquiryId),
    question: redactInquiry(s(q.content)),
    at: s(q.inquiryAt),
    itemName: "",
    sellerProductId: s(q.sellerProductId),
    parentAnswerId: "",
    needsConfirm: false,
  }));
  return { rows: rows.filter((r) => r.id), total: totalOf(raw, rows.length) };
}

export function normalizeCenter(raw: unknown, status: "NO_ANSWER" | "TRANSFER"): { rows: InquiryRow[]; total: number } {
  const rows = contentOf(raw).map((q) => {
    const replies = (Array.isArray(q.replies) ? q.replies : []) as Record<string, unknown>[];
    const target = [...replies].reverse().find((r) => r.needAnswer === true) ?? replies[replies.length - 1];
    return {
      kind: "center" as const,
      id: s(q.inquiryId),
      question: redactInquiry(s(target?.content) || s(q.content)),
      at: s(target?.replyAt) || s(q.answeredAt),
      itemName: s(q.itemName),
      sellerProductId: "",
      parentAnswerId: s(target?.answerId),
      needsConfirm: status === "TRANSFER",
    };
  });
  return { rows: rows.filter((r) => r.id), total: totalOf(raw, rows.length) };
}

export const sortInquiries = (rows: InquiryRow[]) => [...rows].sort((a, b) => b.at.localeCompare(a.at));

/** 보내기 전 답변 검사. 빈 문자열이면 보냄 */
export function checkReply(text: string): string {
  const n = text.trim().length;
  if (n < REPLY_MIN) return `답변은 ${REPLY_MIN}자 이상 넣어 주세요.`;
  if (n > REPLY_MAX) return `답변은 ${REPLY_MAX.toLocaleString()}자까지 보낼 수 있습니다(지금 ${n.toLocaleString()}자).`;
  return "";
}
