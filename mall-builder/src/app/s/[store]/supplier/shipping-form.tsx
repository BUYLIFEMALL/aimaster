import { SUPPLIER_SHIPPING_LABEL, type SupplierShippingType } from "@/lib/supplier";
import type { SupplierShippingRow } from "@/lib/supplier-store";
import PendingButton from "@/app/pending-button";

// T1(0060) 공급사 배송비 입력 — 공급사 화면과 운영자 「공급사」 목록이 함께 쓴다. 손님은 공급사마다 따로 한 번씩 배송비를 내고, 확정되면 공급사 정산에 더해짐
export default function SupplierShippingForm({ action, current, compact = false }: { action: (form: FormData) => Promise<void>; current: SupplierShippingRow | null; compact?: boolean }) {
  const type: SupplierShippingType = current?.type ?? "mall";
  const won = (n: number | null | undefined) => (n == null ? "" : String(n));
  return (
    <form action={action} className={`space-y-2 ${compact ? "text-xs" : "text-sm"}`} data-supplier-shipping-form>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(SUPPLIER_SHIPPING_LABEL) as SupplierShippingType[]).map((t) => (
          <label key={t} className="flex items-center gap-1">
            <input type="radio" name="ship_type" value={t} defaultChecked={t === type} /> {SUPPLIER_SHIPPING_LABEL[t]}
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="block">기본 배송비<input name="base_fee" inputMode="numeric" defaultValue={won(current?.base_fee)} placeholder="예: 3000" className="mt-1 w-full rounded border px-2 py-1.5" /></label>
        <label className="block">이 금액 이상 무료<input name="free_over" inputMode="numeric" defaultValue={won(current?.free_over)} placeholder="조건부 무료일 때" className="mt-1 w-full rounded border px-2 py-1.5" /></label>
        <label className="block">제주 추가<input name="jeju_fee" inputMode="numeric" defaultValue={won(current?.jeju_fee)} placeholder="0" className="mt-1 w-full rounded border px-2 py-1.5" /></label>
        <label className="block">도서산간 추가<input name="island_fee" inputMode="numeric" defaultValue={won(current?.island_fee)} placeholder="0" className="mt-1 w-full rounded border px-2 py-1.5" /></label>
      </div>
      <p className="text-xs text-gray-500">「몰 기본 배송비 따르기」면 몰 배송비 정책으로 받고 배송비는 몰 몫입니다. 직접 정하면 손님이 이 공급사 상품 묶음마다 한 번 내고, 구매 확정 때 공급사 정산에 더해집니다.</p>
      <PendingButton pendingText="저장 중…" className="min-h-10 rounded border px-3 py-1.5">배송비 저장</PendingButton>
    </form>
  );
}

/** 한 줄 요약 */
export function supplierShippingSummary(r: SupplierShippingRow | null | undefined): string {
  if (!r) return "몰 기본 배송비";
  const extra = [r.jeju_fee ? `제주 +${r.jeju_fee.toLocaleString("ko-KR")}` : "", r.island_fee ? `도서산간 +${r.island_fee.toLocaleString("ko-KR")}` : ""].filter(Boolean).join(" · ");
  const main =
    r.type === "free" ? "무료 배송" : r.type === "fixed" ? `${r.base_fee.toLocaleString("ko-KR")}원` : `${r.base_fee.toLocaleString("ko-KR")}원 (${(r.free_over ?? 0).toLocaleString("ko-KR")}원 이상 무료)`;
  return extra ? `${main} · ${extra}` : main;
}
