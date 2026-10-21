"use client";
import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { clearHistory, listHistory, removeHistory } from "@/lib/portrait/history";
import type { HistoryItem } from "@/lib/portrait/history";
import { localDateStamp } from "@/lib/portrait/post";

interface SavedItem { id: string; url: string | null; purposeLabel: string; aspect: string; model: string; bytes: number; createdAt: string; expiresAt: string | null }

export function HistoryList({ userId }: { userId: string }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saved, setSaved] = useState<SavedItem[] | null>(null);
  const [savedError, setSavedError] = useState("");
  const [confirmSaved, setConfirmSaved] = useState(false);

  useEffect(() => { listHistory(userId).then(setItems); }, [userId]);
  useEffect(() => {
    fetch("/api/saved", { cache: "no-store" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "보관함을 불러오지 못했습니다."); setSaved(d.items as SavedItem[]); })
      .catch((e) => { setSaved([]); setSavedError(e instanceof Error ? e.message : "보관함을 불러오지 못했습니다."); });
  }, []);

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
    a.href = item.thumb; a.download = `인물사진-기록-${localDateStamp(new Date(item.createdAt))}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function removeSaved(id: string) {
    setSavedError("");
    const r = await fetch(`/api/saved?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) setSaved((cur) => (cur ?? []).filter((x) => x.id !== id)); else setSavedError("삭제하지 못했습니다.");
  }
  async function clearSaved() {
    setSavedError("");
    const r = await fetch("/api/saved?all=1", { method: "DELETE" });
    if (r.ok) { setSaved([]); setConfirmSaved(false); } else setSavedError("삭제하지 못했습니다.");
  }

  return (
    <div className="stack">
      <section>
        <h2>이 브라우저 기록 <small className="muted">(최근 20장 · 서버에는 없음)</small></h2>
        {items === null ? <p className="empty">불러오는 중…</p> : items.length === 0 ? (
          <p className="empty">아직 만든 사진이 없습니다. <a className="subtle-link" href="/studio">스튜디오로 가기</a></p>
        ) : (
          <>
            <div className="actions" style={{ margin: "8px 0" }}>
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
          </>
        )}
      </section>

      <section className="saved-section">
        <h2>서버 보관함 <small className="muted">(선택 기능 · 최대 30장 · 비공개)</small></h2>
        {saved && saved.length > 0 && (
          <p className="usage" aria-label="보관함 사용량">
            <b>{saved.length}장 / 30장</b> · 합계 {(saved.reduce((n, x) => n + x.bytes, 0) / (1024 * 1024)).toFixed(1)}MB
            <span className="usage-bar"><i style={{ width: `${Math.min(100, Math.round((saved.length / 30) * 100))}%` }} /></span>
            {saved.length >= 30 && <small className="muted"> 가득 찼습니다. 새로 저장하면 가장 오래된 사진부터 자동으로 지워집니다.</small>}
          </p>
        )}
        <p className="muted">스튜디오에서 [서버 보관함에도 저장]을 켠 경우에만 결과 사진(원본 제외)이 저장됩니다. 본인만 볼 수 있고 언제든 삭제할 수 있습니다.</p>
        {savedError && <p role="alert" className="error">{savedError}</p>}
        {saved === null ? <p className="empty">불러오는 중…</p> : saved.length === 0 ? (
          <p className="empty">서버 보관함이 비어 있습니다.</p>
        ) : (
          <>
            <div className="actions" style={{ margin: "8px 0" }}>
              {confirmSaved ? (
                <>
                  <span className="muted">보관함의 사진을 모두 삭제할까요? 되돌릴 수 없습니다.</span>
                  <button type="button" onClick={clearSaved}>모두 삭제</button>
                  <button type="button" onClick={() => setConfirmSaved(false)}>취소</button>
                </>
              ) : <button type="button" onClick={() => setConfirmSaved(true)}><Trash2 size={14} />보관함 전체 삭제</button>}
            </div>
            <div className="project-grid">
              {saved.map((it) => (
                <div key={it.id} className="project-card">
                  {it.url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={it.url} alt={`${it.purposeLabel} 보관 사진`} className="hist-thumb" />
                    : <div className="hist-thumb" />}
                  <small>{new Date(it.createdAt).toLocaleString("ko-KR")}</small>
                  <h3>{it.purposeLabel}</h3>
                  <p className="muted">{it.aspect} · {Math.round(it.bytes / 1024)}KB</p>
                  <small className="muted">{it.expiresAt ? `${new Date(it.expiresAt).toLocaleDateString("ko-KR")}에 자동 삭제` : "30일 안에 자동 삭제"}</small>
                  <div className="actions">
                    {it.url && <a className="button" href={it.url} download={`인물사진-보관-${it.id.slice(0, 8)}.jpg`} target="_blank" rel="noopener noreferrer"><Download size={13} />저장</a>}
                    <button type="button" onClick={() => removeSaved(it.id)} aria-label="보관 사진 삭제"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
