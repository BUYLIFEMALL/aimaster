"use client";

// 주소를 한 글자도 틀리지 않게 붙여 넣도록 「📋 복사」 버튼을 붙인 글자(매뉴얼·카톡 카드 공용, 2026-10-25)
import { useState } from "react";

export default function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="kg-copy">
      <code>{text}</code>
      <button
        type="button"
        className="secondary"
        onClick={async () => {
          try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { setDone(false); }
        }}
      >{done ? "✅ 복사됨" : "📋 복사"}</button>
    </span>
  );
}
