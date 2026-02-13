"use client";

import { Check } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import { formatKRW } from "@/lib/utils/format";
import type { PricingPlan } from "@/types/database.types";

const BILLING_LABELS: Record<string, { label: string; period: string }> = {
  monthly: { label: "1개월", period: "/ 월" },
  biannual: { label: "6개월", period: "/ 6개월" },
  annual: { label: "12개월", period: "/ 12개월" },
  lifetime: { label: "평생", period: "" },
};

const BILLING_FEATURES: Record<string, string[]> = {
  monthly: ["1개월 이용권", "모든 기능 포함", "고객 지원"],
  biannual: ["6개월 이용권", "모든 기능 포함", "우선 고객 지원", "업데이트 포함"],
  annual: ["12개월 이용권", "모든 기능 포함", "전담 고객 지원", "신기능 우선 접근"],
  lifetime: ["평생 이용권", "모든 기능 포함", "VIP 고객 지원", "모든 업데이트 영구 포함"],
};

interface PricingTableProps {
  plans: PricingPlan[];
  programId: string;
}

export default function PricingTable({ plans, programId }: PricingTableProps) {
  const activePlans = plans
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (activePlans.length === 0) return null;

  const handlePurchase = (planId: string) => {
    // PaymentModal will handle this via event
    window.dispatchEvent(new CustomEvent("open-payment", { detail: { planId, programId } }));
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {activePlans.map((plan) => {
        const meta = BILLING_LABELS[plan.billing_type] ?? { label: plan.billing_type, period: "" };
        const features = BILLING_FEATURES[plan.billing_type] ?? [];
        const isLifetime = plan.billing_type === "lifetime";
        const discountPct =
          plan.original_price && plan.original_price > plan.price
            ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
            : null;

        return (
          <GlassCard
            key={plan.id}
            className={`flex flex-col ${isLifetime ? "border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.15)]" : ""}`}
          >
            {isLifetime && (
              <div className="text-center mb-3">
                <span className="bg-gold text-black text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </span>
              </div>
            )}
            <h3 className="text-white font-bold text-lg mb-1">{plan.name || meta.label}</h3>
            <div className="mb-4">
              {plan.original_price && (
                <div className="text-subtext line-through text-sm">
                  {formatKRW(plan.original_price)}
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black gold-text">{formatKRW(plan.price)}</span>
                {meta.period && (
                  <span className="text-subtext text-sm">{meta.period}</span>
                )}
              </div>
              {discountPct && (
                <span className="text-emerald-400 text-sm font-medium">{discountPct}% 할인</span>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-subtext text-sm">
                  <Check size={14} className="text-gold flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <GoldButton
              variant={isLifetime ? "gold" : "outline"}
              fullWidth
              onClick={() => handlePurchase(plan.id)}
            >
              구독하기
            </GoldButton>
          </GlassCard>
        );
      })}
    </div>
  );
}
