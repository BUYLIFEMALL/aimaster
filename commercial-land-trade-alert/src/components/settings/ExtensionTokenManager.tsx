"use client";

// 연결된 확장 목록·PC별 연결 끊기. 기준: realty-listing-alert/app/settings/ExtensionTokenManager.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { revokeExtensionToken } from "@/lib/actions/tokenActions";
import { delBtn, editBtn } from "./setupStyles";

export type ExtensionToken = { id: string; label: string | null; created_at: string; last_used_at: string | null };

const when = (v: string | null) => (v ? new Date(v).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "없음");

export function ExtensionTokenManager({ tokens }: { tokens: ExtensionToken[] }) {
  const router = useRouter();
  const [ask, setAsk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function revoke(id: string) {
    setBusy(true);
    setError("");
    const r = await revokeExtensionToken(id);
    setBusy(false);
    if ("error" in r) { setError(r.error ?? "연결을 끊지 못했습니다."); return; }
    setAsk(null);
    router.refresh();
  }
  if (!tokens.length) return <p className="mt-3 text-sm text-mx-muted">아직 연결된 확장이 없습니다.</p>;
  return (
    <div className="mt-4 border-t border-mx-border pt-3">
      <p className="text-sm font-bold text-mx-text">연결된 PC</p>
      <p className="mt-1 text-xs text-mx-muted">예전 PC나 다른 크롬 프로필의 연결을 끊을 수 있습니다. 끊긴 PC는 수집과 알림이 멈추고, 그 브라우저에서 「바로 연결」을 누르면 다시 연결됩니다.</p>
      <ul className="mt-2 space-y-2">
        {tokens.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1E293B] bg-[#0E1420] px-3 py-2 text-sm text-slate-200">
            <span className="min-w-0">
              <b className="block break-words">{t.label || "상가·건물·토지 매물 알림 크롬 확장"}</b>
              <small className="text-xs text-mx-muted">최근 사용: {when(t.last_used_at)}</small>
            </span>
            {ask === t.id ? (
              <span className="flex gap-1.5">
                <button type="button" className={delBtn} disabled={busy} onClick={() => revoke(t.id)}>{busy ? "처리 중..." : "정말 끊기"}</button>
                <button type="button" className={editBtn} onClick={() => setAsk(null)}>취소</button>
              </span>
            ) : (
              <button type="button" className={delBtn} onClick={() => setAsk(t.id)}>연결 끊기</button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-mx-danger" role="alert">{error}</p>}
    </div>
  );
}
