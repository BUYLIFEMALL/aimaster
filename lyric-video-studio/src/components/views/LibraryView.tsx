"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, timeAgo, toMsg, type Msg } from "@/components/ui/api";
import { Message } from "@/components/ui/Message";
import { useStudio, type SavedItem } from "@/components/studio/StudioContext";

export function LibraryView() {
  const { open, dirty, projectId } = useStudio();
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[] | null>(null), [msg, setMsg] = useState<Msg>(null), [busy, setBusy] = useState("");
  const load = () => api<{ items: SavedItem[] }>("/api/items?kind=project").then((r) => setItems(r.items)).catch((e) => { setItems([]); setMsg(toMsg(e)); });
  useEffect(() => { void load(); }, []);

  async function remove(it: SavedItem) {
    if (!confirm(`「${it.title}」을 지울까요? 되돌릴 수 없습니다.`)) return;
    setBusy(it.id); setMsg(null);
    try { await api(`/api/items?id=${it.id}`, { method: "DELETE" }); setItems((p) => (p ?? []).filter((x) => x.id !== it.id)); setMsg({ text: "지웠습니다.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }
  function openItem(it: SavedItem) {
    if (dirty && it.id !== projectId && !confirm("저장하지 않은 작업이 있습니다. 이 작업을 열까요?")) return;
    open(it); router.push("/source");
  }

  return (
    <div className="stack">
      <div className="page-heading"><p className="eyebrow">LIBRARY</p><h1>🗂️ 내 보관함</h1><p>저장한 가사 시간표·디자인·제목을 다시 엽니다. 음악·커버 파일은 서버에 저장하지 않으므로 연 뒤 1단계에서 다시 넣어 주세요. 저장한 작업은 30일 뒤 자동으로 지워집니다.</p></div>
      <Message msg={msg} />
      {items === null ? <p className="muted">불러오는 중…</p> : items.length === 0 ? (
        <div className="empty-state"><div className="emoji">🗂️</div><p>저장한 작업이 없습니다. 작업 화면 위쪽 「💾 저장」을 누르면 여기에 남습니다.</p></div>
      ) : (
        <div className="list">
          {items.map((it) => {
            return (
              <div key={it.id} className="list-item">
                <span style={{ minWidth: 0 }}>
                  <strong>{it.title}</strong>{it.id === projectId && <span className="badge brand" style={{ marginLeft: 6 }}>지금 작업 중</span>}
                  <small>{it.data.artist || "아티스트 없음"} · 가사 {it.data.lines?.length ?? 0}줄 · {it.data.design?.aspect === "portrait" ? "세로" : "가로"} · 음악 {it.data.audioName || "-"} · {timeAgo(it.updated_at)} 수정</small>
                </span>
                <span className="actions" style={{ flexShrink: 0 }}>
                  <button type="button" className="primary" onClick={() => openItem(it)}>열기</button>
                  <button type="button" className="danger" onClick={() => void remove(it)} disabled={busy === it.id}>{busy === it.id ? "지우는 중…" : "삭제"}</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
