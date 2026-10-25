"use client";
// 공용 기준 코드 `shop-flow` 띠 — 기준: shop-order-report/src/components/ShopFlowBar.tsx (사본: seller-label-docs/src/components/ShopFlowBar.tsx · trending-product-finder/components/ShopFlowBar.tsx).
// 앱마다 디자인이 달라 색은 이 안에서만 정한다(어두운 남색 띠 — 밝은·어두운 화면 모두에서 보임). 흐름으로 들어왔을 때만 보인다.
import { useEffect, useState } from "react";
import { FLOW_SESSION_KEY, FLOW_STEPS, flowNeighbors, isFlowSearch, withFlow, type FlowStepId } from "@/lib/shopFlow";

/** 이 탭이 쇼핑몰 흐름 안에 있는지(주소 표시 또는 같은 탭 기억). 화면 밖(서버)에서는 false. */
export function readFlowActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (isFlowSearch(window.location.search)) {
      window.sessionStorage.setItem(FLOW_SESSION_KEY, "1");
      return true;
    }
    return window.sessionStorage.getItem(FLOW_SESSION_KEY) === "1";
  } catch {
    return isFlowSearch(window.location.search);
  }
}

export function ShopFlowBar({ current }: { current: FlowStepId }) {
  const [active, setActive] = useState(false);
  useEffect(() => setActive(readFlowActive()), []);
  if (!active) return null;

  const { prev, next, index } = flowNeighbors(current);
  const close = () => {
    try {
      window.sessionStorage.removeItem(FLOW_SESSION_KEY);
    } catch {
      /* 저장소가 막혀도 띠만 닫는다 */
    }
    setActive(false);
  };
  const link: React.CSSProperties = { color: "#e2e8f0", textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <nav
      aria-label="쇼핑몰 흐름"
      style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 14, padding: "8px 12px", marginBottom: 16, fontSize: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
    >
      <strong style={{ color: "#fbbf24", whiteSpace: "nowrap" }}>🛒 쇼핑몰 흐름</strong>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: "1 1 auto", minWidth: 0 }}>
        {FLOW_STEPS.map((s, i) => {
          const on = s.id === current;
          return (
            <a
              key={s.id}
              href={withFlow(s.url)}
              aria-current={on ? "step" : undefined}
              style={{ ...link, padding: "3px 8px", borderRadius: 999, background: on ? "#2563eb" : "transparent", border: on ? "1px solid #60a5fa" : "1px solid #334155", fontWeight: on ? 700 : 400, color: i < index ? "#94a3b8" : "#e2e8f0" }}
            >
              {i + 1}. {s.emoji} {s.label}
            </a>
          );
        })}
      </span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {prev && <a href={withFlow(prev.url)} style={{ ...link, color: "#cbd5e1" }}>← 이전</a>}
        {next && <a href={withFlow(next.url)} style={{ ...link, fontWeight: 700, color: "#93c5fd" }}>다음: {next.label} →</a>}
        <button type="button" onClick={close} aria-label="흐름 띠 닫기" style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>
      </span>
    </nav>
  );
}
