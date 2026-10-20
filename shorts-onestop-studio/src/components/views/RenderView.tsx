"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Film, Search, Mic, Music, Pause, Play, RotateCcw, Save, Square, Trash2, Upload } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { api, timeAgo, toMsg, type Item, type Msg } from "@/components/ui/api";
import { useMedia } from "@/components/ui/useMedia";
import { useAudio } from "@/components/ui/useAudio";
import { createClient } from "@/lib/supabase/client";
import { sceneVoices, type ShortsScript, type Voice } from "@/lib/script";
import { CAPTION_STYLES, TTS_MODELS, TTS_VOICES, normalizeAudio, type AudioSettings } from "@/lib/voice";
import { FONT_CSS, H, W, loadFontsFor, normalizeDesign, renderFrame, timeline } from "@/lib/render/scene";
import { exportMp4, type ExportProgress } from "@/lib/render/export";
import { measureAudio as measure } from "@/lib/pipeline";
import { YoutubeUploadCard } from "@/components/views/YoutubeUploadCard";
import { logBrowserUsage } from "@/lib/youtube/browserUpload";
import type { YoutubeUpload } from "@/lib/script";

const label = (s: ShortsScript, i: number) => (i === 0 ? "인트로" : i === s.cards.length + 1 ? "아웃트로" : `카드 ${i}`);
function setVoice(s: ShortsScript, i: number, v: Voice | undefined): ShortsScript {
  const c = structuredClone(s); const n = c.cards.length;
  if (i === 0) c.intro.voice = v; else if (i === n + 1) c.outro.voice = v; else c.cards[i - 1].voice = v;
  return c;
}

export function RenderView() {
  const [list, setList] = useState<Item<ShortsScript>[] | null>(null);
  const [item, setItem] = useState<Item<ShortsScript> | null>(null);
  const [script, setScript] = useState<ShortsScript | null>(null);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null), [dirty, setDirty] = useState(false);
  const [playing, setPlaying] = useState(false), [t, setT] = useState(0.9);
  const canvas = useRef<HTMLCanvasElement>(null); const tRef = useRef(0.9);
  const [exp, setExp] = useState<ExportProgress | null>(null), [file, setFile] = useState<{ url: string; name: string; mb: number; blob: Blob } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const media = useMedia(script); const audio = useAudio(script);
  const a = useMemo(() => normalizeAudio(script?.audio), [script]);
  const tl = useMemo(() => (script ? timeline(script) : null), [script]);

  const open = useCallback(async (id: string) => {
    try {
      const { item } = await api<{ item: Item<ShortsScript> }>(`/api/items?id=${id}`);
      setFile((f) => { if (f) URL.revokeObjectURL(f.url); return null; });
      setItem(item); setScript(item.data); setDirty(false); setPlaying(false); tRef.current = 0.9; setT(0.9);
      window.history.replaceState(null, "", `/render?id=${id}`);
    } catch (e) { setMsg(toMsg(e)); }
  }, []);
  useEffect(() => {
    if (!document.querySelector("link[data-sos-fonts]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; l.setAttribute("data-sos-fonts", "1"); document.head.appendChild(l); }
    api<{ items: Item<ShortsScript>[] }>("/api/items?kind=project").then(({ items }) => {
      setList(items); const id = new URLSearchParams(window.location.search).get("id") ?? items[0]?.id; if (id) void open(id);
    }).catch((e) => setMsg(toMsg(e)));
  }, [open]);

  const update = (fn: (s: ShortsScript) => ShortsScript) => { setScript((s) => (s ? fn(s) : s)); setDirty(true); };
  const setA = (patch: Partial<AudioSettings>) => update((s) => ({ ...s, audio: { ...normalizeAudio(s.audio), ...patch } }));

  // 미리보기 그리기 + 소리 맞추기
  const draw = useCallback((time: number) => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx || !script) return;
    renderFrame(ctx, script, normalizeDesign(script.design as never), time, { media: media.resolve });
  }, [script, media.resolve]);
  useEffect(() => { if (script) void loadFontsFor(script, normalizeDesign(script.design as never)).then(() => draw(tRef.current)); }, [script, draw, media.tick]);
  useEffect(() => {
    if (!playing || !tl) { audio.stopAll(); return; }
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      tRef.current += (now - last) / 1000; last = now;
      if (tRef.current >= tl.total) { tRef.current = 0; }
      draw(tRef.current); setT(tRef.current); audio.sync(tRef.current, true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); audio.stopAll(); };
  }, [playing, tl, draw, audio]);
  function seek(v: number) { tRef.current = v; setT(v); draw(v); if (playing) audio.sync(v, true); }

  async function makeVoice(i: number, s: ShortsScript): Promise<ShortsScript> {
    const text = sceneVoices(s)[i].text;
    const r = await api<{ path: string; src: string }>("/api/ai/tts", { body: { text, settings: normalizeAudio(s.audio) } });
    const dur = await measure(r.src);
    return setVoice(s, i, { path: r.path, dur, text });
  }
  async function makeAll(onlyMissing: boolean) {
    if (!script) return;
    let next = script; const vs = sceneVoices(next); const idx = vs.map((v, i) => i).filter((i) => !onlyMissing || !vs[i].voice);
    if (!idx.length) { setMsg({ text: "모든 장면에 지금 내레이션과 같은 음성이 있습니다.", ok: true }); return; }
    setMsg(null); setPlaying(false);
    try {
      for (let k = 0; k < idx.length; k++) { setBusy(`음성을 만드는 중… (${k + 1}/${idx.length})`); next = await makeVoice(idx[k], next); setScript(next); setDirty(true); }
      setMsg({ text: `음성 ${idx.length}개를 만들었습니다. 장면 길이가 실제 목소리 길이에 맞춰졌어요. [저장]을 눌러 주세요.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }
  async function remake(i: number) {
    if (!script) return; setBusy(`${label(script, i)} 음성을 만드는 중…`); setMsg(null);
    try { setScript(await makeVoice(i, script)); setDirty(true); } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }
  function playOne(v?: Voice) {
    if (!v) return; const src = audio.urls[v.path];
    if (src) { const x = new Audio(src); void x.play().catch(() => undefined); }
  }

  async function uploadBgm(file: File | undefined) {
    if (!file) return;
    setBusy("배경음악을 올리는 중…"); setMsg(null);
    try {
      const r = await api<{ path: string; token: string }>("/api/media/bgm", { body: { name: file.name, size: file.size } });
      const { error } = await createClient().storage.from("shorts-onestop-studio").uploadToSignedUrl(r.path, r.token, file, { contentType: file.type || "audio/mpeg" });
      if (error) throw new Error("업로드에 실패했습니다. 파일 형식(mp3·m4a·wav·ogg·aac)과 크기(10MB 이하)를 확인해 주세요.");
      setA({ bgm: { path: r.path, name: file.name, volume: a.bgm?.volume ?? 0.35 } });
      setMsg({ text: `「${file.name}」을 배경음악으로 올렸습니다. 목소리가 나올 때는 자동으로 작게 깔립니다.`, ok: true });
    } catch (e) { setMsg(e instanceof Error && !(e as { needKey?: boolean }).needKey ? { text: e.message } : toMsg(e)); } finally { setBusy(""); }
  }

  async function makeMp4() {
    if (!script || exp) return;
    setPlaying(false); setMsg(null); setFile((f) => { if (f) URL.revokeObjectURL(f.url); return null; });
    const ac = new AbortController(); abort.current = ac; const started = performance.now();
    try {
      const blob = await exportMp4({ script, media: media.resolve, audioUrls: audio.urls, signal: ac.signal, onProgress: setExp });
      void logBrowserUsage({ action: "mp4_made", projectId: item?.id ?? null });
      const name = `${(item?.title || script.intro.title || "shorts").replace(/[\\/:*?"<>|]/g, "").slice(0, 40).trim() || "shorts"}.mp4`;
      setFile({ url: URL.createObjectURL(blob), name, mb: Math.round((blob.size / 1048576) * 10) / 10, blob });
      setMsg({ text: `MP4를 만들었습니다(${Math.round((performance.now() - started) / 1000)}초 걸림). [MP4 내려받기]로 저장하거나 ⑥에서 유튜브에 바로 올리세요.`, ok: true });
    } catch (e) {
      setMsg(e instanceof DOMException && e.name === "AbortError" ? { text: "MP4 만들기를 멈췄습니다." } : { text: e instanceof Error ? e.message : "MP4를 만들지 못했습니다. 다시 시도해 주세요." });
    } finally { setExp(null); abort.current = null; }
  }

  async function makeSeo() {
    if (!script) return; setBusy("업로드 문구를 만드는 중…"); setMsg(null);
    try { const { seo } = await api<{ seo: NonNullable<ShortsScript["seo"]> }>("/api/ai/seo", { body: { script } }); update((x) => ({ ...x, seo })); setMsg({ text: "업로드 문구를 만들었습니다. 고쳐 쓰고 [저장]을 눌러 주세요.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setMsg({ text: `${what}을(를) 복사했습니다.`, ok: true }); } catch { setMsg({ text: "복사하지 못했습니다. 글자를 직접 선택해 복사해 주세요." }); }
  }
  const setSeo = (patch: Partial<NonNullable<ShortsScript["seo"]>>) => update((x) => (x.seo ? { ...x, seo: { ...x.seo, ...patch } } : x));

  // v1.19 유튜브에 올린 기록은 바로 저장한다(화면을 떠나도 남도록). 다른 고친 내용도 함께 저장된다
  async function saveUpload(rec: YoutubeUpload) {
    if (!item || !script) return;
    const next = { ...script, youtube: [rec, ...(script.youtube ?? [])].slice(0, 10) };
    setScript(next);
    try { const r = await api<{ item: Item<ShortsScript> }>("/api/items", { method: "PATCH", body: { id: item.id, data: next } }); setItem(r.item); setDirty(false); }
    catch { setDirty(true); setMsg({ text: "유튜브에는 올렸지만 기록을 저장하지 못했습니다. [저장]을 눌러 주세요." }); }
  }

  async function save() {
    if (!item || !script) return; setBusy("저장하는 중…");
    try { const r = await api<{ item: Item<ShortsScript> }>("/api/items", { method: "PATCH", body: { id: item.id, data: script } }); setItem(r.item); setDirty(false); setMsg({ text: "음성·자막·배경음악 설정을 저장했습니다.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  const vs = script ? sceneVoices(script) : [];
  const raw = script ? [script.intro.voice, ...script.cards.map((c) => c.voice), script.outro.voice] : [];
  const ready = vs.filter((v) => v.voice).length;

  return (
    <>
      <Hero eyebrow="STEP 4 · 음성·자막·영상" title="🎙️ 목소리와 자막, 배경음악을 입혀요" desc="본인 AI 키로 장면마다 내레이션 음성을 만들면 장면 길이가 실제 목소리에 맞춰지고, 목소리에 맞춰 자막이 나옵니다. 배경음악은 목소리가 나올 때 자동으로 작아집니다." emoji="🎙️" meta={["🔑 본인 키 음성", "💬 자막 4가지 스타일", "🎵 배경음악 자동 볼륨"]} />
      <div className="stack">
        <Message msg={msg} />
        {list && list.length === 0 && <div className="empty-state"><span className="emoji">🎙️</span><strong>먼저 대본을 만들어 주세요</strong><a className="button primary" href="/topic">💡 대본 만들러 가기</a></div>}
        {list && list.length > 0 && <section className="card"><label>작업할 대본<select value={item?.id ?? ""} onChange={(e) => void open(e.target.value)}>{list.map((p) => <option key={p.id} value={p.id}>{p.title} · {timeAgo(p.updated_at)}</option>)}</select></label></section>}
        {script && tl && (
          <div className="atelier">
            <div className="stack">
              <section className="card stack">
                <div className="row" style={{ justifyContent: "space-between" }}><h2>🎙️ ① 내레이션 음성 <small>{ready}/{vs.length} 준비</small></h2>{dirty && <span className="badge brand">저장 안 됨</span>}</div>
                <div className="field-grid">
                  <label>음성 모델<select value={a.model} onChange={(e) => { const m = TTS_MODELS.find((x) => x.id === e.target.value)!; setA({ model: m.id, provider: m.provider, voice: TTS_VOICES[m.provider][0].id }); }}>{TTS_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                  <label>목소리<select value={a.voice} onChange={(e) => setA({ voice: e.target.value })}>{TTS_VOICES[a.provider].map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
                  <label>말 빠르기 ({a.speed.toFixed(2)}배){a.provider === "openai" ? <input type="range" min={0.8} max={1.4} step={0.05} value={a.speed} onChange={(e) => setA({ speed: Number(e.target.value) })} /> : <small className="muted" style={{ display: "block", marginTop: 8 }}>Gemini는 말투 지시로 조절</small>}</label>
                </div>
                {a.model !== "tts-1" && <label>말투 지시(선택)<input value={a.tone} maxLength={200} onChange={(e) => setA({ tone: e.target.value })} placeholder="예: 차분하고 신뢰감 있게, 끝을 또렷하게" /></label>}
                <div className="actions">
                  <button className="primary" disabled={!!busy} onClick={() => void makeAll(true)}><Mic size={14} />음성 없는 장면 모두 만들기</button>
                  <button disabled={!!busy} onClick={() => void makeAll(false)}><RotateCcw size={14} />전부 다시 만들기</button>
                  <Busy on={!!busy && !busy.startsWith("업로드")} label={busy} />
                </div>
                <small className="muted">장면마다 짧은 요청 1회씩(본인 키 요금, 가벼운 모델 기준 소액). 내레이션을 고치면 그 장면은 「다시 만들기」가 필요해요.</small>
                <div className="list">{vs.map((v, i) => (
                  <div key={i} className="list-item">
                    <div style={{ minWidth: 0 }}><strong>{label(script, i)}</strong><small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.text}</small></div>
                    <div className="actions" style={{ flexShrink: 0 }}>
                      {v.voice ? <span className="badge brand">✅ {v.voice.dur.toFixed(1)}초</span> : raw[i] ? <span className="badge">⚠️ 내레이션 바뀜</span> : <span className="badge">음성 없음</span>}
                      {v.voice && <button type="button" aria-label="듣기" onClick={() => playOne(v.voice)}><Play size={13} /></button>}
                      <button type="button" disabled={!!busy} onClick={() => void remake(i)}><Mic size={13} />{v.voice ? "다시" : "만들기"}</button>
                    </div>
                  </div>))}</div>
              </section>
              <section className="card stack">
                <h2>💬 ② 자막</h2>
                <label className="row" style={{ gap: 8, fontWeight: 500 }}><input type="checkbox" checked={a.captions.on} onChange={(e) => setA({ captions: { ...a.captions, on: e.target.checked } })} />영상에 자막 넣기(목소리 길이에 맞춰 나눔)</label>
                {a.captions.on && <label className="row" style={{ gap: 8, fontWeight: 500 }}><input type="checkbox" checked={a.captions.voiceOnly} onChange={(e) => setA({ captions: { ...a.captions, voiceOnly: e.target.checked } })} />MP4에는 목소리가 있는 장면에만 자막 넣기<small className="muted">(미리보기는 스타일 확인용으로 항상 표시)</small></label>}
                {a.captions.on && <>
                  <div className="chips">{(Object.keys(CAPTION_STYLES) as (keyof typeof CAPTION_STYLES)[]).map((k) => <button key={k} type="button" className={`chip ${a.captions.style === k ? "on" : ""}`} onClick={() => setA({ captions: { ...a.captions, style: k } })}>{CAPTION_STYLES[k]}</button>)}</div>
                  <div className="field-grid">
                    <label>세로 위치(아래에서 {a.captions.y}px)<input type="range" min={160} max={1500} step={20} value={a.captions.y} onChange={(e) => setA({ captions: { ...a.captions, y: Number(e.target.value) } })} /></label>
                    <label>크기({Math.round(a.captions.size * 100)}%)<input type="range" min={0.7} max={1.6} step={0.05} value={a.captions.size} onChange={(e) => setA({ captions: { ...a.captions, size: Number(e.target.value) } })} /></label>
                  </div>
                  <small className="muted">유튜브 화면 아래쪽 제목·버튼에 가리지 않게 340px 이상을 권장해요(장면 편집의 세이프에어리어로 확인).</small>
                </>}
              </section>
              <section className="card stack">
                <h2>🎵 ③ 배경음악</h2>
                {a.bgm ? <div className="list-item"><div><strong>🎵 {a.bgm.name}</strong><small>목소리가 나올 때 35%로 자동으로 작아집니다</small></div><button type="button" className="danger" onClick={() => setA({ bgm: undefined })}><Trash2 size={13} />빼기</button></div>
                  : <p className="muted">내 PC의 음악 파일(mp3·m4a·wav·ogg·aac, 10MB 이하)을 올리세요. 저작권이 있는 음악은 쓰지 마시고, 무료 음원(예: 유튜브 오디오 보관함)을 권장합니다.</p>}
                <div className="row">
                  <label className="button" style={{ fontWeight: 600 }}><Upload size={14} />{a.bgm ? "다른 음악 올리기" : "음악 파일 올리기"}<input type="file" accept=".mp3,.m4a,.wav,.ogg,.aac,audio/*" hidden onChange={(e) => void uploadBgm(e.target.files?.[0])} /></label>
                  {a.bgm && <label style={{ flex: 1, minWidth: 180 }}>음악 볼륨({Math.round(a.bgm.volume * 100)}%)<input type="range" min={0} max={1} step={0.05} value={a.bgm.volume} onChange={(e) => setA({ bgm: { ...a.bgm!, volume: Number(e.target.value) } })} /></label>}
                </div>
              </section>
              <section className="card stack">
                <h2>🎬 ④ MP4 만들기</h2>
                <p className="muted">지금 미리보기 그대로 1080×1920 세로 MP4(30fps, 목소리·자막·배경음악 포함)를 이 브라우저 안에서 만듭니다. 서버 요금은 없고, 만드는 동안 이 탭을 열어 두세요(영상 길이의 1~3배 정도 걸립니다).</p>
                {ready < vs.length && <small className="muted">⚠️ 음성이 없는 장면 {vs.length - ready}개는 소리 없이 글자 수 길이로 들어갑니다.</small>}
                {exp && <div className="stack" style={{ gap: 6 }}><div style={{ height: 10, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${exp.pct}%`, height: "100%", background: "var(--brand)", transition: "width .3s" }} /></div><small className="muted">{exp.pct}% · {exp.status}</small></div>}
                <div className="actions">
                  {exp ? <button type="button" className="danger" onClick={() => abort.current?.abort()}><Square size={14} />멈추기</button>
                    : <button type="button" className="primary" disabled={!!busy} onClick={() => void makeMp4()}><Film size={14} />MP4 만들기</button>}
                  {file && <a className="button primary" href={file.url} download={file.name}><Download size={14} />MP4 내려받기 ({file.mb}MB)</a>}
                </div>
                {file && <video src={file.url} controls playsInline style={{ width: "100%", maxWidth: 240, borderRadius: 12, alignSelf: "center" }} />}
              </section>
              <section className="card stack">
                <h2>🔎 ⑤ 업로드 문구(SEO)</h2>
                {!script.seo ? <p className="muted">대본을 바탕으로 쇼츠 제목 후보 5개·설명란·해시태그·검색 태그를 만듭니다(본인 AI 키 1회). ⑥에서 유튜브에 바로 올리거나 복사해 붙여 넣으세요.</p> : <>
                  <div><small className="muted">제목 후보(누르면 복사)</small><div className="list" style={{ marginTop: 6 }}>{script.seo.titles.map((t, i) => <button key={i} type="button" className="list-item" style={{ textAlign: "left", width: "100%" }} onClick={() => void copy(t, "제목")}><span>{t}</span><Copy size={13} /></button>)}</div></div>
                  <label>설명란<textarea rows={5} value={script.seo.description} maxLength={1500} onChange={(e) => setSeo({ description: e.target.value })} /></label>
                  {/* 입력 중 띄어쓰기·쉼표가 지워지지 않게, 칸을 벗어날 때 나눠서 저장한다 */}
                  <label>해시태그(띄어쓰기로 구분)<input key={`h-${script.seo.hashtags.join(" ")}`} defaultValue={script.seo.hashtags.join(" ")} onBlur={(e) => setSeo({ hashtags: e.target.value.split(/\s+/).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 10) })} /></label>
                  <label>검색 태그(쉼표로 구분)<input key={`t-${script.seo.tags.join(",")}`} defaultValue={script.seo.tags.join(", ")} onBlur={(e) => setSeo({ tags: e.target.value.split(/\s*,\s*/).filter(Boolean).slice(0, 20) })} /></label>
                  <div className="actions">
                    <button type="button" onClick={() => void copy(`${script.seo!.description}

${script.seo!.hashtags.join(" ")}`, "설명란+해시태그")}><Copy size={13} />설명란+해시태그 복사</button>
                    <button type="button" onClick={() => void copy(script.seo!.tags.join(", "), "검색 태그")}><Copy size={13} />검색 태그 복사</button>
                  </div>
                </>}
                <div className="actions"><button type="button" className={script.seo ? "" : "primary"} disabled={!!busy || !!exp} onClick={() => void makeSeo()}><Search size={14} />{script.seo ? "다시 만들기" : "업로드 문구 만들기"}</button><Busy on={busy.startsWith("업로드")} label={busy} /></div>
              </section>
              <YoutubeUploadCard key={item?.id} projectId={item?.id ?? null} script={script} blob={file?.blob ?? null} disabled={!!busy || !!exp} onUploaded={saveUpload} />
            </div>
            <aside className="card stack panel">
              <div className="stage-frame"><canvas ref={canvas} width={W} height={H} aria-label="소리 포함 미리보기" /></div>
              <div className="player">
                <button type="button" className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "멈춤" : "소리와 재생"}</button>
                <input type="range" min={0} max={tl.total} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} aria-label="재생 위치" />
              </div>
              <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>{t.toFixed(1)} / {tl.total.toFixed(1)}초 {ready === vs.length ? "· 목소리 길이 기준" : "· 음성 없는 장면은 글자 수로 어림"}</p>
              <div className="actions" style={{ justifyContent: "center" }}><button className="primary" disabled={!!busy || !dirty} onClick={() => void save()}><Save size={14} />저장</button><Music size={14} className="muted" /></div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
