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

/** 쿠팡에서 지운 기록의 문구 머리말 — 기록 표 상태에 「삭제」가 없어 문구로 구분한다(이 기록은 다시 보내기를 막지 않는다) */
export const DELETED_PREFIX = "쿠팡에서 삭제함";

/** 승인 요청(명세 /ko/api/products/request-for-product-approval, 2026-10-31 확인). 본문은 임시저장만, 오류 설명은 승인완료 등도 가능으로 달라 수정 없이 의미 있는 두 상태만 연다 */
export const approvalPath = (sellerProductId: number) => `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}/approvals`;
export const APPROVABLE_STATUS = ["임시저장", "승인반려"];

/** B3 「등록 상태 다시 확인」 대상 — 결과를 아직 모르는 기록. 1건당 쿠팡 2회라 최근 5건만 */
export const RECHECK_STATUSES = ["saved", "requested"];
export const RECHECK_LIMIT = 5;
export const RECHECK_GAP_SECONDS = 30;

/** 반려 기록의 사유 문구. 비어 있으면 어디서 확인할지 안내한다 */
export const rejectReasonText = (message: string | null | undefined) => (message ?? "").trim() || "사유가 아직 기록되지 않았습니다. 상품을 열어 「쿠팡 상태 확인」을 눌러 주세요.";
/** 삭제를 허용하는 쿠팡 상태(판매 중인 상품을 지우지 않도록 이 둘만) */
export const DELETABLE_STATUS = ["승인반려", "임시저장"];

/** 상품 조회 응답 + 이력 → 화면·기록용 한 줄. 반려면 가장 최근 반려 사유를 붙인다.
 *  historyError: 이력 조회 실패 문구(「사유가 없음」과 구분해 보여 준다) */
export function summarizeStatus(productRaw: unknown, history: HistoryEntry[], historyError?: string): StatusSummary {
  const statusName = String((productRaw as { data?: { statusName?: unknown } })?.data?.statusName ?? history[0]?.status ?? "").trim();
  const jobStatus = jobStatusOf(statusName);
  let message = statusName ? `쿠팡 상태: ${statusName}` : "쿠팡 상태를 읽지 못했습니다";
  if (statusName === "승인반려") {
    const reason = history.find((h) => h.status === "승인반려" && h.comment)?.comment ?? history.find((h) => h.comment)?.comment;
    if (reason) message += ` — 반려 사유: ${reason}`;
    else if (historyError) message += ` — 변경 이력을 읽지 못했습니다(${historyError}). 사유는 WING 「상품 관리」에서 확인해 주세요`;
    else message += ` — 쿠팡 이력에 사유가 없습니다(이력 ${history.length}건). WING 「상품 관리」에서 확인해 주세요`;
  } else if (statusName === "상품삭제") {
    message += " — 쿠팡에서 삭제된 상품입니다";
  }
  return { statusName, jobStatus, message: message.slice(0, 500) };
}
