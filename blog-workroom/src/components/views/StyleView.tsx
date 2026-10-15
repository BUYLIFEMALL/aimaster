"use client";
import { useState } from "react";
import { CheckCircle2, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { deleteItem, run, saveItem, type Item } from "@/components/ui/api";
import { Busy, Message, toMsg, type Msg } from "@/components/ui/parts";
import { useBlogs } from "@/components/ui/useBlogs";
import type { BlogData } from "@/lib/types";

const DEPTHS = [{ v: 5, t: "최신 5개 · 빠른 분석" }, { v: 10, t: "최신 10개 · 확장 분석" }, { v: 20, t: "최신 20개 · 정밀 분석" }, { v: 30, t: "최신 30개 · 넓은 분석" }];

export function StyleView() {
  const { blogs, selected, select, replace, reload } = useBlogs();
  const [input, setInput] = useState(""), [sample, setSample] = useState("");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const [depth, setDepth] = useState(10);
  const [newCat, setNewCat] = useState(""), [newSub, setNewSub] = useState("");

  async function act(label: string, fn: () => Promise<void>) {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }
  const create = () => act("블로그를 확인하는 중…", async () => {
    const item = await run<Item<BlogData>>("style.create", { input, samples: sample.trim() ? [sample] : [] });
    replace(item); select(item.id); setInput(""); setSample("");
    setMsg({ text: "블로그를 등록했습니다. 최신 글을 수집한 뒤 스타일을 분석하세요.", ok: true });
  });
  const collect = (b: Item<BlogData>) => act("최신 글과 본문을 수집하는 중…", async () => {
    const item = await run<Item<BlogData>>("style.collect", { id: b.id, depth }); replace(item);
    setMsg({ text: `최신 글 ${item.data.posts.length}개를 수집했습니다.`, ok: true });
  });
  const analyze = (b: Item<BlogData>) => act("내 블로그 스타일을 분석하는 중…(30초~1분)", async () => {
    const item = await run<Item<BlogData>>("style.analyze", { id: b.id }); replace(item);
    setMsg({ text: "분석했습니다. 결과를 확인하고 승인해 주세요.", ok: true });
  });
  const save = (b: Item<BlogData>, data: Partial<BlogData>, note?: string) => act("저장하는 중…", async () => {
    replace(await saveItem<BlogData>(b.id, { data: { ...b.data, ...data } })); if (note) setMsg({ text: note, ok: true });
  });
  const remove = (b: Item<BlogData>) => { if (!window.confirm(`「${b.data.name}」을(를) 목록에서 삭제할까요? 이미 만든 키워드·초안은 남습니다.`)) return; void act("삭제하는 중…", async () => { await deleteItem(b.id); select(null); await reload(); }); };

  const b = selected;
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card">
          <h2>새 블로그 입력</h2>
          <div className="stack">
            <label>네이버 블로그 주소 또는 블로그 ID<input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://blog.naver.com/아이디 또는 아이디" /></label>
            <label>내 글 표본(선택 · 40자 이상)<textarea rows={4} value={sample} onChange={(e) => setSample(e.target.value)} placeholder="본인 블로그 글 본문을 붙여 넣으세요. 주소 없이 표본만으로도 분석할 수 있습니다." /></label>
            <button className="primary" disabled={!!busy || (!input.trim() && sample.trim().length < 40)} onClick={() => void create()}><Plus size={14} />링크로 등록</button>
          </div>
        </section>
        <section className="card">
          <h2>등록된 블로그</h2>
          {blogs === null ? <p className="muted">불러오는 중…</p> : !blogs.length ? <p className="muted">등록된 블로그가 없습니다.</p> : (
            <div className="list">{blogs.map((x) => (
              <button key={x.id} className={`list-item ${x.id === b?.id ? "active" : ""}`} onClick={() => select(x.id)}>
                <span><strong>{x.data.name}</strong><small>{x.data.blogId ?? "표본만"} · {x.data.approved ? "승인됨" : x.data.style ? "승인 대기" : "분석 전"}</small></span>
              </button>
            ))}</div>
          )}
        </section>
      </div>

      <div className="stack">
        <Message msg={msg} /><Busy on={!!busy} label={busy} />
        {!b ? <div className="card muted">왼쪽에서 블로그를 등록하거나 선택하세요.</div> : <>
          <section className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2>① 글 수집 — {b.data.name}</h2>
              <button className="link-button danger" onClick={() => remove(b)}><Trash2 size={13} />목록에서 삭제</button>
            </div>
            {b.data.blogId && <div className="row" style={{ marginTop: 10 }}>
              <select style={{ maxWidth: 240 }} value={depth} onChange={(e) => setDepth(Number(e.target.value))} aria-label="수집 개수">{DEPTHS.map((d) => <option key={d.v} value={d.v}>{d.t}</option>)}</select>
              <button disabled={!!busy} onClick={() => void collect(b)}><RefreshCw size={14} />최신 글 수집</button>
              <a className="subtle-link" href={b.data.url ?? "#"} target="_blank" rel="noreferrer">블로그 열기 ↗</a>
            </div>}
            <p className="muted" style={{ marginTop: 10 }}>수집한 글 {b.data.posts.length}개 · 붙여 넣은 표본 {b.data.samples.length}개</p>
            {b.data.posts.length > 0 && <details style={{ marginTop: 8 }}><summary className="muted" style={{ cursor: "pointer" }}>수집한 글 제목 보기</summary><ol style={{ fontSize: 12, margin: "8px 0 0", paddingLeft: 18 }}>{b.data.posts.map((p) => <li key={p.link}><a href={p.link} target="_blank" rel="noreferrer">{p.title}</a> <small>{p.text.length.toLocaleString()}자</small></li>)}</ol></details>}
            <details style={{ marginTop: 8 }}><summary className="muted" style={{ cursor: "pointer" }}>내 글 표본 추가</summary>
              <SampleAdder disabled={!!busy} onAdd={(t) => void save(b, { samples: [...b.data.samples, t].slice(-10) }, "표본을 추가했습니다.")} />
            </details>
          </section>

          <section className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2>② 내 블로그 스타일 결과·승인</h2>
              <button className="primary" disabled={!!busy || (!b.data.posts.length && !b.data.samples.length)} onClick={() => void analyze(b)}><Sparkles size={14} />{b.data.style ? "다시 분석" : "스타일 분석"}</button>
            </div>
            {!b.data.style ? <p className="muted" style={{ marginTop: 10 }}>글을 수집하거나 표본을 넣은 뒤 분석하세요. 분석에는 본인 AI 키 사용량이 생깁니다.</p> : (
              <div className="stack" style={{ marginTop: 12 }}>
                <p>{b.data.style.summary}</p>
                <div className="field-grid">
                  {([["어조", b.data.style.tone], ["문장", b.data.style.sentence], ["구성", b.data.style.structure], ["독자", b.data.style.reader]] as const).map(([k, v]) => <div key={k} className="notice"><strong>{k}</strong><p>{v}</p></div>)}
                </div>
                <div><strong style={{ fontSize: 12 }}>자주 쓰는 표현</strong><div className="chips" style={{ marginTop: 6 }}>{b.data.style.expressions.map((x) => <span key={x} className="chip">{x}</span>)}</div></div>
                <div className="field-grid">
                  <div><strong style={{ fontSize: 12 }}>강점</strong><ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>{b.data.style.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <div><strong style={{ fontSize: 12 }}>개선하면 좋을 점</strong><ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>{b.data.style.cautions.map((x) => <li key={x}>{x}</li>)}</ul></div>
                </div>
                <div className="row">
                  {b.data.approved ? <span className="ok row"><CheckCircle2 size={15} />승인한 스타일로 초안을 작성합니다.</span> : <button className="primary" disabled={!!busy} onClick={() => void save(b, { approved: true }, "스타일을 승인했습니다. 키워드 탐색으로 넘어가세요.")}><CheckCircle2 size={14} />이 스타일 승인</button>}
                  {b.data.approved && <a className="button" href="/keywords">키워드 탐색으로 →</a>}
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <h2>③ 탐색 주제 — 키워드 탐색·트렌드 관측·벤치마킹에 공통 적용</h2>
            <div className="stack">
              <div>
                <strong style={{ fontSize: 12 }}>블로그 카테고리 · 최대 3개</strong>
                <div className="chips" style={{ marginTop: 6 }}>{b.data.categories.map((c) => <span key={c} className="chip on">{c}<button aria-label={`${c} 삭제`} onClick={() => void save(b, { categories: b.data.categories.filter((x) => x !== c) })}><X size={12} /></button></span>)}</div>
                {b.data.categories.length < 3 && <div className="row" style={{ marginTop: 6 }}><input style={{ maxWidth: 220 }} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="예) 육아" /><button disabled={!newCat.trim()} onClick={() => { void save(b, { categories: [...b.data.categories, newCat.trim()].slice(0, 3) }); setNewCat(""); }}>추가</button></div>}
              </div>
              <div>
                <strong style={{ fontSize: 12 }}>세부 주제 · 최대 5개 (체크한 것으로 탐색)</strong>
                <div className="chips" style={{ marginTop: 6 }}>{b.data.subtopics.map((c) => {
                  const on = b.data.selected.includes(c);
                  return <span key={c} className={`chip ${on ? "on" : ""}`}><label className="row" style={{ gap: 5, fontWeight: 500 }}><input type="checkbox" checked={on} onChange={() => void save(b, { selected: on ? b.data.selected.filter((x) => x !== c) : [...b.data.selected, c] })} />{c}</label><button aria-label={`${c} 삭제`} onClick={() => void save(b, { subtopics: b.data.subtopics.filter((x) => x !== c), selected: b.data.selected.filter((x) => x !== c) })}><X size={12} /></button></span>;
                })}</div>
                {b.data.subtopics.length < 5 && <div className="row" style={{ marginTop: 6 }}><input style={{ maxWidth: 220 }} value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="예) 아기 이유식" /><button disabled={!newSub.trim()} onClick={() => { const v = newSub.trim(); void save(b, { subtopics: [...b.data.subtopics, v].slice(0, 5), selected: [...b.data.selected, v] }); setNewSub(""); }}>추가</button></div>}
              </div>
            </div>
          </section>
        </>}
      </div>
    </div>
  );
}

function SampleAdder({ onAdd, disabled }: { onAdd: (t: string) => void; disabled: boolean }) {
  const [t, setT] = useState("");
  return <div className="stack" style={{ marginTop: 8 }}><textarea rows={5} value={t} onChange={(e) => setT(e.target.value)} placeholder="본인 블로그 글 본문을 붙여 넣으세요(40자 이상)." /><div><button disabled={disabled || t.trim().length < 40} onClick={() => { onAdd(t.trim()); setT(""); }}>표본 추가</button></div></div>;
}
