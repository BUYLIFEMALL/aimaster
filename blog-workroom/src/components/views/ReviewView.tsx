"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Copy, Download, FileCheck2, Trash2 } from "lucide-react";
import { deleteItem, listItems, run, saveItem, type Item } from "@/components/ui/api";
import { Busy, Message, toMsg, type Msg } from "@/components/ui/parts";
import { charCount } from "@/lib/logic";
import type { DraftData, FinalData } from "@/lib/types";

const AREAS = ["내 블로그 스타일", "작성 원칙", "사실·출처", "경험 표현", "자료 유사 표현", "민감·과장 표현"];

function toHtml(title: string, text: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = text.split(/\n\s*\n/).map((p) => (p.startsWith("■ ") ? `<h3>${esc(p.slice(2))}</h3>` : `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)).join("");
  return `<h2>${esc(title)}</h2>${body}`;
}

export function ReviewView({ draftId }: { draftId: string }) {
  const [drafts, setDrafts] = useState<Item<DraftData>[] | null>(null);
  const [finals, setFinals] = useState<Item<FinalData>[]>([]);
  const [current, setCurrent] = useState<Item<DraftData> | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([listItems<DraftData>("draft"), listItems<FinalData>("final")]);
      const ready = d.filter((x) => x.data.text.trim()); setDrafts(ready); setFinals(f);
      setCurrent((c) => (c ? ready.find((x) => x.id === c.id) ?? null : ready.find((x) => x.id === draftId) ?? ready[0] ?? null));
    } catch (e) { setMsg(toMsg(e)); setDrafts([]); }
  }, [draftId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => setConfirmed(false), [current?.id]);

  async function act(label: string, fn: () => Promise<void>) { setBusy(label); setMsg(null); try { await fn(); } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); } }
  const review = () => act("6개 영역을 검수하는 중…(1분 내외)", async () => { const it = await run<Item<DraftData>>("write.review", { id: current!.id }); setCurrent(it); setMsg({ text: it.data.review?.issues.length ? `검수했습니다. 지적 ${it.data.review.issues.length}건을 확인하세요.` : "검수했습니다. 지적 사항이 없습니다.", ok: true }); });
  const editText = (text: string) => setCurrent({ ...current!, data: { ...current!.data, text, review: null, status: "written" } });
  const saveText = () => act("저장하는 중…", async () => { setCurrent(await saveItem<DraftData>(current!.id, { data: current!.data })); });
  const apply = (quote: string, suggestion: string) => {
    const t = current!.data.text;
    if (!t.includes(quote)) { setMsg({ text: "지적한 문장을 본문에서 그대로 찾지 못했습니다. 본문을 직접 수정하세요." }); return; }
    const next = { ...current!.data, text: t.replace(quote, suggestion), review: null, status: "written" as const };
    void act("제안을 반영하는 중…", async () => { setCurrent(await saveItem<DraftData>(current!.id, { data: next })); setMsg({ text: "제안을 반영했습니다. 수정 후에는 다시 검수해야 합니다.", ok: true }); });
  };
  const finalize = () => act("최종본을 저장하는 중…", async () => { await run("write.finalize", { id: current!.id, confirmed }); setConfirmed(false); await load(); setMsg({ text: "최종본을 저장했습니다. 아래 최종본 목록에서 복사하거나 내보내세요. 원래 초안은 유지됩니다.", ok: true }); });
  const copy = async (text: string, html?: string) => {
    try {
      if (html && typeof ClipboardItem !== "undefined") await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      else await navigator.clipboard.writeText(text);
      setMsg({ text: html ? "서식 포함으로 복사했습니다. 붙여 넣은 뒤 서식과 출처를 확인하세요." : "텍스트로 복사했습니다.", ok: true });
    } catch { setMsg({ text: "복사하지 못했습니다. 브라우저 권한을 확인해 주세요." }); }
  };
  const download = (f: FinalData) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`${f.title}\n\n${f.text}`], { type: "text/plain;charset=utf-8" })); a.download = `${f.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "최종본"}.txt`; a.click(); URL.revokeObjectURL(a.href); };
  const removeFinal = (f: Item<FinalData>) => { if (window.confirm("이 최종본을 삭제할까요?")) void act("삭제하는 중…", async () => { await deleteItem(f.id); await load(); }); };

  const d = current?.data, rv = d?.review;
  const must = rv?.issues.filter((x) => x.level === "필수").length ?? 0;
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card">
          <h2>보관된 초안</h2>
          {drafts === null ? <p className="muted">불러오는 중…</p> : !drafts.length ? <div className="notice warning">작성이 끝난 초안이 없습니다. <a href="/write" style={{ textDecoration: "underline" }}>글 작성</a>에서 모든 구간을 작성하세요.</div> : <div className="list">{drafts.map((x) => <button key={x.id} className={`list-item ${x.id === current?.id ? "active" : ""}`} onClick={() => setCurrent(x)}><span><strong>{x.data.title}</strong><small>{x.data.review ? `검수함 · 필수 ${x.data.review.issues.filter((i) => i.level === "필수").length}건` : "검수 전"}</small></span></button>)}</div>}
        </section>
        <section className="card">
          <h2>최종본 {finals.length}개</h2>
          {!finals.length ? <p className="muted">아직 없습니다.</p> : <div className="list">{finals.map((f) => <div key={f.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <span><strong>{f.data.title}</strong><small>{f.data.at.slice(0, 16).replace("T", " ")} · {charCount(f.data.text).toLocaleString()}자</small></span>
            <span className="row" style={{ gap: 4 }}><button onClick={() => void copy(`${f.data.title}\n\n${f.data.text}`)}><Copy size={12} />텍스트</button><button onClick={() => void copy(`${f.data.title}\n\n${f.data.text}`, toHtml(f.data.title, f.data.text))}><Copy size={12} />서식 포함</button><button onClick={() => download(f.data)}><Download size={12} />TXT</button><a className="button" href={`/images?final=${f.id}`}>이미지</a><button className="link-button danger" aria-label="최종본 삭제" onClick={() => removeFinal(f)}><Trash2 size={12} /></button></span>
          </div>)}</div>}
        </section>
      </div>
      <div className="stack">
        <Message msg={msg} /><Busy on={!!busy} label={busy} />
        {!d ? <div className="card muted">왼쪽에서 검수할 초안을 고르세요.</div> : <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>{d.title}</h2><small className="muted">공백 제외 {charCount(d.text).toLocaleString()}자</small></div>
            <textarea className="editor" aria-label="본문" value={d.text} onChange={(e) => editText(e.target.value)} onBlur={() => void saveText()} />
            <div className="actions"><button className="primary" disabled={!!busy} onClick={() => void review()}><ClipboardCheck size={14} />{rv ? "현재 수정본 다시 검수" : "검수하기"}</button><small className="muted">점검 영역: {AREAS.join(" · ")}</small></div>
            <p className="muted" style={{ fontSize: 11 }}>AI 판단은 추정이며 사실 확인·검색 순위·인터넷 전체 표절 검사를 대신하지 않습니다. 출처는 직접 확인하세요. 후기·경험 표현은 실제 구매·방문·사용을 증명하지 않으니 본인 경험에 맞게 고치세요.</p>
          </section>
          {rv && <section className="card stack">
            <h2>검수 결과 — 필수 {must}건 · 권장 {rv.issues.length - must}건</h2>
            {rv.summary && <div className="notice">{rv.summary}</div>}
            {rv.issues.map((x, i) => <div key={i} className="issue">
              <div className="row"><span className={`badge ${x.level}`}>{x.level}</span><strong style={{ fontSize: 12 }}>{x.area}</strong></div>
              <q>{x.quote}</q><p style={{ fontSize: 12 }}>{x.reason}</p>
              {x.suggestion && <div className="row" style={{ marginTop: 6 }}><small>제안: {x.suggestion}</small><button className="link-button" disabled={!!busy} onClick={() => apply(x.quote, x.suggestion)}>제안 반영</button></div>}
            </div>)}
            {must > 0 ? <div className="notice warning">필수 수정 사항을 해결하고 다시 검수해야 최종본으로 저장할 수 있습니다.</div> : <>
              <label className="row" style={{ fontWeight: 500 }}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />글 내용·출처·검수 결과를 직접 확인했습니다.</label>
              <div className="actions"><button className="primary" disabled={!!busy || !confirmed} onClick={() => void finalize()}><FileCheck2 size={14} />최종본으로 저장</button>{finals.some((f) => f.data.draftId === current!.id) && <span className="ok row"><CheckCircle2 size={14} />이 초안의 최종본이 있습니다</span>}</div>
            </>}
          </section>}
        </>}
      </div>
    </div>
  );
}
