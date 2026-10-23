"use client";
import { useEffect, useState } from "react";
import { Download, FileText, Trash2 } from "lucide-react";
import { downloadUrl } from "@/lib/comic/draw";
import { deleteWork, listWorks } from "@/lib/comic/gallery";
import type { Work } from "@/lib/comic/gallery";
import { MAX_WORKS } from "@/lib/comic/extras";

const fmt = (t: number) => new Date(t).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/** [내 작품] 목록: 이 브라우저의 IndexedDB에 회원별로 보관한 완성작(최신순) */
export function WorksList({ userId }: { userId: string }) {
  const [works, setWorks] = useState<Work[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    listWorks(userId).then(setWorks).catch((e) => { setError(e instanceof Error ? e.message : "목록을 읽지 못했습니다."); setWorks([]); });
  }, [userId]);

  async function remove(id: string) {
    setError("");
    try { await deleteWork(userId, id); setWorks((cur) => (cur ?? []).filter((w) => w.id !== id)); setConfirm(null); }
    catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
  }

  if (works === null) return <p className="muted">불러오는 중...</p>;
  return (
    <section className="studio">
      {error && <p role="alert" className="notice lp-alert">{error}</p>}
      <p className="muted">보관 {works.length}/{MAX_WORKS}개 — 20개를 넘으면 가장 오래된 작품부터 자동으로 지워집니다.</p>
      {works.length === 0 ? (
        <div className="card"><p>아직 저장한 작품이 없습니다. [만화 만들기]에서 4컷을 완성한 뒤 <b>[내 작품에 저장]</b>을 눌러 주세요.</p><a className="subtle-link" href="/studio">만화 만들러 가기</a></div>
      ) : (
        <div className="cc-works">
          {works.map((w) => (
            <article key={w.id} className="card cc-work">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.image} alt={`${w.title} 4컷 만화`} />
              <b>{w.title}{w.episode > 1 ? ` (${w.episode}화)` : ""}</b>
              <small className="muted">{fmt(w.createdAt)}</small>
              <div className="actions">
                <button type="button" onClick={() => downloadUrl(w.image, `4컷만화-${w.episode}화.jpg`)}><Download size={14} />다운로드</button>
                <button type="button" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}><FileText size={14} />대본</button>
                {confirm === w.id
                  ? <button type="button" className="danger" onClick={() => remove(w.id)}><Trash2 size={14} />정말 삭제</button>
                  : <button type="button" onClick={() => setConfirm(w.id)}><Trash2 size={14} />삭제</button>}
              </div>
              {open === w.id && (
                <ol className="cc-work-script">
                  {w.script.panels.map((p) => <li key={p.panel}><b>{p.character}</b> {p.dialogue || "(대사 없음)"}</li>)}
                </ol>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
