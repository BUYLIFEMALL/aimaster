"use client";
import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { clearHistory, listHistory, removeHistory } from "@/lib/portrait/history";
import type { HistoryItem } from "@/lib/portrait/history";

export function HistoryList({ userId }: { userId: string }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { listHistory(userId).then(setItems); }, [userId]);

  if (items === null) return <p className="empty">불러오는 중…</p>;
  if (items.length === 0) return <p className="empty">아직 만든 사진이 없습니다. <a className="subtle-link" href="/studio">스튜디오로 가기</a></p>;

  async function remove(id: string) {
    await removeHistory(userId, id);
    setItems((cur) => (cur ?? []).filter((x) => x.id !== id));
  }
  async function clearAll() {
    await clearHistory(userId);
    setItems([]); setConfirmClear(false);
  }
  function save(item: HistoryItem) {
    const a = document.createElement("a");
    a.href = item.thumb; a.download = `인물사진-기록-${new Date(item.createdAt).toISOString().slice(0, 10)}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="stack">
      <div className="actions">
        {confirmClear ? (
          <>
            <span className="muted">기록을 모두 삭제할까요? 되돌릴 수 없습니다.</span>
            <button type="button" onClick={clearAll}>모두 삭제</button>
            <button type="button" onClick={() => setConfirmClear(false)}>취소</button>
          </>
        ) : <button type="button" onClick={() => setConfirmClear(true)}><Trash2 size={14} />전체 삭제</button>}
      </div>
      <div className="project-grid">
        {items.map((it) => (
          <div key={it.id} className="project-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.thumb} alt={`${it.purposeLabel} 결과`} className="hist-thumb" />
            <small>{new Date(it.createdAt).toLocaleString("ko-KR")}</small>
            <h3>{it.purposeLabel}</h3>
            <p className="muted">{it.aspect} · {it.model.includes("pro") ? "Pro" : "Flash"}</p>
            <div className="actions">
              <button type="button" onClick={() => save(it)}><Download size={13} />저장</button>
              <button type="button" onClick={() => remove(it.id)} aria-label="기록 삭제"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
      <p className="muted">기록 미리보기는 긴 변 900px로 줄인 사본입니다. 원본 해상도는 생성 직후 [PNG 저장]으로 받아 주세요.</p>
    </div>
  );
}
