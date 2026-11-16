"use client";

// 토스페이먼츠 결제위젯 v2(@tosspayments/tosspayments-sdk) — 결제수단·약관을 그리고, 버튼을 누르면 결제창. 성공하면 successUrl로 돌아와 서버가 승인한다
import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { exfeeWidgetErrorText } from "@/lib/exchanges";

export default function PayWidget(props: {
  clientKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  successPath: string;
  failPath: string;
  /** 결제 기한(ISO) — 지나면 결제창을 열지 않는다 */
  deadline?: string | null;
  /** 결제 종류 — 생략하면 주문 결제(기존 동작 그대로). "exchange"(교환비)일 때만 오류·취소 문구를 고정 문구로(원문·주문 자동 취소 안내 0) */
  mode?: "order" | "exchange";
}) {
  const exchangeMode = props.mode === "exchange";
  const widgets = useRef<TossPaymentsWidgets | null>(null);
  // 위젯은 한 화면에 한 번만 그린다 — 개발 모드(StrictMode)는 아래 effect를 두 번 실행하는데,
  // 두 번째가 같은 자리에 또 그리면 토스가 「하나의 결제수단 위젯만 사용할 수 있어요」로 막는다(M5-2 시험 2026-11-15)
  const started = useRef<Promise<TossPaymentsWidgets> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    started.current ??= (async () => {
      const toss = await loadTossPayments(props.clientKey);
      const w = toss.widgets({ customerKey: props.customerKey });
      await w.setAmount({ currency: "KRW", value: props.amount });
      await Promise.all([
        w.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
        w.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
      ]);
      return w;
    })();
    started.current.then(
      (w) => {
        if (cancelled) return;
        widgets.current = w;
        setReady(true);
      },
      (e) => {
        if (!cancelled) setError(exchangeMode ? exfeeWidgetErrorText("load") : `결제창을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [props.clientKey, props.customerKey, props.amount]);

  async function pay() {
    if (!widgets.current) return;
    // 기한이 지났으면 결제창을 열지 않는다(자동 취소된 주문은 서버가 승인하지 않으므로 카드 정보를 넣어도 소용없다)
    if (props.deadline && Date.now() > new Date(props.deadline).getTime()) {
      setError("결제 기한이 지나 이 주문은 결제할 수 없습니다(자동으로 취소됩니다). 상품을 다시 담아 주문해 주세요.");
      return;
    }
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
      // 결제창을 닫은 경우 등 — 화면에 남아 다시 누를 수 있다(PC는 취소해도 실패 주소로 가지 않고 여기로 온다)
      const code = (e as { code?: string } | null)?.code ?? "";
      if (exchangeMode) {
        // 교환비: 취소·실패 모두 고정 문구, 자동으로 다시 결제창을 열지 않음(버튼을 다시 눌러야 함)
        setError(exfeeWidgetErrorText("request", e));
        setPaying(false);
        return;
      }
      setError(
        code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED"
          ? "결제를 취소했습니다. 다시 결제하려면 아래 버튼을 눌러 주세요. 결제하지 않으면 기한이 지나 주문이 자동으로 취소됩니다."
          : e instanceof Error ? e.message : String(e),
      );
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
