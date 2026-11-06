"use client";

// U9-B: 업무 워크스페이스에서 보낸 원고 고르기 — 고르면 원문 칸을 채운다(AI 호출 없음).
import { useEffect, useState } from "react";
import { Inbox, Loader2 } from "lucide-react";

interface ReceivedItem {
  id: string;
  title: string;
  createdAt: string;
}

export default function WorkInboxPicker({ disabled, onPick }: { disabled?: boolean; onPick: (text: string, title: string) => void }) {
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/work-inbox/received")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0 && !message) return null;

  const pick = async (item: ReceivedItem) => {
    setBusyId(item.id);
    setMessage("");
    try {
      const res = await fetch("/api/work-inbox/received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "받은 원고를 가져오지 못했습니다.");
      onPick(String(json.bodyMd ?? ""), String(json.title ?? item.title));
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setOpen(false);
      setMessage(`「${item.title}」을(를) 원문 칸에 넣었습니다.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "받은 원고를 가져오지 못했습니다.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mb-2.5">
      {items.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
        >
          <span className="flex items-center gap-1.5">
            <Inbox size={14} />
            📥 업무 워크스페이스에서 받은 원고 ({items.length})
          </span>
          <span>{open ? "접기" : "고르기"}</span>
        </button>
      )}
      {open && (
        <ul className="mt-1.5 border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 max-h-56 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => pick(item)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between gap-2"
              >
                <span className="font-semibold text-slate-800 truncate">{item.title}</span>
                <span className="shrink-0 text-[11px] text-slate-400 flex items-center gap-1">
                  {busyId === item.id && <Loader2 size={12} className="animate-spin" />}
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="mt-1 text-[11px] font-medium text-slate-600">{message}</p>}
    </div>
  );
}
