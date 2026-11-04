"use client";

// 토스페이먼츠 결제위젯 v2(@tosspayments/tosspayments-sdk) — 결제수단·약관을 그리고, 버튼을 누르면 결제창. 성공하면 successUrl로 돌아와 서버가 승인한다
import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

export default function PayWidget(props: {
  clientKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  successPath: string;
  failPath: string;
}) {
  const widgets = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const toss = await loadTossPayments(props.clientKey);
        const w = toss.widgets({ customerKey: props.customerKey });
        await w.setAmount({ currency: "KRW", value: props.amount });
        await Promise.all([
          w.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          w.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);
        if (cancelled) return;
        widgets.current = w;
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(`결제창을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.clientKey, props.customerKey, props.amount]);

  async function pay() {
    if (!widgets.current) return;
    setPaying(true);
    setError("");
    try {
      await widgets.current.requestPayment({
        orderId: props.orderId,
        orderName: props.orderName,
        customerName: props.customerName,
        successUrl: window.location.origin + props.successPath,
        failUrl: window.location.origin + props.failPath,
      });
    } catch (e) {
      // 결제창을 닫은 경우 등 — 화면에 남아 다시 누를 수 있다
      setError(e instanceof Error ? e.message : String(e));
      setPaying(false);
    }
  }

  return (
    <div className="mt-6" data-pay-widget>
      <div id="payment-method" />
      <div id="agreement" />
      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-pay-widget-error>{error}</p>}
      <button
        type="button"
        onClick={pay}
        disabled={!ready || paying}
        className="mt-4 min-h-12 w-full rounded bg-gray-900 text-white disabled:opacity-50"
        data-pay-button
      >
        {!ready ? "결제창 불러오는 중…" : paying ? "결제창 여는 중…" : `${props.amount.toLocaleString("ko-KR")}원 결제하기`}
      </button>
    </div>
  );
}
