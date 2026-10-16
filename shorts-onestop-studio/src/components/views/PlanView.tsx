"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Square, Trash2, Wand2, Layers } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import { CATEGORIES, FORMATS, MAX_CARDS, MIN_CARDS, TONES, guessFromTopic, type ShortsScript, type Tone } from "@/lib/script";
import { MAX_PLAN_TOPICS, STAGES, UPLOAD_TIMES, type PlanData, type Stage } from "@/lib/plan";

const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const DAY = ["일", "월", "화", "수", "목", "금", "토"];
const dow = (ymd: string) => DAY[new Date(`${ymd}T00:00:00Z`).getUTCDay()];

export function PlanView() {
  const [list, setList] = useState<Item<PlanData>[] | null>(null);
  const [item, setItem] = useState<Item<PlanData> | null>(null);
  const [stage, setStage] = useState<Stage>("start"), [cats, setCats] = useState<string[]>([]);
  const [perDay, setPerDay] = useState(1), [days, setDays] = useState(7), [start, setStart] = useState(today()), [seed, setSeed] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set()), [tone, setTone] = useState<Tone>("friendly"), [cards, setCards] = useState(5), [useGuide, setUseGuide] = useState(true);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null), [prog, setProg] = useState<{ done: number; total: number; ok: number } | null>(null);
  const stopRef = useRef(false);
  const count = perDay * days;

  const load = useCallback(async (pick?: string) => {
    try {
      const { items } = await api<{ items: Item<PlanData>[] }>("/api/items?kind=plan"); setList(items);
      const id = pick ?? new URLSearchParams(window.location.search).get("id") ?? items[0]?.id;
      setItem(items.find((p) => p.id === id) ?? items[0] ?? null); setSel(new Set());
    } catch (e) { setMsg(toMsg(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function guidelineFor(category: string): Promise<string> {
    if (!useGuide) return "";
    try { const { items } = await api<{ items: Item<{ text: string }>[] }>("/api/items?kind=guideline"); return items.find((g) => g.title === category)?.data.text ?? ""; } catch { return ""; }
  }

  async function makePlan() {
    if (!cats.length) { setMsg({ text: "분야를 1~3개 골라 주세요." }); return; }
    if (count > MAX_PLAN_TOPICS) { setMsg({ text: `주제는 한 번에 ${MAX_PLAN_TOPICS}개까지 만들 수 있습니다(지금 ${count}개).` }); return; }
    setBusy(`AI가 ${count}개 주제와 전략을 짜는 중…`); setMsg(null);
    try {
      const guideline = cats.length === 1 ? await guidelineFor(cats[0]) : "";
      const { plan } = await api<{ plan: PlanData }>("/api/ai/plan", { body: { stage, categories: cats, perDay, days, start, seed, guideline } });
      const title = `${plan.start} 시작 · ${plan.categories.join("/")} · ${plan.days}일×${plan.perDay}편`;
      const { item: saved } = await api<{ item: Item<PlanData> }>("/api/items", { body: { kind: "plan", title, data: plan } });
      await load(saved.id);
      window.history.replaceState(null, "", `/plan?id=${saved.id}`);
      setMsg({ text: `발행 계획을 만들어 저장했습니다(주제 ${plan.entries.length}개). 아래 일정에서 주제를 골라 대본을 한꺼번에 만들 수 있어요.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function savePlan(data: PlanData) {
    if (!item) return;
    const { item: saved } = await api<{ item: Item<PlanData> }>("/api/items", { method: "PATCH", body: { id: item.id, data } });
    setItem(saved); setList((l) => l?.map((p) => (p.id === saved.id ? saved : p)) ?? l);
  }

  async function bulk() {
    if (!item) return;
    const idx = [...sel].sort((a, b) => a - b).filter((i) => !item.data.entries[i]?.projectId);
    if (!idx.length) { setMsg({ text: "대본이 아직 없는 주제를 골라 주세요." }); return; }
    stopRef.current = false; setMsg(null); setProg({ done: 0, total: idx.length, ok: 0 });
    let data = structuredClone(item.data); let ok = 0; const guides = new Map<string, string>();
    for (let k = 0; k < idx.length; k++) {
      if (stopRef.current) break;
      const e = data.entries[idx[k]];
      setBusy(`대본 만드는 중… (${k + 1}/${idx.length}) ${e.title}`);
      try {
        if (!guides.has(e.category)) guides.set(e.category, await guidelineFor(e.category));
        const g = guessFromTopic(e.title);
        const { script } = await api<{ script: ShortsScript }>("/api/ai/script", { body: { topic: e.title, category: e.category, tone, format: e.format ?? g.format ?? "list", cards: g.cards ?? cards, guideline: guides.get(e.category) } });
        const { item: proj } = await api<{ item: Item<ShortsScript> }>("/api/items", { body: { kind: "project", title: e.title, data: script } });
        data.entries[idx[k]] = { ...e, projectId: proj.id, error: undefined }; ok++;
      } catch (err) {
        data.entries[idx[k]] = { ...e, error: toMsg(err)?.text ?? "실패" };
        if ((err as { needKey?: boolean }).needKey) { setMsg(toMsg(err)); data = structuredClone(data); await savePlan(data).catch(() => undefined); break; }
      }
      data = structuredClone(data);
      await savePlan(data).catch(() => undefined); // 한 편마다 저장(중간에 탭을 닫아도 만든 것은 남음)
      setProg({ done: k + 1, total: idx.length, ok });
    }
    setBusy(""); setSel(new Set());
    setMsg((m) => m ?? { text: `${ok}편의 대본을 만들어 보관함에 저장했습니다${stopRef.current ? "(중간에 멈춤)" : ""}. 각 주제의 [열기]로 배경·음성·MP4를 이어서 만드세요.`, ok: ok > 0 });
  }

  async function remove() {
    if (!item || !window.confirm("이 발행 계획을 지울까요? 만들어 둔 대본은 보관함에 그대로 남습니다.")) return;
    try { await api(`/api/items?id=${item.id}`, { method: "DELETE" }); window.history.replaceState(null, "", "/plan"); await load(""); } catch (e) { setMsg(toMsg(e)); }
  }

  const p = item?.data; const entries = p?.entries ?? [];
  const pending = entries.map((e, i) => (!e.projectId ? i : -1)).filter((i) => i >= 0);
  const toggle = (i: number) => setSel((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <>
      <Hero eyebrow="STEP 5 · 발행 계획" title="📅 업로드 일정을 짜고 여러 편을 한꺼번에" desc="채널 단계와 분야를 고르면 AI가 운영 전략과 날짜별 주제를 짜고, 분야별 추천 시간대에 배치합니다. 일정에서 주제를 골라 대본을 순서대로 한꺼번에 만들어 보관함에 저장하세요." emoji="📅" meta={["🧭 채널 단계 6가지", "⏰ 분야별 추천 시간대", "🗂️ 대본 일괄 제작"]} />
      <div className="stack">
        <Message msg={msg} />
        <section className="card stack">
          <h2>① 계획 만들기</h2>
          <label>채널 단계<select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>{Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <small className="muted">🧭 {STAGES[stage].guide}</small>
          <div><small className="muted">분야(1~3개)</small><div className="chips" style={{ marginTop: 6 }}>{CATEGORIES.map((c) => <button key={c} type="button" className={`chip ${cats.includes(c) ? "on" : ""}`} onClick={() => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length < 3 ? [...s, c] : s))}>{c}</button>)}</div></div>
          <div className="field-grid">
            <label>하루 편수<select value={perDay} onChange={(e) => setPerDay(Number(e.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}편</option>)}</select></label>
            <label>기간<select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[3, 5, 7, 10, 14, 21, 30].map((n) => <option key={n} value={n}>{n}일</option>)}</select></label>
            <label>시작일<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          </div>
          <label>채널 방향·키워드 (선택)<input value={seed} maxLength={200} onChange={(e) => setSeed(e.target.value)} placeholder="예: 40대 직장인 대상, 집에서 하는 운동 위주" /></label>
          <div className="actions">
            <button className="primary" disabled={!!busy || !cats.length || count > MAX_PLAN_TOPICS} onClick={() => void makePlan()}><Wand2 size={14} />계획 만들기 (주제 {count}개)</button>
            {count > MAX_PLAN_TOPICS && <small style={{ color: "var(--err)" }}>⚠️ 한 번에 {MAX_PLAN_TOPICS}개까지 — 기간·편수를 줄여 주세요</small>}
            <Busy on={busy.startsWith("AI")} label={busy} />
          </div>
          <small className="muted">본인 AI 키로 1회 요청합니다. 추천 시간대는 분야별 일반적인 시청 시간대를 바탕으로 한 참고값이며 조회수를 보장하지 않습니다.{cats.length === 1 ? " 이 분야에 저장한 내 지침이 있으면 함께 적용합니다." : ""}</small>
        </section>

        {list && list.length > 0 && (
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <label style={{ flex: 1, minWidth: 0 }}>저장된 계획<select value={item?.id ?? ""} onChange={(e) => { void load(e.target.value); window.history.replaceState(null, "", `/plan?id=${e.target.value}`); }}>{list.map((x) => <option key={x.id} value={x.id}>{x.title} · {timeAgo(x.updated_at)}</option>)}</select></label>
              {item && <button type="button" className="danger" disabled={!!busy} onClick={() => void remove()}><Trash2 size={13} />계획 지우기</button>}
            </div>
            {p && <>
              <div className="avatar-tip"><span className="avatar">🧭</span><div><strong>{STAGES[p.stage]?.label} 전략</strong><p className="muted">{p.strategy.summary}</p></div></div>
              <div className="grid2">
                {p.strategy.focus.length > 0 && <div><strong>🎯 집중할 점</strong><ul className="muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>{p.strategy.focus.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                {p.strategy.tips.length > 0 && <div><strong>💡 실행 팁</strong><ul className="muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>{p.strategy.tips.map((x) => <li key={x}>{x}</li>)}</ul></div>}
              </div>
              <small className="muted">⏰ 추천 시간대: {p.categories.map((c) => `${c} ${(UPLOAD_TIMES[c] ?? []).slice(0, p.perDay).join("·")}`).join(" / ")}</small>
            </>}
          </section>
        )}

        {p && (
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2><CalendarDays size={16} /> ② 업로드 일정 <small>{entries.filter((e) => e.projectId).length}/{entries.length} 대본 완료</small></h2>
              <div className="actions">
                <button type="button" className="link-button" onClick={() => setSel(new Set(pending))}>대본 없는 주제 모두 고르기</button>
                {sel.size > 0 && <button type="button" className="link-button" onClick={() => setSel(new Set())}>선택 해제</button>}
              </div>
            </div>
            <div className="list">{entries.map((e, i) => (
              <div key={i} className="list-item">
                <label className="row" style={{ gap: 10, minWidth: 0, flex: 1, fontWeight: 500, alignItems: "flex-start" }}>
                  <input type="checkbox" disabled={!!e.projectId || !!busy} checked={sel.has(i)} onChange={() => toggle(i)} style={{ marginTop: 4 }} />
                  <div style={{ minWidth: 0 }}>
                    <small className="muted">{e.date.slice(5)}({dow(e.date)}) {e.time} · {e.category}{e.format ? ` · ${FORMATS[e.format].label}` : ""}</small>
                    <strong style={{ display: "block" }}>{e.title}</strong>
                    {e.hook && <small className="muted">🎣 {e.hook}</small>}
                    {e.error && <small style={{ color: "var(--err)", display: "block" }}>⚠️ {e.error}</small>}
                  </div>
                </label>
                <div className="actions" style={{ flexShrink: 0 }}>
                  {e.projectId ? <><span className="badge brand">✅ 대본</span><a className="button" href={`/topic?id=${e.projectId}`}>열기</a><a className="button" href={`/render?id=${e.projectId}`}>🎙️</a></> : <span className="badge">대본 전</span>}
                </div>
              </div>))}</div>
          </section>
        )}

        {p && (
          <section className="card stack">
            <h2><Layers size={16} /> ③ 고른 주제 대본 한꺼번에 만들기 <small>{sel.size}개 선택</small></h2>
            <div className="field-grid">
              <label>말투<select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>{Object.entries(TONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
              <label>카드 수(주제에 숫자가 있으면 그 수)<select value={cards} onChange={(e) => setCards(Number(e.target.value))}>{Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i).map((n) => <option key={n} value={n}>{n}장</option>)}</select></label>
              <label className="row" style={{ gap: 8, fontWeight: 500, alignSelf: "end" }}><input type="checkbox" checked={useGuide} onChange={(e) => setUseGuide(e.target.checked)} />분야별 내 지침 적용</label>
            </div>
            {prog && <div className="stack" style={{ gap: 6 }}><div style={{ height: 10, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${Math.round((prog.done / prog.total) * 100)}%`, height: "100%", background: "var(--brand)", transition: "width .3s" }} /></div><small className="muted">{prog.done}/{prog.total} 처리 · 성공 {prog.ok}편</small></div>}
            <div className="actions">
              {busy.startsWith("대본") ? <button type="button" className="danger" onClick={() => { stopRef.current = true; }}><Square size={13} />이번 편까지만 하고 멈추기</button>
                : <button className="primary" disabled={!!busy || sel.size === 0} onClick={() => void bulk()}><Layers size={14} />{sel.size}편 대본 만들기</button>}
              <Busy on={busy.startsWith("대본")} label={busy} />
            </div>
            <small className="muted">주제마다 본인 AI 키로 1회씩 순서대로 요청하고, 한 편이 끝날 때마다 보관함과 계획에 저장합니다. 실패한 주제는 표시하고 다음 주제로 넘어갑니다. 만드는 동안 이 탭을 열어 두세요.</small>
          </section>
        )}
      </div>
    </>
  );
}
