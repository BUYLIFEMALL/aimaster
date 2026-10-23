"use client";
import { useCallback, useEffect, useState } from "react";
import { Archive, Play, Trash2 } from "lucide-react";
import { deleteItem, listItems, run, type Item } from "@/components/ui/api";
import { Busy, fmt, GradeHelp, Message, Spark, Steps, toMsg, type Msg } from "@/components/ui/parts";
import { BlogPicker, useBlogs } from "@/components/ui/useBlogs";
import type { BriefData } from "@/lib/types";

const STEP_INDEX: Record<BriefData["step"], number> = { collected: 1, analyzed: 2, verified: 3 };

export function TrendsView() {
  const { blogs, selected, select } = useBlogs();
  const [briefs, setBriefs] = useState<Item<BriefData>[] | null>(null);
  const [current, setCurrent] = useState<Item<BriefData> | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => { try { const l = await listItems<BriefData>("brief"); setBriefs(l); setCurrent((c) => (c ? l.find((x) => x.id === c.id) ?? null : l[0] ?? null)); } catch (e) { setMsg(toMsg(e)); setBriefs([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  const topics = selected ? [...selected.data.categories, ...selected.data.subtopics] : [];

  /** 저장 지점부터 이어서: 수집 → 분석 → 검증 */
  async function proceed(start: Item<BriefData> | null) {
    setMsg(null);
    try {
      let item = start;
      if (!item) { setBusy("① 최신 뉴스·웹 자료를 모으는 중…"); item = await run<Item<BriefData>>("trend.collect", { topic, blogItemId: selected?.id ?? null }); setCurrent(item); }
      if (item.data.step === "collected") { setBusy("② 자료를 요약하고 새 용어를 찾는 중…"); item = await run<Item<BriefData>>("trend.analyze", { id: item.id }); setCurrent(item); }
      if (item.data.step === "analyzed" && item.data.terms.length) { setBusy("③ 검색어 트렌드·검색량으로 검증하는 중…"); item = await run<Item<BriefData>>("trend.verify", { id: item.id }); setCurrent(item); }
      setPicked(new Set(item.data.terms.filter((t) => t.surging).map((t) => t.term)));
      setMsg({ text: item.data.terms.length ? "트렌드 관측을 마쳤습니다." : "자료에서 검증할 새 용어를 찾지 못했습니다. 주제를 바꿔 보세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); await load(); }
  }
  async function keep() {
    if (!current) return;
    setBusy("보관함에 저장하는 중…");
    try {
      const items = current.data.terms.filter((t) => picked.has(t.term) && t.metric).map((t) => ({ ...t.metric!, reason: t.why }));
      const r = await run<{ added: number }>("kw.save", { items, source: "트렌드", blogItemId: current.data.blogItemId });
      setMsg({ text: `${r.added}개를 키워드 보관함에 저장했습니다.`, ok: true }); setPicked(new Set());
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }
  async function remove(b: Item<BriefData>) { if (!window.confirm("이 관측 기록을 삭제할까요?")) return; try { await deleteItem(b.id); setCurrent(null); await load(); } catch (e) { setMsg(toMsg(e)); } }

  const c = current?.data;
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card stack">
          <h2>새 트렌드 서칭</h2>
          <BlogPicker blogs={blogs} selected={selected} onSelect={select} />
          {topics.length > 0 && <div className="chips">{topics.map((t) => <button key={t} className={`chip ${topic === t ? "on" : ""}`} onClick={() => setTopic(t)}>{t}</button>)}</div>}
          <label>관측 주제<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예) 아기 이유식" /></label>
          <button className="primary" disabled={!!busy || !topic.trim()} onClick={() => void proceed(null)}><Play size={14} />트렌드 서칭 시작</button>
          <small className="muted">뉴스 10 + 웹자료 10을 모아 요약하고, 자료 속 새 용어의 최근 검색 추이·검색량·문서수를 확인합니다. 단계마다 저장되어 중간에 멈춰도 이어서 진행할 수 있습니다.</small>
        </section>
        <section className="card">
          <h2>관측 기록</h2>
          {briefs === null ? <p className="muted">불러오는 중…</p> : !briefs.length ? <p className="muted">아직 기록이 없습니다.</p> : <div className="list">{briefs.map((b) => <button key={b.id} className={`list-item ${b.id === current?.id ? "active" : ""}`} onClick={() => setCurrent(b)}><span><strong>{b.title}</strong><small>{b.data.step === "verified" ? `검증 완료 · 급상승 ${b.data.terms.filter((t) => t.surging).length}개` : "진행 중 · 이어서 가능"}</small></span></button>)}</div>}
        </section>
      </div>
      <div className="stack">
        <Message msg={msg} /><Busy on={!!busy} label={busy} />
        {!c ? <div className="card muted">왼쪽에서 주제를 정해 트렌드 서칭을 시작하세요.</div> : <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>{current!.title}</h2><button className="link-button danger" onClick={() => void remove(current!)}><Trash2 size={13} />삭제</button></div>
            <Steps list={["자료 수집", "요약·용어 발견", "검색 추이 검증"]} current={STEP_INDEX[c.step]} />
            {c.step !== "verified" && <div className="actions"><button className="primary" disabled={!!busy} onClick={() => void proceed(current)}><Play size={14} />저장 지점부터 계속</button></div>}
            {c.summary && <div className="notice"><strong>뉴스·웹자료 통합 요약</strong><p className="pre" style={{ marginTop: 4 }}>{c.summary}</p></div>}
          </section>
          {c.terms.length > 0 && <section className="card stack">
            <h2>새 용어와 검증 결과</h2>
            <div className="table-wrap"><table>
              <thead><tr><th /><th>검색어</th><th>최근 14일 추이</th><th className="num">변화</th><th className="num">월간 검색량</th><th className="num">문서수</th><th>등급</th></tr></thead>
              <tbody>{c.terms.map((t) => <tr key={t.term}>
                <td><input type="checkbox" aria-label={`${t.term} 선택`} disabled={!t.metric} checked={picked.has(t.term)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(t.term)) n.delete(t.term); else n.add(t.term); return n; })} /></td>
                <td><strong>{t.term}</strong> {t.surging && <span className="badge up">급상승</span>}<small style={{ display: "block" }}>{t.why}</small></td>
                <td><Spark series={t.series} /></td>
                <td className="num">{t.change == null ? "-" : `${t.change >= 0 ? "+" : ""}${Math.round(t.change * 100)}%`}</td>
                <td className="num">{fmt(t.metric?.total)}</td><td className="num">{fmt(t.metric?.docs)}</td><td>{t.metric && <span className={`badge ${t.metric.grade}`}>{t.metric.grade}</span>}</td>
              </tr>)}</tbody>
            </table></div>
            <p className="muted" style={{ fontSize: 11 }}>급상승 판정: 최근 3일 평균이 직전 7일 평균보다 50% 이상 높고, 3일 중 2일 이상과 마지막 날이 기준을 넘을 때. 자료에 나왔다는 것만으로 검색이 늘었다는 뜻은 아닙니다.</p>
            <GradeHelp />
            <div className="actions"><button className="primary" disabled={!!busy || !picked.size} onClick={() => void keep()}><Archive size={14} />선택한 {picked.size}개 키워드 보관</button></div>
          </section>}
          <section className="card">
            <h2>수집한 자료 {c.sources.length}개</h2>
            <ul className="sources" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>{c.sources.map((s, i) => <li key={i}><span className="badge">{s.kind}</span> <a href={s.link} target="_blank" rel="noreferrer">{s.title}</a>{s.date && <small> · {s.date.slice(0, 10)}</small>}</li>)}</ul>
          </section>
        </>}
      </div>
    </div>
  );
}
