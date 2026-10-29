"use client";

import { useActionState, useState, useTransition } from "react";
import { saveDefaultsAction } from "@/lib/actions/connection";
import { testWingConnectionAction } from "@/lib/actions/wing";
import { CHARGE_TYPES, COMMON_COURIERS, DELIVERY_METHODS, defaultReturnFee } from "@/lib/coupang/defaults";
import type { CoupangDefaults } from "@/lib/coupang/product";
import type { OutboundPlace, ReturnCenter } from "@/lib/coupang/logistics";

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none";
const label = "text-xs font-bold text-slate-700";

export function DefaultsForm({ initial, keysSaved }: { initial: CoupangDefaults | null; keysSaved: boolean }) {
  const [state, action, saving] = useActionState(saveDefaultsAction, {});
  const [loading, startLoad] = useTransition();
  const [places, setPlaces] = useState<OutboundPlace[]>([]);
  const [centers, setCenters] = useState<ReturnCenter[]>([]);
  const [loadError, setLoadError] = useState("");
  const [rc, setRc] = useState(initial?.returnCenter ?? { code: "", name: "", phone: "", zipCode: "", address: "", addressDetail: "" });
  const [shipCost, setShipCost] = useState(initial?.shipCost ?? 0);
  const [chargeType, setChargeType] = useState(initial?.deliveryChargeType ?? "FREE");
  const known = COMMON_COURIERS.some((c) => c.code === initial?.deliveryCompanyCode);
  const [courier, setCourier] = useState(initial?.deliveryCompanyCode ? (known ? initial.deliveryCompanyCode : "_other") : "CJGLS");

  const load = () =>
    startLoad(async () => {
      setLoadError("");
      const r = await testWingConnectionAction();
      if (!r.ok) return setLoadError(r.error);
      setPlaces(r.places.filter((p) => p.usable));
      setCenters(r.centers.filter((c) => c.usable));
    });

  return (
    <form action={action} className="space-y-5" autoComplete="off">
      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">🏭 출고지 · ↩️ 반품지</h2>
          <button type="button" disabled={!keysSaved || loading} onClick={load} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50">
            {loading ? "불러오는 중…" : "쿠팡에서 불러오기"}
          </button>
        </div>
        {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
        {loadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">❌ {loadError}</p>}

        <label className="block">
          <span className={label}>출고지</span>
          {places.length ? (
            <select name="outboundShippingPlaceCode" defaultValue={initial?.outboundShippingPlaceCode ?? ""} className={input}>
              <option value="">고르세요</option>
              {places.map((p) => <option key={p.code} value={p.code}>{p.name} (#{p.code}) {p.address}</option>)}
            </select>
          ) : (
            <input name="outboundShippingPlaceCode" defaultValue={initial?.outboundShippingPlaceCode ?? ""} placeholder="「쿠팡에서 불러오기」로 고르거나 출고지 코드 입력" className={input} />
          )}
        </label>

        <label className="block">
          <span className={label}>반품지</span>
          {centers.length ? (
            <select
              value={rc.code}
              onChange={(e) => {
                const c = centers.find((x) => x.code === e.target.value);
                if (c) setRc({ code: c.code, name: c.name, phone: c.phone, zipCode: c.zipCode, address: c.address, addressDetail: c.addressDetail });
              }}
              className={input}
            >
              <option value="">고르세요</option>
              {centers.map((c) => <option key={c.code} value={c.code}>{c.name} (#{c.code}) · {c.courierName || c.courierCode}</option>)}
            </select>
          ) : (
            <p className="mt-1 text-xs text-slate-600">{rc.code ? `${rc.name} (#${rc.code}) · ${rc.address} ${rc.addressDetail}` : "「쿠팡에서 불러오기」로 고르세요."}</p>
          )}
        </label>
        <input type="hidden" name="returnCenterCode" value={rc.code} />
        <input type="hidden" name="returnCenterName" value={rc.name} />
        <input type="hidden" name="returnPhone" value={rc.phone} />
        <input type="hidden" name="returnZipCode" value={rc.zipCode} />
        <input type="hidden" name="returnAddress" value={rc.address} />
        <input type="hidden" name="returnAddressDetail" value={rc.addressDetail} />
        {rc.code && <p className="text-[11px] text-slate-500">반품지 연락처 {rc.phone || "(없음)"} · 우편번호 {rc.zipCode || "(없음)"}</p>}
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">🚚 배송</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>배송 방법</span>
            <select name="deliveryMethod" defaultValue={initial?.deliveryMethod ?? "SEQUENCIAL"} className={input}>
              {DELIVERY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>택배사</span>
            <select value={courier} onChange={(e) => setCourier(e.target.value)} className={input}>
              {COMMON_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              <option value="_other">그 밖의 택배사(코드 입력)</option>
            </select>
            {courier === "_other" ? (
              <input name="deliveryCompanyCode" defaultValue={known ? "" : initial?.deliveryCompanyCode ?? ""} placeholder="쿠팡 택배사 코드(예: KDEXP)" className={input} />
            ) : (
              <input type="hidden" name="deliveryCompanyCode" value={courier} />
            )}
          </label>
          <label className="block">
            <span className={label}>배송비 종류</span>
            <select name="deliveryChargeType" value={chargeType} onChange={(e) => setChargeType(e.target.value as typeof chargeType)} className={input}>
              {CHARGE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          {chargeType !== "FREE" && (
            <label className="block">
              <span className={label}>기본 배송비(원)</span>
              <input name="deliveryCharge" inputMode="numeric" defaultValue={initial?.deliveryCharge || ""} className={input} />
            </label>
          )}
          {chargeType === "CONDITIONAL_FREE" && (
            <label className="block">
              <span className={label}>이 금액 이상 무료(원)</span>
              <input name="freeShipOverAmount" inputMode="numeric" defaultValue={initial?.freeShipOverAmount || ""} className={input} />
            </label>
          )}
          <label className="block">
            <span className={label}>발송비(택배 1건 실제 비용, 원)</span>
            <input name="shipCost" inputMode="numeric" value={shipCost || ""} onChange={(e) => setShipCost(Number(e.target.value.replace(/\D/g, "")) || 0)} placeholder="예: 3000" className={input} />
            <span className="mt-1 block text-[11px] text-slate-500">쿠팡에 보내지 않고 반품배송비 기본값 계산에만 씁니다{shipCost > 0 ? ` — 편도 ${defaultReturnFee(shipCost).toLocaleString()}원(발송비+1,000원), 무료배송 상품 반품 왕복 ${(defaultReturnFee(shipCost) * 2).toLocaleString()}원` : ""}.</span>
          </label>
          <label className="block">
            <span className={label}>기준 출고일(일)</span>
            <input name="outboundShippingTimeDay" inputMode="numeric" defaultValue={initial?.outboundShippingTimeDay ?? 2} className={input} />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" name="unionDelivery" defaultChecked={initial?.unionDelivery ?? true} /> 묶음배송 가능</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="remoteAreaDeliverable" defaultChecked={initial?.remoteAreaDeliverable ?? false} /> 제주·도서산간 배송</label>
        </div>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">↩️ 반품비 · 기타</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>초도 반품배송비(원)</span>
            <input name="deliveryChargeOnReturn" inputMode="numeric" defaultValue={initial?.deliveryChargeOnReturn || ""} placeholder={shipCost > 0 ? `비우면 ${defaultReturnFee(shipCost).toLocaleString()}원(발송비+1,000원)` : "비우면 발송비+1,000원"} className={input} />
            <span className="mt-0.5 block text-[11px] text-slate-500">무료배송 상품을 반품할 때 처음 보낸 배송비</span>
          </label>
          <label className="block">
            <span className={label}>반품배송비(편도, 원)</span>
            <input name="returnCharge" inputMode="numeric" defaultValue={initial?.returnCharge || ""} placeholder={shipCost > 0 ? `비우면 ${defaultReturnFee(shipCost).toLocaleString()}원(발송비+1,000원)` : "비우면 발송비+1,000원"} className={input} />
            <span className="mt-0.5 block text-[11px] text-slate-500">초도 반품배송비의 100~150% 사이(쿠팡 규칙)</span>
          </label>
          <label className="block">
            <span className={label}>1인 최대 구매 수량(0 = 제한 없음)</span>
            <input name="maximumBuyForPerson" inputMode="numeric" defaultValue={initial?.maximumBuyForPerson ?? 0} className={input} />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" name="adultOnly" defaultChecked={initial?.adultOnly ?? false} /> 19세 이상만 구매</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="taxFree" defaultChecked={initial?.taxFree ?? false} /> 면세 상품</label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60">
          {saving ? "저장 중…" : "기본값 저장"}
        </button>
        {state.ok && <span className="text-xs font-bold text-teal-700">✅ 저장했습니다</span>}
        {state.error && <span className="text-xs font-bold text-rose-700">{state.error}</span>}
      </div>
      {state.problems?.length ? (
        <ul className="list-disc space-y-0.5 rounded-xl border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-xs text-amber-900">
          {state.problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
    </form>
  );
}
