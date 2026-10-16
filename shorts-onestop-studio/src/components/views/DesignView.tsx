"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Save, Search, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import { useMedia } from "@/components/ui/useMedia";
import { IMAGE_STYLES, normalizeBackdrop, type Backdrop, type Bg, type ShortsScript } from "@/lib/script";
import { FONT_CSS, H, W, loadFontsFor, normalizeDesign, renderFrame, timeline } from "@/lib/render/scene";

type StockItem = { id: string; type: "image" | "video"; src: string; thumb: string; credit: string; pageUrl: string };
const IMG_MODELS = [{ id: "gemini-2.5-flash-image", name: "Nano Banana · 가벼운 모델 (기본)" }, { id: "gemini-3.1-flash-image", name: "Nano Banana 2 · 균형형" }];

// 장면 순서 번호: 0 = 인트로, 1..n = 카드, n+1 = 아웃트로, -1 = 전체 배경
function getBg(s: ShortsScript, i: number): Bg | undefined { const n = s.cards.length; return i === -1 ? s.backdrop?.global : i === 0 ? s.intro.bg : i === n + 1 ? s.outro.bg : s.cards[i - 1]?.bg; }
function setBg(s: ShortsScript, i: number, bg: Bg | undefined): ShortsScript {
  const c = structuredClone(s); const n = c.cards.length;
  if (i === -1) c.backdrop = { ...normalizeBackdrop(c.backdrop), global: bg };
  else if (i === 0) c.intro.bg = bg; else if (i === n + 1) c.outro.bg = bg; else c.cards[i - 1].bg = bg;
  return c;
}
const label = (s: ShortsScript, i: number) => (i === -1 ? "전체 배경" : i === 0 ? "인트로" : i === s.cards.length + 1 ? "아웃트로" : `카드 ${i}`);
const sceneText = (s: ShortsScript) => [s.intro.narration || s.intro.title, ...s.cards.map((c) => `${c.title}. ${c.narration}`), s.outro.narration || s.outro.title];

export function DesignView() {
  const [list, setList] = useState<Item<ShortsScript>[] | null>(null);
  const [item, setItem] = useState<Item<ShortsScript> | null>(null);
  const [script, setScript] = useState<ShortsScript | null>(null);
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<StockItem[]>([]);
  const [imgModel, setImgModel] = useState(IMG_MODELS[0].id);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null), [dirty, setDirty] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const media = useMedia(script);
  const bd = useMemo(() => normalizeBackdrop(script?.backdrop), [script]);

  const open = useCallback(async (id: string) => {
    try {
      const { item } = await api<{ item: Item<ShortsScript> }>(`/api/items?id=${id}`);
      setItem(item); setScript(item.data); setDirty(false); setResults([]);
      setActive(normalizeBackdrop(item.data.backdrop).mode === "global" ? -1 : 0);
      window.history.replaceState(null, "", `/design?id=${id}`);
    } catch (e) { setMsg(toMsg(e)); }
  }, []);
  useEffect(() => {
    if (!document.querySelector("link[data-sos-fonts]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; l.setAttribute("data-sos-fonts", "1"); document.head.appendChild(l); }
    api<{ items: Item<ShortsScript>[] }>("/api/items?kind=project").then(({ items }) => {
      setList(items); const id = new URLSearchParams(window.location.search).get("id") ?? items[0]?.id; if (id) void open(id);
    }).catch((e) => setMsg(toMsg(e)));
  }, [open]);

  const update = (fn: (s: ShortsScript) => ShortsScript) => { setScript((s) => (s ? fn(s) : s)); setDirty(true); };
  const setBd = (patch: Partial<Backdrop>) => update((s) => ({ ...s, backdrop: { ...normalizeBackdrop(s.backdrop), ...patch } }));
  const hint = (i: number) => (i < 0 ? bd.hints?.[0] : bd.hints?.[i]) ?? { query: "", prompt: "" };
  const setHint = (i: number, patch: Partial<{ query: string; prompt: string }>) => {
    const hints = [...(bd.hints ?? [])]; const k = Math.max(0, i); while (hints.length <= k) hints.push({ query: "", prompt: "" });
    hints[k] = { ...hints[k], ...patch }; setBd({ hints });
  };

  // 미리보기: 선택한 장면의 가운데 시점을 한 장 그린다(영상 배경이면 계속 갱신)
  useEffect(() => {
    if (!script) return;
    let raf = 0; let alive = true;
    const d = normalizeDesign(script.design as never);
    void loadFontsFor(script, d).then(() => {
      const draw = () => {
        const ctx = canvas.current?.getContext("2d"); if (!ctx || !alive) return;
        const { segs } = timeline(script); const g = segs[Math.max(0, active)] ?? segs[0];
        renderFrame(ctx, script, d, g.start + Math.min(1.2, g.dur / 2), { media: media.resolve });
        raf = requestAnimationFrame(draw);
      };
      draw();
    });
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [script, active, media.resolve, media.tick]);

  async function makeHints() {
    if (!script) return;
    setBusy("장면에 맞는 검색어·이미지 설명을 만드는 중…"); setMsg(null);
    try {
      const r = await api<{ scenes: { query: string; prompt: string }[] }>("/api/ai/visuals", { body: { topic: script.topic, scenes: sceneText(script), style: bd.style, character: bd.character } });
      setBd({ hints: r.scenes }); setMsg({ text: "장면마다 스톡 검색어와 AI 이미지 설명을 채웠습니다. 고친 뒤 검색하거나 이미지를 만드세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function search(i: number) {
    const q = hint(i).query.trim(); if (q.length < 2) { setMsg({ text: "검색어를 2자 이상(영어 권장) 입력해 주세요." }); return; }
    setBusy("스톡을 검색하는 중…"); setMsg(null); setActive(i);
    try { setResults((await api<{ items: StockItem[] }>("/api/stock/search", { body: { provider: bd.provider, type: bd.media, query: q } })).items); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  function pickStock(r: StockItem) {
    update((s) => setBg(s, active, { type: r.type, source: bd.provider ?? "pixabay", src: r.src, thumb: r.thumb, credit: r.credit, pageUrl: r.pageUrl }));
  }

  async function fillAllStock() {
    if (!script) return;
    const idx = bd.mode === "global" ? [-1] : Array.from({ length: script.cards.length + 2 }, (_, i) => i);
    if (idx.some((i) => hint(i).query.trim().length < 2)) { setMsg({ text: "먼저 [AI로 장면 설명 만들기]로 검색어를 채워 주세요." }); return; }
    setBusy("모든 장면에 스톡을 채우는 중…"); setMsg(null);
    try {
      let next = script; const used = new Set<string>();
      for (const i of idx) {
        const items = (await api<{ items: StockItem[] }>("/api/stock/search", { body: { provider: bd.provider, type: bd.media, query: hint(i).query } })).items;
        const r = items.find((x) => !used.has(x.id)) ?? items[0];
        if (r) { used.add(r.id); next = setBg(next, i, { type: r.type, source: bd.provider ?? "pixabay", src: r.src, thumb: r.thumb, credit: r.credit, pageUrl: r.pageUrl }); }
      }
      setScript(next); setDirty(true); setMsg({ text: "스톡으로 배경을 채웠습니다. 마음에 안 드는 장면만 다시 검색해 바꾸세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function aiImage(i: number) {
    const prompt = hint(i).prompt.trim(); if (prompt.length < 8) { setMsg({ text: "AI 이미지 설명을 먼저 만들거나 입력해 주세요." }); return; }
    setBusy("AI 이미지를 만드는 중… (보통 10~40초)"); setMsg(null); setActive(i);
    try {
      const r = await api<{ path: string; src: string }>("/api/ai/image", { body: { prompt, style: bd.style, character: bd.character, model: imgModel } });
      update((s) => setBg(s, i, { type: "image", source: "ai", src: "", path: r.path, prompt }));
      setMsg({ text: "AI 이미지를 만들었습니다. [배경 저장]을 눌러 대본에 저장하세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function save() {
    if (!item || !script) return;
    setBusy("저장하는 중…");
    try { const r = await api<{ item: Item<ShortsScript> }>("/api/items", { method: "PATCH", body: { id: item.id, data: script } }); setItem(r.item); setDirty(false); setMsg({ text: "배경을 저장했습니다. 장면 편집에서 움직이는 미리보기로 확인할 수 있어요.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  const rows = script ? (bd.mode === "global" ? [-1] : Array.from({ length: script.cards.length + 2 }, (_, i) => i)) : [];
  const thumbOf = (b?: Bg) => (b ? (b.source === "ai" ? media.srcOf(b) : b.thumb || b.src) : "");

  return (
    <>
      <Hero eyebrow="STEP 2 · 디자인·배경" title="🎨 장면마다 어울리는 배경을 입혀요" desc="AI가 장면에 맞는 스톡 검색어와 이미지 설명을 만들어 줍니다. Pexels·Pixabay 무료 영상·사진을 고르거나 AI 이미지를 만들어 배경으로 쓰세요." emoji="🎨" meta={["🎬 세로 영상·사진", "🎨 AI 이미지 7가지 화풍", "🔑 본인 키 사용"]} />
      <div className="stack">
        <Message msg={msg} />
        {list && list.length === 0 && <div className="empty-state"><span className="emoji">🎨</span><strong>먼저 대본을 만들어 주세요</strong><span>주제·대본 화면에서 대본을 저장하면 여기서 배경을 입힐 수 있어요.</span><a className="button primary" href="/topic">💡 대본 만들러 가기</a></div>}
        {list && list.length > 0 && <section className="card"><label>배경을 입힐 대본<select value={item?.id ?? ""} onChange={(e) => void open(e.target.value)}>{list.map((p) => <option key={p.id} value={p.id}>{p.title} · {timeAgo(p.updated_at)}</option>)}</select></label></section>}
        {script && (
          <div className="atelier">
            <div className="stack">
              <section className="card stack">
                <div className="row" style={{ justifyContent: "space-between" }}><h2>① 배경 방식</h2>{dirty && <span className="badge brand">저장 안 됨</span>}</div>
                <div className="chips">
                  {([["theme", "🎨 테마 배경만"], ["global", "🖼️ 전체 1장"], ["scene", "🎬 장면마다 다르게"]] as const).map(([k, t]) => <button key={k} type="button" className={`chip ${bd.mode === k ? "on" : ""}`} onClick={() => { setBd({ mode: k }); setActive(k === "global" ? -1 : 0); setResults([]); }}>{t}</button>)}
                </div>
                {bd.mode !== "theme" && <>
                  <div className="field-grid">
                    <label>스톡 사이트<select value={bd.provider} onChange={(e) => setBd({ provider: e.target.value as "pexels" | "pixabay" })}><option value="pixabay">Pixabay (추천)</option><option value="pexels">Pexels (기존 키 보유자)</option></select></label>
                    <label>스톡 종류<select value={bd.media} onChange={(e) => setBd({ media: e.target.value as "image" | "video" })}><option value="video">🎬 세로 영상</option><option value="image">🖼️ 사진</option></select></label>
                    <label>글자 위 어둡게 ({Math.round(bd.dim * 100)}%)<input type="range" min={0} max={0.85} step={0.05} value={bd.dim} onChange={(e) => setBd({ dim: Number(e.target.value) })} /></label>
                  </div>
                  <div className="field-grid">
                    <label>AI 이미지 화풍<select value={bd.style} onChange={(e) => setBd({ style: e.target.value })}>{Object.entries(IMAGE_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
                    <label>AI 이미지 모델(Gemini)<select value={imgModel} onChange={(e) => setImgModel(e.target.value)}>{IMG_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                    <label>🎭 같은 인물 유지(선택)<input value={bd.character} maxLength={300} onChange={(e) => setBd({ character: e.target.value })} placeholder="예: 30대 한국인 여성, 단발머리, 베이지 니트" /></label>
                  </div>
                  <div className="actions">
                    <button className="primary" disabled={!!busy} onClick={() => void makeHints()}><Wand2 size={14} />AI로 장면 설명 만들기</button>
                    <button disabled={!!busy} onClick={() => void fillAllStock()}><Sparkles size={14} />스톡으로 모두 채우기</button>
                    <Busy on={!!busy} label={busy} />
                  </div>
                  <small className="muted">장면 설명은 텍스트 AI 1회(본인 키), 스톡 검색은 무료(본인 Pexels·Pixabay 키), AI 이미지는 장면마다 1장씩 만들며 본인 Gemini 계정 요금이 적용됩니다.</small>
                </>}
              </section>
              {bd.mode !== "theme" && (
                <section className="card stack">
                  <h2>② 장면별 배경</h2>
                  {rows.map((i) => {
                    const b = getBg(script, i); const th = thumbOf(b);
                    return (
                      <div key={i} className={`bg-row ${active === i ? "on" : ""}`} onClick={() => setActive(i)}>
                        <div className="bg-thumb">{th ? <img src={th} alt="" /> : <ImageIcon size={18} />}<span>{label(script, i)}</span></div>
                        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                          <div className="row"><input value={hint(i).query} placeholder="스톡 검색어(영어 권장) 예: morning coffee" onChange={(e) => setHint(i, { query: e.target.value })} style={{ flex: 1 }} /><button type="button" disabled={!!busy} onClick={(e) => { e.stopPropagation(); void search(i); }}><Search size={13} />검색</button></div>
                          <div className="row"><input value={hint(i).prompt} placeholder="AI 이미지 설명(영어 권장)" onChange={(e) => setHint(i, { prompt: e.target.value })} style={{ flex: 1 }} /><button type="button" disabled={!!busy} onClick={(e) => { e.stopPropagation(); void aiImage(i); }}><Sparkles size={13} />AI 이미지</button>
                            {b && <button type="button" className="danger" onClick={(e) => { e.stopPropagation(); update((s) => setBg(s, i, undefined)); }}><Trash2 size={13} /></button>}</div>
                          {b && <small className="muted">{b.source === "ai" ? "🎨 AI 이미지" : `${b.type === "video" ? "🎬" : "🖼️"} ${b.credit ?? b.source}`}</small>}
                        </div>
                      </div>
                    );
                  })}
                  {results.length > 0 && <>
                    <h3>🔎 {label(script, active)} 검색 결과 — 눌러서 배경으로 고르기</h3>
                    <div className="stock-grid">{results.map((r) => <button key={r.id} type="button" className="stock-item" onClick={() => pickStock(r)} title={r.credit}><img src={r.thumb} alt="" loading="lazy" />{r.type === "video" && <span>🎬</span>}</button>)}</div>
                    <small className="muted">Pexels·Pixabay 무료 소재입니다. 영상 설명란에 촬영자·사이트 출처를 적어 주시면 좋습니다.</small>
                  </>}
                </section>
              )}
            </div>
            <aside className="card stack panel">
              <div className="stage-frame"><canvas ref={canvas} width={W} height={H} aria-label="배경 미리보기" /></div>
              <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>{bd.mode === "theme" ? "테마 배경만 사용합니다" : `${label(script, active)} 미리보기`}</p>
              <div className="actions" style={{ justifyContent: "center" }}><button className="primary" disabled={!!busy || !dirty} onClick={() => void save()}><Save size={14} />배경 저장</button><a className="button" href={`/scenes?id=${item?.id}`}>🎬 장면 편집에서 재생</a></div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
