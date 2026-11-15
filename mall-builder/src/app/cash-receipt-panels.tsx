// M2-10 현금영수증 칸 — 유저 주문 상세(신청·진행 표시)와 운영사 주문 상세(상태·다시 확인·다시 발급)
import { formatWon } from "@/lib/products";
import { CASH_RECEIPT_KINDS, CASH_RECEIPT_STATUS_LABEL, canRequestCashReceipt, maskReceiptValue, purposeLabel, type CashReceipt } from "@/lib/cash-receipt";
import { recheckCashReceiptAction, requestCashReceiptAction, staffCashReceiptAction } from "@/lib/cash-receipt-actions";

type Order = { id: string; status: string; total: number; is_card: boolean; is_credit: boolean; has_tax_invoice: boolean };

function Status({ cr }: { cr: CashReceipt }) {
  return (
    <p className="text-sm" data-cash-receipt-status={cr.status}>
      {cr.type === "PHONE" ? "휴대폰" : "사업자번호"} {maskReceiptValue(cr)} · {purposeLabel(cr.purpose)} · <b>{CASH_RECEIPT_STATUS_LABEL[cr.status]}</b>
      {cr.amount ? <span> · {formatWon(cr.amount)}</span> : null}
      {cr.approval_no ? <span className="text-gray-600"> · 승인번호 {cr.approval_no}</span> : null}
      {cr.error ? <span className="block text-xs text-red-700">{cr.error}</span> : null}
    </p>
  );
}

const WAITING = new Set(["issuing", "unknown", "cancelling"]);

/** 유저 주문 상세 — 몰이 켰고 무통장 주문일 때만 */
export function CustomerCashReceiptPanel({ slug, order, receipt, ready, enabled, backPath }: { slug: string; order: Order; receipt: CashReceipt | null; ready: boolean; enabled: boolean; backPath: string }) {
  if (!ready || !enabled || order.is_card || order.is_credit) return null;
  const canAsk = canRequestCashReceipt(order, receipt);
  if (!receipt && !canAsk) return null;
  return (
    <div className="space-y-2 rounded border p-3 text-sm" data-customer-cash-receipt>
      <p className="font-semibold">🧾 현금영수증</p>
      {receipt && <Status cr={receipt} />}
      {receipt && WAITING.has(receipt.status) && (
        <form action={recheckCashReceiptAction.bind(null, slug, order.id, backPath)}>
          <button className="min-h-9 rounded border px-3">상태 다시 확인</button>
        </form>
      )}
      {canAsk && (
        <form action={requestCashReceiptAction.bind(null, slug, order.id, backPath)} className="flex flex-wrap items-end gap-2" data-cash-receipt-request>
          <label className="block text-xs text-gray-600">
            받을 방법
            <select name="kind" defaultValue={CASH_RECEIPT_KINDS[0].value} className="mt-0.5 block rounded border px-2 py-1.5 text-sm">
              {CASH_RECEIPT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-600">
            번호
            <input name="value" required maxLength={13} inputMode="numeric" placeholder="숫자만" className="mt-0.5 block w-40 rounded border px-2 py-1.5 text-sm" />
          </label>
          <button className="min-h-9 rounded bg-gray-900 px-3 text-white">{receipt ? "다시 신청" : "신청하기"}</button>
          <span className="w-full text-xs text-gray-500">입금이 확인되면 자동으로 발급됩니다. 세금계산서와 함께 받을 수는 없습니다.</span>
        </form>
      )}
    </div>
  );
}

/** 운영사 주문 상세 — 신청이 있을 때만 */
export function StaffCashReceiptPanel({ slug, receipt, orderId, currentAmount, backPath }: { slug: string; receipt: CashReceipt | null; orderId: string; currentAmount: number; backPath: string }) {
  if (!receipt) return null;
  const changed = receipt.status === "issued" && typeof receipt.amount === "number" && receipt.amount !== currentAmount;
  return (
    <section className="mt-6 space-y-2 rounded-lg border p-4 text-sm" data-staff-cash-receipt>
      <h2 className="font-semibold">🧾 현금영수증(볼타)</h2>
      <Status cr={receipt} />
      {receipt.reissue_amount ? <p className="text-xs text-gray-600">취소가 확인되면 {formatWon(receipt.reissue_amount)}으로 다시 발급합니다.</p> : null}
      <div className="flex flex-wrap gap-2">
        {WAITING.has(receipt.status) && (
          <form action={recheckCashReceiptAction.bind(null, slug, orderId, backPath)}><button className="min-h-9 rounded border px-3">상태 다시 확인</button></form>
        )}
        {receipt.status === "failed" && (
          <form action={staffCashReceiptAction.bind(null, slug, orderId, backPath, "retry")}><button className="min-h-9 rounded bg-gray-900 px-3 text-white">다시 발급</button></form>
        )}
        {receipt.status === "cancel_failed" && (
          <form action={staffCashReceiptAction.bind(null, slug, orderId, backPath, "cancel_retry")}><button className="min-h-9 rounded border px-3">취소 다시 요청</button></form>
        )}
        {changed && (
          <form action={staffCashReceiptAction.bind(null, slug, orderId, backPath, "reissue")} className="flex items-center gap-2">
            <span className="text-xs text-amber-800">주문 금액이 {formatWon(currentAmount)}으로 바뀌었습니다.</span>
            <button className="min-h-9 rounded border border-amber-300 px-3 text-amber-900">취소 후 다시 발급</button>
          </form>
        )}
      </div>
      <p className="text-xs text-gray-500">입금 확인 때 자동 발급, 주문 취소·반품 완료 때 자동 취소됩니다. 볼타 현금영수증 발행은 무료입니다.</p>
    </section>
  );
}
