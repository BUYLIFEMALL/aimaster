"use client";

// 연결된 확장 목록·연결 끊기(2026-10-25 주인님 지적: 「바로 연결」이 있으니 직접 발급은 필요 없음).
// 이 확장 팝업에는 코드를 붙여 넣는 칸이 없어서 직접 발급 기능을 뺐다 — 연결은 「확장 프로그램 바로 연결」 하나로 한다.
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { revokeExtensionToken } from "@/lib/tokenActions";

type Token = { id: string; label: string | null; created_at: string; last_used_at: string | null };

export default function ExtensionTokenManager({ initialTokens }: { initialTokens: Token[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  if (!tokens.length) return <p className="token-manual-empty">아직 연결된 확장이 없어요.</p>;
  return (
    <div className="token-manager">
      <ul className="token-list">
        {tokens.map((token) => (
          <li key={token.id}>
            <span>
              <strong>{token.label || "부동산 매물 알림 크롬 확장"}</strong>
              <small>최근 사용: {token.last_used_at ? new Date(token.last_used_at).toLocaleString("ko-KR") : "없음"}</small>
            </span>
            <button
              onClick={async () => {
                const result = await revokeExtensionToken(token.id);
                if (!("error" in result)) setTokens((current) => current.filter((item) => item.id !== token.id));
              }}
            >
              <Trash2 size={14} /> 연결 끊기
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
