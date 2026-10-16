"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, toMsg, type Item, type Msg } from "@/components/ui/api";
import { modelName } from "@/lib/models";
import { CATEGORIES, FORMATS, MAX_CARDS, MIN_CARDS, TONES, guessFromTopic, scriptFromLines, type Format, type ShortsScript, type Tone } from "@/lib/script";

type Topic = { title: string; hook: string; format: Format | null };
type Guide = Item<{ text: string }>;
const CAT_EMOJI: Record<string, string> = { "건강·운동": "💪", "자기계발·생산성": "📈", "돈·재테크": "💰", "요리·레시피": "🍳", "여행": "✈️", "심리·인간관계": "🧠", "IT·AI": "🤖", "뷰티·패션": "💄", "생활 꿀팁": "🏠", "동기부여": "🔥", "상식·잡학": "📚", "운세·꿈풀이": "🔮", "미스터리": "🕵️", "반전 상식": "😲" };

export function TopicView() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [category, setCategory] = useState<string>("");
  const [seed, setSeed] = useState(""), [reference, setReference] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]), [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("friendly"), [format, setFormat] = useState<Format>("list"), [cards, setCards] = useState(5);
  const [touched, setTouched] = useState({ tone: false, format: false, cards: false });
  const [guides, setGuides] = useState<Guide[]>([]), [useGuide, setUseGuide] = useState(false), [guideText, setGuideText] = useState(""), [guideOpen, setGuideOpen] = useState(false);
  const [manual, setManual] = useState(""), [firstIntro, setFirstIntro] = useState(true), [lastOutro, setLastOutro] = useState(true);
  const [script, setScript] = useState<ShortsScript | null>(null), [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);

  const guide = useMemo(() => guides.find((g) => g.title === category), [guides, category]);
  useEffect(() => { setGuideText(guide?.data.text ?? ""); }, [guide]);

  const loadGuides = useCallback(async () => { try { setGuides((await api<{ items: Guide[] }>("/api/items?kind=guideline")).items); } catch { /* 지침은 선택 기능 */ } }, []);
  useEffect(() => {
    void loadGuides();
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) api<{ item: Item<ShortsScript> }>(`/api/items?id=${id}`).then(({ item }) => { setScript(item.data); setItemId(item.id); setTopic(item.data.topic); if (item.data.category) setCategory(item.data.category); }).catch((e) => setMsg(toMsg(e)));
  }, [loadGuides]);

  function pickTopic(t: string, f?: Format | null) {
    setTopic(t);
    const g = guessFromTopic(t);
    if (!touched.format && (f || g.format)) setFormat((f ?? g.format)!);
    if (!touched.cards && g.cards) setCards(g.cards);
    if (!touched.tone && g.tone) setTone(g.tone);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 300_000 || !/\.(txt|md|markdown|csv|json)$/i.test(file.name)) { setMsg({ text: "txt·md·csv·json 파일(300KB 이하)만 불러올 수 있습니다." }); return; }
    setReference((await file.text()).slice(0, 12000)); setMsg({ text: `「${file.name}」 내용을 참고 자료로 불러왔습니다.`, ok: true });
  }

  async function suggest() {
    setBusy("주제를 고르는 중…"); setMsg(null);
    try {
      const r = await api<{ topics: Topic[] }>("/api/ai/topics", { body: { category, seed, reference, guideline: useGuide ? guideText : "" } });
      setTopics(r.topics);
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function makeScript() {
    setBusy("대본을 쓰는 중… (보통 10~40초)"); setMsg(null);
    try {
      const r = await api<{ script: ShortsScript }>("/api/ai/script", { body: { topic, category, tone, format, cards, reference, guideline: useGuide ? guideText : "" } });
      setScript(r.script); setItemId(null); setMsg({ text: "대본이 완성됐습니다. 아래에서 고친 뒤 보관함에 저장하세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  function makeManual() {
    const s = scriptFromLines(manual, { topic, firstAsIntro: firstIntro, lastAsOutro: lastOutro });
    if (!s) { setMsg({ text: `장면이 ${MIN_CARDS}줄 이상 필요합니다(인트로·아웃트로 줄 제외). 한 줄에 한 장면씩 적어 주세요.` }); return; }
    setScript(s); setItemId(null); setMsg({ text: "장면을 만들었습니다. 화면에 보일 제목을 다듬은 뒤 저장하세요.", ok: true });
  }

  async function save() {
    if (!script) return;
    setBusy("저장하는 중…"); setMsg(null);
    try {
      const title = script.intro.title || script.topic;
      if (itemId) await api("/api/items", { method: "PATCH", body: { id: itemId, title, data: script } });
      else setItemId((await api<{ item: Item<ShortsScript> }>("/api/items", { body: { kind: "project", title, data: script } })).item.id);
      setMsg({ text: "보관함에 저장했습니다. 다음 단계(디자인·배경)가 열리면 이 대본으로 이어서 작업합니다.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function saveGuide() {
    if (!category) return;
    setBusy("지침을 저장하는 중…");
    try {
      if (guide) await api("/api/items", { method: "PATCH", body: { id: guide.id, data: { text: guideText } } });
      else await api("/api/items", { body: { kind: "guideline", title: category, data: { text: guideText } } });
      await loadGuides(); setMsg({ text: `「${category}」 지침을 저장했습니다.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  const upd = (fn: (s: ShortsScript) => ShortsScript) => setScript((s) => (s ? fn(structuredClone(s)) : s));
  const step = script ? 3 : topic ? 2 : 1;

  return (
    <>
      <Hero eyebrow="STEP 1 · 주제·대본" title="💡 주제를 고르면 AI가 대본을 씁니다" desc="분야를 고르고 주제 8개를 추천받거나, 직접 주제·대본을 넣으세요. 화면에는 짧은 글자만, 자세한 내용은 내레이션으로 전달하는 쇼츠 표준 구성으로 만들어 드립니다." emoji="💡" meta={["⏱ 약 30초", "📄 참고 자료 반영", "✍️ 내 지침 적용"]} />
      <div className="wizard-steps"><span className={step === 1 ? "on" : "done"}>① 주제 고르기</span><span className={step === 2 ? "on" : step > 2 ? "done" : ""}>② 대본 옵션</span><span className={step === 3 ? "on" : ""}>③ 대본 다듬기·저장</span></div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button type="button" className={`chip ${mode === "ai" ? "on" : ""}`} onClick={() => setMode("ai")}><Sparkles size={13} />AI로 만들기</button>
        <button type="button" className={`chip ${mode === "manual" ? "on" : ""}`} onClick={() => setMode("manual")}><FileText size={13} />내 대본으로 만들기</button>
      </div>
      <div className="stack">
        <Message msg={msg} />
        {mode === "ai" ? (
          <>
            <section className="card stack">
              <h2>① 분야와 주제</h2>
              <div className="chips">{CATEGORIES.map((c) => <button key={c} type="button" className={`chip ${category === c ? "on" : ""}`} onClick={() => { setCategory(c); setTopics([]); }}>{CAT_EMOJI[c]} {c}</button>)}</div>
              <div className="grid2">
                <label>내 키워드·아이디어 (선택)<input value={seed} maxLength={200} onChange={(e) => setSeed(e.target.value)} placeholder="예: 직장인 아침 루틴, 40대 다이어트" /></label>
                <label>참고 자료 (선택 — 기사·메모를 붙여넣거나 파일로)<textarea rows={2} value={reference} maxLength={12000} onChange={(e) => setReference(e.target.value)} placeholder="이 내용을 근거로 주제·대본을 씁니다." /></label>
              </div>
              <div className="row">
                <label className="button" style={{ fontWeight: 600 }}>📄 파일 불러오기<input type="file" accept=".txt,.md,.markdown,.csv,.json" hidden onChange={(e) => void readFile(e.target.files?.[0])} /></label>
                {reference && <button type="button" className="link-button" onClick={() => setReference("")}>참고 자료 지우기</button>}
                <label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={useGuide} disabled={!category} onChange={(e) => setUseGuide(e.target.checked)} />내 지침 사용{category && (guide ? <span className="badge brand">저장됨</span> : <span className="badge">없음</span>)}</label>
                <button type="button" className="link-button" disabled={!category} onClick={() => setGuideOpen((v) => !v)}>✍️ {category || "분야"} 지침 {guideOpen ? "닫기" : "쓰기"}</button>
              </div>
              {guideOpen && category && (
                <div className="stack" style={{ gap: 8 }}>
                  <textarea rows={4} value={guideText} maxLength={3000} onChange={(e) => setGuideText(e.target.value)} placeholder="예: 반말 금지, 첫 문장은 질문으로, 의학적 단정 금지, 마지막에 '저장해 두세요' 넣기" />
                  <div className="actions"><button className="primary" disabled={!!busy || !guideText.trim()} onClick={() => void saveGuide()}><Save size={13} />지침 저장</button><small>「내 지침 사용」을 켜면 이 분야의 주제·대본에 우선 적용됩니다.</small></div>
                </div>
              )}
              <div className="actions"><button className="primary" disabled={!category || !!busy} onClick={() => void suggest()}><Wand2 size={14} />주제 8개 추천받기</button><Busy on={busy.startsWith("주제")} label={busy} /></div>
              {topics.length > 0 && <div className="topic-grid">{topics.map((t) => (
                <button key={t.title} type="button" className={`topic-card ${topic === t.title ? "on" : ""}`} onClick={() => pickTopic(t.title, t.format)}>
                  <strong>{t.title}</strong>{t.hook && <small>🎣 {t.hook}</small>}{t.format && <span className="badge">{FORMATS[t.format].label}</span>}
                </button>))}</div>}
              <label>또는 주제를 직접 입력<input value={topic} maxLength={120} onChange={(e) => pickTopic(e.target.value)} placeholder="예: 아침에 하면 좋은 습관 5가지" /></label>
            </section>
            <section className="card stack">
              <h2>② 대본 옵션 <small>— 주제 문구에 맞춰 자동으로 골라 두었어요. 바꾸면 그대로 유지됩니다.</small></h2>
              <div className="field-grid">
                <label>말투<select value={tone} onChange={(e) => { setTone(e.target.value as Tone); setTouched((t) => ({ ...t, tone: true })); }}>{Object.entries(TONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
                <label>구성<select value={format} onChange={(e) => { setFormat(e.target.value as Format); setTouched((t) => ({ ...t, format: true })); }}>{Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
                <label>카드 수<select value={cards} onChange={(e) => { setCards(Number(e.target.value)); setTouched((t) => ({ ...t, cards: true })); }}>{Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i).map((n) => <option key={n} value={n}>{n}장</option>)}</select></label>
              </div>
              <div className="actions"><button className="primary" disabled={topic.trim().length < 4 || !!busy} onClick={() => void makeScript()}><Sparkles size={14} />대본 만들기</button><Busy on={busy.startsWith("대본")} label={busy} /></div>
            </section>
          </>
        ) : (
          <section className="card stack">
            <h2>📜 내 대본으로 장면 만들기 <small>— AI를 쓰지 않습니다</small></h2>
            <label>주제(제목)<input value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} placeholder="예: 내가 회사를 그만둔 진짜 이유" /></label>
            <label>대본 — 한 줄 = 한 장면(빈 줄은 무시, 카드 {MIN_CARDS}~{MAX_CARDS}장)<textarea rows={9} value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"첫 줄은 인트로 내레이션\n두 번째 줄부터 장면마다 한 줄씩\n…\n마지막 줄은 아웃트로 내레이션"} /></label>
            <div className="row"><label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={firstIntro} onChange={(e) => setFirstIntro(e.target.checked)} />첫 줄을 인트로로</label><label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={lastOutro} onChange={(e) => setLastOutro(e.target.checked)} />마지막 줄을 아웃트로로</label></div>
            <div className="actions"><button className="primary" disabled={!manual.trim()} onClick={makeManual}><FileText size={14} />장면 만들기</button></div>
          </section>
        )}

        {script && (
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>③ 대본 다듬기 <small>{script.source === "ai" ? `AI 대본 · ${script.model ? modelName(script.model) : ""}` : "내 대본"}</small></h2>
              <div className="actions"><button className="primary" disabled={!!busy} onClick={() => void save()}><Save size={14} />{itemId ? "보관함에 다시 저장" : "보관함에 저장"}</button><Busy on={busy.startsWith("저장")} label={busy} /></div></div>
            <div className="scene"><div className="scene-tag">🎬<span>인트로</span></div><div className="stack" style={{ gap: 8 }}>
              <div className="row"><label>꼬리표<input value={script.intro.eyebrow} maxLength={30} onChange={(e) => upd((s) => { s.intro.eyebrow = e.target.value; return s; })} /></label><label style={{ flex: 3 }}>화면 제목<input value={script.intro.title} maxLength={50} onChange={(e) => upd((s) => { s.intro.title = e.target.value; return s; })} /></label></div>
              <label>내레이션<textarea rows={2} value={script.intro.narration} maxLength={400} onChange={(e) => upd((s) => { s.intro.narration = e.target.value; return s; })} /></label></div></div>
            {script.cards.map((c, i) => (
              <div key={i} className="scene"><div className="scene-tag">{i + 1}<span>{c.tag || "카드"}</span>
                <button type="button" className="link-button" aria-label={`${i + 1}번 카드 삭제`} disabled={script.cards.length <= MIN_CARDS} onClick={() => upd((s) => { s.cards.splice(i, 1); return s; })}><Trash2 size={13} /></button></div>
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row"><label>태그<input value={c.tag ?? ""} maxLength={20} onChange={(e) => upd((s) => { s.cards[i].tag = e.target.value; return s; })} /></label><label style={{ flex: 2 }}>화면 제목<input value={c.title} maxLength={40} onChange={(e) => upd((s) => { s.cards[i].title = e.target.value; return s; })} /></label><label style={{ flex: 2 }}>한 줄 설명<input value={c.desc} maxLength={60} onChange={(e) => upd((s) => { s.cards[i].desc = e.target.value; return s; })} /></label></div>
                  <label>내레이션<textarea rows={2} value={c.narration} maxLength={400} onChange={(e) => upd((s) => { s.cards[i].narration = e.target.value; return s; })} /></label>
                </div></div>
            ))}
            {script.cards.length < MAX_CARDS && <div><button type="button" onClick={() => upd((s) => { s.cards.push({ tag: "", title: "새 카드", desc: "", narration: "" }); return s; })}><Plus size={13} />카드 추가</button></div>}
            <div className="scene"><div className="scene-tag">🏁<span>아웃트로</span></div><div className="stack" style={{ gap: 8 }}>
              <div className="row"><label style={{ flex: 2 }}>화면 제목<input value={script.outro.title} maxLength={50} onChange={(e) => upd((s) => { s.outro.title = e.target.value; return s; })} /></label><label style={{ flex: 2 }}>부제<input value={script.outro.subtitle} maxLength={80} onChange={(e) => upd((s) => { s.outro.subtitle = e.target.value; return s; })} /></label></div>
              <label>행동 유도 문구(쉼표로 구분)<input value={script.outro.cta.join(", ")} onChange={(e) => upd((s) => { s.outro.cta = e.target.value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 3); return s; })} /></label>
              <label>내레이션<textarea rows={2} value={script.outro.narration} maxLength={400} onChange={(e) => upd((s) => { s.outro.narration = e.target.value; return s; })} /></label></div></div>
            <label>해시태그(공백으로 구분)<input value={script.hashtags.join(" ")} onChange={(e) => upd((s) => { s.hashtags = e.target.value.split(/\s+/).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 10); return s; })} /></label>
          </section>
        )}
      </div>
    </>
  );
}
