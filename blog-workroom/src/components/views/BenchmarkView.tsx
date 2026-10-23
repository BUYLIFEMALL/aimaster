"use client";
import { useCallback, useEffect, useState } from "react";
import { Archive, Eye, Search, Sparkles, Trash2 } from "lucide-react";
import { deleteItem, listItems, run, saveItem, type Item } from "@/components/ui/api";
import { Busy, GradeHelp, Message, MetricTable, toMsg, type Msg } from "@/components/ui/parts";
import { BlogPicker, useBlogs } from "@/components/ui/useBlogs";
import type { BenchData, KeywordMetric } from "@/lib/types";

export function BenchmarkView() {
  const { blogs, selected, select } = useBlogs();
  const [list, setList] = useState<Item<BenchData>[] | null>(null);
  const [current, setCurrent] = useState<Item<BenchData> | null>(null);
  const [queries, setQueries] = useState<string[]>([]), [q, setQ] = useState(""), [manual, setManual] = useState("");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [view, setView] = useState<string | null>(null);

  const load = useCallback(async () => { try { const l = await listItems<BenchData>("bench"); setList(l); setCurrent((c) => (c ? l.find((x) => x.id === c.id) ?? null : l[0] ?? null)); } catch (e) { setMsg(toMsg(e)); setList([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function act(label: string, fn: () => Promise<void>) { setBusy(label); setMsg(null); try { await fn(); } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); } }

  const topics = selected ? [...selected.data.categories, ...selected.data.subtopics] : [];
  const toggleQ = (t: string) => setQueries((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t].slice(0, 3)));
  const find = () => act("같은 주제 블로그를 찾는 중…", async () => { const it = await run<Item<BenchData>>("bench.find", { queries, blogItemId: selected?.id ?? null }); setCurrent(it); await load(); });
  const analyze = (blogId: string) => act("최근 글을 읽고 분석하는 중…(1분 내외)", async () => {
    const it = await run<Item<BenchData>>("bench.analyze", { id: current!.id, blogId }); setCurrent(it); setView(it.data.analyses[0]?.blogId ?? null);
    setPicked(new Set()); setMsg({ text: "분석했습니다. 참고할 검색어를 보관하세요.", ok: true });
  });
  const toggleWatch = (blogId: string) => act("저장하는 중…", async () => { const d = current!.data; setCurrent(await saveItem<BenchData>(current!.id, { data: { ...d, watch: d.watch.includes(blogId) ? d.watch.filter((x) => x !== blogId) : [...d.watch, blogId] } })); });
  const keep = (rows: KeywordMetric[]) => act("보관함에 저장하는 중…", async () => {
    const r = await run<{ added: number }>("kw.save", { items: rows.filter((x) => picked.has(x.keyword)), source: "벤치마킹", blogItemId: current!.data.blogItemId });
    setMsg({ text: `${r.added}개를 키워드 보관함에 저장했습니다.`, ok: true }); setPicked(new Set());
  });
  const remove = (b: Item<BenchData>) => { if (window.confirm("이 벤치마킹 기록을 삭제할까요?")) void act("삭제하는 중…", async () => { await deleteItem(b.id); setCurrent(null); await load(); }); };

  const c = current?.data;
  const analysis = c?.analyses.find((a) => a.blogId === view) ?? c?.analyses[0] ?? null;
  const rows = (analysis?.keywords ?? []).filter((k) => k.metric).map((k) => ({ ...k.metric!, reason: k.why }));
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card stack">
          <h2>블로그 찾기</h2>
          <BlogPicker blogs={blogs} selected={selected} onSelect={select} />
          {topics.length > 0 && <div className="chips">{topics.map((t) => <button key={t} className={`chip ${queries.includes(t) ? "on" : ""}`} onClick={() => toggleQ(t)}>{t}</button>)}</div>}
          <div className="row"><input style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="주제 직접 입력" /><button disabled={!q.trim() || queries.length >= 3} onClick={() => { toggleQ(q.trim()); setQ(""); }}>추가</button></div>
          <small className="muted">선택한 주제(최대 3개): {queries.join(", ") || "없음"}</small>
          <button className="primary" disabled={!!busy || !queries.length} onClick={() => void find()}><Search size={14} />같은 주제 블로그 찾기</button>
        </section>
        <section className="card">
          <h2>벤치마킹 기록</h2>
          {list === null ? <p className="muted">불러오는 중…</p> : !list.length ? <p className="muted">아직 기록이 없습니다.</p> : <div className="list">{list.map((b) => <button key={b.id} className={`list-item ${b.id === current?.id ? "active" : ""}`} onClick={() => { setCurrent(b); setView(null); }}><span><strong>{b.title}</strong><small>블로그 {b.data.blogs.length}개 · 분석 {b.data.analyses.length}개</small></span></button>)}</div>}
        </section>
      </div>
      <div className="stack">
        <Message msg={msg} /><Busy on={!!busy} label={busy} />
        {!c ? <div className="card muted">왼쪽에서 주제를 골라 같은 주제를 쓰는 블로그를 찾으세요.</div> : <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>「{c.topic}」 블로그 {c.blogs.length}개</h2><button className="link-button danger" onClick={() => remove(current!)}><Trash2 size={13} />삭제</button></div>
            <div className="table-wrap"><table>
              <thead><tr><th>블로그</th><th className="num">검색 노출</th><th /></tr></thead>
              <tbody>{c.blogs.map((b) => <tr key={b.blogId}>
                <td><a href={`https://blog.naver.com/${b.blogId}`} target="_blank" rel="noreferrer"><strong>{b.name}</strong></a> {c.watch.includes(b.blogId) && <span className="badge up">관찰 중</span>}<small style={{ display: "block" }}>{b.sample}</small></td>
                <td className="num">{b.hits}건</td>
                <td><span className="row" style={{ gap: 4, flexWrap: "nowrap" }}><button disabled={!!busy} onClick={() => void analyze(b.blogId)}><Sparkles size={13} />분석</button><button className="link-button" onClick={() => void toggleWatch(b.blogId)}><Eye size={13} />{c.watch.includes(b.blogId) ? "관찰 해제" : "관찰"}</button></span></td>
              </tr>)}</tbody>
            </table></div>
            <div className="row"><input style={{ flex: 1, maxWidth: 360 }} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="다른 블로그 주소나 ID로 분석" /><button disabled={!!busy || !manual.trim()} onClick={() => void analyze(manual.trim())}>분석</button></div>
            <small className="muted">검색 노출은 고른 주제로 검색했을 때 상위 50개 결과에 나온 글 수입니다. 남의 글을 베끼기 위한 기능이 아니라 주제·제목 방식을 참고하기 위한 기능입니다.</small>
          </section>
          {c.analyses.length > 0 && <section className="card stack">
            <div className="chips">{c.analyses.map((a) => <button key={a.blogId} className={`chip ${analysis?.blogId === a.blogId ? "on" : ""}`} onClick={() => setView(a.blogId)}>{a.name}</button>)}</div>
            {analysis && <>
              <div className="notice"><strong>제목·구성 패턴</strong><p style={{ marginTop: 4 }}>{analysis.pattern}</p></div>
              {analysis.strengths.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>{analysis.strengths.map((s) => <li key={s}>{s}</li>)}</ul>}
              <details><summary className="muted" style={{ cursor: "pointer" }}>최근 글 제목 {analysis.titles.length}개</summary><ol style={{ fontSize: 12, paddingLeft: 18 }}>{analysis.titles.map((t, i) => <li key={i}>{t}</li>)}</ol></details>
              <h3>참고할 검색어</h3>
              <MetricTable rows={rows} selected={picked} onToggle={(k) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
              <GradeHelp />
              <div className="actions"><button className="primary" disabled={!!busy || !picked.size} onClick={() => void keep(rows)}><Archive size={14} />선택한 {picked.size}개 보관</button></div>
            </>}
          </section>}
        </>}
      </div>
    </div>
  );
}
