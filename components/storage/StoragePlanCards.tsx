"use client";

import { useState } from "react";
import PaymentModal from "@/components/payment/PaymentModal";
import type { StoragePlanOffer } from "@/lib/storage/memberStorage";

const BILLING_LABEL: Record<string, string> = { monthly: "1개월", bimonthly: "2개월", quarterly: "3개월", biannual: "6개월", annual: "12개월" };

function fmtGb(bytes: number) {
  return bytes >= 1024 ** 3 ? `${Math.round(bytes / 1024 ** 3)}GB` : `${Math.round(bytes / 1024 ** 2)}MB`;
}
function keep(days: number | null) {
  if (days === null) return "구독 중 자동 삭제 없음";
  if (days % 365 === 0) return `${days / 365}년 보관`;
  return `${days}일 보관`;
}

/** 저장 구독 요금제 카드 — 결제는 기존 페이앱 결제 창(PaymentModal) 그대로 */
export default function StoragePlanCards({ offers, currentQuotaBytes }: { offers: StoragePlanOffer[]; currentQuotaBytes: number | null }) {
  const [selected, setSelected] = useState<StoragePlanOffer | null>(null);
  if (offers.length === 0) return null;
  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-3">📦 저장 구독</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {offers.map((o, i) => {
          const current = currentQuotaBytes !== null && currentQuotaBytes >= o.quotaBytes;
          return (
            <div
              key={o.pricingPlanId}
              className={`glass-card p-5 flex flex-col ${i === 1 ? "border border-gold/60 shadow-lg shadow-gold/10" : ""}`}
            >
              {i === 1 && <span className="self-start text-[11px] font-bold text-black bg-gold rounded-full px-2 py-0.5 mb-2">추천</span>}
              <p className="text-white font-bold">{o.name}</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {o.price.toLocaleString()}원<span className="text-sm font-medium text-subtext"> / {BILLING_LABEL[o.billingType] ?? "1개월"}</span>
              </p>
              <ul className="mt-3 space-y-1 text-sm text-white/85">
                <li>💾 저장 용량 {fmtGb(o.quotaBytes)}</li>
                <li>🗓️ {keep(o.retentionDays)}</li>
                <li>📤 블로그·SNS에 올린 자료도 같은 기간 보관</li>
              </ul>
              <button
                type="button"
                disabled={current}
                onClick={() => setSelected(o)}
                className="mt-4 rounded-xl bg-gold px-4 py-2.5 text-sm font-extrabold text-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {current ? "이용 중" : "구독하기"}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-subtext text-xs mt-3 break-keep">
        구독이 끝나면 7일 유예 뒤 기본(30일 보관)으로 돌아가며, 그때 30일이 지난 자료는 자동으로 정리됩니다.
      </p>
      {selected && (
        <PaymentModal
          plan={{ id: selected.pricingPlanId, name: selected.name, billing_type: selected.billingType, price: selected.price }}
          programName="저장공간 추가"
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
