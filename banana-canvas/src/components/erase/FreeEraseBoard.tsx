"use client";
// 「🧽 무료 지우기(내 PC)」 — 공용 엔진 browser-free-erase로 회원 브라우저 안에서 지운다(서버 업로드·저장·키·비용 없음).
// 여러 장 목록 → 캔버스에서 칠하기/문구 찾기 → 지우기 → 같은 비율 복사·일괄 → ZIP. 원본은 바꾸지 않고 결과를 따로 둔다.
import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Brush, Copy, Download, Eraser, Eye, ImagePlus, RotateCcw, ScanText, Sparkles, Square, Trash2, Undo2 } from "lucide-react";
import { detectTextBoxes, eraseRegion, freeEraseBackend, loadFreeErase, maskFromImage, type FreeEraseProgress } from "@/lib/freeErase/engine";
import { FREE_ERASE_CACHE, FREE_ERASE_MODELS, fillBoxes } from "@/lib/freeErase/protocol";

const MAX_ITEMS = 50;
const PAINT = "rgb(236,72,153)";
type Status = "idle" | "working" | "done" | "error";
interface Item {
  id: string; name: string; url: string; w: number; h: number; checked: boolean;
  maskBlob: Blob | null; maskOn: boolean;
  result: { blob: Blob; url: string } | null;
  status: Status; error?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const baseName = (n: string) => n.replace(/\.[^.]+$/, "") || "image";
const toBlob = (c: HTMLCanvasElement, type = "image/png", q?: number) => new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), type, q));
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error("image")); im.src = url; });
}
const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : "처리하지 못했습니다. 다시 시도해 주세요.");

export function FreeEraseBoard() {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]); itemsRef.current = items;
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<"paint" | "erase">("paint");
  const [brush, setBrush] = useState(4);
  const [view, setView] = useState<"result" | "original">("result");
  const [undoCount, setUndoCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<FreeEraseProgress | null>(null);
  const [backend, setBackend] = useState<string | null>(null);
  /** AI 계산용 모델 파일이 이 브라우저에 저장돼 있는지(null: 아직 모름) */
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof caches === "undefined") return;
    caches.open(FREE_ERASE_CACHE).then((c) => c.match(FREE_ERASE_MODELS.lama.url)).then((r) => setSaved(Boolean(r))).catch(() => setSaved(null));
  }, []);
  const [batch, setBatch] = useState<{ done: number; total: number; label: string } | null>(null);
  const [fmt, setFmt] = useState<"png" | "jpg90" | "jpg85" | "jpg95">("png");
  const [width, setWidth] = useState<"orig" | "1000" | "860">("orig");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const undo = useRef<HTMLCanvasElement[]>([]);
  const drawing = useRef<{ last: [number, number] } | null>(null);
  const stop = useRef(false);
  const cur = items.find((i) => i.id === sel) ?? null;

  const patch = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  // 화면을 떠나면 만든 주소를 정리
  useEffect(() => () => { for (const i of itemsRef.current) { URL.revokeObjectURL(i.url); if (i.result) URL.revokeObjectURL(i.result.url); } }, []);

  async function ensureModel(kind: "lama" | "det") {
    const b = await loadFreeErase(kind, (p) => setProgress(p));
    setProgress(null);
    if (kind === "lama") { setBackend(b); setSaved(true); }
    return b;
  }

  /* ---------- 사진 올리기 ---------- */
  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const room = MAX_ITEMS - itemsRef.current.length;
    if (list.length > room) setNotice(`한 번에 최대 ${MAX_ITEMS}장까지 올릴 수 있어 ${Math.max(0, room)}장만 추가했습니다.`);
    const added: Item[] = [];
    for (const f of list.slice(0, Math.max(0, room))) {
      const url = URL.createObjectURL(f);
      try { const im = await loadImage(url); added.push({ id: uid(), name: f.name, url, w: im.naturalWidth, h: im.naturalHeight, checked: true, maskBlob: null, maskOn: false, result: null, status: "idle" }); }
      catch { URL.revokeObjectURL(url); setNotice(`「${f.name}」을(를) 읽지 못했습니다. JPG·PNG·WEBP로 다시 올려 주세요.`); }
    }
    if (!added.length) return;
    setItems((xs) => [...xs, ...added]);
    if (!sel) await select(added[0].id, added);
  }

  /* ---------- 캔버스(지울 곳 칠하기) ---------- */
  async function saveMask(): Promise<void> {
    const c = canvasRef.current, it = itemsRef.current.find((i) => i.id === sel);
    if (!c || !it) return;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let on = false; for (let i = 3; i < d.length; i += 16) if (d[i]) { on = true; break; }
    patch(it.id, { maskBlob: on ? await toBlob(c) : null, maskOn: on });
  }

  async function select(id: string, list = itemsRef.current) {
    if (id === sel) return;
    if (sel) await saveMask();
    const it = list.find((i) => i.id === id); if (!it) return;
    setSel(id); undo.current = []; setUndoCount(0);
  }

  // 고른 사진이 바뀌면 캔버스 크기를 맞추고 저장해 둔 칠한 곳을 다시 그린다(화면이 그려진 뒤)
  useEffect(() => {
    const it = itemsRef.current.find((i) => i.id === sel), c = canvasRef.current;
    if (!it || !c) return;
    let alive = true;
    c.width = it.w; c.height = it.h;
    const x = c.getContext("2d")!; x.clearRect(0, 0, it.w, it.h);
    if (it.maskBlob) void createImageBitmap(it.maskBlob).then((b) => { if (alive) x.drawImage(b, 0, 0); });
    return () => { alive = false; };
  }, [sel]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const c = e.currentTarget, r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  function pushUndo() {
    const c = canvasRef.current!; const copy = document.createElement("canvas");
    copy.width = c.width; copy.height = c.height; copy.getContext("2d")!.drawImage(c, 0, 0);
    undo.current.push(copy); if (undo.current.length > 15) undo.current.shift();
    setUndoCount(undo.current.length);
  }
  function stroke(a: [number, number], b: [number, number]) {
    const c = canvasRef.current!, x = c.getContext("2d")!;
    x.globalCompositeOperation = mode === "paint" ? "source-over" : "destination-out";
    x.strokeStyle = x.fillStyle = PAINT; x.lineCap = x.lineJoin = "round";
    x.lineWidth = (Math.min(c.width, c.height) * brush) / 100;
    x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    x.globalCompositeOperation = "source-over";
  }
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cur || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo(); const p = pos(e); drawing.current = { last: p }; stroke(p, p);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; const p = pos(e); stroke(drawing.current.last, p); drawing.current.last = p;
  };
  const onUp = () => { if (drawing.current) { drawing.current = null; void saveMask(); } };
  function undoOnce() {
    const prev = undo.current.pop(); const c = canvasRef.current; if (!prev || !c) return;
    const x = c.getContext("2d")!; x.clearRect(0, 0, c.width, c.height); x.drawImage(prev, 0, 0);
    setUndoCount(undo.current.length); void saveMask();
  }
  function clearMask() {
    const c = canvasRef.current; if (!c) return; pushUndo();
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height); void saveMask();
  }

  /* ---------- 계산(한 장) ---------- */
  const sourceUrl = (it: Item) => it.result?.url ?? it.url; // 결과가 있으면 이어서 지운다

  async function findTextOn(it: Item, paintOnCanvas: boolean): Promise<number> {
    await ensureModel("det");
    const im = await loadImage(sourceUrl(it));
    const boxes = await detectTextBoxes(im, it.w, it.h);
    if (paintOnCanvas && canvasRef.current) {
      pushUndo(); const x = canvasRef.current.getContext("2d")!; x.fillStyle = PAINT;
      for (const b of boxes) x.fillRect(b.x, b.y, b.w, b.h);
      await saveMask();
    } else if (boxes.length) {
      const mask = it.maskBlob ? await maskFromImage(it.maskBlob, it.w, it.h, "alpha") : new Uint8Array(it.w * it.h);
      fillBoxes(mask, it.w, it.h, boxes);
      const c = document.createElement("canvas"); c.width = it.w; c.height = it.h;
      const x = c.getContext("2d")!, d = x.createImageData(it.w, it.h);
      for (let i = 0; i < mask.length; i++) if (mask[i]) { d.data[i * 4] = 236; d.data[i * 4 + 1] = 72; d.data[i * 4 + 2] = 153; d.data[i * 4 + 3] = 255; }
      x.putImageData(d, 0, 0);
      patch(it.id, { maskBlob: await toBlob(c), maskOn: true });
    }
    return boxes.length;
  }

  async function eraseItem(it: Item, maskBlob: Blob): Promise<void> {
    patch(it.id, { status: "working", error: undefined });
    try {
      await ensureModel("lama");
      const [im, mask] = await Promise.all([loadImage(sourceUrl(it)), maskFromImage(maskBlob, it.w, it.h, "alpha")]);
      const out = await eraseRegion(im, mask, it.w, it.h);
      const blob = await toBlob(out);
      const fresh = itemsRef.current.find((x) => x.id === it.id);
      if (fresh?.result) URL.revokeObjectURL(fresh.result.url);
      patch(it.id, { result: { blob, url: URL.createObjectURL(blob) }, status: "done", maskBlob: null, maskOn: false });
      if (it.id === sel && canvasRef.current) { canvasRef.current.getContext("2d")!.clearRect(0, 0, it.w, it.h); undo.current = []; setUndoCount(0); }
      setBackend(freeEraseBackend());
    } catch (e) { patch(it.id, { status: "error", error: errText(e) }); throw e; }
  }

  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return; setBusy(label); setNotice("");
    try { await fn(); } catch (e) { console.warn("[free-erase]", (e as { raw?: string })?.raw ?? e); setNotice(errText(e)); } finally { setBusy(null); setProgress(null); }
  }

  const findHere = () => run("문구 찾기", async () => {
    if (!cur) return; const n = await findTextOn(cur, true);
    setNotice(n ? `글자 ${n}곳을 칠했습니다. 남길 글자는 지우개로 걷어낸 뒤 「지우기」를 누르세요.` : "찾은 글자가 없습니다. 세로쓰기·장식체는 놓칠 수 있으니 붓으로 칠해 주세요.");
  });
  const eraseHere = () => run("지우기", async () => {
    if (!cur) return; await saveMask();
    const it = itemsRef.current.find((i) => i.id === cur.id)!;
    if (!it.maskBlob) { setNotice("지울 곳을 먼저 칠하거나 「문구 찾기」를 눌러 주세요."); return; }
    await eraseItem(it, it.maskBlob); setView("result");
  });

  /* ---------- 여러 장 ---------- */
  const checked = items.filter((i) => i.checked);
  const sameRatio = (a: Item, b: Item) => Math.abs(a.w / a.h - b.w / b.h) < 0.01;

  const copyMask = () => run("마스크 복사", async () => {
    if (!cur || !canvasRef.current) return; await saveMask();
    const targets = checked.filter((t) => t.id !== cur.id && sameRatio(t, cur));
    const skipped = checked.filter((t) => t.id !== cur.id && !sameRatio(t, cur)).length;
    for (const t of targets) {
      const c = document.createElement("canvas"); c.width = t.w; c.height = t.h;
      c.getContext("2d")!.drawImage(canvasRef.current, 0, 0, t.w, t.h);
      patch(t.id, { maskBlob: await toBlob(c), maskOn: true });
    }
    setNotice(`지금 사진의 칠한 곳을 ${targets.length}장에 복사했습니다.${skipped ? ` 가로세로 비율이 다른 ${skipped}장은 건너뛰었습니다.` : ""}`);
  });

  const batchRun = (kind: "find" | "erase") => run(kind === "find" ? "선택 문구 찾기" : "선택 지우기", async () => {
    await saveMask(); stop.current = false;
    const list = itemsRef.current.filter((i) => i.checked && (kind === "find" || i.maskBlob));
    if (!list.length) { setNotice(kind === "erase" ? "칠한 곳이 있는 선택 사진이 없습니다." : "선택한 사진이 없습니다."); return; }
    let ok = 0, fail = 0; const t0 = performance.now();
    for (let k = 0; k < list.length; k++) {
      if (stop.current) break;
      const left = k ? Math.round(((performance.now() - t0) / k) * (list.length - k) / 1000) : null;
      setBatch({ done: k, total: list.length, label: left != null ? `남은 시간 약 ${left}초` : "준비 중" });
      const it = itemsRef.current.find((i) => i.id === list[k].id)!;
      try {
        if (kind === "find") { await findTextOn(it, it.id === sel); }
        else await eraseItem(it, it.maskBlob!);
        ok++;
      } catch { fail++; }
    }
    setBatch(null);
    if (sel) { const c = canvasRef.current, it = itemsRef.current.find((i) => i.id === sel); if (c && it) { const x = c.getContext("2d")!; x.clearRect(0, 0, c.width, c.height); if (it.maskBlob) x.drawImage(await createImageBitmap(it.maskBlob), 0, 0); } }
    setNotice(`${ok}장 완료${fail ? ` · ${fail}장 실패(목록에 표시)` : ""}${stop.current ? " · 중단했습니다(처리한 결과는 남아 있습니다)" : ""}.`);
  });

  const downloadZip = () => run("ZIP 만들기", async () => {
    const done = items.filter((i) => i.checked && i.result);
    if (!done.length) { setNotice("내려받을 결과가 없습니다. 먼저 지우기를 해 주세요."); return; }
    const zip = new JSZip(); const used = new Set<string>();
    for (const it of done) {
      let blob = it.result!.blob, ext = "png";
      const targetW = width === "orig" ? it.w : Math.min(it.w, Number(width));
      if (fmt !== "png" || targetW !== it.w) {
        const im = await loadImage(it.result!.url), th = Math.round((it.h * targetW) / it.w);
        const c = document.createElement("canvas"); c.width = targetW; c.height = th;
        const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, targetW, th); x.drawImage(im, 0, 0, targetW, th);
        if (fmt === "png") blob = await toBlob(c);
        else { blob = await toBlob(c, "image/jpeg", Number(fmt.slice(3)) / 100); ext = "jpg"; }
      }
      let name = `${baseName(it.name)}_지움.${ext}`; let n = 2; while (used.has(name)) name = `${baseName(it.name)}_지움_${n++}.${ext}`; used.add(name);
      zip.file(name, blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(out); a.download = `무료지우기_${done.length}장.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  function removeItem(id: string) {
    const it = items.find((i) => i.id === id); if (!it) return;
    URL.revokeObjectURL(it.url); if (it.result) URL.revokeObjectURL(it.result.url);
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (sel === id) setSel(null);
  }
  function resetResult() {
    if (!cur?.result) return; URL.revokeObjectURL(cur.result.url);
    patch(cur.id, { result: null, status: "idle" }); setView("original");
  }

  const shown = cur ? (view === "result" && cur.result ? cur.result.url : cur.url) : null;
  const mb = (n: number) => Math.round(n / 1048576);

  return (
    <div className="fe-wrap">
      <div className="card fe-intro">
        <div className="fe-intro-row">
          <span className="fe-badge">🆓 무료 · 내 PC 처리</span>
          <span className="fe-badge soft">사진이 서버로 올라가지 않음</span>
          {backend && <span className="fe-badge leaf">{backend === "webgpu" ? "⚡ 그래픽 가속(WebGPU)" : "🧮 CPU 계산"}</span>}
        </div>
        <div className="fe-model" id="model">
          <button type="button" className="fe-model-btn" disabled={Boolean(busy) || saved === true}
            onClick={() => void run("AI 계산용 모델 파일 받는 중…", async () => { await ensureModel("lama"); await ensureModel("det"); setNotice("AI 계산용 모델 파일을 이 브라우저에 저장했습니다. 이제 바로 지울 수 있습니다."); })}>
            {saved ? "✅ AI 계산용 모델 파일 저장됨" : `⬇ AI 계산용 모델 파일 받기 (약 ${mb(FREE_ERASE_MODELS.lama.bytes + FREE_ERASE_MODELS.det.bytes)}MB)`}
          </button>
          <span className={saved ? "fe-model-state ok" : "fe-model-state"}>
            {saved ? "이 PC·이 브라우저에 저장돼 있어 바로 사용할 수 있습니다." : "아직 받지 않았습니다. 이 버튼을 누르거나, 처음 「지우기」를 누를 때 자동으로 받습니다(처음 한 번만)."}
          </span>
        </div>
        <ul className="fe-model-notes">
          <li>⬇ <b>받는 것</b>: 프로그램 설치가 아니라 <b>AI 계산용 모델 파일</b>입니다. 공개 모델 저장소 허깅페이스(huggingface.co)에서 받아 <b>브라우저 안에 저장</b>합니다 — 다운로드 폴더에 파일이 생기지 않습니다.</li>
          <li>🔁 같은 PC·같은 브라우저에서는 한 번만 받습니다. 다른 브라우저·다른 PC, 사이트 데이터를 지운 뒤에는 다시 받습니다.</li>
          <li>⏱ 계산은 지금 쓰는 PC의 그래픽카드·CPU로 하므로 <b>컴퓨터 사양에 따라 작업 시간이 다를 수 있습니다</b>. 크롬·엣지 최신판을 권장합니다.</li>
          <li>ℹ 모델 설명 페이지(파일 받기 아님): <a href={FREE_ERASE_MODELS.lama.page} target="_blank" rel="noopener noreferrer">지우기 LaMa ↗</a> · <a href={FREE_ERASE_MODELS.det.page} target="_blank" rel="noopener noreferrer">글자 찾기 RapidOCR ↗</a></li>
        </ul>
        {progress && (
          <div className="fe-progress" role="status">
            <span>AI 계산용 모델 파일({progress.model === "lama" ? "지우기" : "글자 찾기"}) 받는 중 {mb(progress.loaded)}/{mb(progress.total)}MB</span>
            <progress max={progress.total} value={progress.loaded} />
          </div>
        )}
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>

      <div className="fe-grid">
        <aside className="card fe-list">
          <header>
            <b>사진 {items.length}/{MAX_ITEMS}</b>
            <label className="button"><ImagePlus size={14} />사진 추가<input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} /></label>
          </header>
          {items.length > 1 && (
            <div className="fe-checkall">
              <button type="button" onClick={() => setItems((xs) => xs.map((x) => ({ ...x, checked: true })))}>모두 선택</button>
              <button type="button" onClick={() => setItems((xs) => xs.map((x) => ({ ...x, checked: false })))}>선택 해제</button>
            </div>
          )}
          {items.length === 0 ? (
            <label className="fe-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
              <ImagePlus size={28} />
              <b>사진을 끌어 놓거나 눌러서 고르세요</b>
              <small>여러 장 가능 · 최대 {MAX_ITEMS}장</small>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          ) : (
            <ul>
              {items.map((it) => (
                <li key={it.id} className={it.id === sel ? "on" : ""}>
                  <input type="checkbox" checked={it.checked} aria-label={`${it.name} 선택`} onChange={(e) => patch(it.id, { checked: e.target.checked })} />
                  <button type="button" className="fe-thumb" onClick={() => void select(it.id)} title={it.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.result?.url ?? it.url} alt="" />
                    <span className="fe-name">{it.name}</span>
                    <span className={`fe-state ${it.status}`}>
                      {it.status === "working" ? "지우는 중" : it.maskOn ? "🖌 칠함" : it.status === "done" ? "✅ 완료" : it.status === "error" ? "실패" : "대기"}
                    </span>
                  </button>
                  <button type="button" className="fe-x" aria-label={`${it.name} 빼기`} onClick={() => removeItem(it.id)} disabled={!!busy}><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card fe-editor">
          {!cur ? (
            <div className="fe-empty">사진 목록(넓은 화면은 왼쪽, 휴대폰은 위)에서 사진을 올리고 고르면 여기에서 지울 곳을 칠합니다.</div>
          ) : (
            <>
              <div className="actions fe-tools">
                <div className="bc-seg" role="group" aria-label="붓 종류">
                  <button type="button" aria-pressed={mode === "paint"} onClick={() => setMode("paint")}><Brush size={14} />칠하기</button>
                  <button type="button" aria-pressed={mode === "erase"} onClick={() => setMode("erase")}><Eraser size={14} />지우개</button>
                </div>
                <label className="bc-inline">붓 크기<input type="range" min={1} max={15} value={brush} onChange={(e) => setBrush(Number(e.target.value))} /></label>
                <button type="button" disabled={!undoCount || !!busy} onClick={undoOnce}><Undo2 size={14} />되돌리기</button>
                <button type="button" disabled={!!busy} onClick={clearMask}><Trash2 size={14} />칠한 곳 비우기</button>
                {cur.result && (
                  <>
                    <button type="button" onClick={() => setView(view === "result" ? "original" : "result")}><Eye size={14} />{view === "result" ? "원본 보기" : "결과 보기"}</button>
                    <button type="button" disabled={!!busy} onClick={resetResult}><RotateCcw size={14} />원본으로</button>
                  </>
                )}
              </div>
              <div className="fe-stage" style={{ width: "100%", margin: "0 auto", maxWidth: `min(100%, calc(72vh * ${(cur.w / cur.h).toFixed(4)}))` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {shown && <img src={shown} alt={cur.name} draggable={false} />}
                <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="지울 곳 칠하기" />
              </div>
              {cur.error && <p className="notice warning">{cur.error}</p>}
              <div className="actions">
                <button type="button" disabled={!!busy} onClick={findHere}><ScanText size={14} />{busy === "문구 찾기" ? "찾는 중…" : "문구 찾기"}</button>
                <button type="button" className="primary" disabled={!!busy} onClick={eraseHere}><Sparkles size={14} />{busy === "지우기" ? "지우는 중…" : "지우기"}</button>
              </div>
            </>
          )}
        </section>
      </div>

      {items.length > 0 && (
        <div className="card fe-batch">
          <b>여러 장 한 번에 (선택 {checked.length}장)</b>
          <div className="actions">
            <button type="button" disabled={!!busy || !cur} onClick={copyMask}><Copy size={14} />지금 칠한 곳을 같은 비율 사진에 복사</button>
            <button type="button" disabled={!!busy || !checked.length} onClick={() => batchRun("find")}><ScanText size={14} />선택 사진 문구 찾기</button>
            <button type="button" className="primary" disabled={!!busy || !checked.length} onClick={() => batchRun("erase")}><Sparkles size={14} />선택 사진 모두 지우기</button>
            {batch && <button type="button" onClick={() => { stop.current = true; }}><Square size={14} />중단</button>}
          </div>
          {batch && (
            <div className="fe-progress" role="status">
              <span>{batch.done}/{batch.total}장 · {batch.label}</span>
              <progress max={batch.total} value={batch.done} />
            </div>
          )}
          <div className="actions fe-save">
            <label className="bc-inline">형식
              <select value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)}>
                <option value="png">PNG(화질 그대로)</option>
                <option value="jpg95">JPG 품질 95</option>
                <option value="jpg90">JPG 품질 90</option>
                <option value="jpg85">JPG 품질 85</option>
              </select>
            </label>
            <label className="bc-inline">가로 크기
              <select value={width} onChange={(e) => setWidth(e.target.value as typeof width)}>
                <option value="orig">원본 그대로</option>
                <option value="1000">1000px</option>
                <option value="860">860px(상세페이지)</option>
              </select>
            </label>
            <button type="button" className="primary" disabled={!!busy} onClick={downloadZip}><Download size={14} />선택 결과 ZIP 내려받기</button>
          </div>
        </div>
      )}

      <p className="bc-privacy fe-legal">
        ⚖️ 본인이 권리를 가진 이미지에만 사용하세요. 워터마크·로고를 무단으로 지우면 저작권·상표 문제가 될 수 있습니다. AI로 만든 이미지를 공개할 때는 AI 생성임을 밝혀 주세요.
        {" "}모델: {FREE_ERASE_MODELS.lama.license} · {FREE_ERASE_MODELS.det.license}.
      </p>
    </div>
  );
}
