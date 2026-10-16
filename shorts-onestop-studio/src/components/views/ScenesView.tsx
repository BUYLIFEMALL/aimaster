"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Save, ScanLine } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import type { ShortsScript } from "@/lib/script";
import { EFFECTS, FONTS, FONT_CSS, H, LAYOUTS, THEMES, W, loadFontsFor, normalizeDesign, renderFrame, segmentAt, timeline, type Design } from "@/lib/render/scene";

// 장면 편집·미리보기(크리에이티브 아틀리에): 가운데 9:16 캔버스 + 오른쪽 옵션 패널
function useFonts(onReady: () => void) {
  useEffect(() => {
    if (!document.querySelector(`link[data-sos-fonts]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; l.setAttribute("data-sos-fonts", "1"); document.head.appendChild(l);
    }
    const fams = Object.values(FONTS).map((f) => `${f.weight} 64px "${f.family}"`).concat(['700 40px "Noto Sans KR"']);
    Promise.all(fams.map((f) => document.fonts.load(f, "가나다ABC123").catch(() => []))).then(onReady);
  }, [onReady]);
}

const START = 0.9; // 0초는 글자가 나타나기 전이라 첫 화면은 글자가 보이는 지점에서 시작

export function ScenesView() {
  const [list, setList] = useState<Item<ShortsScript>[] | null>(null);
  const [item, setItem] = useState<Item<ShortsScript> | null>(null);
  const [design, setDesign] = useState<Design>(normalizeDesign(undefined));
  const [playing, setPlaying] = useState(false), [t, setT] = useState(0), [safe, setSafe] = useState(false), [fontTick, setFontTick] = useState(0);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null), [dirty, setDirty] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);

  const onFonts = useCallback(() => setFontTick((n) => n + 1), []);
  useFonts(onFonts);

  const open = useCallback(async (id: string) => {
    try {
      const { item } = await api<{ item: Item<ShortsScript> }>(`/api/items?id=${id}`);
      setItem(item); setDesign(normalizeDesign(item.data.design as Partial<Design>)); setDirty(false); tRef.current = START; setT(START); setPlaying(false);
      window.history.replaceState(null, "", `/scenes?id=${id}`);
    } catch (e) { setMsg(toMsg(e)); }
  }, []);

  useEffect(() => {
    api<{ items: Item<ShortsScript>[] }>("/api/items?kind=project").then(({ items }) => {
      setList(items);
      const id = new URLSearchParams(window.location.search).get("id") ?? items[0]?.id;
      if (id) void open(id);
    }).catch((e) => setMsg(toMsg(e)));
  }, [open]);

  const tl = useMemo(() => (item ? timeline(item.data) : null), [item]);

  const draw = useCallback((time: number) => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx || !item) return;
    renderFrame(ctx, item.data, design, time, { safe });
  }, [item, design, safe]);

  // 대본·글꼴이 바뀌면 그 글자들로 웹 글꼴을 먼저 받아 두고 다시 그린다
  useEffect(() => { if (item) void loadFontsFor(item.data, design).then(() => setFontTick((n) => n + 1)); }, [item, design]);
  useEffect(() => { draw(tRef.current); }, [draw, fontTick]);

  useEffect(() => {
    if (!playing || !tl) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      tRef.current += (now - last) / 1000; last = now;
      if (tRef.current >= tl.total) tRef.current = 0;
      draw(tRef.current); setT(tRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, tl, draw]);

  function seek(v: number) { tRef.current = v; setT(v); draw(v); }
  function change(patch: Partial<Design>) { setDesign((d) => ({ ...d, ...patch })); setDirty(true); }

  async function save() {
    if (!item) return;
    setBusy("저장하는 중…"); setMsg(null);
    try {
      const data = { ...item.data, design };
      const r = await api<{ item: Item<ShortsScript> }>("/api/items", { method: "PATCH", body: { id: item.id, data } });
      setItem(r.item); setDirty(false); setMsg({ text: "디자인을 저장했습니다. 다음 단계(배경·음성·영상)에서 이 디자인으로 이어집니다.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  const cur = tl && item ? segmentAt(tl.segs, t) : null;
  const segLabel = (k: string, i: number) => (k === "intro" ? "인트로" : k === "outro" ? "아웃트로" : `카드 ${i + 1}`);

  return (
    <>
      <Hero eyebrow="STEP 3 · 장면 편집" title="🎬 대본을 세로 영상 장면으로 확인하세요" desc="저장한 대본이 실제 쇼츠 화면(1080×1920)으로 움직이며 재생됩니다. 테마·카드 모양·글꼴을 바꾸면 바로 반영되고, 유튜브 화면 가림 영역도 확인할 수 있어요." emoji="🎬" meta={["📐 9:16 미리보기", "🎨 테마 8 · 레이아웃 6", "🔲 세이프에어리어"]} />
      <div className="stack">
        <Message msg={msg} />
        {list && list.length === 0 && (
          <div className="empty-state"><span className="emoji">🎬</span><strong>먼저 대본을 만들어 주세요</strong><span>주제·대본 화면에서 대본을 만들고 보관함에 저장하면 여기서 장면으로 볼 수 있어요.</span><a className="button primary" href="/topic">💡 대본 만들러 가기</a></div>
        )}
        {list && list.length > 0 && (
          <section className="card">
            <label>편집할 대본<select value={item?.id ?? ""} onChange={(e) => void open(e.target.value)}>{list.map((p) => <option key={p.id} value={p.id}>{p.title} · 카드 {p.data.cards?.length ?? 0}장 · {timeAgo(p.updated_at)}</option>)}</select></label>
          </section>
        )}
        {item && tl && (
          <div className="atelier">
            <section className="card stage">
              <div className="stage-frame"><canvas ref={canvas} width={W} height={H} aria-label="쇼츠 장면 미리보기" /></div>
              <div className="player">
                <button type="button" className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "일시정지" : "재생"}</button>
                <button type="button" onClick={() => seek(START)} aria-label="처음으로"><RotateCcw size={14} /></button>
                <input type="range" min={0} max={tl.total} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} aria-label="재생 위치" />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{t.toFixed(1)} / {tl.total.toFixed(1)}초</span>
              </div>
              <div className="chips" style={{ justifyContent: "center" }}>
                {tl.segs.map((g) => <button key={`${g.kind}${g.index}`} type="button" className={`chip ${cur === g ? "on" : ""}`} onClick={() => seek(g.start + 0.6)}>{segLabel(g.kind, g.index)}</button>)}
                <button type="button" className={`chip ${safe ? "on" : ""}`} onClick={() => setSafe((v) => !v)}><ScanLine size={13} />세이프에어리어</button>
              </div>
              <small className="muted">장면 길이는 지금은 내레이션 글자 수로 어림합니다(약 7자/초). 음성 단계가 열리면 실제 목소리 길이에 맞춰집니다.</small>
            </section>
            <aside className="card stack panel">
              <div className="row" style={{ justifyContent: "space-between" }}><h2>🎨 장면 디자인</h2>{dirty && <span className="badge brand">저장 안 됨</span>}</div>
              <div><p className="panel-label">테마</p><div className="swatches">{(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((k) => (
                <button key={k} type="button" title={THEMES[k].name} className={`swatch ${design.theme === k ? "on" : ""}`} style={{ background: `linear-gradient(135deg, ${THEMES[k].bg[0]}, ${THEMES[k].bg[2]})` }} onClick={() => change({ theme: k })}><span>{THEMES[k].name}</span></button>
              ))}</div></div>
              <div><p className="panel-label">카드 레이아웃</p><div className="chips">{(Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]).map((k) => <button key={k} type="button" className={`chip ${design.layout === k ? "on" : ""}`} onClick={() => change({ layout: k })}>{LAYOUTS[k]}</button>)}</div></div>
              <label>제목 글꼴<select value={design.font} onChange={(e) => change({ font: e.target.value as Design["font"] })}>{(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((k) => <option key={k} value={k}>{FONTS[k].name}</option>)}</select></label>
              <div><p className="panel-label">제목 효과</p><div className="chips">{(Object.keys(EFFECTS) as (keyof typeof EFFECTS)[]).map((k) => <button key={k} type="button" className={`chip ${design.effect === k ? "on" : ""}`} onClick={() => change({ effect: k })}>{EFFECTS[k]}</button>)}</div></div>
              <label className="row" style={{ gap: 8, fontWeight: 500 }}><input type="checkbox" checked={design.badges} onChange={(e) => change({ badges: e.target.checked })} />카드 번호·태그 표시</label>
              <div className="actions"><button className="primary" disabled={!!busy || !dirty} onClick={() => void save()}><Save size={14} />디자인 저장</button><Busy on={!!busy} label={busy} /></div>
              <div className="avatar-tip"><span className="avatar">🤖</span><div><strong>글자를 고치고 싶다면?</strong><p className="muted">화면 제목·내레이션은 <a href={`/topic?id=${item.id}`} style={{ textDecoration: "underline" }}>💡 주제·대본</a>에서 고쳐 저장하면 여기에 바로 반영됩니다.</p></div></div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
