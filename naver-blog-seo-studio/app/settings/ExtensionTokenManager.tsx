"use client";

import { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { createExtensionToken, revokeExtensionToken } from "@/lib/tokenActions";

type Token = { id: string; label: string | null; created_at: string; last_used_at: string | null };

export default function ExtensionTokenManager({ initialTokens }: { initialTokens: Token[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [label, setLabel] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function issue() {
    setError("");
    const result = await createExtensionToken(label);
    if ("error" in result) return setError(result.error ?? "토큰 발급에 실패했습니다.");
    setIssued(result.token); setCopied(false); setLabel("");
    setTokens((current) => [{ id: result.id, label: label.trim() || "SEO Studio Chrome 확장", created_at: result.createdAt, last_used_at: null }, ...current]);
  }

  async function copy() { if (issued) { await navigator.clipboard.writeText(issued); setCopied(true); } }

  return <div className="token-manager">
    {issued && <div className="token-issued"><p>이 토큰은 지금 한 번만 표시됩니다. Chrome 확장에 즉시 붙여넣으세요.</p><div><code>{issued}</code><button onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "복사됨" : "복사"}</button></div></div>}
    <div className="token-create"><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="토큰 이름 (선택)" /><button onClick={issue}>새 토큰 발급</button></div>
    {error && <p className="token-error">{error}</p>}
    <ul className="token-list">{tokens.map((token) => <li key={token.id}><span><strong>{token.label || "SEO Studio Chrome 확장"}</strong><small>최근 사용: {token.last_used_at ? new Date(token.last_used_at).toLocaleString("ko-KR") : "없음"}</small></span><button onClick={async () => { const result = await revokeExtensionToken(token.id); if (!("error" in result)) setTokens((current) => current.filter((item) => item.id !== token.id)); }}><Trash2 size={14} /> 폐기</button></li>)}</ul>
  </div>;
}
