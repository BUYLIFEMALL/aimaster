"use client";

import { useActionState, useState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import type { CustomerAddress } from "@/lib/store";
import { placeOrderAction, type PlaceOrderState } from "./actions";
import { canUseCredit, creditAvailable } from "@/lib/credit";
import { clampPoints, couponDiscount, earnPreview, maxPoints, type BenefitLine, type CouponDef, type PointSettings } from "@/lib/benefits";

/** 쿠폰·포인트(D17·D18) — 장바구니 주문에만 넘긴다(견적·비회원 주문은 없음) */
export type OrderBenefits = {
  coupons: { issueId: string; name: string; label: string; expiresAt: string | null; coupon: CouponDef }[];
  lines: BenefitLine[];
  isBusiness: boolean;
  points: { settings: PointSettings; balance: number } | null;
  gradeRate: number | null;
};

type Totals = { subtotal: number; shipping: number; total: number };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const REGION_NOTE = { mainland: "", jeju: "제주 추가 배송비 포함", island: "도서산간 추가 배송비 포함" } as const;

export default function OrderForm({
  slug,
  addresses,
  regionOf,
  totalsByRegion,
  defaultDepositor,
  bankText,
  action,
  note,
  credit,
  invoice,
  card,
  benefits,
}: {
  slug: string;
  addresses: CustomerAddress[];
  regionOf: Record<string, "mainland" | "jeju" | "island">;
  totalsByRegion: Record<"mainland" | "jeju" | "island", Totals>;
  defaultDepositor: string;
  bankText: string;
  /** 다른 주문 방식(견적 주문 등) — 없으면 장바구니 주문 */
  action?: (prev: PlaceOrderState, form: FormData) => Promise<PlaceOrderState>;
  /** 주문 버튼 아래 안내 — 없으면 장바구니 주문 안내 */
  note?: string;
  /** 외상 한도가 있는 승인 사업자면 결제 방법에 「외상」이 보인다 */
  credit?: { limit: number; balance: number };
  /** 승인 사업자면 세금계산서 발행 요청 칸이 보인다 */
  invoice?: { defaultEmail: string };
  /** 몰이 카드 결제(토스페이먼츠)를 켰으면 결제 방법에 「카드 결제」가 보인다 — 장바구니 주문만 */
  card?: boolean;
  benefits?: OrderBenefits;
}) {
  const [addressId, setAddressId] = useState(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? "");
  const initial: PlaceOrderState = { error: null, depositor: defaultDepositor, memo: "" };
  const [state, formAction, pending] = useActionState(action ?? placeOrderAction.bind(null, slug), initial);
  const region = regionOf[addressId] ?? "mainland";
  const base = totalsByRegion[region];
  const [couponId, setCouponId] = useState("");
  const [pointInput, setPointInput] = useState(0);
  const picked = benefits?.coupons.find((c) => c.issueId === couponId) ?? null;
  const coupon = picked && benefits ? couponDiscount(picked.coupon, benefits.lines, benefits.isBusiness) : null;
  const couponAmt = coupon && !coupon.error ? coupon.amount : 0;
  const pointRule = benefits?.points ? maxPoints(benefits.points.settings, benefits.points.balance, base.subtotal - couponAmt) : null;
  const points = benefits?.points && pointRule ? clampPoints(pointInput, pointRule.max, benefits.points.settings.use_unit) : 0;
  const t = { ...base, total: base.total - couponAmt - points };
  const earn = benefits?.points ? earnPreview(benefits.points.settings, benefits.gradeRate, t.total, base.shipping) : 0;
  const [pay, setPay] = useState<"bank" | "credit" | "card">("bank");
  const [wantInvoice, setWantInvoice] = useState(false);
  const creditOk = !!credit && canUseCredit(credit.limit, credit.balance, t.total);
  // 배송지를 바꿔 금액이 한도를 넘으면 무통장으로 되돌린다
  // 0원(쿠폰·포인트로 전액)이면 카드 결제를 할 수 없어 무통장으로(바로 결제 완료)
  const payMethod = (pay === "credit" && !creditOk) || (pay === "card" && t.total === 0) ? "bank" : pay;

  return (
    <form onSubmit={noResetSubmit(formAction)} className="space-y-8">
      {/* 배송지 선택 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">배송지 선택</h2>
          <a href={`/s/${slug}/my`} className="text-xs font-semibold text-blue-600 underline">
            배송지 추가·수정(마이페이지)
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                addressId === a.id
                  ? "border-blue-600 bg-blue-50/20 ring-1 ring-blue-500 shadow-xs"
                  : "border-slate-200/80 bg-white hover:bg-slate-50"
              }`}
              data-address-option
            >
              <input
                type="radio"
                name="address_id"
                value={a.id}
                checked={addressId === a.id}
                onChange={() => setAddressId(a.id)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs leading-relaxed text-slate-600">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <span>{a.label}</span>
                  {a.is_default && (
                    <span className="rounded bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      기본
                    </span>
                  )}
                </span>
                <span className="block mt-1 font-medium text-slate-800">{a.receiver} · {a.phone}</span>
                <span className="block mt-0.5 text-slate-500">({a.zip}) {a.addr1} {a.addr2}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* 입금자명 & 배송 메모 */}
      <section className="grid gap-4 sm:grid-cols-2">
        {payMethod === "card" ? (
          <input type="hidden" name="depositor" value="" />
        ) : (
          <label className="block">
            <span className="text-xs font-bold text-slate-700">입금자명 *</span>
            <input
              name="depositor"
              defaultValue={state.depositor}
              required
              maxLength={20}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-bold text-slate-700">배송 메모 (선택)</span>
          <input
            name="memo"
            defaultValue={state.memo}
            maxLength={200}
            placeholder="예: 부재 시 문 앞에 놓아 주세요"
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          />
        </label>
      </section>

      {/* 세금계산서 요청 */}
      {invoice && payMethod === "card" && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed" data-invoice-card-note>
          카드 결제는 카드 매출전표가 세금계산서를 대신합니다. 세금계산서가 필요하면 무통장 입금을 골라 주세요.
        </p>
      )}
      {invoice && payMethod !== "card" && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm" data-invoice-request>
          <label className="flex items-center gap-2 font-medium text-slate-800">
            <input
              type="checkbox"
              name="want_invoice"
              checked={wantInvoice}
              onChange={(e) => setWantInvoice(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>세금계산서 발행 요청</span>
            <span className="text-xs font-normal text-slate-500">(사업자 정보는 승인된 가입 정보로)</span>
          </label>
          {wantInvoice && (
            <label className="block pt-1">
              <span className="text-xs font-semibold text-slate-600">세금계산서 수신 이메일</span>
              <input
                name="invoice_email"
                type="email"
                defaultValue={invoice.defaultEmail}
                required
                maxLength={100}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 sm:w-80 focus:border-blue-500 focus:outline-hidden"
              />
            </label>
          )}
        </section>
      )}

      {/* 결제 방법 */}
      {(credit && credit.limit > 0) || card ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-sm" data-pay-methods>
          <p className="font-bold text-slate-900">결제 방법</p>
          <div className="space-y-2.5">
            {card && (
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="pay_method"
                  value="card"
                  checked={pay === "card"}
                  disabled={t.total === 0}
                  onChange={() => setPay("card")}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">카드 결제</span>
                  <span className="text-slate-500"> — 신용·체크카드, 간편결제</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">주문하면 결제창이 열립니다. 30분 안에 결제하지 않으면 주문이 취소될 수 있습니다.</span>
                </span>
              </label>
            )}
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="pay_method"
                value="bank"
                checked={pay === "bank"}
                onChange={() => setPay("bank")}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900">무통장 입금</span> — <span className="text-slate-500">{bankText}</span>
              </span>
            </label>
            {credit && credit.limit > 0 && (
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="pay_method"
                  value="credit"
                  checked={pay === "credit"}
                  disabled={!creditOk}
                  onChange={() => setPay("credit")}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">외상(후불)</span> — 남은 한도 <b>{won(creditAvailable(credit.limit, credit.balance))}</b>
                  {!creditOk && <span className="ml-1 font-bold text-rose-600">이번 주문 금액이 남은 한도보다 큽니다</span>}
                  <span className="block text-[11px] text-slate-400 mt-0.5">외상 주문은 바로 「결제 완료」가 되고, 대금은 운영자와 정한 날에 입금합니다.</span>
                </span>
              </label>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-sm">
          <p className="font-bold text-slate-900">결제 방법: 무통장 입금</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{bankText}</p>
        </section>
      )}

      {/* 혜택 쿠폰 & 포인트 */}
      {benefits && (benefits.coupons.length > 0 || benefits.points) && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-xs" data-order-benefits>
          <p className="font-bold text-slate-900">할인 및 포인트 혜택</p>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">쿠폰 ({benefits.coupons.length}장 보유)</span>
            <select
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              data-coupon-select
              disabled={!benefits.coupons.length}
            >
              <option value="">{benefits.coupons.length ? "쿠폰 쓰지 않음" : "쓸 수 있는 쿠폰이 없습니다"}</option>
              {benefits.coupons.map((c) => {
                const d = couponDiscount(c.coupon, benefits.lines, benefits.isBusiness);
                return (
                  <option key={c.issueId} value={c.issueId} disabled={!!d.error}>
                    {c.name} — {d.error ? d.error : `${won(d.amount)} 할인`}
                    {c.expiresAt ? ` (~${new Date(c.expiresAt).toLocaleDateString("ko-KR")})` : ""}
                  </option>
                );
              })}
            </select>
          </label>

          {benefits.points && (
            <div data-points-box className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">
                보유 포인트: <b className="text-blue-600">{benefits.points.balance.toLocaleString("ko-KR")}점</b>
                {pointRule?.reason
                  ? ` · ${pointRule.reason}`
                  : ` · 이번 주문 최대 ${(pointRule?.max ?? 0).toLocaleString("ko-KR")}점(${benefits.points.settings.use_unit}점 단위)`}
              </span>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={benefits.points.settings.use_unit}
                  value={pointInput || ""}
                  onChange={(e) => setPointInput(Number(e.target.value))}
                  onBlur={() => setPointInput(points)}
                  disabled={!pointRule?.max}
                  placeholder="0"
                  className="w-40 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  data-points-input
                />
                <button
                  type="button"
                  onClick={() => setPointInput(pointRule?.max ?? 0)}
                  disabled={!pointRule?.max}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  모두 쓰기
                </button>
              </div>
            </div>
          )}
          <input type="hidden" name="coupon_issue_id" value={couponAmt > 0 ? couponId : ""} />
          <input type="hidden" name="points" value={points} />
        </section>
      )}

      {/* 최종 결제 금액 및 발주 버튼 */}
      <section className="ml-auto max-w-md space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-sm shadow-xs" data-order-totals>
        <p className="flex justify-between text-slate-600">
          <span>상품 금액</span>
          <span className="font-bold text-slate-900">{won(t.subtotal)}</span>
        </p>
        <p className="flex justify-between text-slate-500 text-xs">
          <span>배송비{REGION_NOTE[region] && ` (${REGION_NOTE[region]})`}</span>
          <span className="font-semibold text-slate-700">{won(t.shipping)}</span>
        </p>
        {couponAmt > 0 && (
          <p className="flex justify-between text-rose-600 text-xs font-semibold" data-coupon-line>
            <span>쿠폰 할인</span>
            <span>−{won(couponAmt)}</span>
          </p>
        )}
        {points > 0 && (
          <p className="flex justify-between text-rose-600 text-xs font-semibold" data-points-line>
            <span>포인트 사용</span>
            <span>−{won(points)}</span>
          </p>
        )}
        <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
          <span className="font-bold text-slate-900">결제 금액</span>
          <span className="text-2xl font-black text-blue-600">{won(t.total)}</span>
        </div>
        {earn > 0 && (
          <p className="text-right text-[11px] font-medium text-emerald-700" data-earn-preview>
            구매 확정 때 {earn.toLocaleString("ko-KR")}점 적립 예정
          </p>
        )}

        <input type="hidden" name="expected_total" value={t.total} />
        {payMethod !== pay && <input type="hidden" name="pay_method" value={payMethod} />}
        {state.error && <p className="text-xs font-bold text-rose-600" data-order-error>{state.error}</p>}

        <button
          disabled={pending || !addressId}
          className="mt-4 min-h-13 w-full btn-3d-blue text-base font-bold shadow-md disabled:opacity-40"
        >
          {pending ? "주문하는 중…" : payMethod === "card" ? `${won(t.total)} 주문하고 카드 결제` : `${won(t.total)} 주문하기`}
        </button>

        <p className="text-[11px] leading-relaxed text-slate-400" data-order-note>
          {note ?? (payMethod === "card" ? "주문하면 재고가 확보되고 결제창으로 넘어갑니다. 결제가 끝나면 배송을 준비합니다." : "주문하면 재고가 확보되고 장바구니가 비워집니다. 입금이 확인되면 배송을 준비합니다.")}
        </p>
      </section>
    </form>
  );
}
