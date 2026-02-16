"use client";

import { useState } from "react";
import { X, CreditCard, Shield, Clock, Ticket, Check } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";

interface PricingPlan {
  id: string;
  name: string;
  billing_type: string;
  price: number;
  original_price?: number | null;
}

interface PaymentModalProps {
  plan: PricingPlan;
  programName: string;
  onClose: () => void;
}

const BILLING_LABEL: Record<string, string> = {
  monthly: "1개월",
  biannual: "6개월",
  annual: "12개월",
  lifetime: "평생",
};

export default function PaymentModal({ plan, programName, onClose }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 쿠폰 관련 상태
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    type: string;
    value: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(plan.price);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setError("");
    setCouponLoading(true);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, planId: plan.id }),
      });

      const data = await res.json();

      if (!data.valid) {
        setError(data.error || "유효하지 않은 쿠폰입니다");
        return;
      }

      setAppliedCoupon(data.coupon);
      setDiscountAmount(data.discountAmount);
      setFinalPrice(data.finalPrice);
    } catch {
      setError("쿠폰 확인 중 오류가 발생했습니다");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalPrice(plan.price);
    setCouponCode("");
  };

  const handlePay = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          couponCode: appliedCoupon?.code || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "결제 요청에 실패했습니다.");
        setLoading(false);
        return;
      }

      // 무료 쿠폰으로 바로 구독 완료된 경우
      if (data.free) {
        window.location.href = "/dashboard";
        return;
      }

      // 페이앱 결제창 팝업
      const popup = window.open(
        data.paymentUrl,
        "payapp_payment",
        "width=480,height=720,scrollbars=yes,resizable=no,left=" +
          (window.screenX + (window.outerWidth - 480) / 2) +
          ",top=" +
          (window.screenY + (window.outerHeight - 720) / 2)
      );

      if (!popup) {
        setError("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.");
        setLoading(false);
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setLoading(false);
          window.location.href = "/dashboard";
        }
      }, 500);

    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const planDiscount = plan.original_price
    ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
    : 0;

  const isFree = finalPrice === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-subtext hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-1">결제 확인</h2>
          <p className="text-sm text-subtext">{programName}</p>
        </div>

        {/* 쿠폰 입력 */}
        <div className="mb-5">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">
                  {appliedCoupon.code} 적용됨
                  {appliedCoupon.type === "free" && " (무료)"}
                  {appliedCoupon.type === "percentage" && ` (${appliedCoupon.value}% 할인)`}
                  {appliedCoupon.type === "fixed" && ` (${appliedCoupon.value.toLocaleString()}원 할인)`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs text-subtext hover:text-white"
              >
                취소
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="쿠폰 코드 입력"
                  className="input-dark w-full pl-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 text-sm font-medium text-gold border border-gold/30 rounded-xl hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                {couponLoading ? "확인중..." : "적용"}
              </button>
            </div>
          )}
        </div>

        {/* 플랜 정보 */}
        <div className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-subtext">플랜</span>
            <span className="text-sm text-white font-medium">{plan.name}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-subtext">구독 기간</span>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-gold" />
              <span className="text-sm text-white">{BILLING_LABEL[plan.billing_type] ?? plan.billing_type}</span>
            </div>
          </div>
          <div className="h-px bg-white/10 my-3" />

          {/* 금액 정보 */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-subtext">정가</span>
            <span className="text-sm text-subtext">
              {plan.original_price && plan.original_price > plan.price ? (
                <span className="line-through">{plan.original_price.toLocaleString()}원</span>
              ) : (
                `${plan.price.toLocaleString()}원`
              )}
            </span>
          </div>

          {planDiscount > 0 && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-subtext">플랜 할인</span>
              <span className="text-sm text-red-400">
                -{(plan.original_price! - plan.price).toLocaleString()}원 ({planDiscount}%)
              </span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-subtext">쿠폰 할인</span>
              <span className="text-sm text-emerald-400">-{discountAmount.toLocaleString()}원</span>
            </div>
          )}

          <div className="h-px bg-white/10 my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">최종 결제 금액</span>
            <span className="text-xl font-bold text-gold">
              {isFree ? "무료" : `${finalPrice.toLocaleString()}원`}
            </span>
          </div>
        </div>

        {/* 안내 */}
        {!isFree && (
          <div className="flex items-start gap-2 mb-5 text-xs text-subtext">
            <Shield size={13} className="mt-0.5 text-gold flex-shrink-0" />
            <p>결제 버튼 클릭 시 페이앱 결제창이 팝업으로 열립니다. 팝업 차단을 해제해주세요.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <GoldButton
          onClick={handlePay}
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {isFree ? (
            <>
              <Check size={18} />
              {loading ? "처리 중..." : "무료로 구독하기"}
            </>
          ) : (
            <>
              <CreditCard size={18} />
              {loading ? "결제창 열리는 중..." : `${finalPrice.toLocaleString()}원 결제하기`}
            </>
          )}
        </GoldButton>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 text-sm text-subtext hover:text-white transition-colors py-2"
        >
          취소
        </button>
      </div>
    </div>
  );
}
