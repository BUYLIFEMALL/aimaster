"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Download, Pencil, Square, Trash2, Wand2, Layers, X } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import { CATEGORIES, FORMATS, MAX_CARDS, MIN_CARDS, TONES, guessFromTopic, type ShortsScript, type Tone } from "@/lib/script";
import { MAX_PLAN_TOPICS, STAGES, UPLOAD_TIMES, sortEntries, type PlanData, type PlanEntry, type Stage } from "@/lib/plan";
import { fillBackgrounds, makeVoices, prepareMedia } from "@/lib/pipeline";
import { exportMp4 } from "@/lib/render/export";

type Steps = { bg: boolean; voice: boolean; mp4: boolean };
/** 이 항목에 아직 남은 단계가 있는가 */
const remains = (e: PlanEntry, st: Steps) => !e.projectId || (st.bg && !e.done?.bg) || (st.voice && !e.done?.voice) || (st.mp4 && !e.done?.mp4);
const fileName = (t: string) => `${t.replace(/[\\/:*?"<>|]/g, "").slice(0, 40).trim() || "shorts"}.mp4`;

const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const DAY = ["일", "월", "화", "수", "목", "금", "토"];
const dow = (ymd: string) => DAY[new Date(`${ymd}T00:00:00Z`).getUTCDay()];

export function PlanView() {
  const [list, setList] = useState<Item<PlanData>[] | null>(null);
  const [item, setItem] = useState<Item<PlanData> | null>(null);
  const [stage, setStage] = useState<Stage>("start"), [cats, setCats] = useState<string[]>([]);
  const [perDay, setPerDay] = useState(1), [days, setDays] = useState(7), [start, setStart] = useState(today()), [seed, setSeed] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set()), [tone, setTone] = useState<Tone>("friendly"), [cards, setCards] = useState(4), [useGuide, setUseGuide] = useState(true);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null), [prog, setProg] = useState<{ done: number; total: number; ok: number } | null>(null);
  const [steps, setSteps] = useState<Steps>({ bg: true, voice: false, mp4: false });
  const [seconds, setSeconds] = useState(45); // 일괄 대본 목표 길이(0 = 제한 없음)
  const [adding, setAdding] = useState<{ title: string; date: string; time: string; category: string; format: string } | null>(null);
  const [edit, setEdit] = useState<{ i: number; title: string; date: string; time: string } | null>(null);
  const [files, setFiles] = useState<{ name: string; url: string; mb: number }[]>([]);
  const stopRef = useRef(false); const abortRef = useRef<AbortController | null>(null);
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
    const idx = [...sel].sort((a, b) => a - b).filter((i) => item.data.entries[i] && remains(item.data.entries[i], steps));
    if (!idx.length) { setMsg({ text: "남은 단계가 있는 주제를 골라 주세요." }); return; }
    stopRef.current = false; setMsg(null); setProg({ done: 0, total: idx.length, ok: 0 });
    let data = structuredClone(item.data); let ok = 0; let halted = false; const guides = new Map<string, string>();
    const persist = async () => { data = structuredClone(data); await savePlan(data).catch(() => undefined); }; // 단계마다 저장(탭을 닫아도 끝난 단계는 남음)
    for (let k = 0; k < idx.length && !stopRef.current; k++) {
      let e = data.entries[idx[k]]; const tag = `(${k + 1}/${idx.length}) ${e.title}`;
      const set = (patch: Partial<PlanEntry>) => { e = { ...e, ...patch }; data.entries[idx[k]] = e; };
      try {
        let script: ShortsScript | null = null;
        if (!e.projectId) {
          setBusy(`대본 만드는 중… ${tag}`);
          if (!guides.has(e.category)) guides.set(e.category, await guidelineFor(e.category));
          const g = guessFromTopic(e.title);
          script = (await api<{ script: ShortsScript }>("/api/ai/script", { body: { topic: e.title, category: e.category, tone, format: e.format ?? g.format ?? "list", cards: g.cards ?? cards, guideline: guides.get(e.category), seconds: seconds || undefined } })).script;
          const { item: proj } = await api<{ item: Item<ShortsScript> }>("/api/items", { body: { kind: "project", title: e.title, data: script } });
          set({ projectId: proj.id, error: undefined }); await persist();
        }
        const pid = e.projectId!;
        const load = async (): Promise<ShortsScript> => script ?? (script = (await api<{ item: Item<ShortsScript> }>(`/api/items?id=${pid}`)).item.data);
        const store = async (s2: ShortsScript) => { script = s2; await api("/api/items", { method: "PATCH", body: { id: pid, data: s2 } }); };
        if (steps.bg && !e.done?.bg && !stopRef.current) {
          setBusy(`배경 채우는 중… ${tag}`); await store(await fillBackgrounds(await load()));
          set({ done: { ...e.done, bg: true } }); await persist();
        }
        if (steps.voice && !e.done?.voice && !stopRef.current) {
          await store(await makeVoices(await load(), (n, t) => setBusy(`음성 만드는 중(${n}/${t})… ${tag}`)));
          set({ done: { ...e.done, voice: true } }); await persist();
        }
        if (steps.mp4 && !e.done?.mp4 && !stopRef.current) {
          setBusy(`MP4 준비 중… ${tag}`);
          const s2 = await load(); const m = await prepareMedia(s2);
          const ac = new AbortController(); abortRef.current = ac;
          const blob = await exportMp4({ script: s2, media: m.media, audioUrls: m.audioUrls, signal: ac.signal, onProgress: (pr) => setBusy(`MP4 ${pr.pct}% … ${tag}`) });
          setFiles((fs) => [...fs, { name: fileName(e.title), url: URL.createObjectURL(blob), mb: Math.round((blob.size / 1048576) * 10) / 10 }]);
          set({ done: { ...e.done, mp4: true } }); await persist();
        }
        set({ error: undefined }); ok++;
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        set({ error: aborted ? "멈춤" : err instanceof Error ? err.message : "실패" });
        if ((err as { needKey?: boolean }).needKey) { setMsg(toMsg(err)); halted = true; }
      } finally { abortRef.current = null; }
      await persist();
      setProg({ done: k + 1, total: idx.length, ok });
      if (halted) break;
    }
    setBusy(""); setSel(new Set());
    if (!halted) setMsg({ text: `${ok}편을 처리해 보관함에 저장했습니다${stopRef.current ? "(중간에 멈춤)" : ""}.${steps.mp4 ? " 아래 [MP4 내려받기]로 저장하세요(이 화면을 벗어나면 사라집니다)." : " 각 주제의 [열기]로 이어서 다듬으세요."}`, ok: ok > 0 });
  }

  async function saveEdit() {
    if (!item || !edit) return;
    if (edit.title.trim().length < 4 || !/^\d{4}-\d{2}-\d{2}$/.test(edit.date) || !/^\d{2}:\d{2}$/.test(edit.time)) { setMsg({ text: "주제는 4자 이상, 날짜·시각을 모두 넣어 주세요." }); return; }
    const entries = [...item.data.entries]; entries[edit.i] = { ...entries[edit.i], title: edit.title.trim().slice(0, 60), date: edit.date, time: edit.time };
    try { await savePlan({ ...item.data, entries: sortEntries(entries) }); setEdit(null); setSel(new Set()); setMsg({ text: "일정을 고쳤습니다.", ok: true }); } catch (e) { setMsg(toMsg(e)); }
  }
  function startAdd() {
    if (!item) return;
    const last = item.data.entries[item.data.entries.length - 1];
    setEdit(null); setAdding({ title: "", date: last?.date ?? today(), time: "19:00", category: item.data.categories[0] ?? CATEGORIES[0], format: "" });
  }
  async function addEntry() {
    if (!item || !adding) return;
    if (adding.title.trim().length < 4 || !/^\d{4}-\d{2}-\d{2}$/.test(adding.date) || !/^\d{2}:\d{2}$/.test(adding.time)) { setMsg({ text: "주제는 4자 이상, 날짜·시각을 모두 넣어 주세요." }); return; }
    const g = guessFromTopic(adding.title);
    const entry: PlanEntry = { date: adding.date, time: adding.time, category: adding.category, title: adding.title.trim().slice(0, 60), hook: "", format: (adding.format || g.format || null) as PlanEntry["format"] };
    try { await savePlan({ ...item.data, entries: sortEntries([...item.data.entries, entry]) }); setAdding(null); setSel(new Set()); setMsg({ text: `「${entry.title}」을 일정에 추가했습니다.`, ok: true }); } catch (e) { setMsg(toMsg(e)); }
  }
  async function removeEntry(i: number) {
    if (!item) return;
    const gone = item.data.entries[i];
    try { await savePlan({ ...item.data, entries: item.data.entries.filter((_, j) => j !== i) }); setSel(new Set()); setMsg({ text: `「${gone.title}」을 일정에서 뺐습니다${gone.projectId ? "(만든 대본은 보관함에 그대로 있습니다)" : ""}.`, ok: true }); } catch (e) { setMsg(toMsg(e)); }
  }

  async function remove() {
    if (!item || !window.confirm("이 발행 계획을 지울까요? 만들어 둔 대본은 보관함에 그대로 남습니다.")) return;
    try { await api(`/api/items?id=${item.id}`, { method: "DELETE" }); window.history.replaceState(null, "", "/plan"); await load(""); } catch (e) { setMsg(toMsg(e)); }
  }

  const p = item?.data; const entries = p?.entries ?? [];
  const pending = entries.map((e, i) => (remains(e, steps) ? i : -1)).filter((i) => i >= 0);
  const selE = [...sel].map((i) => entries[i]).filter(Boolean);
  const est = { text: selE.filter((e) => !e.projectId).length + (steps.bg ? selE.filter((e) => !e.done?.bg).length : 0), tts: steps.voice ? selE.filter((e) => !e.done?.voice).length * (cards + 2) : 0, mp4: steps.mp4 ? selE.filter((e) => !e.done?.mp4).length : 0 };
  const toggle = (i: number) => setSel((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <>
      <Hero eyebrow="STEP 5 · 발행 계획" title="📅 업로드 일정을 짜고 여러 편을 한꺼번에" desc="채널 단계와 분야를 고르면 AI가 운영 전략과 날짜별 주제를 짜고, 분야별 추천 시간대에 배치합니다. 일정을 고치고, 고른 주제를 대본·배경·음성·MP4까지 순서대로 한꺼번에 만드세요." emoji="📅" meta={["🧭 채널 단계 6가지", "⏰ 분야별 추천 시간대", "🗂️ 대본~MP4 일괄 제작"]} />
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
                <button type="button" className="link-button" disabled={!!busy || entries.length >= MAX_PLAN_TOPICS * 2} onClick={startAdd}>+ 주제 추가</button>
                <button type="button" className="link-button" disabled={!!busy} onClick={() => setSel(new Set(pending))}>남은 단계가 있는 주제 모두 고르기</button>
                {sel.size > 0 && <button type="button" className="link-button" onClick={() => setSel(new Set())}>선택 해제</button>}
              </div>
            </div>
            {adding && (
              <div className="list-item stack" style={{ alignItems: "stretch", borderColor: "var(--brand-line)" }}>
                <strong>➕ 새 주제</strong>
                <input value={adding.title} maxLength={60} autoFocus onChange={(ev) => setAdding({ ...adding, title: ev.target.value })} placeholder="예: 아침 공복에 하면 좋은 스트레칭 3가지" aria-label="새 주제" />
                <div className="row">
                  <input type="date" value={adding.date} onChange={(ev) => setAdding({ ...adding, date: ev.target.value })} aria-label="새 주제 날짜" style={{ flex: 1, minWidth: 140 }} />
                  <input type="time" value={adding.time} onChange={(ev) => setAdding({ ...adding, time: ev.target.value })} aria-label="새 주제 시각" style={{ flex: 1, minWidth: 110 }} />
                </div>
                <div className="row">
                  <select value={adding.category} onChange={(ev) => setAdding({ ...adding, category: ev.target.value })} aria-label="새 주제 분야" style={{ flex: 1, minWidth: 140 }}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={adding.format} onChange={(ev) => setAdding({ ...adding, format: ev.target.value })} aria-label="새 주제 구성" style={{ flex: 1, minWidth: 140 }}><option value="">구성 자동</option>{Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                </div>
                <div className="actions"><button type="button" className="primary" onClick={() => void addEntry()}><Check size={13} />추가</button><button type="button" onClick={() => setAdding(null)}><X size={13} />취소</button></div>
              </div>
            )}
            <div className="list">{entries.map((e, i) => edit?.i === i ? (
              <div key={i} className="list-item stack" style={{ alignItems: "stretch" }}>
                <input value={edit.title} maxLength={60} onChange={(ev) => setEdit({ ...edit, title: ev.target.value })} aria-label="주제" />
                <div className="row">
                  <input type="date" value={edit.date} onChange={(ev) => setEdit({ ...edit, date: ev.target.value })} aria-label="날짜" style={{ flex: 1, minWidth: 140 }} />
                  <input type="time" value={edit.time} onChange={(ev) => setEdit({ ...edit, time: ev.target.value })} aria-label="시각" style={{ flex: 1, minWidth: 110 }} />
                  <button type="button" className="primary" onClick={() => void saveEdit()}><Check size={13} />저장</button>
                  <button type="button" onClick={() => setEdit(null)}><X size={13} />취소</button>
                </div>
              </div>
            ) : (
              <div key={i} className="list-item plan-row">
                <label className="row" style={{ gap: 10, minWidth: 0, flex: 1, fontWeight: 500, alignItems: "flex-start" }}>
                  <input type="checkbox" disabled={!remains(e, steps) || !!busy} checked={sel.has(i)} onChange={() => toggle(i)} style={{ marginTop: 4 }} />
                  <div style={{ minWidth: 0 }}>
                    <small className="muted">{e.date.slice(5)}({dow(e.date)}) {e.time} · {e.category}{e.format ? ` · ${FORMATS[e.format].label}` : ""}</small>
                    <strong style={{ display: "block" }}>{e.title}</strong>
                    {e.hook && <small className="muted">🎣 {e.hook}</small>}
                    {e.error && <small style={{ color: "var(--err)", display: "block" }}>⚠️ {e.error}</small>}
                  </div>
                </label>
                <div className="actions plan-actions">
                  {e.projectId ? <><span className="badge brand">✅ 대본</span>{e.done?.bg && <span className="badge brand" title="배경">🎨</span>}{e.done?.voice && <span className="badge brand" title="음성">🎙️</span>}{e.done?.mp4 && <span className="badge brand" title="MP4">🎬</span>}<a className="button" href={`/topic?id=${e.projectId}`}>열기</a><a className="button" href={`/render?id=${e.projectId}`} aria-label="음성·자막·영상">🎙️</a></> : <span className="badge">대본 전</span>}
                  <button type="button" aria-label="고치기" disabled={!!busy} onClick={() => setEdit({ i, title: e.title, date: e.date, time: e.time })}><Pencil size={13} /></button>
                  <button type="button" aria-label="일정에서 빼기" className="danger" disabled={!!busy} onClick={() => void removeEntry(i)}><Trash2 size={13} /></button>
                </div>
              </div>))}</div>
          </section>
        )}

        {p && (
          <section className="card stack">
            <h2><Layers size={16} /> ③ 고른 주제 한꺼번에 만들기 <small>{sel.size}개 선택</small></h2>
            <div className="chips">
              <span className="chip on">📝 대본(항상)</span>
              <button type="button" className={`chip ${steps.bg ? "on" : ""}`} disabled={!!busy} onClick={() => setSteps((x) => ({ ...x, bg: !x.bg }))}>🎨 배경(스톡 자동)</button>
              <button type="button" className={`chip ${steps.voice ? "on" : ""}`} disabled={!!busy} onClick={() => setSteps((x) => ({ ...x, voice: !x.voice }))}>🎙️ 음성</button>
              <button type="button" className={`chip ${steps.mp4 ? "on" : ""}`} disabled={!!busy} onClick={() => setSteps((x) => ({ ...x, mp4: !x.mp4 }))}>🎬 MP4</button>
            </div>
            <div className="field-grid">
              <label>말투<select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>{Object.entries(TONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
              <label>목표 길이<select value={seconds} onChange={(e) => { const v = Number(e.target.value); setSeconds(v); if (v) setCards(({ 30: 3, 45: 4, 60: 5 } as Record<number, number>)[v]); }}><option value={0}>제한 없음</option>{[30, 45, 60].map((v) => <option key={v} value={v}>약 {v}초</option>)}</select></label>
              <label>카드 수(주제에 숫자가 있으면 그 수)<select value={cards} onChange={(e) => setCards(Number(e.target.value))}>{Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i).map((n) => <option key={n} value={n}>{n}장</option>)}</select></label>
              <label className="row" style={{ gap: 8, fontWeight: 500, alignSelf: "end" }}><input type="checkbox" checked={useGuide} onChange={(e) => setUseGuide(e.target.checked)} />분야별 내 지침 적용</label>
            </div>
            {prog && <div className="stack" style={{ gap: 6 }}><div style={{ height: 10, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${Math.round((prog.done / prog.total) * 100)}%`, height: "100%", background: "var(--brand)", transition: "width .3s" }} /></div><small className="muted">{prog.done}/{prog.total} 처리 · 성공 {prog.ok}편</small></div>}
            <div className="actions">
              {busy && !busy.startsWith("AI") ? <button type="button" className="danger" onClick={() => { stopRef.current = true; abortRef.current?.abort(); }}><Square size={13} />멈추기</button>
                : <button className="primary" disabled={!!busy || sel.size === 0} onClick={() => void bulk()}><Layers size={14} />{sel.size}편 만들기</button>}
              <Busy on={!!busy && !busy.startsWith("AI")} label={busy} />
            </div>
            {sel.size > 0 && <small className="muted">💸 예상(본인 키): 텍스트 약 {est.text}회{est.tts ? ` · 음성 약 ${est.tts}회` : ""} · 스톡 검색 무료{est.mp4 ? ` · MP4 ${est.mp4}편(편당 영상 길이의 약 2~3배 시간, 서버 비용 없음)` : ""}</small>}
            <small className="muted">주제마다 순서대로 처리하고 단계가 끝날 때마다 보관함과 계획에 저장합니다(이미 끝난 단계는 건너뜀). 실패한 주제는 표시하고 다음으로 넘어가며, 키가 없으면 멈춥니다. 음성은 각 대본의 음성 설정(처음엔 기본값 OpenAI GPT-4o mini TTS)으로 만듭니다. 만드는 동안 이 탭을 열어 두세요.</small>
            {files.length > 0 && <div className="list">{files.map((x) => <div key={x.url} className="list-item"><span>🎬 {x.name}</span><a className="button primary" href={x.url} download={x.name}><Download size={13} />MP4 내려받기 ({x.mb}MB)</a></div>)}</div>}
          </section>
        )}
      </div>
    </>
  );
}
