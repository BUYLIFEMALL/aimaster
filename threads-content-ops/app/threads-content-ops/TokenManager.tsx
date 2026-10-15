"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import { createThreadsContentOpsToken, revokeThreadsContentOpsToken } from "./actions";

type TokenRow = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("ko-KR") : "아직 사용하지 않음";
}

export default function TokenManager({ initialTokens }: { initialTokens: TokenRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [label, setLabel] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function createToken() {
    setIsCreating(true);
    setError("");
    const result = await createThreadsContentOpsToken(label.trim());
    setIsCreating(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setIssuedToken(result.token);
    setTokens((current) => [
      { id: result.id, label: label.trim() || null, created_at: result.createdAt, last_used_at: null },
      ...current,
    ]);
    setLabel("");
    setCopied(false);
  }

  async function copyToken() {
    if (!issuedToken) return;
    await navigator.clipboard.writeText(issuedToken);
    setCopied(true);
  }

  async function revokeToken(id: string) {
    setError("");
    const result = await revokeThreadsContentOpsToken(id);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setTokens((current) => current.filter((token) => token.id !== id));
  }

  return (
    <div className="space-y-4">
      {issuedToken && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
          <p className="mb-2 text-xs text-gold">이 토큰은 지금 한 번만 표시됩니다. 데스크톱 앱에 바로 붙여넣어 주세요.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-black/30 px-3 py-2 text-xs text-white">{issuedToken}</code>
            <button type="button" onClick={copyToken} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gold/20 px-3 py-2 text-xs text-gold hover:bg-gold/30">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} placeholder="사용 기기 이름 (선택)" className="input-dark min-w-[200px] flex-1" />
        <GoldButton type="button" size="sm" onClick={createToken} disabled={isCreating}>
          <KeyRound size={14} className="mr-1" />
          {isCreating ? "발급 중" : "연동 토큰 발급"}
        </GoldButton>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {tokens.length === 0 ? (
        <p className="text-sm text-subtext">발급된 연동 토큰이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
              <div>
                <p className="text-sm text-white">{token.label || "이름 없는 기기"}</p>
                <p className="text-xs text-subtext">발급 {formatDateTime(token.created_at)} · 마지막 사용 {formatDateTime(token.last_used_at)}</p>
              </div>
              <button type="button" onClick={() => revokeToken(token.id)} className="inline-flex shrink-0 items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <Trash2 size={13} /> 폐기
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
