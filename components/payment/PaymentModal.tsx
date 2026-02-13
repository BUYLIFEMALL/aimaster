"use client";

import { useState } from "react";
import { X, CreditCard, Shield, Clock } from "lucide-react";
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

  const handlePay = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "결제 요청에 실패했습니다.");
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
        return;
      }

      // 팝업이 닫힐 때까지 대기
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setLoading(false);
          // 결제 완료 후 페이지 새로고침
          window.location.href = "/dashboard";
        }
      }, 500);

    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const discount = plan.original_price
    ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-subtext hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* 헤더 */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-1">결제 확인</h2>
          <p className="text-sm text-subtext">{programName}</p>
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-subtext">결제 금액</span>
            <div className="text-right">
              {plan.original_price && plan.original_price > plan.price && (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-subtext line-through">
                    {plan.original_price.toLocaleString()}원
                  </span>
                  <span className="text-xs text-red-400 font-bold">{discount}% 할인</span>
                </div>
              )}
              <span className="text-xl font-bold text-gold">
                {plan.price.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 안내 */}
        <div className="flex items-start gap-2 mb-5 text-xs text-subtext">
          <Shield size={13} className="mt-0.5 text-gold flex-shrink-0" />
          <p>결제 버튼 클릭 시 페이앱 결제창이 팝업으로 열립니다. 팝업 차단을 해제해주세요.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 결제 버튼 */}
        <GoldButton
          onClick={handlePay}
          disabled={loading}
          size="lg"
          className="w-full"
        >
          <CreditCard size={18} />
          {loading ? "결제창 열리는 중..." : `${plan.price.toLocaleString()}원 결제하기`}
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
