"use client";
import { useEffect, useState } from "react";
import { Download, FileText, RefreshCw, Trash2 } from "lucide-react";
import { downloadUrl } from "@/lib/comic/draw";
import { MAX_SAVED } from "@/lib/comic/savedIndex";
import type { Script } from "@/lib/comic/script";
import { convertPresetFor } from "@/lib/comic/imageSize";
import { markHandoff } from "@/lib/linkHandoff";

interface Item { id: string; url: string | null; title: string; episode: number; panelCount: number; aspect: string; createdAt: string; expiresAt: string | null; script: Script; width?: number; height?: number; imported?: string; ext?: string }

const fmt = (iso: string) => new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/** 서버 보관함 목록(v1.05): 회원 본인 폴더의 완성작만 서버가 서명 주소(1시간)로 돌려준다 */
export function ServerWorks() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setError("");
    try {
      const r = await fetch("/api/saved", { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "서버 보관함을 불러오지 못했습니다.");
      setItems(d.items as Item[]);
    } catch (e) { setError(e instanceof Error ? e.message : "서버 보관함을 불러오지 못했습니다."); setItems([]); }
  }
  useEffect(() => { load(); }, []);

  async function download(it: Item) {
    if (!it.url) return;
    setError("");
    try {
      const blob = await (await fetch(it.url)).blob();
      const url = URL.createObjectURL(blob);
      downloadUrl(url, it.imported ? `만화-변환-${it.id.slice(0, 8)}.${it.ext ?? "jpg"}` : `만화-${it.episode}화.jpg`);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { setError("내려받지 못했습니다. [새로고침] 후 다시 시도해 주세요(주소는 1시간 동안 유효합니다)."); }
  }
  async function remove(id: string) {
    setError("");
    const r = await fetch(`/api/saved?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) { setError("삭제하지 못했습니다."); return; }
    setItems((cur) => (cur ?? []).filter((x) => x.id !== id)); setConfirm(null);
  }
  async function removeAll() {
    setError(""); setDeleting(true);
    try {
      const r = await fetch("/api/saved?all=1", { method: "DELETE" });
      if (!r.ok) { setError("전체 삭제하지 못했습니다."); return; }
      setItems([]); setConfirm(null);
    } finally { setDeleting(false); }
  }

  return (
    <section className="studio" aria-label="서버 보관함">
      <div className="cc-row">
        <h2 className="cc-h">서버 보관함</h2>
        <button type="button" onClick={load}><RefreshCw size={14} />새로고침</button>
        {!!items?.length && (confirm === "all"
          ? <>
              <button type="button" className="danger" onClick={removeAll} disabled={deleting}><Trash2 size={14} />{deleting ? "삭제 중..." : `${items.length}개 모두 삭제`}</button>
              <button type="button" onClick={() => setConfirm(null)} disabled={deleting}>취소</button>
            </>
          : <button type="button" onClick={() => setConfirm("all")}><Trash2 size={14} />전체 삭제</button>)}
      </div>
      <p className="muted">[서버 보관함에 저장]한 작품입니다. 다른 기기·브라우저에서도 보이며 회원당 최대 {MAX_SAVED}개, 정한 보관 기간이 지나면 자동으로 지워집니다.</p>
      {error && <p role="alert" className="notice lp-alert">{error}</p>}
      {items === null ? <p className="muted">불러오는 중...</p> : items.length === 0 ? (
        <div className="card"><p>서버 보관함이 비어 있습니다. 완성 화면의 <b>[서버 보관함에 저장]</b>으로 올릴 수 있습니다.</p></div>
      ) : (
        <div className="cc-works">
          {items.map((w) => (
            <article key={w.id} className="card cc-work">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {w.url ? <img src={w.url} alt={`${w.title} 만화`} /> : <div className="cc-placeholder">이미지 없음</div>}
              <b>{w.title}{w.episode > 1 ? ` (${w.episode}화)` : ""}</b>
              {/* v1.34: 이미지 변환 스튜디오에서 다시 저장한 그림만 있는 작품 */}
              {w.imported && <small className="muted" data-converted-badge>🔁 변환됨 · {(w.ext ?? "jpg").toUpperCase()}</small>}
              <small className="muted">{w.imported ? "그림만" : `${w.panelCount}컷 · ${w.aspect}`} · {fmt(w.createdAt)}{w.expiresAt ? ` · ${fmt(w.expiresAt)}까지 보관` : " · 직접 지울 때까지"}</small>
              <div className="actions">
                <button type="button" onClick={() => download(w)} disabled={!w.url}><Download size={14} />다운로드</button>
                {/* v1.26: 서버 보관 작품을 이미지 변환 스튜디오로(서명 주소 1시간, 변환은 브라우저 안에서) */}
                {w.url && <a className="button" href={`https://image-convert-studio.buylife.xyz/convert?src=${encodeURIComponent(w.url)}${convertPresetFor(w.width, w.height) ? `&preset=${convertPresetFor(w.width, w.height)}` : ""}&via=four-cut-comics&label=${encodeURIComponent(`${w.title || "4컷 만화"}${w.episode > 1 ? ` ${w.episode}화` : ""}`)}`} onClick={() => markHandoff(w.id, "image-convert-studio")} target="_blank" rel="noopener noreferrer" title="WebP·PNG·JPEG·AVIF 형식·크기 바꾸기(이미지 변환 스튜디오)">🔁 형식 바꾸기</a>}
                {/* v1.32: 완성작을 시네마틱 스토리보드 참고 이미지로(서명 주소 1시간, 받는 쪽이 저장소를 확인) — 보낸 곳 ?via=로 돌아가기·프로젝트 기록 */}
                {w.url && <a className="button" href={`https://cinematic-storyboard-studio.buylife.xyz/studio?src=${encodeURIComponent(w.url)}&via=four-cut-comics`} onClick={() => markHandoff(w.id, "cinematic-storyboard-studio")} target="_blank" rel="noopener noreferrer" title="이 만화를 참고 이미지로 시네마틱 스토리보드 만들기" data-storyboard-link>🎬 스토리보드로</a>}
                {!w.imported && <button type="button" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}><FileText size={14} />대본</button>}
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
