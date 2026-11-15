// M2-7 반품·환불 칸 — 유저 주문 상세(반품 요청·환불 계좌·진행 표시)와 운영사 주문 상세(회수 단계·반품 승인·환불 완료)
import { formatWon } from "@/lib/products";
import { COURIERS, DEFAULT_COURIER } from "@/lib/shipping";
import {
  REFUND_STATUS_LABEL, RETURN_REASONS, RETURN_STEP_LABEL, defaultReturnFee, maskAccount, needsRefundAccount, reasonLabel,
} from "@/lib/returns";
import type { RefundAccount, ReturnInfo } from "@/lib/returns-server";
import { approveReturnAction, refundDoneAction, requestReturnAction, returnStepAction, setRefundAccountAction } from "@/lib/return-actions";

type Order = { id: string; status: string; total: number; is_card: boolean; is_credit: boolean };

function BankFields({ account }: { account?: RefundAccount | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" data-refund-account-fields>
      <label className="block text-xs text-gray-600">은행<input name="bank_name" required maxLength={20} defaultValue={account?.bank_name ?? ""} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" /></label>
      <label className="block text-xs text-gray-600">계좌번호<input name="bank_account" required maxLength={30} inputMode="numeric" pattern="[0-9-]{6,30}" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" placeholder={account ? `지금 ${maskAccount(account.bank_account)} — 다시 넣어 주세요` : "숫자·-"} /></label>
      <label className="block text-xs text-gray-600">예금주<input name="bank_holder" required maxLength={30} defaultValue={account?.bank_holder ?? ""} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" /></label>
    </div>
  );
}

function Progress({ info }: { info: ReturnInfo }) {
  return (
    <ul className="space-y-1 text-sm" data-return-progress>
      {info.return_reason && <li>사유: <b>{reasonLabel(info.return_reason)}</b>{info.return_memo && <span className="text-gray-600"> · {info.return_memo}</span>}</li>}
      {info.return_step && <li>진행: <b>{RETURN_STEP_LABEL[info.return_step]}</b>{info.return_tracking && <span> · 회수 {info.return_courier} {info.return_tracking}</span>}</li>}
      {info.return_fee > 0 && <li>반품비: {formatWon(info.return_fee)}</li>}
      {info.refund_status !== "none" && (
        <li data-refund-status={info.refund_status}>
          {REFUND_STATUS_LABEL[info.refund_status]} <b>{formatWon(info.refund_amount)}</b>
          {info.refunded_at && <span className="text-gray-500"> · {new Date(info.refunded_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span>}
        </li>
      )}
    </ul>
  );
}

/** 유저 주문 상세 */
export function CustomerReturnPanel({ slug, order, info, account, storeFee, backPath }: { slug: string; order: Order; info: ReturnInfo | null; account: RefundAccount | null; storeFee: number; backPath: string }) {
  if (!info) return null; // 0099 전 DB
  const bank = needsRefundAccount(order);
  const showProgress = order.status === "return_requested" || order.status === "returned" || info.refund_status !== "none";
  const askAccount = bank && (order.status === "cancel_requested" || order.status === "return_requested" || info.refund_status === "pending");
  return (
    <div className="space-y-4" data-customer-return>
      {order.status === "delivered" && (
        <details className="rounded border p-3 text-sm" data-return-request>
          <summary className="cursor-pointer font-medium text-red-700">반품 요청</summary>
          <form action={requestReturnAction.bind(null, slug, order.id, backPath)} className="mt-3 space-y-2">
            <fieldset className="space-y-1">
              {RETURN_REASONS.map((r, i) => (
                <label key={r.value} className="flex items-center gap-2">
                  <input type="radio" name="reason" value={r.value} required defaultChecked={i === 0} /> {r.label}
                  <span className="text-xs text-gray-500">{r.fee ? (storeFee > 0 ? `반품비 ${formatWon(defaultReturnFee(r.value, storeFee, order.total))}` : "") : "반품비 없음"}</span>
                </label>
              ))}
            </fieldset>
            <input name="memo" maxLength={300} placeholder="자세한 내용(선택)" className="w-full rounded border px-2 py-1.5" />
            {bank && (<><p className="text-xs text-gray-600">무통장 결제 주문이라 환불받을 계좌가 필요합니다(환불이 끝나면 지웁니다).</p><BankFields /></>)}
            <button className="min-h-10 rounded border border-red-200 px-4 text-red-700">반품 요청하기</button>
          </form>
        </details>
      )}
      {showProgress && <div className="rounded border p-3"><p className="mb-1 text-sm font-semibold">반품·환불</p><Progress info={info} /></div>}
      {askAccount && (
        <form action={setRefundAccountAction.bind(null, slug, order.id, backPath)} className="space-y-2 rounded border p-3 text-sm" data-refund-account-form>
          <p className="font-semibold">환불 계좌 {account ? <span className="font-normal text-gray-600">· {account.bank_name} {maskAccount(account.bank_account)} {account.bank_holder}</span> : <span className="font-normal text-red-700">· 아직 없음</span>}</p>
          <BankFields account={account} />
          <button className="min-h-9 rounded bg-gray-900 px-3 text-white">{account ? "계좌 바꾸기" : "계좌 저장"}</button>
        </form>
      )}
    </div>
  );
}

/** 운영사 주문 상세 */
export function StaffReturnPanel({ slug, order, info, account, storeFee, backPath }: { slug: string; order: Order; info: ReturnInfo | null; account: RefundAccount | null; storeFee: number; backPath: string }) {
  if (!info) return null;
  const inReturn = order.status === "return_requested";
  if (!inReturn && info.refund_status === "none" && order.status !== "returned") return null;
  const fee = info.return_fee || defaultReturnFee(info.return_reason, storeFee, order.total);
  return (
    <section className="mt-6 space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 text-sm" data-staff-return>
      <h2 className="font-semibold">반품·환불</h2>
      <Progress info={info} />
      {inReturn && info.return_step !== "collecting" && info.return_step !== "collected" && (
        <form action={returnStepAction.bind(null, slug, order.id, backPath, "collecting")} className="flex flex-wrap items-end gap-2" data-return-collecting>
          <label className="block text-xs text-gray-600">회수 택배사<input name="return_courier" required maxLength={30} defaultValue={DEFAULT_COURIER} list="mb-return-couriers" className="mt-0.5 w-32 rounded border px-2 py-1.5 text-sm" /></label>
          <datalist id="mb-return-couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
          <label className="block text-xs text-gray-600">회수 송장<input name="return_tracking" required maxLength={40} className="mt-0.5 w-40 rounded border px-2 py-1.5 text-sm" /></label>
          <button className="min-h-10 rounded border px-3">회수 중으로</button>
        </form>
      )}
      {inReturn && info.return_step === "collecting" && (
        <form action={returnStepAction.bind(null, slug, order.id, backPath, "collected")}>
          <button className="min-h-10 rounded border px-3" data-return-collected>회수 완료(입고 확인)</button>
        </form>
      )}
      {inReturn && (
        <form action={approveReturnAction.bind(null, slug, order.id, backPath)} className="flex flex-wrap items-end gap-2 border-t pt-3" data-return-approve>
          <label className="block text-xs text-gray-600">반품비(원)<input name="return_fee" defaultValue={fee} inputMode="numeric" className="mt-0.5 w-28 rounded border px-2 py-1.5 text-sm" /></label>
          <label className="block text-xs text-gray-600">메모(선택)<input name="note" maxLength={200} className="mt-0.5 w-48 rounded border px-2 py-1.5 text-sm" /></label>
          <button className="min-h-10 rounded bg-gray-900 px-4 text-white">반품 승인</button>
          <span className="text-xs text-gray-500">
            재고를 되돌리고 {order.is_card ? "카드 결제에서 반품비를 뺀 금액을 바로 환불" : order.is_credit ? "외상을 되돌린 뒤 반품비만 다시 청구" : "반품비를 뺀 금액을 「환불 대기」로"}합니다.
          </span>
        </form>
      )}
      {info.refund_status === "pending" && (
        <form action={refundDoneAction.bind(null, slug, order.id, backPath)} className="space-y-2 border-t pt-3" data-refund-done>
          <p>
            환불할 금액 <b>{formatWon(info.refund_amount)}</b> ·{" "}
            {account ? <b>{account.bank_name} {account.bank_account} {account.bank_holder}</b> : <span className="text-red-700">유저가 아직 환불 계좌를 넣지 않았습니다</span>}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs text-gray-600">메모(선택)<input name="note" maxLength={100} placeholder="예: 국민 이체" className="mt-0.5 w-48 rounded border px-2 py-1.5 text-sm" /></label>
            <button className="min-h-10 rounded bg-emerald-700 px-4 text-white">이체했습니다 — 환불 완료</button>
          </div>
          <p className="text-xs text-gray-500">환불 완료를 누르면 계좌 정보는 지워지고 금액·일시 기록만 남습니다(5년 보관).</p>
        </form>
      )}
    </section>
  );
}
