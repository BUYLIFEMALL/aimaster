import type { LeadStatus } from "@/types/database.types";

export const STATUS_LABEL: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "미발송", className: "bg-gray-100 text-gray-600" },
  customer_completed: { label: "발송제외", className: "bg-green-100 text-green-700" },
  stopped: { label: "수신거부", className: "bg-red-100 text-red-700" },
};

const SENT_BADGE_CLASS = "bg-amber-100 text-amber-700";

/**
 * 화면에 보여줄 상태 배지를 계산한다. status="new"이고 send_count가 1 이상이면
 * "N차 발송"(최대 5차)으로 표시하고, 그 외에는 STATUS_LABEL 그대로 쓴다.
 */
export function getLeadDisplayStatus(lead: { status: LeadStatus; send_count: number }): {
  label: string;
  className: string;
} {
  if (lead.status === "new" && lead.send_count > 0) {
    return { label: `${lead.send_count}차 발송`, className: SENT_BADGE_CLASS };
  }
  return STATUS_LABEL[lead.status];
}
