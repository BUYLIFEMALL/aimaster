"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Maximize2, Plus, RefreshCw, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Aspect, AspectOrOriginal, ComicLang, ComicStyle, Kind, ModelLevel, SynthBackground } from "@/lib/bnc/types";
import { ASPECTS, BUCKET, KIND_LABEL, MAX_SOURCES } from "@/lib/bnc/types";
import { CATEGORIES, PROCESSES, STYLES } from "@/lib/bnc/styles";
import { ACCEPT_ATTR, FORMAT_HELP, detectImage, sizeError } from "@/lib/bnc/paths";
import { MaskEditor } from "./MaskEditor";
import { GraphicCard } from "./GraphicCard";
import { PresetRow } from "./PresetRow";
import type { ComicPreset, EditPreset, Preset, RestorePreset } from "@/lib/bnc/presets";
import { checkImageFile } from "@/lib/imageFileCheck";
import { presetIdForSize } from "@/lib/bnc/postPresets";
import { percentAt } from "@/lib/bnc/compare";

// 이미지 변환 스튜디오(브라우저 처리)로 결과를 넘겨 형식·크기를 바꾼다(v1.14)
const CONVERT_URL = "https://image-convert-studio.buylife.xyz/convert";
// v1.17: 결과를 시네마틱 스토리보드 참고 이미지로(받는 쪽이 banana-canvas-files 서명 주소만 받음)
const STORYBOARD_URL = "https://cinematic-storyboard-studio.buylife.xyz/studio";
// 변환 스튜디오 v1.13 ?preset= — 결과 비율이 게시처 규격과 맞으면 그 규격으로 바로 받게 한다(공용 기준 코드 post-presets 사본)
function convertPreset(w: number, h: number): string {
  const id = presetIdForSize(w, h);
  return id ? `&preset=${id}` : "";
}

interface Img { path: string; url: string; name: string }
interface Out { path: string; url: string | null; w: number; h: number; text?: string; mime?: string }
interface Result { id: string; kind: Kind; title: string; outputs: Out[]; model: string; warning: string | null }
interface ApiErr { error?: string; needKey?: boolean; expired?: boolean }

async function api<T>(url: string, method: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; needKey: boolean; expired: boolean }> {
  try {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json().catch(() => ({}))) as T & ApiErr;
    if (!res.ok) return { ok: false, error: data.error ?? "요청을 처리하지 못했습니다.", needKey: !!data.needKey, expired: !!data.expired };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", needKey: false, expired: false };
  }
}

async function saveImage(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } catch { window.open(url, "_blank", "noopener"); }
}

function AspectPick({ value, onChange, withOriginal, options }: { value: AspectOrOriginal; onChange: (a: AspectOrOriginal) => void; withOriginal?: boolean; options?: Aspect[] }) {
  const list: AspectOrOriginal[] = [...(withOriginal ? (["original"] as const) : []), ...(options ?? ASPECTS)];
  return (
    <div className="bc-seg" role="group" aria-label="종횡비">
      {list.map((a) => <button key={a} type="button" aria-pressed={value === a} onClick={() => onChange(a)}>{a === "original" ? "원본 비율" : a}</button>)}
    </div>
  );
}

/** 원본과 결과를 겹쳐 슬라이더로 비교(포토 리메이크에서 옮김, v1.12). 비율이 달라도 두 이미지를 같은 틀 안에 맞춰 보여 준다. */
function Compare({ before, after, w, h }: { before: string; after: string; w: number; h: number }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  // v1.23: 그림 위를 직접 끌어 선 옮기기 — 위치 계산은 공용 기준 코드 compare-slider 사본
  const moveTo = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); setPos(percentAt(e.clientX, r.left, r.width)); };
  return (
    <div className="bc-compare-wrap">
      <div
        className="bc-compare"
        style={{ aspectRatio: w && h ? `${w} / ${h}` : undefined }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); moveTo(e); }}
        onPointerMove={(e) => { if (dragging) moveTo(e); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="완성 이미지" />
        <div className="bc-compare-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before} alt="원본 이미지" />
        </div>
        <span className="bc-compare-label left">원본</span><span className="bc-compare-label right">완성</span>
        <span className="bc-compare-divider" style={{ left: `${pos}%` }} />
      </div>
      <label className="bc-compare-slider">원본과 완성 비교
        <input type="range" min={0} max={100} value={pos} aria-label="원본과 완성 비교" onChange={(e) => setPos(Number(e.target.value))} />
      </label>
    </div>
  );
}

/** 작업 카드: 아이콘·제목·한 줄 설명·"원본 필요" 표시를 한 모양으로 통일 */
function Card({ icon, title, hint, needsImage, locked, children, id }: { icon: string; title: string; hint: string; needsImage?: boolean; locked?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <section className={`card bc-card${locked ? " locked" : ""}`} id={id}>
      <header>
        <h2><span aria-hidden>{icon}</span> {title}</h2>
        {needsImage && <span className={`bc-need${locked ? " on" : ""}`}>{locked ? "원본 이미지 필요" : "원본 이미지 사용"}</span>}
      </header>
      <p className="bc-hint">{hint}</p>
      {children}
    </section>
  );
}

export function Studio({ fromId, fromIndex, importUrl, initialIdea }: { fromId?: string; fromIndex?: number; importUrl?: string; initialIdea?: string }) {
  const [model, setModel] = useState<ModelLevel>("flash");
  const [base, setBase] = useState<Img | null>(null);
  const [sources, setSources] = useState<Img[]>([]);
  const [busy, setBusy] = useState<"" | "upload" | "suggest" | Kind>("");
  const [error, setError] = useState<{ text: string; needKey: boolean } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [maskMode, setMaskMode] = useState(false);
  const [over, setOver] = useState(false);

  // 이미지 생성
  const [idea, setIdea] = useState(initialIdea ?? "");
  // v1.24: 다른 프로그램이 보낸 아이디어로 열리면 「이미지 생성」 카드로 내려가 테두리를 잠깐 강조(한 번만)
  useEffect(() => {
    if (!initialIdea) return;
    const el = document.getElementById("card-generate");
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t0 = window.setTimeout(() => {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      el.classList.add("bc-flash");
    }, 150);
    const t1 = window.setTimeout(() => el.classList.remove("bc-flash"), 2600);
    return () => { window.clearTimeout(t0); window.clearTimeout(t1); };
  }, [initialIdea]);
  const [category, setCategory] = useState("default");
  const [genAspect, setGenAspect] = useState<Aspect>("1:1");
  // 편집
  const [processes, setProcesses] = useState<string[]>([]);
  const [style, setStyle] = useState("");
  const [custom, setCustom] = useState("");
  const [upscaleF, setUpscaleF] = useState<2 | 4>(2);
  // 합성
  const [synthPrompt, setSynthPrompt] = useState("");
  const [synthAspect, setSynthAspect] = useState<AspectOrOriginal>("original");
  const [sourceNotes, setSourceNotes] = useState<Record<string, string>>({});
  const [synthBg, setSynthBg] = useState<SynthBackground>("auto");
  // 옛 사진 복원(포토 리메이크에서 옮김)
  const [repairOn, setRepairOn] = useState(true);
  const [colorizeOn, setColorizeOn] = useState(true);
  const [restoreUp, setRestoreUp] = useState<0 | 2 | 4>(0);
  const [restoreAspect, setRestoreAspect] = useState<AspectOrOriginal>("original");
  const [restoreNote, setRestoreNote] = useState("");
  // 결과 비교용: 실행할 때 쓴 원본
  const [resultBase, setResultBase] = useState<string | null>(null);
  // 빠른 작업 / 스페셜
  const [planAspect, setPlanAspect] = useState<Aspect>("4:3");
  // 부분 수정 지시·비율 확장(올인원 그래픽에서 옮김, v1.13)
  const [inpaintNote, setInpaintNote] = useState("");
  const [expandAspect, setExpandAspect] = useState<Aspect>("16:9");
  const [age, setAge] = useState("");
  const [albumAspect, setAlbumAspect] = useState<Aspect>("16:9");
  const [comicStyle, setComicStyle] = useState<ComicStyle>("noir");
  const [comicLang, setComicLang] = useState<ComicLang>("ko");
  const [comicText, setComicText] = useState("");
  const [comicAspect, setComicAspect] = useState<Aspect>("4:3");
  const [storyIdea, setStoryIdea] = useState("");
  const [dish, setDish] = useState("");
  // 내 작업 레시피(v1.18) · 이 컷만 다시(v1.18)
  const [presets, setPresets] = useState<Preset[]>([]);
  const [recutting, setRecutting] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const srcRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const basePathRef = useRef<string | null>(null);
  basePathRef.current = base?.path ?? null;

  const fail = (r: { error: string; needKey: boolean }) => setError({ text: r.error, needKey: r.needKey });

  // 기록에서 "이어서 편집"으로 들어온 경우
  useEffect(() => {
    if (!fromId) return;
    (async () => {
      const r = await api<{ item: { outputs: Out[] } }>(`/api/history/${fromId}`, "GET");
      if (!r.ok) { fail(r); return; }
      const o = r.data.item.outputs.filter((x) => x.path && x.url)[fromIndex ?? 0];
      if (o?.url) setBase({ path: o.path, url: o.url, name: "result" });
    })();
  }, [fromId, fromIndex]);

  // 다른 프로그램(AI 이미지 스튜디오 v1.14, AI 인물사진 v1.16)에서 「바나나 캔버스로 보내 편집」으로 들어온 경우
  useEffect(() => {
    if (!importUrl) return;
    (async () => {
      setBusy("upload");
      const r = await api<{ path: string; url: string | null }>("/api/import", "POST", { url: importUrl });
      setBusy("");
      if (!r.ok) { fail(r); return; }
      if (r.data.url) setBase({ path: r.data.path, url: r.data.url, name: "imported" });
      window.history.replaceState(null, "", "/studio");
    })();
  }, [importUrl]);

  useEffect(() => {
    void api<{ items: Preset[] }>("/api/presets", "GET").then((r) => { if (r.ok) setPresets(r.data.items); });
  }, []);

  const dropTemp = useCallback((path: string | null) => {
    if (path && path.includes("/in/")) void fetch(`/api/upload?path=${encodeURIComponent(path)}`, { method: "DELETE", keepalive: true }).catch(() => {});
  }, []);

  async function uploadFile(file: File): Promise<Img | null> {
    const det = detectImage(file.name, file.type);
    if (!det) { setError({ text: `지원하지 않는 형식입니다. ${FORMAT_HELP}만 올릴 수 있습니다.`, needKey: false }); return null; }
    const big = sizeError(file.size);
    if (big) { setError({ text: big, needKey: false }); return null; }
    // 깨진 사진은 서버에 올리기 전에 막는다(공용 image-file-check — 브라우저 안에서 풀어 보기). 마스크(PNG)도 같은 길이라 함께 검사됨
    const check = await checkImageFile(file);
    if (!check.ok) { setError({ text: check.message, needKey: false }); return null; }
    const sign = await api<{ path: string; token: string }>("/api/upload", "POST", { name: file.name, mime: det.mime, size: file.size });
    if (!sign.ok) { fail(sign); return null; }
    let upErr: unknown = null;
    try { ({ error: upErr } = await createClient().storage.from(BUCKET).uploadToSignedUrl(sign.data.path, sign.data.token, file, { contentType: det.mime })); }
    catch (e) { upErr = e; }
    if (upErr) { setError({ text: "파일 업로드에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.", needKey: false }); return null; }
    return { path: sign.data.path, url: URL.createObjectURL(file), name: file.name };
  }

  async function pickBase(file: File | undefined | null) {
    if (!file) return;
    setError(null); setBusy("upload");
    let img: Img | null;
    try { img = await uploadFile(file); } finally { setBusy(""); } // 예외가 나도 「업로드 중…」에 멈추지 않게
    if (!img) return;
    dropTemp(basePathRef.current);
    setBase(img); setResult(null); setMaskMode(false);
  }

  async function addSource(file: File | undefined | null) {
    if (!file) return;
    if (sources.length >= MAX_SOURCES) { setError({ text: `합성 소스는 최대 ${MAX_SOURCES}장까지 추가할 수 있습니다.`, needKey: false }); return; }
    setError(null); setBusy("upload");
    let img: Img | null;
    try { img = await uploadFile(file); } finally { setBusy(""); }
    if (img) setSources((s) => [...s, img]);
  }

  function clearBase() {
    dropTemp(base?.path ?? null);
    for (const s of sources) dropTemp(s.path);
    setBase(null); setSources([]); setResult(null); setMaskMode(false);
  }

  async function run(kind: Kind, extra: Record<string, unknown> = {}) {
    setError(null); setBusy(kind); setResult(null);
    const usedBase = base?.url ?? null;
    const r = await api<Result>("/api/run", "POST", {
      params: { kind, model, base: base?.path, sources: sources.map((s) => s.path), ...extra },
    });
    setBusy("");
    if (!r.ok) {
      fail(r);
      if (r.expired) { setBase(null); setSources([]); }
      return;
    }
    setResult(r.data);
    setResultBase(usedBase);
    // 좁은 화면(결과가 아래쪽)에서만 결과로 이동
    if (window.innerWidth < 1100) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function suggest(type: "generate" | "edit" | "synthesis" | "story" | "recipe", set: (t: string) => void) {
    setError(null); setBusy("suggest");
    const r = await api<{ text: string }>("/api/suggest", "POST", {
      type, base: base?.path, sources: sources.map((s) => s.path), prompt: type === "generate" ? idea : custom,
      category, processes, style, aspect: synthAspect,
      sourceNotes: sources.map((s) => sourceNotes[s.path] ?? ""), background: synthBg,
    });
    setBusy("");
    if (!r.ok) { fail(r); return; }
    set(r.data.text);
  }

  async function runInpaint(mask: Blob) {
    setError(null); setBusy("inpaint");
    const m = await uploadFile(new File([mask], "mask.png", { type: "image/png" }));
    if (!m) { setBusy(""); return; }
    setBusy("");
    await run("inpaint", { mask: m.path, prompt: inpaintNote });
    setMaskMode(false);
    dropTemp(m.path);
  }

  // 스토리 컷·레시피 단계 한 장만 다시 만든다(본인 키로 이미지 1장)
  async function recut(i: number) {
    if (!result || recutting !== null) return;
    setError(null); setRecutting(i);
    const r = await api<{ index: number; model: string; output: Out }>("/api/run/recut", "POST", { id: result.id, index: i });
    setRecutting(null);
    if (!r.ok) { fail(r); return; }
    setResult((cur) => (cur && cur.id === result.id ? { ...cur, model: r.data.model, outputs: cur.outputs.map((o, k) => (k === r.data.index ? r.data.output : o)) } : cur));
  }

  function useAsBase(o: Out) {
    if (!o.url || !o.path) return;
    dropTemp(basePathRef.current);
    setBase({ path: o.path, url: o.url, name: "result" });
    setResult(null);
    document.getElementById("source")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const working = busy !== "" && busy !== "suggest" && busy !== "upload";
  const disabled = busy !== "" || recutting !== null;
  const noBase = !base;
  const editReady = processes.length > 0 || !!style || !!custom.trim();
  const toggleProcess = (id: string) => setProcesses((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const estimate = busy === "story" || busy === "recipe" ? "이미지 8장 안팎을 생성합니다. 1~2분 걸릴 수 있습니다." : "보통 10~30초 걸립니다.";

  return (
    <div className="bc">
      {error && (
        <div className="lp-alert" role="alert">
          <span>{error.text}{error.needKey && <> <a href="/settings" style={{ textDecoration: "underline" }}>API키등록·플랫폼연동 열기</a></>}</span>
          <button type="button" aria-label="닫기" onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <nav className="bc-nav-chips" aria-label="작업 바로가기">
        {/* v1.14: 카드가 많아져 「만들기 / 고치기 / 스페셜」로 묶음 */}
        <span className="bc-nav-group"><b>만들기</b>
          <a href="#card-generate">✨ 생성</a>
          <a href="#card-graphic">📐 템플릿 그래픽</a>
          <a href="#card-story">🎞️ 스토리·레시피</a>
        </span>
        <span className="bc-nav-group"><b>고치기</b>
          <a href="#source">🖼️ 원본</a>
          <a href="#card-restore">🕰️ 옛 사진 복원</a>
          <a href="#card-edit">🛠️ 편집</a>
          <a href="#card-composite">🧩 합성</a>
          <a href="#card-quick">⚡ 빠른 작업</a>
        </span>
        <span className="bc-nav-group"><b>스페셜</b>
          <a href="#card-album">📖 인생 앨범</a>
          <a href="#card-comic">💬 만화 패널</a>
        </span>
        <a href="#result" style={{ background: "var(--brand)", borderColor: "var(--foreground)", color: "var(--brand-ink)", fontWeight: 800 }}>🌟 결과 보기</a>
      </nav>

      <div className="bc-board">
        {/* ───── 1열: 원본 · 생성 · 빠른 작업 · 스토리/레시피 ───── */}
        <div className="bc-col">
          <section className="card bc-card" id="source">
            <header><h2><span aria-hidden>🖼️</span> 원본 이미지</h2><span className="bc-need on">모든 작업의 출발점</span></header>
            {maskMode && base ? (
              <MaskEditor src={base.url} busy={busy === "inpaint" || busy === "upload"} onApply={(m) => void runInpaint(m)} onCancel={() => setMaskMode(false)} />
            ) : !base ? (
              <button
                type="button" className={`bc-drop${over ? " over" : ""}`} disabled={disabled}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); void pickBase(e.dataTransfer.files?.[0]); }}
              >
                {busy === "upload" ? <Loader2 className="ls-spin" /> : <ImagePlus size={30} />}
                <strong>{busy === "upload" ? "업로드 중…" : "클릭하거나 이미지를 끌어다 놓으세요"}</strong>
                <small>{FORMAT_HELP}</small>
              </button>
            ) : (
              <div className="bc-base">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={base.url} alt="원본 이미지" onClick={() => setZoom(base.url)} />
                <div className="actions">
                  <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}>바꾸기</button>
                  <button type="button" disabled={disabled} onClick={clearBase}><Trash2 size={14} />삭제</button>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" hidden accept={ACCEPT_ATTR} onChange={(e) => { void pickBase(e.target.files?.[0]); e.target.value = ""; }} />
            <label className="bc-field" style={{ marginTop: 10 }}>AI 모델
              <select value={model} onChange={(e) => setModel(e.target.value === "pro" ? "pro" : "flash")} disabled={disabled}>
                <option value="flash">Nano Banana — 빠름(기본)</option>
                <option value="pro">Nano Banana Pro — 정밀</option>
              </select>
            </label>
            <p className="bc-privacy">올린 이미지는 1시간 안에 자동 삭제됩니다. 본인 사진 또는 사용 동의를 받은 사진만 올려 주세요.</p>
          </section>

          <Card id="card-generate" icon="✨" title="이미지 생성" hint="아이디어만 입력하면 새 이미지를 만듭니다. 원본 이미지가 없어도 됩니다.">
            <textarea rows={3} value={idea} maxLength={600} onChange={(e) => setIdea(e.target.value)} placeholder="예: 우주를 나는 고양이" disabled={disabled} aria-label="이미지 아이디어" />
            {/* v1.24: 다른 프로그램이 보낸 아이디어 — 채우기만 하고 자동 생성은 하지 않음 */}
            {initialIdea && idea === initialIdea && <p className="bc-hint" data-idea-from-link>다른 프로그램에서 보낸 아이디어를 채웠습니다. 확인한 뒤 [이미지 생성]을 눌러 주세요.</p>}
            <div className="bc-row2">
              <label className="bc-field">카테고리
                <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={disabled}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <AspectPick value={genAspect} onChange={(a) => setGenAspect(a as Aspect)} />
            <div className="bc-btns">
              <button type="button" className="bc-suggest" disabled={disabled || !idea.trim()} onClick={() => void suggest("generate", setIdea)}><Sparkles size={14} />{busy === "suggest" ? "제안 중…" : "프롬프트 제안"}</button>
              <button type="button" className="primary" disabled={disabled || !idea.trim()} onClick={() => void run("generate", { prompt: idea, category, aspect: genAspect })}><Wand2 size={14} />이미지 생성</button>
            </div>
          </Card>

          <GraphicCard disabled={disabled} hasBase={!noBase} onRun={(extra) => void run("graphic", extra)} onError={fail} presets={presets} onPresetsChange={setPresets} />

          <Card id="card-quick" icon="⚡" title="빠른 작업" hint="버튼 한 번으로 끝나는 변환입니다." needsImage locked={noBase}>
            <div className="bc-quick">
              <button type="button" disabled={disabled || noBase} onClick={() => void run("bgremove")}>✂️ 배경 제거<small>투명 PNG</small></button>
              <button type="button" disabled={disabled || noBase} onClick={() => setMaskMode(true)}>🎨 {inpaintNote.trim() ? "부분 수정" : "부분 삭제"}<small>{inpaintNote.trim() ? "칠한 곳을 지시대로 바꾸기" : "브러시로 칠해 지우기"}</small></button>
              <button type="button" disabled={disabled || noBase} onClick={() => void run("idphoto")}>🆔 증명사진 변환<small>정장·흰 배경·3:4</small></button>
              <button type="button" disabled={disabled || noBase} onClick={() => void run("floorplan", { aspect: planAspect })}>🏠 평면도를 3D로<small>비율 {planAspect}</small></button>
            </div>
            <AspectPick value={planAspect} onChange={(a) => setPlanAspect(a as Aspect)} options={["4:3", "16:9", "1:1"]} />
            {/* v1.16: 증명사진은 한 번 변환만 — 국가별 규격·머리 비율 검사는 전문 프로그램으로 안내 */}
            <p className="bc-hint">🆔 여권·비자·운전면허 등 <b>국가별 규격(21종)과 머리 비율 검사</b>가 필요하면{" "}
              <a href="https://portrait-photo.buylife.xyz/studio" target="_blank" rel="noopener noreferrer">AI 인물사진</a>에서 만드세요.</p>
            <input value={inpaintNote} maxLength={300} onChange={(e) => setInpaintNote(e.target.value)} placeholder="부분 수정 지시 (선택, 예: 칠한 곳에 커피잔 추가) — 비우면 지우기" disabled={disabled || noBase} aria-label="부분 수정 지시" />
            <div className="bc-btns">
              <AspectPick value={expandAspect} onChange={(a) => setExpandAspect(a as Aspect)} options={["16:9", "9:16", "1:1", "4:3", "3:4"]} />
              <button type="button" disabled={disabled || noBase} onClick={() => void run("expand", { aspect: expandAspect })}>↔️ 비율 확장</button>
            </div>
          </Card>

          <Card id="card-story" icon="🎞️" title="연속 스토리 · 이미지 레시피" hint="글자 없이 이미지로만 이야기하거나, 요리 과정을 단계별 사진으로 만듭니다.">
            <textarea rows={2} value={storyIdea} maxLength={600} onChange={(e) => setStoryIdea(e.target.value)} placeholder="스토리 아이디어 (예: 숲길을 따라 걷다 작은 오두막을 발견하는 여행자 이야기)" disabled={disabled} aria-label="스토리 아이디어" />
            <div className="bc-btns">
              <button type="button" className="bc-suggest" disabled={disabled || noBase} onClick={() => void suggest("story", setStoryIdea)}><Sparkles size={14} />이미지에서 제안</button>
              <button type="button" className="bc-story" disabled={disabled || !storyIdea.trim()} onClick={() => void run("story", { prompt: storyIdea })}>스토리 8컷 생성</button>
            </div>
            <input value={dish} maxLength={100} onChange={(e) => setDish(e.target.value)} placeholder="요리 이름 (예: 마카롱 굽는 법)" disabled={disabled} aria-label="요리 이름" />
            <div className="bc-btns">
              <button type="button" className="bc-suggest" disabled={disabled || noBase} onClick={() => void suggest("recipe", setDish)}><Sparkles size={14} />사진에서 요리명 제안</button>
              <button type="button" className="bc-recipe" disabled={disabled || !dish.trim()} onClick={() => void run("recipe", { prompt: dish })}>레시피 생성</button>
            </div>
          </Card>
        </div>

        {/* ───── 2열: 편집 · 합성 · 인생 앨범 · 만화 ───── */}
        <div className="bc-col">
          <Card id="card-restore" icon="🕰️" title="옛 사진 복원" hint="원래 구도·얼굴·시대를 그대로 지키며 긁힘·빛바램을 고치고 흑백에 자연스러운 색을 입힙니다. 결과는 원본과 비교해 볼 수 있습니다." needsImage locked={noBase}>
            <div className="bc-seg" role="group" aria-label="복원 방식">
              <button type="button" aria-pressed={repairOn} disabled={disabled || noBase} onClick={() => setRepairOn((v) => !v)}>손상 복원</button>
              <button type="button" aria-pressed={colorizeOn} disabled={disabled || noBase} onClick={() => setColorizeOn((v) => !v)}>흑백 컬러화</button>
            </div>
            <div className="bc-seg" role="group" aria-label="완성 크기">
              <button type="button" aria-pressed={restoreUp === 0} disabled={disabled || noBase} onClick={() => setRestoreUp(0)}>기본 크기</button>
              <button type="button" aria-pressed={restoreUp === 2} disabled={disabled || noBase} onClick={() => setRestoreUp(2)}>실제 2배 확대</button>
              <button type="button" aria-pressed={restoreUp === 4} disabled={disabled || noBase} onClick={() => setRestoreUp(4)}>실제 4배 확대</button>
            </div>
            <AspectPick value={restoreAspect} onChange={setRestoreAspect} withOriginal />
            <textarea rows={2} value={restoreNote} maxLength={600} onChange={(e) => setRestoreNote(e.target.value)} placeholder="추가 요청 (선택, 예: 얼굴과 옷 형태는 그대로 두고 빛바랜 부분만 다듬어 주세요)" disabled={disabled || noBase} aria-label="복원 추가 요청" />
            <p className="bc-hint">확대는 AI 결과를 서버에서 실제 픽셀로 키웁니다(긴 변 최대 8,192px).</p>
            <PresetRow kind="restore" presets={presets} onChange={setPresets} disabled={disabled} onError={(text) => setError({ text, needKey: false })}
              current={(): RestorePreset => ({ repair: repairOn, colorize: colorizeOn, upscale: restoreUp, aspect: restoreAspect, prompt: restoreNote })}
              onApply={(x) => { const r = x as RestorePreset; setRepairOn(r.repair); setColorizeOn(r.colorize); setRestoreUp(r.upscale); setRestoreAspect(r.aspect); setRestoreNote(r.prompt); }} />
            <button type="button" className="primary" disabled={disabled || noBase}
              onClick={() => void run("restore", { repair: repairOn, colorize: colorizeOn, upscale: restoreUp, aspect: restoreAspect, prompt: restoreNote })}>사진 복원하기</button>
          </Card>

          <Card id="card-edit" icon="🛠️" title="이미지 편집" hint="처리 방식과 스타일을 고르고 필요하면 추가 요청을 적습니다." needsImage locked={noBase}>
            <div>
              <small className="bc-label">처리 방식 (복수 선택)</small>
              <div className="bc-seg">
                {PROCESSES.map((p) => <button key={p.id} type="button" aria-pressed={processes.includes(p.id)} disabled={disabled || noBase} onClick={() => toggleProcess(p.id)}>{p.name}</button>)}
                {processes.includes("upscale") && (
                  <>
                    <button type="button" aria-pressed={upscaleF === 2} onClick={() => setUpscaleF(2)}>2x</button>
                    <button type="button" aria-pressed={upscaleF === 4} onClick={() => setUpscaleF(4)}>4x</button>
                  </>
                )}
              </div>
            </div>
            <PresetRow kind="edit" presets={presets} onChange={setPresets} disabled={disabled} onError={(text) => setError({ text, needKey: false })}
              current={(): EditPreset => ({ processes, style, prompt: custom, upscale: upscaleF })}
              onApply={(x) => { const e = x as EditPreset; setProcesses(e.processes); setStyle(e.style); setCustom(e.prompt); setUpscaleF(e.upscale); }} />
            <label className="bc-field">스타일 변환
              <select value={style} onChange={(e) => setStyle(e.target.value)} disabled={disabled || noBase}>
                <option value="">스타일을 선택하세요…</option>
                {STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <textarea rows={3} value={custom} maxLength={600} onChange={(e) => setCustom(e.target.value)} placeholder="추가 요청 (예: 배경에 은하수를 추가해줘)" disabled={disabled || noBase} aria-label="추가 요청" />
            <div className="bc-btns">
              <button type="button" className="bc-suggest" disabled={disabled || noBase || !editReady} onClick={() => void suggest("edit", setCustom)}><Sparkles size={14} />{busy === "suggest" ? "제안 중…" : "프롬프트 제안"}</button>
              <button type="button" className="primary" disabled={disabled || noBase || !editReady}
                onClick={() => void run("edit", { processes, style: style || undefined, prompt: custom, upscale: processes.includes("upscale") ? upscaleF : 0 })}>편집 실행</button>
            </div>
          </Card>

          <Card id="card-composite" icon="🧩" title="이미지 합성" hint="원본에 소스 이미지(최대 5장)의 요소를 합칩니다. 원본 인물 얼굴은 유지됩니다." needsImage locked={noBase}>
            <div className="bc-sources">
              {sources.map((s, i) => (
                <div key={s.path} className="bc-src">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={`소스 ${i + 1}`} />
                  <button type="button" aria-label={`소스 ${i + 1} 삭제`} onClick={() => { dropTemp(s.path); setSources((x) => x.filter((y) => y.path !== s.path)); }}><X size={12} /></button>
                </div>
              ))}
              <button type="button" className="bc-addsrc" disabled={disabled || noBase || sources.length >= MAX_SOURCES} onClick={() => srcRef.current?.click()}><Plus size={16} />소스 추가 ({sources.length}/{MAX_SOURCES})</button>
            </div>
            <input ref={srcRef} type="file" hidden accept={ACCEPT_ATTR} onChange={(e) => { void addSource(e.target.files?.[0]); e.target.value = ""; }} />
            {sources.length > 0 && (
              <div className="bc-notes">
                {sources.map((s, i) => (
                  <label key={s.path} className="bc-field">{i + 1}번째 소스 지시 <small>(선택)</small>
                    <input value={sourceNotes[s.path] ?? ""} maxLength={300} disabled={disabled} placeholder="예: 오른손에 들기, 머리에 착용"
                      onChange={(e) => setSourceNotes((n) => ({ ...n, [s.path]: e.target.value }))} />
                  </label>
                ))}
              </div>
            )}
            <label className="bc-field">배경 처리
              <select value={synthBg} onChange={(e) => setSynthBg(e.target.value as SynthBackground)} disabled={disabled || noBase}>
                <option value="auto">자동(원본 배경이 없으면 새로 만듦)</option>
                <option value="keep">원본 배경 유지</option>
                <option value="change">합성 방식에 맞게 배경 변경</option>
              </select>
            </label>
            <textarea rows={2} value={synthPrompt} maxLength={600} onChange={(e) => setSynthPrompt(e.target.value)} placeholder="합성 방식 (예: 원본 인물에게 소스 갑옷을 입혀주세요)" disabled={disabled || noBase} aria-label="합성 방식" />
            <AspectPick value={synthAspect} onChange={setSynthAspect} withOriginal />
            <div className="bc-btns">
              <button type="button" className="bc-suggest" disabled={disabled || noBase || !sources.length} onClick={() => void suggest("synthesis", setSynthPrompt)}><Sparkles size={14} />{busy === "suggest" ? "제안 중…" : "프롬프트 제안"}</button>
              <button type="button" className="primary" disabled={disabled || noBase || !sources.length || !synthPrompt.trim()} onClick={() => void run("synthesis", { prompt: synthPrompt, aspect: synthAspect, sourceNotes: sources.map((s) => sourceNotes[s.path] ?? ""), background: synthBg })}>합성 실행</button>
            </div>
          </Card>

          <Card id="card-album" icon="📖" title="인생 앨범 제작" hint="사진 속 인물의 유아기~70대 모습을 한 장의 앨범 콜라주로 만듭니다." needsImage locked={noBase}>
            <div className="bc-row2">
              <input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="현재 나이 (예: 25)" disabled={disabled || noBase} aria-label="현재 나이" />
            </div>
            <AspectPick value={albumAspect} onChange={(a) => setAlbumAspect(a as Aspect)} options={["16:9", "9:16", "1:1"]} />
            <button type="button" className="primary" disabled={disabled || noBase || !age.trim()} onClick={() => void run("lifealbum", { age: Number(age), aspect: albumAspect })}>앨범 제작 실행</button>
          </Card>

          <Card id="card-comic" icon="💬" title="만화 패널" hint="사진을 만화 한 컷으로 바꾸고 대사를 넣습니다." needsImage locked={noBase}>
            <div className="bc-seg">
              {([["noir", "느와르"], ["webtoon", "웹툰"], ["american", "미국 코믹스"]] as [ComicStyle, string][]).map(([v, l]) => <button key={v} type="button" aria-pressed={comicStyle === v} onClick={() => setComicStyle(v)}>{l}</button>)}
              <button type="button" aria-pressed={comicLang === "ko"} onClick={() => setComicLang("ko")}>한국어</button>
              <button type="button" aria-pressed={comicLang === "en"} onClick={() => setComicLang("en")}>영어</button>
            </div>
            <AspectPick value={comicAspect} onChange={(a) => setComicAspect(a as Aspect)} options={["4:3", "1:1", "16:9"]} />
            <PresetRow kind="comic" presets={presets} onChange={setPresets} disabled={disabled} onError={(text) => setError({ text, needKey: false })}
              current={(): ComicPreset => ({ comicStyle, comicLang, aspect: comicAspect })}
              onApply={(x) => { const c = x as ComicPreset; setComicStyle(c.comicStyle); setComicLang(c.comicLang); setComicAspect(c.aspect); }} />
            <textarea rows={2} value={comicText} maxLength={300} onChange={(e) => setComicText(e.target.value)} placeholder="대사나 캡션 (비워 두면 글자 없이)" disabled={disabled || noBase} aria-label="만화 대사" />
            <button type="button" className="primary" disabled={disabled || noBase} onClick={() => void run("comic", { comicStyle, comicLang, comicText, aspect: comicAspect })}>만화 패널 생성</button>
          </Card>
        </div>

        {/* ───── 3열: 결과(화면에 고정) ───── */}
        <aside className="bc-col bc-resultcol">
          <section className="card bc-card bc-result" id="result" ref={resultRef}>
            <header><h2><span aria-hidden>🌟</span> 결과</h2>{result && <span className="bc-need on">{KIND_LABEL[result.kind]}</span>}</header>
            {working && (
              <div className="bc-wait" role="status"><Loader2 className="ls-spin" size={18} />{KIND_LABEL[busy as Kind]} 중… {estimate}</div>
            )}
            {!working && !result && (
              <div className="bc-placeholder">
                <ImagePlus size={36} />
                <b>결과가 여기에 표시됩니다</b>
                <small>왼쪽·가운데에서 원하는 작업을 실행해 보세요. 모든 기능이 한 화면에 있습니다.</small>
              </div>
            )}
            {result && (
              <>
                <div className="bc-result-head"><small>{result.title} · 모델 {result.model}</small></div>
                {result.warning && <div className="notice warning" style={{ marginBottom: 10 }}>{result.warning}</div>}
                <div className={`bc-outs${result.outputs.length > 1 ? " multi" : ""}`}>
                  {result.outputs.map((o, i) => (
                    <figure key={`${o.path}-${i}`} className="bc-out">
                      {o.url && resultBase && result.outputs.length === 1
                        ? <Compare before={resultBase} after={o.url} w={o.w} h={o.h} />
                        : o.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={o.url} alt={`결과 ${i + 1}`} onClick={() => setZoom(o.url)} /> : <div className="bc-noimg">이미지를 만들지 못했습니다</div>}
                      {o.text && result.kind !== "comic" && <figcaption>{o.text}</figcaption>}
                      {(result.kind === "story" || result.kind === "recipe") && o.text && (
                        <div className="actions">
                          <button type="button" disabled={busy !== "" || recutting !== null} title="이 장면만 본인 키로 이미지 1장을 다시 만듭니다"
                            onClick={() => void recut(i)}>
                            {recutting === i ? <Loader2 className="ls-spin" size={13} /> : <RefreshCw size={13} />}
                            {recutting === i ? "다시 만드는 중…" : result.kind === "story" ? "이 컷만 다시" : "이 단계만 다시"}
                          </button>
                        </div>
                      )}
                      {o.url && (
                        <div className="actions">
                          <button type="button" onClick={() => void saveImage(o.url!, `banana_${result.kind}_${i + 1}${o.mime?.includes("jpeg") ? ".jpg" : ".png"}`)}><Download size={13} />다운로드</button>
                          <button type="button" onClick={() => setZoom(o.url)}><Maximize2 size={13} />크게 보기{o.w ? ` (${o.w}×${o.h})` : ""}</button>
                          <button type="button" onClick={() => useAsBase(o)}><RefreshCw size={13} />이 결과로 계속 편집</button>
                          <a className="button" href={`${CONVERT_URL}?src=${encodeURIComponent(o.url)}${convertPreset(o.w, o.h)}`} target="_blank" rel="noopener noreferrer">🔁 형식 바꾸기(WebP·PNG·JPG)</a>
                          <a className="button" href={`${STORYBOARD_URL}?src=${encodeURIComponent(o.url)}`} target="_blank" rel="noopener noreferrer" title="이 결과로 9컷 영화 스토리보드·영상 프롬프트 만들기(시네마틱 스토리보드)">🎬 스토리보드로</a>
                        </div>
                      )}
                    </figure>
                  ))}
                </div>
                <div className="actions" style={{ marginTop: 12 }}>
                  <a className="button" href="/history"><Star size={13} />결과 기록 보기</a>
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

      {zoom && (
        <div className="bc-zoom" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="확대 보기" onClick={(e) => e.stopPropagation()} />
          <button type="button" aria-label="닫기" onClick={() => setZoom(null)}><X size={20} /></button>
        </div>
      )}
    </div>
  );
}
