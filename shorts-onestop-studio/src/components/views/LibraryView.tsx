"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import type { ShortsScript } from "@/lib/script";

export function LibraryView() {
  const [items, setItems] = useState<Item<ShortsScript>[] | null>(null);
  const [guides, setGuides] = useState<Item<{ text: string }>[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const load = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([api<{ items: Item<ShortsScript>[] }>("/api/items?kind=project"), api<{ items: Item<{ text: string }>[] }>("/api/items?kind=guideline")]);
      setItems(p.items); setGuides(g.items);
    } catch (e) { setMsg(toMsg(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function remove(id: string, label: string) {
    if (!window.confirm(`「${label}」을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try { await api(`/api/items?id=${id}`, { method: "DELETE" }); await load(); setMsg({ text: "삭제했습니다.", ok: true }); } catch (e) { setMsg(toMsg(e)); }
  }
  return (
    <>
      <Hero eyebrow="LIBRARY" title="🗂️ 내 보관함" desc="저장한 대본과 분야별 내 지침을 모아 둡니다. 대본을 누르면 이어서 고칠 수 있습니다. 프리셋은 디자인 단계가 열릴 때 함께 추가됩니다." emoji="🗂️" meta={[`📝 대본 ${items?.length ?? "…"}개`, `✍️ 지침 ${guides.length}개`]} />
      <div className="stack">
        <Message msg={msg} />
        <section className="card stack">
          <h2>📝 저장한 대본</h2>
          {items === null ? <p className="muted">불러오는 중…</p> : items.length === 0 ? (
            <div className="empty-state"><span className="emoji">📭</span><strong>보관함이 비어 있어요</strong><span>주제·대본 화면에서 대본을 만들고 [보관함에 저장]을 눌러 주세요.</span><a className="button primary" href="/topic">✨ 대본 만들러 가기</a></div>
          ) : <div className="list">{items.map((p) => (
            <div key={p.id} className="list-item">
              <a href={`/topic?id=${p.id}`} style={{ flex: 1 }}><strong>{p.title}</strong><small>{p.data.category || "직접 입력"} · 카드 {p.data.cards?.length ?? 0}장 · {p.data.source === "manual" ? "내 대본" : "AI 대본"} · {timeAgo(p.updated_at)}</small></a>
              <button type="button" className="danger" onClick={() => void remove(p.id, p.title)}><Trash2 size={13} />삭제</button>
            </div>))}</div>}
        </section>
        <section className="card stack">
          <h2>✍️ 분야별 내 지침</h2>
          {guides.length === 0 ? <p className="muted">아직 저장한 지침이 없습니다. 주제·대본 화면에서 분야를 고른 뒤 [지침 쓰기]로 만들 수 있습니다.</p> :
            <div className="list">{guides.map((g) => (
              <div key={g.id} className="list-item"><div style={{ flex: 1 }}><strong>{g.title}</strong><small style={{ whiteSpace: "pre-wrap" }}>{g.data.text.slice(0, 120)}{g.data.text.length > 120 ? "…" : ""}</small></div>
                <button type="button" className="danger" onClick={() => void remove(g.id, `${g.title} 지침`)}><Trash2 size={13} />삭제</button></div>))}</div>}
        </section>
      </div>
    </>
  );
}
