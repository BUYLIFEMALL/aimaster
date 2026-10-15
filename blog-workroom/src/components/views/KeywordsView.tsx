"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Search, Sparkles, Trash2 } from "lucide-react";
import { deleteItem, listItems, run, type Item } from "@/components/ui/api";
import { Busy, GradeHelp, Message, MetricTable, toMsg, type Msg } from "@/components/ui/parts";
import { BlogPicker, useBlogs } from "@/components/ui/useBlogs";
import type { KeywordData, KeywordMetric } from "@/lib/types";

type Cand = KeywordMetric & { reason?: string; saved?: boolean };
const TABS = ["주제로 탐색", "직접 키워드 분석", "보관함"] as const;

export function KeywordsView() {
  const { blogs, selected, select } = useBlogs();
  const [tab, setTab] = useState<(typeof TABS)[number]>("주제로 탐색");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const [cands, setCands] = useState<Cand[]>([]), [picked, setPicked] = useState<Set<string>>(new Set());
  const [direct, setDirect] = useState(""), [directRows, setDirectRows] = useState<Cand[]>([]);
  const [library, setLibrary] = useState<Item<KeywordData>[] | null>(null);
  const [grade, setGrade] = useState("전체");

  const loadLibrary = useCallback(async () => { try { setLibrary(await listItems<KeywordData>("keyword")); } catch (e) { setMsg(toMsg(e)); setLibrary([]); } }, []);
  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  async function act(label: string, fn: () => Promise<void>) { setBusy(label); setMsg(null); try { await fn(); } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); } }
  const toggle = (k: string) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const discover = () => act("후보를 찾고 공식 수치로 검증하는 중…(1~2분)", async () => {
    const d = selected?.data;
    const r = await run<{ candidates: Cand[] }>("kw.discover", { blogItemId: selected?.id, categories: d?.categories ?? [], subtopics: d?.selected.length ? d.selected : d?.subtopics ?? [] });
    setCands(r.candidates); setPicked(new Set(r.candidates.filter((c) => c.grade === "골드" && !c.saved).map((c) => c.keyword)));
    setMsg({ text: `후보 ${r.candidates.length}개를 검증했습니다. 보관할 검색어를 체크하세요.`, ok: true });
  });
  const analyzeDirect = () => act("검색량·문서수를 조회하는 중…", async () => {
    const r = await run<{ metrics: Cand[] }>("kw.metrics", { keywords: direct.split(/[\n,]/).map((x) => x.trim()).filter(Boolean) });
    setDirectRows(r.metrics); setPicked(new Set(r.metrics.map((m) => m.keyword)));
  });
  const saveRows = (rows: Cand[], source: "탐색" | "직접") => act("보관함에 저장하는 중…", async () => {
    const items = rows.filter((r) => picked.has(r.keyword) && !r.saved);
    if (!items.length) { setMsg({ text: "보관할 검색어를 체크해 주세요." }); return; }
    const r = await run<{ added: number }>("kw.save", { items, source, blogItemId: selected?.id ?? null });
    setMsg({ text: `${r.added}개를 보관함에 저장했습니다.`, ok: true });
    const saved = new Set(items.map((i) => i.keyword));
    setCands((c) => c.map((x) => (saved.has(x.keyword) ? { ...x, saved: true } : x))); setDirectRows((c) => c.map((x) => (saved.has(x.keyword) ? { ...x, saved: true } : x)));
    setPicked(new Set()); await loadLibrary();
  });
  const removeKw = (it: Item<KeywordData>) => act("삭제하는 중…", async () => { await deleteItem(it.id); setLibrary((l) => l?.filter((x) => x.id !== it.id) ?? null); });

  const libRows = useMemo(() => (library ?? []).filter((k) => grade === "전체" || k.data.grade === grade), [library, grade]);
  const d = selected?.data;

  return (
    <div className="stack">
      <div className="actions" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "primary" : ""} onClick={() => { setTab(t); setMsg(null); }}>{t}{t === "보관함" && library ? ` (${library.length})` : ""}</button>)}</div>
      <Message msg={msg} /><Busy on={!!busy} label={busy} />

      {tab === "주제로 탐색" && <section className="card stack">
        <BlogPicker blogs={blogs} selected={selected} onSelect={select} />
        {d && <div className="notice"><strong>탐색 주제</strong> — 카테고리: {d.categories.join(", ") || "없음"} / 세부 주제: {(d.selected.length ? d.selected : d.subtopics).join(", ") || "없음"} <a href="/style" style={{ textDecoration: "underline" }}>수정</a>{!d.approved && <><br /><span className="muted">스타일이 아직 승인되지 않았습니다. 승인하면 내 문체에 맞는 후보가 더 정확해집니다.</span></>}</div>}
        <div className="actions"><button className="primary" disabled={!!busy || !d || (!d.categories.length && !d.subtopics.length)} onClick={() => void discover()}><Sparkles size={14} />골드키워드 탐색</button><small className="muted">본인 AI 키 1회 + 네이버 검색광고·검색 API를 사용합니다.</small></div>
        {cands.length > 0 && <>
          <MetricTable rows={cands} selected={picked} onToggle={toggle} />
          <div className="actions"><button className="primary" disabled={!!busy || !picked.size} onClick={() => void saveRows(cands, "탐색")}><Archive size={14} />선택한 {picked.size}개 보관</button></div>
        </>}
        <GradeHelp />
      </section>}

      {tab === "직접 키워드 분석" && <section className="card stack">
        <label>분석할 검색어(줄마다 하나, 최대 20개)<textarea rows={5} value={direct} onChange={(e) => setDirect(e.target.value)} placeholder={"아기 이유식 시작 시기\n이유식 큐브 만들기"} /></label>
        <div className="actions"><button className="primary" disabled={!!busy || !direct.trim()} onClick={() => void analyzeDirect()}><Search size={14} />수치 확인</button></div>
        {directRows.length > 0 && <>
          <MetricTable rows={directRows} selected={picked} onToggle={toggle} extra={(r) => <a className="link-button" href={`/research?keyword=${encodeURIComponent(r.keyword)}`}>글 작성 준비 →</a>} />
          <div className="actions"><button className="primary" disabled={!!busy || !picked.size} onClick={() => void saveRows(directRows, "직접")}><Archive size={14} />선택한 {picked.size}개 보관</button></div>
        </>}
        <GradeHelp />
      </section>}

      {tab === "보관함" && <section className="card stack">
        <div className="row"><label className="row" style={{ gap: 8 }}>등급<select style={{ width: 140 }} value={grade} onChange={(e) => setGrade(e.target.value)}>{["전체", "골드", "실버", "일반", "경쟁", "검색 적음"].map((g) => <option key={g}>{g}</option>)}</select></label><small className="muted">보관 당시 수치입니다. 다시 확인하려면 직접 키워드 분석을 이용하세요.</small></div>
        {library === null ? <p className="muted">불러오는 중…</p> : <MetricTable rows={libRows.map((k) => ({ ...k.data, reason: `${k.data.source} · ${k.data.checkedAt.slice(0, 10)}${k.data.reason ? ` · ${k.data.reason}` : ""}` }))} extra={(r) => {
          const it = libRows.find((x) => x.data.keyword === r.keyword)!;
          return <span className="row" style={{ gap: 2, flexWrap: "nowrap" }}><a className="link-button" href={`/research?keyword=${encodeURIComponent(r.keyword)}`}>글 작성 준비 →</a><button className="link-button danger" aria-label={`${r.keyword} 삭제`} onClick={() => void removeKw(it)}><Trash2 size={13} /></button></span>;
        }} />}
      </section>}
    </div>
  );
}
