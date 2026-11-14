"use client";
// 2026-11-15 매뉴얼 「MCP·REST API」 예시 — 코드 칸 + 1초 복사 버튼(매뉴얼 지침 ④ 「코드·1초 복사」)
import { useState } from "react";

export function CopyCode({ label, code }: { label: string; code: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* 복사 권한이 없으면 칸을 직접 드래그해 복사 */
    }
  };
  return (
    <div className="aww-code-box">
      <div className="aww-code-head">
        <span>{label}</span>
        <button type="button" className="aww-code-copy" onClick={() => void copy()}>
          {done ? "✅ 복사됨" : "📋 복사"}
        </button>
      </div>
      <pre className="aww-code-pre">{code}</pre>
    </div>
  );
}
