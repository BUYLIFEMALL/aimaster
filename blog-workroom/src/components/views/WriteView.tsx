"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, PenLine, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { deleteItem, listItems, run, saveItem, type Item } from "@/components/ui/api";
import { Busy, Message, toMsg, type Msg } from "@/components/ui/parts";
import { charCount, joinSections } from "@/lib/logic";
import type { DraftData, ResearchData } from "@/lib/types";

const TYPES = ["정보형", "후기형", "비교형", "방법(how-to)형", "목록형"];
const LENGTHS = ["짧게(1500자 내외)", "보통(2500자 내외)", "길게(4000자 이상)"];
const EXPERIENCE = ["쓰지 않음", "확인 표시와 함께 사용"];

export function WriteView({ researchId, draftId }: { researchId: string; draftId: string }) {
  const [researches, setResearches] = useState<Item<ResearchData>[]>([]);
  const [drafts, setDrafts] = useState<Item<DraftData>[] | null>(null);
  const [current, setCurrent] = useState<Item<DraftData> | null>(null);
  const [rid, setRid] = useState(researchId);
  const [opt, setOpt] = useState({ type: TYPES[0], length: LENGTHS[1], experience: EXPERIENCE[0], request: "" });
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const stop = useRef(false);

  const load = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([listItems<ResearchData>("research"), listItems<DraftData>("draft")]);
      const approved = r.filter((x) => x.data.approved); setResearches(approved); setDrafts(d);
      setRid((cur) => cur || approved[0]?.id || "");
      setCurrent((c) => (c ? d.find((x) => x.id === c.id) ?? null : d.find((x) => x.id === draftId) ?? null));
    } catch (e) { setMsg(toMsg(e)); setDrafts([]); }
  }, [draftId]);
  useEffect(() => { void load(); }, [load]);

  const outline = async () => {
    setBusy("제목 후보와 글 구성을 만드는 중…"); setMsg(null);
    try { const it = await run<Item<DraftData>>("write.outline", { researchId: rid, options: opt }); setCurrent(it); await load(); setMsg({ text: "글 구성을 만들었습니다. 소제목을 확인·수정한 뒤 작성을 시작하세요.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  };
  /** 비어 있는 구간부터 순서대로 작성(중지하면 다음 구간 전에 멈춤 — 쓴 구간은 저장됨) */
  async function writeAll(only?: number) {
    if (!current) return;
    stop.current = false; setMsg(null);
    let item = current;
    try {
      const targets = only != null ? [only] : item.data.sections.map((s, i) => (s.body.trim() ? -1 : i)).filter((i) => i >= 0);
      for (const [n, i] of targets.entries()) {
        if (stop.current) { setMsg({ text: "중지했습니다. 작성한 구간은 저장되었고 [이어서 작성]으로 계속할 수 있습니다.", ok: true }); break; }
        setBusy(`구간 ${i + 1}/${item.data.sections.length} 작성 중…(${n + 1}/${targets.length})`);
        item = await run<Item<DraftData>>("write.section", { id: item.id, index: i }); setCurrent(item);
      }
      if (!stop.current && item.data.status === "written") setMsg({ text: "모든 구간을 작성했습니다. 내용을 확인·수정한 뒤 최종 검수를 진행하세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); void load(); }
  }
  const save = async (data: DraftData, title?: string) => {
    try { setCurrent(await saveItem<DraftData>(current!.id, { data, title })); } catch (e) { setMsg(toMsg(e)); }
  };
  const edit = (patch: Partial<DraftData>) => {
    const d = { ...current!.data, ...patch };
    const done = d.sections.every((s) => s.body.trim());
    const next = { ...d, text: done ? joinSections(d.title, d.sections) : d.text, review: null, status: (done ? "written" : d.sections.some((s) => s.body.trim()) ? "writing" : "outline") as DraftData["status"] };
    setCurrent({ ...current!, data: next });
    return next;
  };
  const remove = async () => { if (!window.confirm("이 초안을 삭제할까요?")) return; try { await deleteItem(current!.id); setCurrent(null); await load(); } catch (e) { setMsg(toMsg(e)); } };

  const d = current?.data;
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card stack">
          <h2>새 초안</h2>
          {!researches.length ? <div className="notice warning">승인된 작성 준비 자료가 없습니다. <a href="/research" style={{ textDecoration: "underline" }}>글 작성 준비</a>에서 자료를 승인하세요.</div> : <>
            <label>승인된 자료<select value={rid} onChange={(e) => setRid(e.target.value)}>{researches.map((r) => <option key={r.id} value={r.id}>{r.data.query} · 사전 지식 {r.data.points.filter((p) => p.kept).length}개</option>)}</select></label>
            <label>글 유형<select value={opt.type} onChange={(e) => setOpt({ ...opt, type: e.target.value })}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>분량<select value={opt.length} onChange={(e) => setOpt({ ...opt, length: e.target.value })}>{LENGTHS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>경험 표현<select value={opt.experience} onChange={(e) => setOpt({ ...opt, experience: e.target.value })}>{EXPERIENCE.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>추가 요청(선택)<textarea rows={3} value={opt.request} onChange={(e) => setOpt({ ...opt, request: e.target.value.slice(0, 500) })} placeholder="예) 초보 엄마 눈높이로, 마지막에 체크리스트" /></label>
            <button className="primary" disabled={!!busy || !rid} onClick={() => void outline()}><PenLine size={14} />글 구성 만들기</button>
          </>}
        </section>
        <section className="card">
          <h2>보관된 초안</h2>
          {drafts === null ? <p className="muted">불러오는 중…</p> : !drafts.length ? <p className="muted">아직 없습니다.</p> : <div className="list">{drafts.map((x) => <button key={x.id} className={`list-item ${x.id === current?.id ? "active" : ""}`} onClick={() => setCurrent(x)}><span><strong>{x.data.title}</strong><small>{x.data.keyword} · {{ outline: "구성만", writing: "작성 중", written: "작성 완료", reviewed: "검수함" }[x.data.status]}</small></span></button>)}</div>}
        </section>
      </div>
      <div className="stack">
        <Message msg={msg} />
        {busy && <div className="row"><Busy on label={busy} />{!busy.startsWith("제목") && <button onClick={() => { stop.current = true; }}><Square size={12} />중지 · 저장 유지</button>}</div>}
        {!d ? <div className="card muted">왼쪽에서 승인된 자료로 새 초안을 만들거나 보관된 초안을 고르세요.</div> : <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>제목</h2><button className="link-button danger" onClick={() => void remove()}><Trash2 size={13} />초안 삭제</button></div>
            <div className="chips">{d.titles.map((t) => <button key={t} className={`chip ${d.title === t ? "on" : ""}`} onClick={() => void save(edit({ title: t }), t)}>{t}</button>)}</div>
            <input aria-label="제목" value={d.title} onChange={(e) => edit({ title: e.target.value })} onBlur={() => void save(current!.data, current!.data.title)} />
            <small className="muted">{d.options.type} · {d.options.length} · 경험 표현 {d.options.experience} · 검색어 「{d.keyword}」</small>
            <div className="actions">
              <button className="primary" disabled={!!busy || d.sections.every((s) => s.body.trim())} onClick={() => void writeAll()}><Play size={14} />{d.sections.some((s) => s.body.trim()) ? "이어서 작성" : "전체 작성 시작"}</button>
              {d.status === "written" || d.status === "reviewed" ? <a className="button" href={`/review?draft=${current!.id}`}>이 초안 최종 검수하기 →</a> : null}
              {d.text && <button onClick={() => void navigator.clipboard.writeText(d.text).then(() => setMsg({ text: "본문을 복사했습니다.", ok: true }))}><Copy size={13} />본문 복사</button>}
              {d.text && <small className="muted">공백 제외 {charCount(d.text).toLocaleString()}자</small>}
            </div>
          </section>
          {d.sections.map((s, i) => (
            <section key={i} className="card stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong style={{ fontSize: 13 }}>{i + 1}. {s.heading || "도입"}</strong>
                <button className="link-button" disabled={!!busy} onClick={() => void writeAll(i)}><RotateCcw size={13} />{s.body ? "이 구간 다시 쓰기" : "이 구간 쓰기"}</button>
              </div>
              {i > 0 && <input aria-label={`${i + 1}번 소제목`} value={s.heading} onChange={(e) => edit({ sections: d.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) })} onBlur={() => void save(current!.data)} />}
              <small className="muted">담을 내용: {s.goal}</small>
              <textarea rows={s.body ? Math.min(18, Math.max(5, Math.ceil(s.body.length / 60))) : 3} value={s.body} placeholder="아직 작성하지 않았습니다." onChange={(e) => edit({ sections: d.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} onBlur={() => void save(current!.data)} />
            </section>
          ))}
          <p className="muted" style={{ fontSize: 11 }}>[경험 확인 필요] 표시는 실제 경험에 맞게 고치거나 지우세요. 수정한 내용은 입력란을 벗어나면 자동 저장되고, 수정 후에는 다시 검수해야 합니다. 자동 발행은 하지 않습니다.</p>
        </>}
      </div>
    </div>
  );
}
