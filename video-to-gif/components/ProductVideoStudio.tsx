"use client";
// v1.30 「🛍 상품 사진 영상」(메이커 v0.3.3 후속 M2) — 사진 1~6장 → MP4(공용 browser-mp4-encoder 사본) · 상세페이지용 애니메이션 WebP(ffmpeg.wasm).
// 모든 처리는 이 브라우저 안에서만 한다(사진·영상을 서버로 보내지 않음, 키·AI 없음). 계산은 lib/productVideo.ts.
import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { ChevronLeft, ChevronRight, Download, Film, Pause, Play, Square, Trash2, UploadCloud } from "lucide-react";
import { assertWebCodecs, encodeMp4, mixVoiceAndBgm } from "@/lib/mp4Encoder";
import { createZip, uniqueNames } from "@/lib/zip";
import {
  FPS_OPTIONS, MAX_PHOTOS, MOTIONS, RATIOS, TEMPOS, TRANSITIONS, WEBP_LADDER, WEBP_MAX_BYTES,
  containRect, frameAt, groupByCode, isImageName, motionFor, motionTransform, nextWebpIndex, safeName, totalSeconds, transitionFor, webpArgs, withCode,
  type MotionKey, type RatioKey, type TempoKey, type TransitionKey,
} from "@/lib/productVideo";

const CORE_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd"; // ConverterWorkspace와 같은 코어
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Noto+Sans+KR:wght@700;900&display=swap";
const FONTS = {
  blackhan: { name: "블랙한산스", css: `"Black Han Sans", "Noto Sans KR", sans-serif`, weight: "400" },
  noto: { name: "노토 산스(깔끔)", css: `"Noto Sans KR", sans-serif`, weight: "900" },
  jua: { name: "주아(둥글게)", css: `"Jua", "Noto Sans KR", sans-serif`, weight: "400" },
  dohyeon: { name: "도현", css: `"Do Hyeon", "Noto Sans KR", sans-serif`, weight: "400" },
} as const;
type FontKey = keyof typeof FONTS;
type Output = "mp4" | "webp" | "both";

type Photo = { id: string; name: string; bmp: ImageBitmap };
type Text = { title: string; desc: string; brand: string; font: FontKey; color: string; outline: boolean; shadow: boolean };
type Settings = { tempo: TempoKey; motion: MotionKey; transition: TransitionKey; ratio: RatioKey; fps: number; output: Output; text: Text };
type Result = { name: string; url: string; bytes: number; blob: Blob; note?: string };

const DEFAULT_TEXT: Text = { title: "", desc: "", brand: "", font: "blackhan", color: "#ffffff", outline: true, shadow: true };
const uid = () => Math.random().toString(36).slice(2, 10);
const mb = (b: number) => `${(b / 1048576).toFixed(1)}MB`;

// ── 한 장면 그리기(미리보기·MP4 공통) ──
function drawPhoto(ctx: CanvasRenderingContext2D, W: number, H: number, bmp: ImageBitmap, i: number, u: number, s: Settings, alpha = 1, shift = 0, extraScale = 1) {
  const box = { x: W * 0.06, y: H * 0.2, w: W * 0.88, h: H * 0.6 };
  const r = containRect(bmp.width, bmp.height, box.w, box.h);
  const m = motionTransform(motionFor(i, s.motion), u); const sc = m.scale * extraScale;
  const cx = box.x + box.w / 2 + m.dx * W + shift, cy = box.y + box.h / 2 + m.dy * H;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(bmp, cx - (r.w * sc) / 2, cy - (r.h * sc) / 2, r.w * sc, r.h * sc);
  ctx.restore();
}
function drawBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number, bmp: ImageBitmap, alpha = 1) {
  const s = Math.max(W / bmp.width, H / bmp.height) * 1.15;
  ctx.save(); ctx.globalAlpha = alpha; ctx.filter = "blur(36px) brightness(0.55)";
  ctx.drawImage(bmp, (W - bmp.width * s) / 2, (H - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
  ctx.restore();
}
function drawText(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, y: number, px: number, t: Text, weightOverride?: string) {
  if (!text.trim()) return;
  // 작은 글자(설명·브랜드)는 고른 글꼴 대신 노토 산스 700 — 굵은 제목용 글꼴에 억지 굵기를 주면 글자가 뭉개진다(v1.30 운영 확인)
  const f = weightOverride ? FONTS.noto : FONTS[t.font]; let size = px;
  const font = () => `${weightOverride ?? f.weight} ${size}px ${f.css}`;
  ctx.save(); ctx.font = font();
  while (size > 18 && ctx.measureText(text).width > W * 0.9) { size -= 2; ctx.font = font(); }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (t.shadow) { ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.06; }
  if (t.outline) { ctx.lineWidth = Math.max(3, size * (weightOverride ? 0.08 : 0.12)); ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(text, W / 2, y); ctx.shadowColor = "transparent"; }
  ctx.fillStyle = t.color; ctx.fillText(text, W / 2, y);
  ctx.restore();
}
function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, photos: Photo[], t: number, s: Settings, code = "") {
  const n = photos.length; ctx.save(); ctx.fillStyle = "#0b0f17"; ctx.fillRect(0, 0, W, H);
  if (!n) { ctx.restore(); return; }
  const { i, u, k } = frameAt(t, n, s.tempo); const cur = photos[i].bmp; const nxt = k !== null ? photos[i + 1].bmp : null;
  const tr = transitionFor(i, s.transition);
  if (!nxt || k === null || tr === "cut") {
    const show = nxt && k !== null && k >= 0.5 && tr === "cut" ? i + 1 : i; const b = photos[show].bmp;
    drawBackdrop(ctx, W, H, b); drawPhoto(ctx, W, H, b, show, show === i ? u : 0, s);
  } else if (tr === "fade") {
    drawBackdrop(ctx, W, H, cur); drawBackdrop(ctx, W, H, nxt, k);
    drawPhoto(ctx, W, H, cur, i, u, s, 1 - k); drawPhoto(ctx, W, H, nxt, i + 1, 0, s, k);
  } else if (tr === "slide") {
    const e = k * k * (3 - 2 * k);
    drawBackdrop(ctx, W, H, cur, 1 - e); drawBackdrop(ctx, W, H, nxt, e);
    drawPhoto(ctx, W, H, cur, i, u, s, 1, -e * W); drawPhoto(ctx, W, H, nxt, i + 1, 0, s, 1, (1 - e) * W);
  } else if (tr === "zoom") {
    drawBackdrop(ctx, W, H, cur); drawBackdrop(ctx, W, H, nxt, k);
    drawPhoto(ctx, W, H, cur, i, u, s, 1 - k, 0, 1 + 0.25 * k); drawPhoto(ctx, W, H, nxt, i + 1, 0, s, k, 0, 0.9 + 0.1 * k);
  } else { // flash
    const b = k < 0.5 ? cur : nxt; drawBackdrop(ctx, W, H, b); drawPhoto(ctx, W, H, b, k < 0.5 ? i : i + 1, k < 0.5 ? u : 0, s);
    ctx.fillStyle = `rgba(255,255,255,${(1 - Math.abs(2 * k - 1)) * 0.85})`; ctx.fillRect(0, 0, W, H);
  }
  const base = Math.min(W, H);
  drawText(ctx, W, H, withCode(s.text.title, code), H * 0.1, base * 0.085, s.text);
  drawText(ctx, W, H, withCode(s.text.desc, code), H * 0.155, base * 0.045, s.text, "700");
  drawText(ctx, W, H, withCode(s.text.brand, code), H * 0.9, base * 0.04, s.text, "700");
  ctx.restore();
}

async function loadFonts(text: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  const sample = text + "가나다ABC0123";
  await Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`${f.weight} 64px ${f.css}`, sample).catch(() => [])));
  await document.fonts.load(`700 40px "Noto Sans KR"`, sample).catch(() => []);
}

export default function ProductVideoStudio() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [batch, setBatch] = useState<{ code: string; files: File[] }[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [s, setS] = useState<Settings>({ tempo: "normal", motion: "auto", transition: "auto", ratio: "vertical", fps: 30, output: "both", text: DEFAULT_TEXT });
  const [music, setMusic] = useState<{ file: File; url: string; volume: number } | null>(null);
  const [busy, setBusy] = useState(""), [err, setErr] = useState(""), [results, setResults] = useState<Result[]>([]);
  const [playing, setPlaying] = useState(false), [t, setT] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null); const abort = useRef<AbortController | null>(null);
  const ffRef = useRef<Promise<FFmpeg> | null>(null); const tRef = useRef(0);
  const { w: W, h: H } = RATIOS[s.ratio]; const total = totalSeconds(photos.length, s.tempo);

  useEffect(() => { // 글꼴 CSS(공식 무료 글꼴, OFL)
    if (document.querySelector(`link[href="${FONT_CSS}"]`)) return;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; document.head.appendChild(l);
  }, []);
  // 미리보기 그리기
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    void loadFonts(s.text.title + s.text.desc + s.text.brand).then(() => drawFrame(ctx, W, H, photos, tRef.current, s, batch[0]?.code ?? "상품코드"));
  }, [photos, s, W, H, t, batch]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0; const start = performance.now() - tRef.current * 1000;
    const loop = (now: number) => { const x = ((now - start) / 1000) % Math.max(1, total); tRef.current = x; setT(x); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [playing, total]);
  useEffect(() => () => results.forEach((r) => URL.revokeObjectURL(r.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toBitmaps(files: File[]): Promise<Photo[]> {
    const out: Photo[] = [];
    for (const f of files) { try { out.push({ id: uid(), name: f.name, bmp: await createImageBitmap(f) }); } catch { throw new Error(`사진을 열지 못했습니다: ${f.name}`); } }
    return out;
  }
  async function addFiles(list: FileList | null | undefined) {
    if (!list?.length) return; setErr("");
    const files = Array.from(list).filter((f) => isImageName(f.name) || f.type.startsWith("image/"));
    const g = groupByCode(files);
    if (g.groups.length >= 2) { // 여러 상품(상품코드_1~6)
      setBatch(g.groups); setSkipped(g.skipped); setPhotos(await toBitmaps(g.groups[0].files.slice(0, MAX_PHOTOS))); tRef.current = 0; setT(0); return;
    }
    setBatch([]); setSkipped([]);
    const room = MAX_PHOTOS - photos.length; if (room <= 0) { setErr(`사진은 ${MAX_PHOTOS}장까지 넣을 수 있습니다.`); return; }
    try { const add = await toBitmaps(files.slice(0, room)); setPhotos((p) => [...p, ...add]); if (files.length > room) setErr(`${MAX_PHOTOS}장까지만 넣었습니다.`); }
    catch (e) { setErr(e instanceof Error ? e.message : "사진을 열지 못했습니다."); }
  }
  const move = (i: number, d: -1 | 1) => setPhotos((p) => { const q = [...p]; const j = i + d; if (j < 0 || j >= q.length) return p; [q[i], q[j]] = [q[j], q[i]]; return q; });
  const remove = (i: number) => setPhotos((p) => p.filter((_, k) => k !== i));
  const setText = (patch: Partial<Text>) => setS((x) => ({ ...x, text: { ...x.text, ...patch } }));

  function ffmpeg(): Promise<FFmpeg> {
    if (!ffRef.current) {
      ffRef.current = (async () => {
        const f = new FFmpeg();
        await f.load({ coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm") });
        return f;
      })().catch((e) => { ffRef.current = null; throw new Error(`WebP 변환 엔진을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`); });
    }
    return ffRef.current;
  }

  async function makeOne(list: Photo[], code: string, signal: AbortSignal, label: string): Promise<Result[]> {
    const tot = totalSeconds(list.length, s.tempo);
    await loadFonts(withCode(s.text.title + s.text.desc + s.text.brand, code));
    const audio = music ? await mixVoiceAndBgm({ total: tot, voices: [], bgm: { src: music.url, volume: music.volume }, onStatus: (x) => setBusy(`${label} ${x}`) }) : null;
    const mp4 = await encodeMp4({
      width: W, height: H, fps: s.fps, total: tot, audio, signal, videoBitrate: W * H > 1_200_000 ? 6_000_000 : 4_000_000,
      onProgress: (p) => setBusy(`${label} MP4 ${p.pct}%${p.etaSeconds ? ` · 남은 시간 약 ${p.etaSeconds}초` : ""}`),
      drawFrame: (ctx, time) => drawFrame(ctx, W, H, list, time, s, code),
    });
    const base = code || withCode(s.text.title, code) || "상품영상";
    const out: Result[] = [];
    if (s.output !== "webp") out.push({ name: safeName(base, "mp4"), url: URL.createObjectURL(mp4), bytes: mp4.size, blob: mp4 });
    if (s.output !== "mp4") {
      setBusy(`${label} WebP 변환 엔진 준비 중…`);
      const f = await ffmpeg(); await f.writeFile("in.mp4", new Uint8Array(await mp4.arrayBuffer()));
      let idx = 0, webp: Blob | null = null, note = "";
      try {
        while (idx >= 0) {
          if (signal.aborted) throw new DOMException("취소", "AbortError");
          const st = WEBP_LADDER[idx]; setBusy(`${label} WebP 만드는 중(${idx + 1}단계 · ${Math.round(st.scale * 100)}% · ${st.fps}fps)…`);
          const code2 = await f.exec(webpArgs("in.mp4", "out.webp", W, st));
          if (code2 !== 0) throw new Error("WebP를 만들지 못했습니다. MP4로 받아 주세요.");
          const data = await f.readFile("out.webp") as Uint8Array; await f.deleteFile("out.webp");
          if (data.byteLength <= WEBP_MAX_BYTES) { webp = new Blob([data.slice()], { type: "image/webp" }); note = idx ? `10MB에 맞추려고 ${Math.round(st.scale * 100)}% 크기·${st.fps}fps로 줄였습니다` : ""; break; }
          idx = nextWebpIndex(idx, data.byteLength);
        }
      } finally { await f.deleteFile("in.mp4").catch(() => undefined); }
      if (!webp) throw new Error("WebP를 10MB 이하로 줄이지 못했습니다. 템포를 「빠르게」로 하거나 사진 수를 줄여 주세요.");
      out.push({ name: safeName(base, "webp"), url: URL.createObjectURL(webp), bytes: webp.size, blob: webp, note });
    }
    return out;
  }

  async function run() {
    if (busy) return; setErr("");
    try { assertWebCodecs(); } catch (e) { setErr(e instanceof Error ? e.message : "이 브라우저는 영상 만들기를 지원하지 않습니다."); return; }
    setPlaying(false); const ac = new AbortController(); abort.current = ac; const started = performance.now();
    results.forEach((r) => URL.revokeObjectURL(r.url)); setResults([]);
    const jobs = batch.length ? batch.map((g) => ({ code: g.code, files: g.files })) : [{ code: "", files: [] as File[] }];
    const fails: string[] = []; let made = 0;
    for (let n = 0; n < jobs.length; n++) {
      if (ac.signal.aborted) break;
      const j = jobs[n]; const label = jobs.length > 1 ? `[${n + 1}/${jobs.length} ${j.code}]` : "";
      try {
        const list = j.files.length ? await toBitmaps(j.files.slice(0, MAX_PHOTOS)) : photos;
        if (!list.length) throw new Error("사진을 1장 이상 넣어 주세요.");
        const r = await makeOne(list, j.code, ac.signal, label); made++;
        setResults((x) => [...x, ...r]);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") break;
        fails.push(`${j.code || "상품"}: ${e instanceof Error ? e.message : "실패"}`);
      }
    }
    abort.current = null; setBusy("");
    if (ac.signal.aborted) setErr("만들기를 멈췄습니다. 끝난 결과는 아래에 있습니다.");
    else if (fails.length) setErr(`${made}개 완료, ${fails.length}개 실패 — ${fails.join(" / ")}`);
    else setErr(`✅ ${made}개 상품을 만들었습니다(${Math.round((performance.now() - started) / 1000)}초).`);
  }

  function zipAll() {
    const names = uniqueNames(results.map((r) => r.name));
    Promise.all(results.map(async (r, i) => ({ name: names[i], data: new Uint8Array(await r.blob.arrayBuffer()) }))).then((entries) => {
      const url = URL.createObjectURL(new Blob([createZip(entries).slice()], { type: "application/zip" }));
      const a = document.createElement("a"); a.href = url; a.download = "상품사진영상.zip"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }).catch(() => setErr("ZIP을 만들지 못했습니다. 파일을 하나씩 받아 주세요."));
  }

  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-[#30363d] text-gray-300 hover:border-gray-500"}`;
  const input = "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white";
  const ok = err.startsWith("✅");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-lg">🛍</span>
          <h1 className="text-xl font-extrabold text-white">상품 사진 영상</h1>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">NEW · 키 없이 무료</span>
        </div>
        <p className="text-sm text-gray-300">상품 사진 1~6장으로 움직이는 홍보 영상(MP4)과 상세페이지용 움짤(애니메이션 WebP, 10MB 이하)을 만듭니다. 사진과 영상은 이 브라우저 안에서만 처리되고 서버로 올라가지 않습니다.</p>
        <p className="text-xs text-gray-400">💡 여러 상품을 한 번에: 파일 이름을 <b className="text-gray-200">상품코드_1.jpg ~ 상품코드_6.jpg</b>로 맞춰 한꺼번에 넣으면 상품코드별로 하나씩 차례로 만들고 ZIP으로 받을 수 있습니다. 문구에 <code className="text-amber-300">{"{상품코드}"}</code>를 쓰면 그 상품의 코드로 바뀝니다.</p>
      </header>

      {err && <div className={`rounded-xl border px-4 py-3 text-sm ${ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>{err}</div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#30363d] bg-[#161b22] px-6 py-8 text-center hover:border-amber-500/50"
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
            <UploadCloud className="h-8 w-8 text-amber-400" />
            <div className="text-sm font-bold text-white">상품 사진을 끌어 놓거나 눌러서 고르세요</div>
            <div className="text-xs text-gray-400">JPG · PNG · WebP · 상품 1개는 최대 {MAX_PHOTOS}장 · 여러 상품은 상품코드_번호 이름으로</div>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
          </label>

          {batch.length > 0 ? (
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-sm text-gray-200">
              <div className="mb-2 font-bold">📦 여러 상품 {batch.length}개 — 하나씩 차례로 만듭니다</div>
              <div className="flex flex-wrap gap-2">{batch.map((g) => <span key={g.code} className="rounded-lg bg-[#0d1117] px-2 py-1 text-xs">{g.code} · {g.files.length}장</span>)}</div>
              {skipped.length > 0 && <div className="mt-2 text-xs text-amber-300">이름 규칙에 맞지 않거나 번호가 겹쳐 뺀 파일: {skipped.join(", ")}</div>}
              <button type="button" className="mt-3 text-xs text-gray-400 underline" onClick={() => { setBatch([]); setSkipped([]); setPhotos([]); }}>여러 상품 비우기</button>
            </div>
          ) : photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {photos.map((p, i) => (
                <div key={p.id} className="space-y-1 rounded-lg border border-[#30363d] bg-[#161b22] p-1.5 text-center">
                  <div className="text-[10px] text-gray-400">{i + 1}번</div>
                  <div className="truncate text-[10px] text-gray-300" title={p.name}>{p.name}</div>
                  <div className="flex justify-center gap-1">
                    <button type="button" aria-label="앞으로" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-gray-300 hover:bg-[#30363d] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" aria-label="뒤로" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-gray-300 hover:bg-[#30363d] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                    <button type="button" aria-label="빼기" onClick={() => remove(i)} className="rounded p-1 text-rose-300 hover:bg-[#30363d]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
            <div className="text-sm font-bold text-white">🎬 움직임</div>
            <div className="flex flex-wrap gap-2">{(Object.keys(TEMPOS) as TempoKey[]).map((k) => <button key={k} type="button" className={chip(s.tempo === k)} onClick={() => setS({ ...s, tempo: k })}>{TEMPOS[k].label} · 장당 {TEMPOS[k].per}초</button>)}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-gray-400">카메라 움직임<select className={input} value={s.motion} onChange={(e) => setS({ ...s, motion: e.target.value as MotionKey })}>{(Object.keys(MOTIONS) as MotionKey[]).map((k) => <option key={k} value={k}>{MOTIONS[k]}</option>)}</select></label>
              <label className="space-y-1 text-xs text-gray-400">사진 넘김<select className={input} value={s.transition} onChange={(e) => setS({ ...s, transition: e.target.value as TransitionKey })}>{(Object.keys(TRANSITIONS) as TransitionKey[]).map((k) => <option key={k} value={k}>{TRANSITIONS[k]}</option>)}</select></label>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
            <div className="text-sm font-bold text-white">✍️ 문구 3층</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-gray-400">제목(위)<input className={input} maxLength={30} value={s.text.title} placeholder="예: 여름 필수템" onChange={(e) => setText({ title: e.target.value })} /></label>
              <label className="space-y-1 text-xs text-gray-400">설명(제목 아래)<input className={input} maxLength={40} value={s.text.desc} placeholder="예: 300g 초경량 · 오늘 출발" onChange={(e) => setText({ desc: e.target.value })} /></label>
              <label className="space-y-1 text-xs text-gray-400">브랜드(아래)<input className={input} maxLength={30} value={s.text.brand} placeholder="예: @내스토어" onChange={(e) => setText({ brand: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
              <select className="rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-1" value={s.text.font} onChange={(e) => setText({ font: e.target.value as FontKey })}>{(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].name}</option>)}</select>
              <label className="flex items-center gap-1">글자색<input type="color" value={s.text.color} onChange={(e) => setText({ color: e.target.value })} /></label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.text.outline} onChange={(e) => setText({ outline: e.target.checked })} />테두리</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.text.shadow} onChange={(e) => setText({ shadow: e.target.checked })} />그림자</label>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
            <div className="text-sm font-bold text-white">📐 크기·결과</div>
            <div className="flex flex-wrap gap-2">{(Object.keys(RATIOS) as RatioKey[]).map((k) => <button key={k} type="button" className={chip(s.ratio === k)} onClick={() => setS({ ...s, ratio: k })}>{RATIOS[k].label}</button>)}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
              <span>결과</span>
              {(["both", "mp4", "webp"] as Output[]).map((o) => <button key={o} type="button" className={chip(s.output === o)} onClick={() => setS({ ...s, output: o })}>{o === "both" ? "MP4 + WebP" : o === "mp4" ? "MP4만" : "WebP만(상세페이지)"}</button>)}
              <span className="ml-2">MP4 초당 장면</span>
              <select className="rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-1" value={s.fps} onChange={(e) => setS({ ...s, fps: Number(e.target.value) })}>{FPS_OPTIONS.map((f) => <option key={f} value={f}>{f}fps</option>)}</select>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div>🎵 배경음악(선택, MP4에만 들어갑니다)</div>
              {music ? (
                <div className="flex flex-wrap items-center gap-3 text-gray-200">
                  <span className="truncate">{music.file.name}</span>
                  <label className="flex items-center gap-1">볼륨<input type="range" min={0.1} max={1} step={0.05} value={music.volume} onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) })} /></label>
                  <button type="button" className="text-rose-300 underline" onClick={() => { URL.revokeObjectURL(music.url); setMusic(null); }}>빼기</button>
                </div>
              ) : <input type="file" accept="audio/*" className="text-gray-300" onChange={(e) => { const f = e.target.files?.[0]; if (f) setMusic({ file: f, url: URL.createObjectURL(f), volume: 0.6 }); }} />}
              <div>⚠️ 내 음악은 상업적으로 써도 되는 곡인지(구매·라이선스 조건) 직접 확인해 주세요. WebP 움짤에는 소리가 들어가지 않습니다.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {busy ? <button type="button" onClick={() => abort.current?.abort()} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-4 py-2.5 text-sm font-bold text-rose-200"><Square className="h-4 w-4" />멈추기</button>
              : <button type="button" disabled={!photos.length && !batch.length} onClick={() => void run()} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-40"><Film className="h-4 w-4" />{batch.length > 1 ? `상품 ${batch.length}개 만들기` : "영상 만들기"}</button>}
            {busy && <span className="text-xs text-gray-300">{busy} — 이 탭을 열어 두세요</span>}
          </div>

          {results.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#161b22] p-4">
              <div className="flex items-center justify-between"><div className="text-sm font-bold text-white">📥 결과 {results.length}개</div>{results.length > 1 && <button type="button" onClick={zipAll} className="text-xs font-bold text-amber-300 underline">ZIP으로 모두 받기</button>}</div>
              {results.map((r) => (
                <div key={r.url} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0d1117] px-3 py-2 text-xs text-gray-200">
                  <span>{r.name} · {mb(r.bytes)}{r.note ? ` · ${r.note}` : ""}</span>
                  <a href={r.url} download={r.name} className="inline-flex items-center gap-1 font-bold text-amber-300"><Download className="h-3.5 w-3.5" />받기</a>
                </div>
              ))}
              <div className="text-[11px] text-gray-400">상세페이지 편집기(스마트스토어·쿠팡 등)에는 WebP 파일을 이미지처럼 올리면 움직입니다. GIF가 꼭 필요하면 MP4를 「영상 → GIF 변환」에 넣어 주세요.</div>
            </div>
          )}
        </section>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="mx-auto overflow-hidden rounded-xl border border-[#30363d] bg-black" style={{ aspectRatio: `${W} / ${H}`, maxWidth: s.ratio === "vertical" ? 240 : 300 }}>
            <canvas ref={canvas} width={W} height={H} className="h-full w-full" aria-label="미리보기" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!photos.length} onClick={() => setPlaying((p) => !p)} className="inline-flex items-center gap-1 rounded-lg bg-[#30363d] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? "멈춤" : "미리보기"}</button>
            <input type="range" className="flex-1" min={0} max={total} step={0.05} value={Math.min(t, total)} onChange={(e) => { setPlaying(false); tRef.current = Number(e.target.value); setT(tRef.current); }} aria-label="미리보기 위치" />
          </div>
          <p className="text-center text-[11px] text-gray-400">{t.toFixed(1)} / {total.toFixed(1)}초 · {W}×{H}{batch.length ? ` · 미리보기는 첫 상품(${batch[0].code})` : ""}</p>
        </aside>
      </div>
    </div>
  );
}
