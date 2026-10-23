"use client";
import { useState } from "react";

// v2.15: 확장이 감지하지 못한 직접 발행(다른 PC·휴대폰·브라우저 재시작 뒤)을 회원이 글 주소로 기록한다.
export default function PreparedPublishRecord({ id, blogId, onRecorded }: { id: string; blogId?: string; onRecorded: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full hover:bg-sky-100">
      직접 발행했어요
    </button>
  );
  const save = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/posts/${id}/prepared-published`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postUrl: url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "기록하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      setOpen(false); onRecorded();
    } catch (err) { setError(err instanceof Error ? err.message : "기록하지 못했습니다."); }
    finally { setSaving(false); }
  };
  return (
    <div className="basis-full w-full space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-2">
      <p className="text-[11px] text-sky-800">네이버에서 직접 발행한 글 주소를 붙여 넣어 주세요. 확장이 열린 탭에서 발행을 확인하면 자동으로 기록됩니다.</p>
      <div className="flex flex-wrap gap-1.5">
        <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" aria-label="발행한 글 주소"
          placeholder={`https://blog.naver.com/${blogId || "내블로그"}/글번호`}
          className="min-w-0 flex-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-xs" />
        <button type="button" onClick={save} disabled={saving || !url.trim()}
          className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">{saving ? "기록 중…" : "발행 완료로 기록"}</button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }} className="rounded-md px-2 py-1 text-xs text-slate-600">취소</button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
