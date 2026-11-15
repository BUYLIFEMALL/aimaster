// M2-11 「배송 조회 ↗」 링크 — 택배사 조회 화면을 새 창으로 연다(송장이 없으면 아무것도 안 그림)
import { trackingUrl } from "@/lib/tracking-link";

export default function TrackingLink({ courier, trackingNo, className }: { courier: string | null | undefined; trackingNo: string | null | undefined; className?: string }) {
  const href = trackingUrl(courier, trackingNo);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? "ml-2 text-blue-700 underline"} data-tracking-link>
      배송 조회 ↗
    </a>
  );
}
