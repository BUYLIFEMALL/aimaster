// 등록 현황·승인 상태 정리(C1-14). 쿠팡 응답을 기록 표 상태로 바꾼다 — 외부 호출 없음(tests/status.test.mjs).
// 명세: 상품 조회 GET seller-products/{id} → data.statusName / 상태변경이력 GET seller-products/{id}/histories → data[].status·comment(반려 사유)

export const productPath = (sellerProductId: number) => `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`;
export const historyPath = (sellerProductId: number) => `${productPath(sellerProductId)}/histories`;

/** 기록 표 상태(coupang_ops_jobs.status 제약과 같음) */
export type JobStatus = "sending" | "saved" | "requested" | "approved" | "rejected" | "failed" | "unknown";

/** 쿠팡 상태 이름 → 기록 표 상태. 「상품삭제」·모르는 값은 null(기록 상태를 바꾸지 않고 문구만 남김) */
export function jobStatusOf(statusName: string): JobStatus | null {
  switch (statusName.trim()) {
    case "임시저장":
      return "saved";
    case "심사중":
    case "승인대기중":
    case "승인요청": // 명세 예시에만 나오는 값
      return "requested";
    case "승인완료":
    case "부분승인완료":
      return "approved";
    case "승인반려":
      return "rejected";
    default:
      return null;
  }
}

export type HistoryEntry = { status: string; comment: string; createdBy: string; createdAt: string };

export function normalizeHistory(raw: unknown): HistoryEntry[] {
  const list = (raw as { data?: unknown })?.data;
  if (!Array.isArray(list)) return [];
  const s = (v: unknown) => (v == null ? "" : String(v)).trim();
  return list
    .map((h: Record<string, unknown>) => ({ status: s(h.status), comment: s(h.comment), createdBy: s(h.createdBy), createdAt: s(h.createdAt) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 최신 먼저
}

export type StatusSummary = { statusName: string; jobStatus: JobStatus | null; message: string };

/** 상품 조회 응답 + 이력 → 화면·기록용 한 줄. 반려면 가장 최근 반려 사유를 붙인다 */
export function summarizeStatus(productRaw: unknown, history: HistoryEntry[]): StatusSummary {
  const statusName = String((productRaw as { data?: { statusName?: unknown } })?.data?.statusName ?? history[0]?.status ?? "").trim();
  const jobStatus = jobStatusOf(statusName);
  let message = statusName ? `쿠팡 상태: ${statusName}` : "쿠팡 상태를 읽지 못했습니다";
  if (statusName === "승인반려") {
    const reason = history.find((h) => h.status === "승인반려" && h.comment)?.comment;
    message += reason ? ` — 반려 사유: ${reason}` : " — 반려 사유는 WING 「상품 관리」에서 확인해 주세요";
  } else if (statusName === "상품삭제") {
    message += " — 쿠팡에서 삭제된 상품입니다";
  }
  return { statusName, jobStatus, message: message.slice(0, 500) };
}
