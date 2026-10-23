"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ListChecks, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { deleteItem, listItems, run, saveItem, type Item } from "@/components/ui/api";
import { Busy, fmt, Message, Steps, toMsg, type Msg } from "@/components/ui/parts";
import { BlogPicker, useBlogs } from "@/components/ui/useBlogs";
import type { KeywordData, KeywordMetric, ResearchData } from "@/lib/types";

const STEP: Record<ResearchData["step"], number> = { picked: 0, collected: 2, analyzed: 3, approved: 4 };

export function ResearchView({ initialKeyword }: { initialKeyword: string }) {
  const { blogs, selected, select } = useBlogs();
  const [list, setList] = useState<Item<ResearchData>[] | null>(null);
  const [library, setLibrary] = useState<Item<KeywordData>[]>([]);
  const [current, setCurrent] = useState<Item<ResearchData> | null>(null);
  const [kw, setKw] = useState(initialKeyword);
  const [rel, setRel] = useState<{ self: KeywordMetric | null; autocomplete: string[]; related: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    try { const [l, k] = await Promise.all([listItems<ResearchData>("research"), listItems<KeywordData>("keyword")]); setList(l); setLibrary(k); setCurrent((c) => (c ? l.find((x) => x.id === c.id) ?? null : initialKeyword ? null : l[0] ?? null)); }
    catch (e) { setMsg(toMsg(e)); setList([]); }
  }, [initialKeyword]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setQuery(current?.data.query ?? ""); setRel(null); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(label: string, fn: () => Promise<void>) { setBusy(label); setMsg(null); try { await fn(); } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); } }
  const create = () => act("새 글 작성 준비를 만드는 중…", async () => { const it = await run<Item<ResearchData>>("research.create", { keyword: kw, blogItemId: selected?.id ?? null }); setCurrent(it); setKw(""); await load(); });
  const loadRelated = () => act("자동완성·연관 검색어를 모으는 중…", async () => {
    const r = await run<{ self: KeywordMetric | null; autocomplete: string[]; related: string[] }>("kw.related", { keyword: current!.data.keyword }); setRel(r);
    setCurrent(await saveItem<ResearchData>(current!.id, { data: { ...current!.data, related: [...r.autocomplete, ...r.related].slice(0, 40) } }));
  });
  const collect = () => act("검색어의 상위 글 5개와 관련 뉴스를 확보하는 중…", async () => { setCurrent(await run<Item<ResearchData>>("research.collect", { id: current!.id, query })); });
  const analyze = () => act("자료를 분석해 근거 있는 사전 지식을 정리하는 중…(1분 내외)", async () => {
    const it = await run<Item<ResearchData> & { dropped?: number }>("research.analyze", { id: current!.id }); setCurrent(it);
    setMsg({ text: `사전 지식 ${it.data.points.length}개를 정리했습니다${it.dropped ? ` (근거를 확인하지 못했거나 원문과 지나치게 같은 ${it.dropped}개는 제외)` : ""}. 확인 후 승인하세요.`, ok: true });
  });
  const patch = (data: Partial<ResearchData>) => act("저장하는 중…", async () => { setCurrent(await saveItem<ResearchData>(current!.id, { data: { ...current!.data, ...data } })); });
  const remove = () => { if (window.confirm("이 작성 준비를 삭제할까요? 연결된 초안은 남습니다.")) void act("삭제하는 중…", async () => { await deleteItem(current!.id); setCurrent(null); await load(); }); };

  const c = current?.data;
  const suggestions = rel ? [...rel.autocomplete, ...rel.related] : c?.related ?? [];
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card stack">
          <h2>새 글 작성 준비</h2>
          <BlogPicker blogs={blogs} selected={selected} onSelect={select} />
          <label>보관 키워드에서 선택<select value="" onChange={(e) => setKw(e.target.value)}><option value="">— 선택 —</option>{library.map((k) => <option key={k.id} value={k.data.keyword}>{k.data.keyword} · {k.data.grade} · 월 {fmt(k.data.total)}</option>)}</select></label>
          <label>또는 직접 입력<input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="예) 이유식 시작 시기" /></label>
          <button className="primary" disabled={!!busy || !kw.trim()} onClick={() => void create()}><Plus size={14} />작성 준비 시작</button>
        </section>
        <section className="card">
          <h2>작성 준비 목록</h2>
          {list === null ? <p className="muted">불러오는 중…</p> : !list.length ? <p className="muted">아직 없습니다.</p> : <div className="list">{list.map((r) => <button key={r.id} className={`list-item ${r.id === current?.id ? "active" : ""}`} onClick={() => setCurrent(r)}><span><strong>{r.data.query}</strong><small>{r.data.approved ? "승인 완료" : r.data.step === "analyzed" ? "확인 대기" : "진행 중"}</small></span></button>)}</div>}
        </section>
      </div>
      <div className="stack">
        <Message msg={msg} /><Busy on={!!busy} label={busy} />
        {!c ? <div className="card muted">왼쪽에서 키워드를 골라 글 작성 준비를 시작하세요.</div> : <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>보관 키워드: {c.keyword}</h2><button className="link-button danger" onClick={remove}><Trash2 size={13} />삭제</button></div>
            <Steps list={["검색어 목록", "검색어 선택", "상위 5개 확보", "자료 분석", "확인·승인"]} current={c.approved ? 4 : Math.max(STEP[c.step], query && query !== c.keyword ? 1 : STEP[c.step])} />
            <p className="muted" style={{ fontSize: 12 }}>보관 키워드의 검색량·등급은 새로 고른 검색어의 수치가 아닙니다. 추천되지 않은 검색어도 모두 고를 수 있습니다.</p>
            <div className="actions"><button disabled={!!busy} onClick={() => void loadRelated()}><ListChecks size={14} />검색어 목록 확보(자동완성·연관 검색어)</button></div>
            {suggestions.length > 0 && <div className="chips">{[c.keyword, ...suggestions.filter((x) => x !== c.keyword)].map((s) => <button key={s} className={`chip ${query === s ? "on" : ""}`} onClick={() => setQuery(s)}>{s}</button>)}</div>}
            <label>글을 쓸 검색어<input value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <div className="actions"><button className="primary" disabled={!!busy || !query.trim()} onClick={() => void collect()}><Search size={14} />이 검색어의 상위 5개 확보</button></div>
          </section>

          {c.sources.length > 0 && <section className="card stack">
            <h2>확보한 자료 — 「{c.query}」</h2>
            <ol className="sources" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>{c.sources.map((s, i) => <li key={i}><a href={s.link} target="_blank" rel="noreferrer">{s.title}</a> <small>{s.blogger} · {s.ok ? `본문 ${s.text.length.toLocaleString()}자` : "본문을 읽지 못해 요약만 사용"}</small></li>)}</ol>
            {c.news.length > 0 && <details><summary className="muted" style={{ cursor: "pointer" }}>관련 뉴스 {c.news.length}개</summary><ul className="sources" style={{ fontSize: 12, paddingLeft: 18 }}>{c.news.map((n, i) => <li key={i}><a href={n.link} target="_blank" rel="noreferrer">{n.title}</a></li>)}</ul></details>}
            <small className="muted">네이버 검색 API 정확도순 상위 블로그 글입니다. 실제 검색 화면의 순위와 다를 수 있습니다.</small>
            <div className="actions"><button className="primary" disabled={!!busy} onClick={() => void analyze()}><Sparkles size={14} />{c.points.length ? "다시 분석" : "AI 사전 지식 정리"}</button></div>
          </section>}

          {c.points.length > 0 && <section className="card stack">
            <h2>사전 지식 확인 — 쓰지 않을 항목은 체크를 해제하세요</h2>
            <div className="list">{c.points.map((p, i) => <label key={i} className={`point ${p.kept ? "" : "off"}`} style={{ fontWeight: 400 }}>
              <input type="checkbox" checked={p.kept} disabled={c.approved} onChange={() => void patch({ points: c.points.map((x, j) => (j === i ? { ...x, kept: !x.kept } : x)) })} />
              <span>{p.text}<small style={{ display: "block" }}>근거: {p.source > 100 ? `뉴스 ${p.source - 100}` : `자료 ${p.source}`} · 「{p.quote}」</small></span>
            </label>)}</div>
            <label>내 글의 방향<textarea rows={3} value={c.angle} disabled={c.approved} onChange={(e) => setCurrent({ ...current!, data: { ...c, angle: e.target.value } })} onBlur={() => void patch({ angle: c.angle })} /></label>
            {c.gaps.length > 0 && <div><strong style={{ fontSize: 12 }}>상위 글이 덜 다룬 독자 궁금증</strong><ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>{c.gaps.map((g) => <li key={g}>{g}</li>)}</ul></div>}
            {c.approved ? <div className="row"><span className="ok row"><CheckCircle2 size={15} />승인 완료 ({c.approvedAt?.slice(0, 16).replace("T", " ")})</span><a className="button primary" href={`/write?research=${current!.id}`}>이 자료로 글 작성 →</a><button className="link-button" onClick={() => void patch({ approved: false, approvedAt: null, step: "analyzed" })}>승인 취소</button></div>
              : <div className="actions"><button className="primary" disabled={!!busy || !c.points.some((p) => p.kept)} onClick={() => void patch({ approved: true, approvedAt: new Date().toISOString(), step: "approved" })}><CheckCircle2 size={14} />자료 확인·승인</button><small className="muted">AI 정리는 추정입니다. 출처를 직접 확인한 뒤 승인하세요.</small></div>}
          </section>}
        </>}
      </div>
    </div>
  );
}
