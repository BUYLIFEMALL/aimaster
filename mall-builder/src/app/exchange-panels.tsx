// M2-12b 교환 칸 — 유저 주문 상세(신청·진행 표시)와 운영사 주문 상세(대리 접수·회수·입고·교환비·재발송·완료·거절).
// 스스로 교환 정보를 읽는 서버 컴포넌트. 0102 없는 DB면 아무것도 안 그리고, 읽기 오류는 숨기지 않고 보여 준다.
import TrackingLink from "@/app/tracking-link";
import { formatWon } from "@/lib/products";
import { COURIERS, DEFAULT_COURIER } from "@/lib/shipping";
import {
  EXCHANGE_REASONS, EXCHANGE_STEP_LABEL, FEE_STATUS_LABEL, exchangeDaysLeft, exchangeNotices, isExchangeOrderStatus, exchangeReasonLabel, exchangeStockNote,
  itemRequestState, staffExchangeActions, type ExchangeItem, type ExchangeRow, type ExchangeVariant,
} from "@/lib/exchanges";
import { getExchangeData } from "@/lib/exchanges-server";
import { exchangeFeeAction, exchangeFeePaidAction, exchangeStepAction, requestExchangeAction } from "@/lib/exchange-actions";

type Props = { slug: string; orderId: string; orderStatus: string };

function ErrorBox({ message }: { message: string }) {
  return <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-exchange-error>{message}</p>;
}

function RequestForm({ slug, item, maxQty, needsOption, options, who }: {
  slug: string; item: ExchangeItem; maxQty: number; needsOption: boolean; options: ExchangeVariant[]; who: "customer" | "staff";
}) {
  const active = options.filter((o) => o.is_active);
  return (
    <details className="rounded border p-3 text-sm" data-exchange-request={item.id}>
      <summary className="cursor-pointer font-medium text-blue-800">
        {who === "staff" ? "대리 교환 접수" : "교환 신청"} · {item.name_snapshot}{item.option_snapshot && <span className="text-gray-600"> ({item.option_snapshot})</span>}
      </summary>
      <form action={requestExchangeAction.bind(null, slug, who === "staff" ? "admin" : "shop")} className="mt-3 space-y-2">
        <input type="hidden" name="item_id" value={item.id} />
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-gray-600">수량(최대 {maxQty}개)
            <input name="qty" type="number" min={1} max={maxQty} defaultValue={1} required className="mt-0.5 w-20 rounded border px-2 py-1.5 text-sm" />
          </label>
          {needsOption && (
            <label className="block text-xs text-gray-600">바꿀 옵션
              <select name="to_variant_id" required defaultValue="" className="mt-0.5 rounded border px-2 py-1.5 text-sm">
                <option value="" disabled>골라 주세요</option>
                {active.map((o) => <option key={o.id} value={o.id}>{o.key}</option>)}
              </select>
            </label>
          )}
        </div>
        {!needsOption && <p className="text-xs text-gray-500">옵션이 없는 상품이라 같은 상품으로 바꿔 드립니다.</p>}
        <fieldset className="space-y-1">
          {EXCHANGE_REASONS.map((r, i) => (
            <label key={r.value} className="flex items-center gap-2">
              <input type="radio" name="reason" value={r.value} required defaultChecked={i === 0} /> {r.label}
              <span className="text-xs text-gray-500">{r.fee ? "교환비가 있을 수 있어요" : "교환비 없음"}</span>
            </label>
          ))}
        </fieldset>
        <input name="memo" maxLength={300} placeholder="자세한 내용(선택)" className="w-full rounded border px-2 py-1.5" />
        <button className="min-h-10 rounded border border-blue-200 px-4 text-blue-800">{who === "staff" ? "대리 접수하기" : "교환 신청하기"}</button>
      </form>
    </details>
  );
}

function Summary({ x, item }: { x: ExchangeRow; item: ExchangeItem | undefined }) {
  const stock = exchangeStockNote(x);
  return (
    <ul className="space-y-1" data-exchange-summary>
      <li>
        <b>{item?.name_snapshot ?? "상품"}</b> {x.qty}개
        {(x.from_option || x.to_option) && <span> · {x.from_option || "옵션 없음"} → <b>{x.to_option || "같은 상품"}</b></span>}
      </li>
      <li>사유: {exchangeReasonLabel(x.reason)}{x.memo && <span className="text-gray-600"> · {x.memo}</span>}{x.requested_by === "staff" && <span className="text-gray-500"> · 운영사 대리 접수</span>}</li>
      <li data-exchange-step={x.step}>진행: <b>{EXCHANGE_STEP_LABEL[x.step]}</b>{x.reject_note && <span className="text-red-700"> · {x.reject_note}</span>}</li>
      {x.collect_tracking && <li>회수 {x.collect_courier} {x.collect_tracking}<TrackingLink courier={x.collect_courier} trackingNo={x.collect_tracking} /></li>}
      {x.reship_tracking && <li>새 상품 {x.reship_courier} {x.reship_tracking}<TrackingLink courier={x.reship_courier} trackingNo={x.reship_tracking} /></li>}
      {x.fee > 0 && <li data-exchange-fee={x.fee_status}>교환비 {formatWon(x.fee)} · {FEE_STATUS_LABEL[x.fee_status]}</li>}
      {stock && <li className="text-xs text-gray-500" data-exchange-stock>{stock}</li>}
    </ul>
  );
}

/** 유저 주문 상세 */
export async function CustomerExchangePanel({ slug, orderId, orderStatus }: Props) {
  const data = await getExchangeData(orderId);
  if (data.state === "missing") return null; // 0102 전 DB
  if (data.state === "error") return <ErrorBox message={data.message} />;
  const { exchanges, items, variants, deliveredAt } = data;
  const daysLeft = exchangeDaysLeft(deliveredAt);
  const forms = isExchangeOrderStatus(orderStatus)
    ? items.map((item) => ({ item, s: itemRequestState({ who: "customer", orderStatus, daysLeft, item, exchanges, options: variants.filter((v) => v.product_id === item.product_id) }) }))
    : [];
  const openable = forms.filter((f) => f.s.ok);
  const notices = exchangeNotices(forms);
  // 대상이 아예 없을 때(배송 완료 전·전부 진행 중·수량 없음)만 빈 화면. 안내할 이유가 있으면 신청 불가여도 보여 준다
  if (!exchanges.length && !openable.length && !notices.length) return null;
  return (
    <div className="space-y-3" data-customer-exchange>
      {openable.length > 0 && daysLeft !== null && <p className="text-xs text-gray-600">교환 신청은 {daysLeft}일 남았습니다(배송 완료 뒤 7일).</p>}
      {openable.map(({ item, s }) => s.ok && (
        <RequestForm key={item.id} slug={slug} item={item} maxQty={s.maxQty} needsOption={s.needsOption}
          options={variants.filter((v) => v.product_id === item.product_id)} who="customer" />
      ))}
      {notices.map((n) => <p key={n.key} className="text-xs text-gray-600" data-exchange-notice={n.key}>{n.text}</p>)}
      {exchanges.map((x) => (
        <div key={x.id} className="rounded border p-3 text-sm" data-exchange={x.id}>
          <p className="mb-1 font-semibold">교환</p>
          <Summary x={x} item={items.find((i) => i.id === x.item_id)} />
          {x.fee_status === "waiting" && x.step !== "rejected" && (
            <p className="mt-2 text-xs text-amber-800">교환비 입금이 확인되면 새 상품을 보내 드립니다. 입금 방법은 쇼핑몰 안내를 따라 주세요.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function CourierFields({ listId }: { listId: string }) {
  return (
    <>
      <label className="block text-xs text-gray-600">택배사<input name="courier" required maxLength={30} defaultValue={DEFAULT_COURIER} list={listId} className="mt-0.5 w-32 rounded border px-2 py-1.5 text-sm" /></label>
      <datalist id={listId}>{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
      <label className="block text-xs text-gray-600">송장 번호<input name="tracking" required maxLength={40} className="mt-0.5 w-40 rounded border px-2 py-1.5 text-sm" /></label>
    </>
  );
}

/** 운영사 주문 상세 */
export async function StaffExchangePanel({ slug, orderId, orderStatus }: Props) {
  const data = await getExchangeData(orderId);
  if (data.state === "missing") return null;
  if (data.state === "error") return <ErrorBox message={data.message} />;
  const { exchanges, items, variants } = data;
  const proxy = isExchangeOrderStatus(orderStatus)
    ? items.map((item) => ({ item, s: itemRequestState({ who: "staff", orderStatus, daysLeft: null, item, exchanges, options: variants.filter((v) => v.product_id === item.product_id) }) }))
    : [];
  const proxyNotices = exchangeNotices(proxy);
  if (!exchanges.length && !proxy.some((p) => p.s.ok) && !proxyNotices.length) return null;
  return (
    <section className="mt-6 space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-sm" data-staff-exchange>
      <h2 className="font-semibold">교환</h2>
      {exchanges.map((x) => {
        const item = items.find((i) => i.id === x.item_id);
        const a = staffExchangeActions(x, orderStatus, variants.some((v) => v.product_id === item?.product_id));
        const step = (s: Parameters<typeof exchangeStepAction>[2]) => exchangeStepAction.bind(null, slug, x.id, s);
        return (
          <div key={x.id} className="space-y-2 rounded border bg-white p-3" data-exchange={x.id}>
            <Summary x={x} item={item} />
            {a.collecting && (
              <form action={step("collecting")} className="flex flex-wrap items-end gap-2" data-exchange-collecting>
                <CourierFields listId={`mb-ex-c-${x.id}`} />
                <button className="min-h-10 rounded border px-3">회수 중으로</button>
              </form>
            )}
            {a.collected && (
              <form action={step("collected")}>
                <button className="min-h-10 rounded border px-3" data-exchange-collected>회수 완료(입고 확인)</button>
              </form>
            )}
            {a.fee && (
              <form action={exchangeFeeAction.bind(null, slug, x.id)} className="flex flex-wrap items-end gap-2" data-exchange-fee-form>
                <label className="block text-xs text-gray-600">교환비(원)<input name="fee" defaultValue={x.fee} inputMode="numeric" className="mt-0.5 w-28 rounded border px-2 py-1.5 text-sm" /></label>
                <button className="min-h-10 rounded border px-3">교환비 정하기</button>
              </form>
            )}
            {a.feePaid && (
              <form action={exchangeFeePaidAction.bind(null, slug, x.id)}>
                <button className="min-h-10 rounded bg-emerald-700 px-3 text-white" data-exchange-fee-paid>교환비 {formatWon(x.fee)} 입금 확인</button>
              </form>
            )}
            {a.reship && (
              <form action={step("reshipped")} className="flex flex-wrap items-end gap-2" data-exchange-reship>
                <CourierFields listId={`mb-ex-r-${x.id}`} />
                <button className="min-h-10 rounded bg-gray-900 px-3 text-white">새 상품 발송</button>
              </form>
            )}
            {a.reshipBlocked && <p className="text-xs text-amber-800" data-exchange-reship-blocked>{a.reshipBlocked}</p>}
            {a.done && (
              <form action={step("done")}>
                <button className="min-h-10 rounded border px-3" data-exchange-done>교환 완료</button>
              </form>
            )}
            {a.reject && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red-700">교환 거절</summary>
                <form action={step("rejected")} className="mt-2 flex flex-wrap items-end gap-2" data-exchange-reject>
                  <label className="block text-xs text-gray-600">거절 사유<input name="note" required maxLength={300} className="mt-0.5 w-64 rounded border px-2 py-1.5 text-sm" /></label>
                  <button className="min-h-9 rounded border border-red-200 px-3 text-red-700">거절하기</button>
                </form>
              </details>
            )}
            {!isExchangeOrderStatus(orderStatus) && !["done", "rejected"].includes(x.step) && (
              <p className="text-xs text-amber-800">주문이 배송 완료(구매 확정 포함) 상태가 아니라 교환을 진행할 수 없습니다.</p>
            )}
          </div>
        );
      })}
      {proxy.filter((p) => p.s.ok).map(({ item, s }) => s.ok && (
        <RequestForm key={item.id} slug={slug} item={item} maxQty={s.maxQty} needsOption={s.needsOption}
          options={variants.filter((v) => v.product_id === item.product_id)} who="staff" />
      ))}
      {proxyNotices.map((n) => <p key={n.key} className="text-xs text-amber-800" data-exchange-notice={n.key}>{n.text}</p>)}
      <p className="text-xs text-gray-500">회수 완료 때 원래 옵션 재고를 되돌리고, 새 상품을 보낼 때 바꿀 옵션 재고를 뺍니다. 교환비가 있으면 입금 확인 뒤에만 보낼 수 있습니다.</p>
    </section>
  );
}
