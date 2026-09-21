"use client";

import { useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import { createPersonalAccessToken, revokePersonalAccessToken } from "@/lib/actions/personalAccessTokens";

type TokenRow = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

export default function TokenManager({
  programSlug,
  initialTokens,
}: {
  programSlug: string;
  initialTokens: TokenRow[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [label, setLabel] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    setError("");
    const result = await createPersonalAccessToken(programSlug, label.trim());
    setCreating(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setIssuedToken(result.token);
    setLabel("");
    setCopied(false);
    // 실제 DB id를 그대로 써서, 새로고침 없이 바로 폐기까지 가능하게 한다
    // (예전엔 임시 id("pending-...")를 썼는데, 그 상태에서 폐기 버튼을 누르면
    // handleRevoke의 방어 코드에 걸려 조용히 아무 반응이 없던 버그가 있었음).
    setTokens((prev) => [
      { id: result.id, label: label.trim() || null, created_at: result.createdAt, last_used_at: null, revoked_at: null },
      ...prev,
    ]);
  }

  async function handleCopy() {
    if (!issuedToken) return;
    await navigator.clipboard.writeText(issuedToken);
    setCopied(true);
  }

  async function handleRevoke(id: string) {
    const result = await revokePersonalAccessToken(id);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div>
      {issuedToken && (
        <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <p className="text-xs text-gold mb-2">
            이 토큰은 지금만 볼 수 있습니다 — 앱에 붙여넣기 전에 창을 닫으면 다시 확인할 수 없습니다.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-black/30 px-3 py-2 text-xs text-white">
              {issuedToken}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg bg-gold/20 px-3 py-2 text-xs text-gold hover:bg-gold/30"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="이 토큰의 용도(선택, 예: 내 노트북)"
          className="input-dark flex-1 min-w-[200px]"
        />
        <GoldButton type="button" size="sm" onClick={handleCreate} disabled={creating}>
          {creating ? "발급 중..." : "새 토큰 발급"}
        </GoldButton>
      </div>
      {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

      {tokens.length === 0 ? (
        <p className="text-sm text-subtext">아직 발급한 토큰이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-white/10 p-3"
            >
              <div>
                <p className="text-sm text-white">{t.label || "(이름 없음)"}</p>
                <p className="text-xs text-subtext">
                  발급: {formatDateTime(t.created_at)} · 마지막 사용: {formatDateTime(t.last_used_at)}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
              >
                <Trash2 size={12} />
                폐기
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
