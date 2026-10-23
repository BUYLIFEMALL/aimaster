// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Image as ImageIcon, RotateCcw, Save, Search, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import { useMedia } from "@/components/ui/useMedia";
import { pickStock as bestStock } from "@/lib/pipeline";
import { IMAGE_STYLES, normalizeBackdrop, type Backdrop, type Bg, type ShortsScript } from "@/lib/script";
import { FONT_CSS, H, W, loadFontsFor, normalizeDesign, renderFrame, timeline } from "@/lib/render/scene";
import { DEFAULT_VIDEO_MODEL, findVideoModel, LENGTH_CHOICES, pickSeconds, PROVIDER_NAME, priceLabel, sceneCost, VIDEO_MODELS, wonLabel, type VideoJob } from "@/lib/videoModels";

type StockItem = { id: string; type: "image" | "video"; src: string; thumb: string; credit: string; pageUrl: string };
const IMG_MODELS = [{ id: "gemini-3.1-flash-lite-image", name: "Nano Banana · 가벼운 모델 (기본)" }, { id: "gemini-nano-banana-2.1", name: "Nano Banana 2 · 균형형" }];

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
  const [vidModel, setVidModel] = useState(DEFAULT_VIDEO_MODEL);
  const [linkNext, setLinkNext] = useState(true);
  const [lenChoice, setLenChoice] = useState<"fit" | number>("fit"); // v1.25 영상 길이: 장면에 맞춤(기본) 또는 5·8·10초
  const [keyOk, setKeyOk] = useState<Record<string, boolean>>({});
  const scriptRef = useRef<ShortsScript | null>(null); scriptRef.current = script;
  const itemRef = useRef<Item<ShortsScript> | null>(null); itemRef.current = item;
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
    // v1.23 영상 모델 목록의 「키 미등록」 표시용(키 값은 받지 않고 등록 여부만)
    fetch("/api/keys", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.keys) setKeyOk(Object.fromEntries(Object.entries(d.keys as Record<string, { hasKey: boolean }>).map(([k, v]) => [k, v.hasKey]))); }).catch(() => undefined);
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

  // v1.23: AI 영상을 만드는 중인 장면은 배경을 바꾸지 않는다(진행 작업이 사라지면 결과를 못 받고 다시 누르면 요금이 두 번 나감)
  const locked = (i: number) => { const b = script ? getBg(script, i) : undefined; if (b?.videoJob) { setMsg({ text: `${script ? label(script, i) : "이 장면"}은(는) AI 영상을 만드는 중입니다. 끝난 뒤에 배경을 바꿔 주세요.` }); return true; } return false; };

  function pickStock(r: StockItem) {
    if (locked(active)) return;
    update((s) => setBg(s, active,{ type: r.type, source: bd.provider ?? "pixabay", src: r.src, thumb: r.thumb, credit: r.credit, pageUrl: r.pageUrl, stockId: r.id.replace(/^[a-z]+-/, "") }));
  }

  async function fillAllStock() {
    if (!script) return;
    const idx = bd.mode === "global" ? [-1] : Array.from({ length: script.cards.length + 2 }, (_, i) => i);
    if (idx.some((i) => hint(i).query.trim().length < 2)) { setMsg({ text: "먼저 [AI로 장면 설명 만들기]로 검색어를 채워 주세요." }); return; }
    setBusy("모든 장면에 스톡을 채우는 중…"); setMsg(null);
    try {
      let next = script; const used = new Set<string>();
      for (const i of idx) {
        if (getBg(next, i)?.source === "ai" || getBg(next, i)?.videoJob) continue; // 비용을 들여 만든 AI 이미지·영상(만드는 중 포함)은 덮어쓰지 않는다
        const items = (await api<{ items: StockItem[] }>("/api/stock/search", { body: { provider: bd.provider, type: bd.media, query: hint(i).query } })).items;
        const r = bestStock(items, hint(i).query, used); // 검색어와 태그가 가장 많이 겹치는 결과
        if (r) { used.add(r.id); next = setBg(next, i, { type: r.type, source: bd.provider ?? "pixabay", src: r.src, thumb: r.thumb, credit: r.credit, pageUrl: r.pageUrl, stockId: r.id.replace(/^[a-z]+-/, "") }); }
      }
      setScript(next); setDirty(true); setMsg({ text: "스톡으로 배경을 채웠습니다(AI 이미지가 있는 장면은 그대로 둠). 마음에 안 드는 장면만 다시 검색해 바꾸세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function aiImage(i: number) {
    if (locked(i)) return;
    const prompt = hint(i).prompt.trim(); if (prompt.length < 8) { setMsg({ text: "AI 이미지 설명을 먼저 만들거나 입력해 주세요." }); return; }
    setBusy("AI 이미지를 만드는 중… (보통 10~40초)"); setMsg(null); setActive(i);
    try {
      const r = await api<{ path: string; src: string }>("/api/ai/image", { body: { prompt, style: bd.style, character: bd.character, model: imgModel } });
      update((s) => setBg(s, i, { type: "image", source: "ai", src: "", path: r.path, prompt }));
      setMsg({ text: "AI 이미지를 만들었습니다. [배경 저장]을 눌러 대본에 저장하세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  // ── v1.23 AI 동영상 장면 ─────────────────────────────
  // 영상의 첫·끝 화면으로 쓸 사진 주소: 사진 배경이면 그 사진, AI 영상이면 처음 썼던 사진(poster). 스톡 영상은 쓸 수 없다
  const frameOf = (b?: Bg) => (!b ? "" : b.type === "image" ? media.srcOf(b) : b.poster ? media.srcOf(b.poster) : "");
  const vm = findVideoModel(vidModel) ?? VIDEO_MODELS[0];
  const nextIdx = (i: number) => (script && i >= 0 && i <= script.cards.length ? i + 1 : -2);
  // v1.25 장면 길이(음성이 있으면 음성 길이 기준) → 만들 영상 길이(초)·예상 금액
  const segDur = (i: number) => (script && i >= 0 ? timeline(script).segs[i]?.dur : undefined);
  const secOf = (i: number) => pickSeconds(vm, lenChoice, segDur(i));
  const withEndOf = (i: number) => !!(script && linkNext && vm.endFrame && nextIdx(i) >= 0 && frameOf(getBg(script, nextIdx(i))));
  const costOf = (i: number) => sceneCost(vm, withEndOf(i), secOf(i));

  async function persist(next: ShortsScript) {
    const it = itemRef.current; if (!it) return;
    try { const r = await api<{ item: Item<ShortsScript> }>("/api/items", { method: "PATCH", body: { id: it.id, data: next } }); setItem(r.item); setDirty(false); } catch { /* 저장 실패해도 화면 상태는 유지(회원이 [배경 저장]을 다시 누를 수 있음) */ }
  }

  async function aiVideo(i: number) {
    if (!script) return;
    const b = getBg(script, i); const start = frameOf(b);
    if (!b || !start) { setMsg({ text: "먼저 이 장면에 사진 배경(AI 이미지 또는 스톡 사진)을 넣어 주세요. 그 사진이 영상의 첫 화면이 됩니다." }); return; }
    if (b.videoJob) return;
    if (!keyOk[vm.provider]) { setMsg({ text: `${vm.name}은(는) 본인 ${PROVIDER_NAME[vm.provider]} 키가 필요합니다. API키등록·플랫폼연동에서 먼저 등록해 주세요.` }); return; }
    const n = nextIdx(i); const end = linkNext && vm.endFrame && n >= 0 ? frameOf(getBg(script, n)) : "";
    setBusy(`${label(script, i)} AI 영상 작업을 보내는 중…`); setMsg(null); setActive(i);
    try {
      const r = await api<{ state: string; job?: VideoJob; path?: string }>("/api/ai/video", { body: { action: "submit", model: vm.id, prompt: hint(i).prompt, startUrl: start, endUrl: end || undefined, seconds: secOf(i) } });
      const cur = scriptRef.current ?? script; const base = getBg(cur, i) ?? b;
      const next = r.path ? setBg(cur, i, { type: "video", source: "ai", src: "", path: r.path, prompt: hint(i).prompt, model: vm.id, poster: base.type === "image" ? base : base.poster })
        : setBg(cur, i, { ...base, videoJob: r.job });
      setScript(next); await persist(next);
      setMsg({ text: r.path ? "AI 영상을 만들었습니다. 대본에 저장했습니다." : `${label(script, i)} AI 영상을 만드는 중입니다(보통 1~5분). 이 화면을 열어 두면 자동으로 확인하고, 닫았다가 다시 열어도 이어서 확인합니다.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  // 만드는 중인 장면을 15초마다 확인한다(한 번에 하나씩, 자동 재제출은 하지 않음 — 이중 과금 방지)
  const pending = script ? [-1, ...Array.from({ length: script.cards.length + 2 }, (_, i) => i)].filter((i) => getBg(script, i)?.videoJob).join(",") : "";
  useEffect(() => {
    if (!pending) return;
    let alive = true; let running = false;
    const tick = async () => {
      if (running || !alive) return; running = true;
      try {
        for (const i of pending.split(",").map(Number)) {
          const s = scriptRef.current; const b = s ? getBg(s, i) : undefined; if (!s || !b?.videoJob) continue;
          try {
            const r = await api<{ state: string; path?: string }>("/api/ai/video", { body: { action: "check", job: b.videoJob } });
            if (r.state !== "done" || !r.path || !alive) continue;
            const cur = scriptRef.current ?? s; const base = getBg(cur, i) ?? b; const { videoJob: doneJob, ...photo } = base;
            const next = setBg(cur, i, { type: "video", source: "ai", src: "", path: r.path, prompt: photo.prompt, model: doneJob?.model, poster: photo.type === "image" ? photo : photo.poster });
            setScript(next); await persist(next);
            setMsg({ text: `${label(cur, i)} AI 영상이 완성되어 대본에 저장했습니다.`, ok: true });
          } catch (e) {
            if (!alive) continue;
            const cur = scriptRef.current ?? s; const base = getBg(cur, i); if (!base) continue;
            const { videoJob: failedJob, ...photo } = base; void failedJob;
            const next = setBg(cur, i, photo); setScript(next); await persist(next);
            setMsg({ text: `${label(cur, i)} AI 영상을 만들지 못해 원래 사진을 그대로 두었습니다. ${toMsg(e)?.text ?? ""}` });
          }
        }
      } finally { running = false; }
    };
    void tick(); const timer = setInterval(() => void tick(), 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [pending]);

  function backToPhoto(i: number) { update((s) => { const b = getBg(s, i); return b?.poster ? setBg(s, i, b.poster) : s; }); }

  async function save() {
    if (!item || !script) return;
    setBusy("저장하는 중…");
    try { const r = await api<{ item: Item<ShortsScript> }>("/api/items", { method: "PATCH", body: { id: item.id, data: script } }); setItem(r.item); setDirty(false); setMsg({ text: "배경을 저장했습니다. 장면 편집에서 움직이는 미리보기로 확인할 수 있어요.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  const rows = script ? (bd.mode === "global" ? [-1] : Array.from({ length: script.cards.length + 2 }, (_, i) => i)) : [];
  const thumbOf = (b?: Bg): string => (b ? (b.source === "ai" && b.type === "video" ? (b.poster ? thumbOf(b.poster) : "") : b.source === "ai" ? media.srcOf(b) : b.type === "image" ? media.srcOf(b) : b.thumb || b.src) : "");
  const bgLabel = (b: Bg) => b.path && media.gone.has(b.path) ? `🗑️ 만든 지 30일이 지나 파일이 삭제되었습니다 — 다시 만들거나 골라 주세요` : b.videoJob ? `⏳ AI 영상 만드는 중… (${findVideoModel(b.videoJob.model)?.name ?? ""} · ${new Date(b.videoJob.startedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 시작)`
    : b.source === "ai" && b.type === "video" ? `🎬 AI 영상 · ${findVideoModel(b.model)?.name ?? ""}` : b.source === "ai" ? "🎨 AI 이미지" : `${b.type === "video" ? "🎬" : "🖼️"} ${b.credit ?? b.source}`;
  // v1.25 「모두 영상으로 만들면」 합계: 사진 배경이 있고 아직 AI 영상이 아닌(만드는 중도 아닌) 장면
  const videoTargets = rows.filter((i) => i >= 0 && script && frameOf(getBg(script, i)) && !(getBg(script, i)?.source === "ai" && getBg(script, i)?.type === "video") && !getBg(script, i)?.videoJob);
  const allCost = Math.round(videoTargets.reduce((sum, i) => sum + costOf(i), 0) * 100) / 100;

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
                  <div className="field-grid">
                    <label>🎬 AI 영상 모델 · 생성 단가<select value={vidModel} onChange={(e) => { setVidModel(e.target.value); const m = findVideoModel(e.target.value); if (m && typeof lenChoice === "number" && !m.durations.includes(lenChoice)) setLenChoice("fit"); }}>{VIDEO_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} — {priceLabel(m, linkNext && m.endFrame)} · {m.note}{keyOk[m.provider] ? "" : ` (${PROVIDER_NAME[m.provider]} 키 미등록)`}</option>)}</select></label>
                    <label>⏱️ 영상 길이<select value={String(lenChoice)} onChange={(e) => setLenChoice(e.target.value === "fit" ? "fit" : Number(e.target.value))}><option value="fit">장면 길이에 맞춤 (반복 재생 없음 · 권장)</option>{LENGTH_CHOICES.filter((s) => vm.durations.includes(s)).map((s) => <option key={s} value={s}>{s}초 고정</option>)}</select></label>
                    <label className="row" style={{ gap: 8, fontWeight: 500, alignSelf: "end" }}><input type="checkbox" checked={linkNext} onChange={(e) => setLinkNext(e.target.checked)} />다음 장면과 이어지게(다음 장면 사진을 끝 화면으로)</label>
                  </div>
                  <small className="muted">🎬 AI 영상: 장면 사진을 첫 화면으로 영상을 만듭니다({vm.name}은 {vm.durations.join("·")}초). 「장면 길이에 맞춤」은 장면보다 길거나 같은 가장 짧은 길이를 골라 반복 재생을 막습니다. 버튼의 금액은 그 장면 기준이며 본인 {PROVIDER_NAME[vm.provider]} 계정에 청구되고, 실제 금액은 업체 가격표 기준입니다. 실패해도 자동으로 다시 보내지 않으니 직접 다시 눌러 주세요.</small>
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
                  {videoTargets.length > 0 && <div className="notice" style={{ fontSize: 13 }}>💰 사진 배경 장면 {videoTargets.length}개를 모두 {vm.name}(으)로 영상으로 만들면 <strong>약 ${allCost.toFixed(2)}</strong>({wonLabel(allCost)})입니다. 비용을 아끼려면 강조할 장면만 [AI 영상]을 눌러 주세요.</div>}
                  {rows.map((i) => {
                    const b = getBg(script, i); const th = thumbOf(b);
                    return (
                      <div key={i} className={`bg-row ${active === i ? "on" : ""}`} onClick={() => setActive(i)}>
                        <div className="bg-thumb">{th ? <img src={th} alt="" /> : <ImageIcon size={18} />}<span>{label(script, i)}</span></div>
                        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                          <div className="row"><input value={hint(i).query} placeholder="스톡 검색어(영어 권장) 예: morning coffee" onChange={(e) => setHint(i, { query: e.target.value })} style={{ flex: 1 }} /><button type="button" disabled={!!busy} onClick={(e) => { e.stopPropagation(); void search(i); }}><Search size={13} />검색</button></div>
                          <div className="row"><input value={hint(i).prompt} placeholder="AI 이미지 설명(영어 권장)" onChange={(e) => setHint(i, { prompt: e.target.value })} style={{ flex: "1 1 180px", minWidth: 0 }} /><button type="button" disabled={!!busy} onClick={(e) => { e.stopPropagation(); void aiImage(i); }}><Sparkles size={13} />AI 이미지</button>
                            {i >= 0 && <button type="button" disabled={!!busy || !!b?.videoJob || !frameOf(b)} title={frameOf(b) ? `${vm.name} · ${secOf(i)}초 · 약 $${costOf(i).toFixed(2)}${withEndOf(i) ? " · 다음 장면과 이어 붙임" : ""}` : "사진 배경이 있어야 영상으로 만들 수 있어요"} onClick={(e) => { e.stopPropagation(); void aiVideo(i); }}><Clapperboard size={13} />AI 영상 {secOf(i)}초 ${costOf(i).toFixed(2)}</button>}
                            {b?.poster && !b.videoJob && <button type="button" title="AI 영상을 지우고 처음 사진으로" aria-label="처음 사진으로 되돌리기" onClick={(e) => { e.stopPropagation(); backToPhoto(i); }}><RotateCcw size={13} /></button>}
                            {b && !b.videoJob && <button type="button" className="danger" onClick={(e) => { e.stopPropagation(); update((s) => setBg(s, i, undefined)); }}><Trash2 size={13} /></button>}</div>
                          {b && <small className="muted">{bgLabel(b)}</small>}
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
