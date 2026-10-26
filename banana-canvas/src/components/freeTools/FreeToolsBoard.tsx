"use client";
// E5(2026-10-26) 「🧰 무료 이미지 도구」 — 배경 지우기·얼굴 가리기·사진 나누기. 모두 회원 브라우저 안에서 처리(서버 업로드·키·비용 없음).
// 계산은 lib/freeTools/calc.ts(시험), 그리기는 lib/freeTools/render.ts, 모델 받기·계산은 공용 컴포넌트 browser-free-erase.
// 꾸밈은 globals.css의 bp-·ft- 규칙만(이 프로그램은 테일윈드가 없다).
import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Download, ImagePlus, Trash2 } from "lucide-react";
import { detectTextBoxes, loadFreeErase, type FreeEraseError } from "@/lib/freeErase/engine";
import { readBitmap } from "@/lib/batch/render";
import { NUKKI_SENDER_ORIGIN, NUKKI_MSG_READY, NUKKI_MSG_RESULT, NUKKI_RESULT_MAX_BYTES, readNukkiFile } from "@/lib/nukkiHandoff";
import { BATCH_FROM_TOOLS, prepareText, putForBatch } from "@/lib/freeTools/toBatch";
import { SPLIT_LAYOUTS, clampRect, evenCuts, moveCut, pieceNames, splitRects, type Rect, type SplitLayout } from "@/lib/freeTools/calc";
import { autoBgMask, autoFaces, composeBg, composeHide, cropPiece, keepNumberBoxes, paintMask, toBlob, type HideMode } from "@/lib/freeTools/render";

type Tab = "bg" | "face" | "split";
const TABS: { id: Tab; label: string }[] = [
  { id: "bg", label: "✂ 배경 지우기" },
  { id: "face", label: "🙈 얼굴 가리기" },
  { id: "split", label: "▦ 사진 나누기" },
];
const MAX_ITEMS = 20;
const MAX_BYTES = 25 * 1024 * 1024;

interface Item { id: string; file: File; name: string; w: number; h: number; thumb: string }
interface Cuts { xs: number[]; ys: number[] }
const uid = () => Math.random().toString(36).slice(2, 10);
const stem = (n: string) => n.replace(/\.[^.]+$/, "") || "사진";

function saveFile(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function errorText(e: unknown): string {
  const raw = String((e as FreeEraseError)?.raw ?? (e as Error)?.message ?? e);
  if (/^download:|Failed to fetch|NetworkError|network/i.test(raw)) return "AI 계산용 모델 파일을 받지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";
  if (/memory|RangeError|Aborted|OOM|allocation/i.test(raw)) return "이 기기의 메모리가 부족합니다. 다른 탭을 닫거나 더 작은 사진으로 다시 시도해 주세요.";
  return "계산에 실패했습니다. 다시 시도해 주세요.";
}
const cutsFor = (layout: SplitLayout): Cuts => ({ xs: evenCuts(SPLIT_LAYOUTS[layout].cols), ys: evenCuts(SPLIT_LAYOUTS[layout].rows) });

export function FreeToolsBoard() {
  const [tab, setTab] = useState<Tab>("bg");
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // 배경 지우기
  const [fill, setFill] = useState<"transparent" | "white" | "color">("transparent");
  const [color, setColor] = useState("#f4f4f5");
  const [brush, setBrush] = useState<"erase" | "restore">("erase");
  const [brushPx, setBrushPx] = useState(24);
  // 얼굴 가리기
  const [faces, setFaces] = useState<Record<string, Rect[]>>({});
  const [hide, setHide] = useState<HideMode>("pixel");
  const [strength, setStrength] = useState(6);
  // 사진 나누기
  const [layout, setLayout] = useState<SplitLayout>("4");
  const [cuts, setCuts] = useState<Record<string, Cuts>>({});
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const [ver, setVer] = useState(0); // 마스크(캔버스) 고친 뒤 다시 그리기

  const bitmaps = useRef(new Map<string, ImageBitmap>());
  const masks = useRef(new Map<string, HTMLCanvasElement>());
  const viewRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<Item[]>([]); itemsRef.current = items;
  const drag = useRef<{ kind: "paint"; last: { x: number; y: number } } | { kind: "rect"; x: number; y: number; cur: Rect } | { kind: "cut"; axis: "x" | "y"; i: number } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);

  const cur = items.find((x) => x.id === sel) ?? null;
  const curCuts = cur ? cuts[cur.id] ?? cutsFor(layout) : null;

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const room = MAX_ITEMS - itemsRef.current.length;
    const skipped: string[] = [], added: Item[] = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      if (f.size > MAX_BYTES) { skipped.push(`${f.name}(25MB 초과)`); continue; }
      try {
        const bm = await readBitmap(f); const id = uid();
        bitmaps.current.set(id, bm);
        added.push({ id, file: f, name: f.name || "붙여넣은사진.png", w: bm.width, h: bm.height, thumb: URL.createObjectURL(f) });
      } catch { skipped.push(`${f.name}(열 수 없는 사진)`); }
    }
    if (files.length > room) skipped.push(`${files.length - Math.max(0, room)}장(최대 ${MAX_ITEMS}장)`);
    if (added.length) { setItems((xs) => [...xs, ...added]); setSel((s) => s ?? added[0].id); }
    setNotice(skipped.length ? `넣지 못한 사진: ${skipped.join(", ")}` : null);
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? []).filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter((f): f is File => !!f);
      if (files.length) { e.preventDefault(); void addFiles(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);
  useEffect(() => () => {
    itemsRef.current.forEach((it) => URL.revokeObjectURL(it.thumb));
    bitmaps.current.forEach((b) => b.close());
  }, []);

  // E5-2: 상세페이지 「✂ 누끼」로 열린 창이면 「준비됨」을 보내고 그림을 받는다(공용 nukki-handoff, 서버를 거치지 않음)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("from") !== "shop-detail" || !window.opener) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.opener) return;
      const got = readNukkiFile(e.origin, e.data);
      if (!got) return;
      if ("error" in got) { setNotice(got.error); return; }
      setTab("bg");
      if (got.section) setFromShop({ section: got.section, name: got.name });
      void addFiles([new File([got.file], got.name, { type: got.file.type })]).then(() => setNotice(`📥 상세페이지에서 「${got.name}」을 받았습니다. 「배경 자동 지우기」 뒤 「↩ 상세페이지에 넣기」를 누르면 그 섹션에 새 버전으로 저장됩니다.`));
    };
    window.addEventListener("message", onMessage);
    window.opener.postMessage({ type: NUKKI_MSG_READY }, NUKKI_SENDER_ORIGIN);
    return () => window.removeEventListener("message", onMessage);
  }, [addFiles]);

  // E5-3: 다른 프로그램의 「🙈 사진 속 개인정보 가리기」 바로가기(?tab=face)로 열리면 그 탭부터
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "face" || t === "split" || t === "bg") setTab(t);
  }, []);

  /** E5-3: 누끼 결과를 상세페이지 그 섹션으로 되돌려 보낸다(상세페이지가 새 버전으로 저장) */
  const [fromShop, setFromShop] = useState<{ section: string; name: string } | null>(null);
  async function returnToShop() {
    if (!cur || !fromShop) return;
    if (!window.opener || window.opener.closed) { setNotice("상세페이지 창이 닫혔습니다. 결과를 받아서 상세페이지 「📤 직접 등록」으로 넣어 주세요."); return; }
    setNotice(null);
    try {
      await prepare("bg"); setBusy("상세페이지로 보낼 결과 만드는 중…");
      const [f] = await outputsFor(cur);
      if (f.blob.size > NUKKI_RESULT_MAX_BYTES) { setNotice("결과가 10MB를 넘습니다. JPG로 바꾸거나 결과를 받아 줄여서 「📤 직접 등록」으로 넣어 주세요."); return; }
      window.opener.postMessage({ type: NUKKI_MSG_RESULT, section: fromShop.section, file: f.blob }, NUKKI_SENDER_ORIGIN);
      setNotice("↩ 상세페이지로 보냈습니다. 상세페이지 창의 그 섹션 카드에서 저장 결과를 확인해 주세요.");
    } catch (e) { setNotice(errorText(e)); } finally { setBusy(null); }
  }
  const [digitsOnly, setDigitsOnly] = useState(true);

  // 첫 모델 준비가 오래 걸리면 안내(60초)
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const t = window.setTimeout(() => setSlow(true), 60_000);
    return () => window.clearTimeout(t);
  }, [busy]);

  function remove(id: string) {
    const it = items.find((x) => x.id === id); if (it) URL.revokeObjectURL(it.thumb);
    bitmaps.current.get(id)?.close(); bitmaps.current.delete(id); masks.current.delete(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (sel === id) setSel(null);
  }
  function clearAll() { items.forEach((it) => remove(it.id)); }

  /** 모델 준비(첫 회 내려받기 진행률 표시) */
  async function prepare(model: "bg" | "face" | "det" | "rec") {
    const label = model === "bg" ? "배경 지우기" : model === "face" ? "얼굴 찾기" : model === "det" ? "글자 찾기" : "글자 읽기";
    setBusy(`${label} 준비 중…`);
    await loadFreeErase(model, (p) => setBusy(prepareText(label, p.loaded, p.total)));
  }
  async function ensureMask(it: Item) {
    const hit = masks.current.get(it.id); if (hit) return hit;
    const m = await autoBgMask(bitmaps.current.get(it.id)!, it.w, it.h);
    masks.current.set(it.id, m); return m;
  }
  async function ensureFaces(it: Item): Promise<Rect[]> {
    if (faces[it.id]) return faces[it.id];
    const r = await autoFaces(bitmaps.current.get(it.id)!, it.w, it.h);
    setFaces((f) => ({ ...f, [it.id]: r })); return r;
  }

  async function runAuto() {
    if (!cur) return;
    setNotice(null);
    try {
      if (tab === "bg") {
        await prepare("bg"); setBusy("배경을 찾는 중…");
        masks.current.delete(cur.id); await ensureMask(cur); setVer((v) => v + 1);
        setNotice("✅ 배경을 지웠습니다. 경계가 어색하면 붓으로 지우거나 되살리세요.");
      } else {
        await prepare("face"); setBusy("얼굴을 찾는 중…");
        const r = await autoFaces(bitmaps.current.get(cur.id)!, cur.w, cur.h);
        setFaces((f) => ({ ...f, [cur.id]: r }));
        setNotice(r.length ? `✅ 얼굴 ${r.length}개를 가렸습니다. 빠진 곳은 끌어서 네모를 그리고, 잘못 가린 곳은 눌러서 빼세요.` : "얼굴을 찾지 못했습니다. 가릴 곳을 끌어서 네모로 그려 주세요.");
      }
    } catch (e) { setNotice(errorText(e)); } finally { setBusy(null); }
  }

  /** E5-2: 사진 속 글자 자리(송장 번호·전화번호·이름표 등)를 찾아 가림 네모로 더한다. 글자를 읽지는 않아 모든 글자 자리가 대상 */
  async function runText() {
    if (!cur) return;
    setNotice(null);
    try {
      await prepare("det"); setBusy("글자 자리를 찾는 중…");
      const bm = bitmaps.current.get(cur.id)!;
      let boxes = await detectTextBoxes(bm, cur.w, cur.h);
      const found = boxes.length;
      if (digitsOnly && found) {
        await prepare("rec"); setBusy(`글자 ${found}곳을 읽어 숫자 자리를 고르는 중…`);
        boxes = await keepNumberBoxes(bm, cur.w, cur.h, boxes);
      }
      setFaces((f) => ({ ...f, [cur.id]: [...(f[cur.id] ?? []), ...boxes] }));
      setNotice(boxes.length
        ? `✅ ${digitsOnly ? `글자 ${found}곳 중 숫자가 많은 자리 ${boxes.length}곳` : `글자 자리 ${boxes.length}곳`}을 더 가렸습니다. 가릴 필요 없는 곳은 네모를 눌러서 빼세요.`
        : digitsOnly && found ? `글자 ${found}곳을 찾았지만 숫자가 많은 자리는 없었습니다. 필요하면 「숫자가 많은 자리만」을 끄고 다시 눌러 주세요.` : "글자를 찾지 못했습니다. 가릴 곳을 끌어서 네모로 그려 주세요.");
    } catch (e) { setNotice(errorText(e)); } finally { setBusy(null); }
  }

  // 미리보기 그리기
  useEffect(() => {
    const c = viewRef.current; if (!c) return;
    if (!cur) { c.width = 1; c.height = 1; return; }
    const bm = bitmaps.current.get(cur.id); if (!bm) return;
    const id = requestAnimationFrame(() => {
      c.width = cur.w; c.height = cur.h;
      const x = c.getContext("2d")!;
      x.clearRect(0, 0, cur.w, cur.h);
      const lw = Math.max(2, Math.round(Math.max(cur.w, cur.h) / 300));
      if (tab === "bg") {
        const m = masks.current.get(cur.id);
        x.drawImage(m ? composeBg(bm, m, cur.w, cur.h, fill === "transparent" ? { kind: "transparent" } : { kind: "color", color: fill === "white" ? "#ffffff" : color }) : bm, 0, 0);
      } else if (tab === "face") {
        const rs = faces[cur.id] ?? [];
        x.drawImage(composeHide(bm, cur.w, cur.h, rs, hide, strength), 0, 0);
        x.lineWidth = lw; x.strokeStyle = "#f43f5e"; x.setLineDash([lw * 3, lw * 2]);
        for (const r of rs) x.strokeRect(r.x, r.y, r.w, r.h);
        if (draft) { x.strokeStyle = "#0ea5e9"; x.strokeRect(draft.x, draft.y, draft.w, draft.h); }
      } else if (curCuts) {
        x.drawImage(bm, 0, 0);
        x.lineWidth = lw * 1.5; x.strokeStyle = "#f43f5e"; x.setLineDash([lw * 4, lw * 2]);
        for (const v of curCuts.xs) { x.beginPath(); x.moveTo(v * cur.w, 0); x.lineTo(v * cur.w, cur.h); x.stroke(); }
        for (const v of curCuts.ys) { x.beginPath(); x.moveTo(0, v * cur.h); x.lineTo(cur.w, v * cur.h); x.stroke(); }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [cur, tab, fill, color, faces, hide, strength, draft, curCuts, ver]);

  // 화면 좌표 → 사진 좌표
  function toImg(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect(), s = cur!.w / r.width;
    return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s, scale: s };
  }
  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!cur || busy) return;
    const p = toImg(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 포인터 고정이 안 되는 환경이어도 그리기는 계속 */ }
    if (tab === "bg") {
      const m = masks.current.get(cur.id);
      if (!m) { setNotice("먼저 「배경 자동 지우기」를 눌러 주세요."); return; }
      paintMask(m, null, p, brushPx * p.scale, brush); setVer((v) => v + 1);
      drag.current = { kind: "paint", last: p };
    } else if (tab === "face") {
      drag.current = { kind: "rect", x: p.x, y: p.y, cur: { x: p.x, y: p.y, w: 0, h: 0 } };
    } else if (curCuts) {
      const tol = 14 * p.scale;
      const xi = curCuts.xs.findIndex((v) => Math.abs(v * cur.w - p.x) < tol);
      const yi = curCuts.ys.findIndex((v) => Math.abs(v * cur.h - p.y) < tol);
      if (xi >= 0) drag.current = { kind: "cut", axis: "x", i: xi };
      else if (yi >= 0) drag.current = { kind: "cut", axis: "y", i: yi };
    }
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current; if (!d || !cur) return;
    const p = toImg(e);
    if (d.kind === "paint") {
      const m = masks.current.get(cur.id); if (!m) return;
      paintMask(m, d.last, p, brushPx * p.scale, brush); d.last = p; setVer((v) => v + 1);
    } else if (d.kind === "rect") {
      d.cur = clampRect({ x: d.x, y: d.y, w: p.x - d.x, h: p.y - d.y }, cur.w, cur.h); setDraft(d.cur);
    } else if (curCuts) {
      const next = d.axis === "x" ? { ...curCuts, xs: moveCut(curCuts.xs, d.i, p.x / cur.w) } : { ...curCuts, ys: moveCut(curCuts.ys, d.i, p.y / cur.h) };
      setCuts((c) => ({ ...c, [cur.id]: next }));
    }
  }
  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current; drag.current = null; setDraft(null);
    if (!d || !cur || d.kind !== "rect") return;
    const p = toImg(e), small = 8 * p.scale;
    const list = faces[cur.id] ?? [];
    if (d.cur.w < small && d.cur.h < small) {
      // 짧게 누름 → 그 자리 네모 빼기
      const hit = list.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (hit >= 0) setFaces((f) => ({ ...f, [cur.id]: list.filter((_, i) => i !== hit) }));
      return;
    }
    setFaces((f) => ({ ...f, [cur.id]: [...list, d.cur] }));
  }

  function pickLayout(l: SplitLayout) {
    setLayout(l);
    if (cur) setCuts((c) => ({ ...c, [cur.id]: cutsFor(l) }));
  }

  // 결과 만들기
  const bgFormat = fill === "transparent" ? "png" : format;
  async function outputsFor(it: Item): Promise<{ name: string; blob: Blob }[]> {
    const bm = bitmaps.current.get(it.id)!;
    if (tab === "bg") {
      const m = await ensureMask(it);
      const c = composeBg(bm, m, it.w, it.h, fill === "transparent" ? { kind: "transparent" } : { kind: "color", color: fill === "white" ? "#ffffff" : color });
      return [{ name: `${stem(it.name)}_누끼.${bgFormat}`, blob: await toBlob(c, bgFormat) }];
    }
    if (tab === "face") {
      const rs = await ensureFaces(it);
      return [{ name: `${stem(it.name)}_가림.${format}`, blob: await toBlob(composeHide(bm, it.w, it.h, rs, hide, strength), format) }];
    }
    const k = cuts[it.id] ?? cutsFor(layout);
    const rects = splitRects(it.w, it.h, k.xs, k.ys), names = pieceNames(it.name, rects.length, format);
    const out: { name: string; blob: Blob }[] = [];
    for (let i = 0; i < rects.length; i++) out.push({ name: names[i], blob: await toBlob(cropPiece(bm, rects[i]), format) });
    return out;
  }
  async function download(all: boolean) {
    const targets = all ? items : cur ? [cur] : [];
    if (!targets.length) return;
    setNotice(null);
    try {
      if (tab !== "split") await prepare(tab);
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < targets.length; i++) {
        setBusy(`만드는 중 ${i + 1}/${targets.length}`);
        files.push(...(await outputsFor(targets[i])));
      }
      setVer((v) => v + 1);
      if (files.length === 1) saveFile(files[0].blob, files[0].name);
      else {
        setBusy("ZIP으로 묶는 중…");
        const zip = new JSZip(); const used = new Set<string>();
        for (const f of files) { let n = f.name, k = 2; while (used.has(n)) n = f.name.replace(/(\.[^.]+)$/, `(${k++})$1`); used.add(n); zip.file(n, f.blob); }
        const label = tab === "bg" ? "누끼" : tab === "face" ? "얼굴가림" : "나누기";
        saveFile(await zip.generateAsync({ type: "blob" }), `${label}_${files.length}개.zip`);
      }
      setNotice(`✅ ${files.length}개 파일을 받았습니다. 촬영 정보·위치 정보는 결과 파일에 들어가지 않았습니다.`);
    } catch (e) { setNotice(errorText(e)); } finally { setBusy(null); }
  }
  /** E5-2: 모든 사진의 결과를 브라우저 안에 잠시 보관하고 「사진 일괄 손질」로 이동(서버 전송 없음) */
  async function sendToBatch() {
    if (!items.length) return;
    setNotice(null);
    try {
      if (tab !== "split") await prepare(tab);
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < items.length; i++) {
        setBusy(`보낼 결과 만드는 중 ${i + 1}/${items.length}`);
        files.push(...(await outputsFor(items[i])));
      }
      if (files.length > 50) { setNotice(`사진 일괄 손질은 한 번에 50장까지 받습니다(지금 ${files.length}장). 사진 수를 줄여 주세요.`); return; }
      await putForBatch(files);
      window.location.assign(BATCH_FROM_TOOLS);
    } catch (e) { setNotice(e instanceof DOMException ? "브라우저 임시 보관에 실패했습니다. 결과를 받아서 직접 넣어 주세요." : errorText(e)); } finally { setBusy(null); }
  }

  const pieces = cur && curCuts ? splitRects(cur.w, cur.h, curCuts.xs, curCuts.ys) : [];
  const hasMask = !!(cur && masks.current.get(cur.id));

  return (
    <div className="fe-wrap">
      <div className="card fe-intro">
        <div className="fe-intro-row">
          <span className="fe-badge">🆓 무료 · 내 PC 처리</span>
          <span className="fe-badge soft">사진이 서버로 올라가지 않음</span>
          <span className="fe-badge leaf">✅ 촬영 정보·위치 정보 자동 제거</span>
        </div>
        <div className="ft-tabs" role="tablist" aria-label="도구 고르기">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : undefined} onClick={() => { setTab(t.id); setNotice(null); }}>{t.label}</button>
          ))}
        </div>
        <p className="bp-intro">
          {tab === "bg" && <>사진을 고르고 <b>「배경 자동 지우기」</b>를 누르세요. 경계는 붓으로 지우거나 되살립니다. 머리카락·투명한 물건처럼 섬세한 누끼는 「🪄 AI 작업 카드」(본인 키)가 더 정교합니다.</>}
          {tab === "face" && <><b>「얼굴 찾아 가리기」</b>를 누르면 얼굴을 자동으로 가립니다. 못 찾은 얼굴·이름·송장 번호는 사진 위를 <b>끌어서 네모</b>로, 잘못 가린 곳은 <b>눌러서</b> 뺍니다. 약한 흐림은 알아볼 수 있으니 강도를 충분히 올리세요.</>}
          {tab === "split" && <>나눌 모양을 고르고, 빨간 선을 <b>끌어서</b> 위치를 바꾸세요. 조각마다 파일로(여러 개면 ZIP) 받습니다.</>}
        </p>
        {busy && <p className="notice" role="status">⏳ {busy}{slow ? " — 1분 넘게 걸리고 있습니다. 계속 멈춰 있으면 새로 고침 후 다시 눌러 주세요." : ""}</p>}
        {!busy && notice && <p className="notice" role="status">{notice}</p>}
      </div>

      <div className="bp-grid">
        <aside className="card fe-list">
          <header>
            <b>사진 {items.length}/{MAX_ITEMS}</b>
            <label className="button"><ImagePlus size={14} />추가<input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} /></label>
          </header>
          {items.length === 0 ? (
            <label className="fe-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
              <ImagePlus size={28} />
              <b>사진을 끌어 놓거나 눌러서 고르세요</b>
              <small>Ctrl+V로 붙여넣기 · 최대 {MAX_ITEMS}장 · 한 장 25MB</small>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          ) : (
            <>
              <ul className="bp-scroll" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
                {items.map((it) => (
                  <li key={it.id} className={it.id === sel ? "on" : undefined}>
                    <button type="button" onClick={() => setSel(it.id)} className="bp-thumbbtn" title={it.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.thumb} alt="" />
                      <span>
                        <span className="bp-name">{it.name}</span>
                        <span className="bp-size">{it.w}×{it.h}{masks.current.get(it.id) ? " · 누끼✓" : ""}{faces[it.id] ? ` · 가림 ${faces[it.id].length}` : ""}</span>
                      </span>
                    </button>
                    <button type="button" aria-label={`${it.name} 빼기`} onClick={() => remove(it.id)} className="bp-x"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
              <button type="button" className="bp-link" onClick={clearAll}>모두 빼기</button>
            </>
          )}
        </aside>

        <section className="card">
          <div className="bp-head">
            <b>👀 미리보기 {cur ? `— ${cur.name}` : ""}</b>
            {cur && tab === "split" && <span className="bp-hint">{pieces.length}조각 · {pieces[0]?.w}×{pieces[0]?.h}px부터</span>}
          </div>
          <div className={`bp-preview${tab === "bg" ? " ft-checker" : ""}`}>
            <canvas
              ref={viewRef}
              className={`ft-view${cur ? "" : " empty"} ${tab}`}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; setDraft(null); }}
            />
          </div>
          {!cur && <p className="bp-hint">왼쪽에서 사진을 고르면 여기에서 바로 손볼 수 있습니다.</p>}
        </section>

        <section className="card bp-set">
          {tab === "bg" && (
            <>
              <button type="button" className="primary bp-go" disabled={!cur || !!busy} onClick={() => void runAuto()}>✂ {hasMask ? "다시 자동 지우기" : "배경 자동 지우기"}</button>
              {fromShop && cur?.name === fromShop.name && (
                <button type="button" className="button bp-go" disabled={!hasMask || !!busy} onClick={() => void returnToShop()} title="이 결과를 상세페이지 그 섹션의 새 버전으로 저장합니다(원본은 버전 목록에 남음)">
                  ↩ 상세페이지에 넣기
                </button>
              )}
              <div>
                <span className="bp-label">🖌 경계 다듬기 붓</span>
                <div className="bp-seg c2">
                  <button type="button" className={brush === "erase" ? "on" : undefined} onClick={() => setBrush("erase")}>지우기</button>
                  <button type="button" className={brush === "restore" ? "on" : undefined} onClick={() => setBrush("restore")}>되살리기</button>
                </div>
                <label className="bp-range">붓 크기 {brushPx}px <input type="range" min={4} max={80} value={brushPx} onChange={(e) => setBrushPx(Number(e.target.value))} /></label>
                <p className="bp-hint">미리보기 위를 문질러 고칩니다.</p>
              </div>
              <div>
                <span className="bp-label">🎨 배경</span>
                <div className="bp-seg c3">
                  {(["transparent", "white", "color"] as const).map((k) => (
                    <button key={k} type="button" className={fill === k ? "on" : undefined} onClick={() => setFill(k)}>{k === "transparent" ? "투명" : k === "white" ? "흰색" : "색 고르기"}</button>
                  ))}
                </div>
                {fill === "color" && <label className="bp-row">배경 색 <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>}
              </div>
            </>
          )}
          {tab === "face" && (
            <>
              <button type="button" className="primary bp-go" disabled={!cur || !!busy} onClick={() => void runAuto()}>🔍 얼굴 찾아 가리기</button>
              <div>
                <span className="bp-label">🙈 가리는 방식</span>
                <div className="bp-seg c3">
                  {(["pixel", "blur", "fill"] as const).map((k) => (
                    <button key={k} type="button" className={hide === k ? "on" : undefined} onClick={() => setHide(k)}>{k === "pixel" ? "모자이크" : k === "blur" ? "흐리게" : "검게 칠"}</button>
                  ))}
                </div>
                {hide !== "fill" && <label className="bp-range">강도 {strength} <input type="range" min={1} max={10} value={strength} onChange={(e) => setStrength(Number(e.target.value))} /></label>}
              </div>
              <div>
                <span className="bp-label">🔢 글자 자리 가리기</span>
                <label className="bp-row" style={{ marginBottom: 6 }}>
                  <input type="checkbox" checked={digitsOnly} onChange={(e) => setDigitsOnly(e.target.checked)} />숫자가 많은 자리만(송장·전화번호·주문번호)
                </label>
                <button type="button" className="button bp-go" disabled={!cur || !!busy} onClick={() => void runText()}>{digitsOnly ? "숫자 자리 찾아 가리기" : "글자 자리 모두 찾아 가리기"}</button>
                <p className="bp-hint">{digitsOnly ? "글자를 읽어 숫자가 4개 이상이고 절반 이상인 자리만 가립니다(처음 한 번 약 5MB+11MB 모델을 받습니다). 한글은 읽지 못해 이름·주소는 끌어서 직접 가려 주세요." : "글자를 읽지 않고 자리만 찾으므로 상품명 같은 다른 글자도 가려집니다. 필요 없는 네모는 눌러서 빼세요(처음 한 번 약 5MB 모델을 받습니다)."}</p>
              </div>
              <div>
                <span className="bp-label">✍ 손으로 가리기</span>
                <p className="bp-hint">사진 위를 끌면 네모가 추가되고, 네모를 짧게 누르면 빠집니다. 지금 {cur ? (faces[cur.id]?.length ?? 0) : 0}곳.</p>
                {cur && (faces[cur.id]?.length ?? 0) > 0 && <button type="button" className="bp-link" onClick={() => setFaces((f) => ({ ...f, [cur.id]: [] }))}>이 사진 네모 모두 지우기</button>}
              </div>
            </>
          )}
          {tab === "split" && (
            <div>
              <span className="bp-label">▦ 나눌 모양</span>
              <div className="ft-layouts">
                {(Object.keys(SPLIT_LAYOUTS) as SplitLayout[]).map((k) => (
                  <button key={k} type="button" className={layout === k ? "on" : undefined} onClick={() => pickLayout(k)}>{SPLIT_LAYOUTS[k].label}</button>
                ))}
              </div>
              {cur && <button type="button" className="bp-link" onClick={() => pickLayout(layout)}>선 위치 처음대로</button>}
            </div>
          )}

          <div>
            <span className="bp-label">💾 저장</span>
            {tab === "bg" && fill === "transparent" ? (
              <p className="bp-hint">투명 배경은 PNG로 저장합니다.</p>
            ) : (
              <div className="bp-seg c2">
                {(["jpg", "png"] as const).map((f) => (
                  <button key={f} type="button" className={format === f ? "on" : undefined} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
                ))}
              </div>
            )}
          </div>
          <div className="bp-stack">
            <button type="button" className="primary bp-go" disabled={!cur || !!busy} onClick={() => void download(false)}>
              <Download size={15} />{tab === "split" ? `이 사진 조각 받기 (${pieces.length}개)` : "이 사진 받기"}
            </button>
            {items.length > 1 && (
              <button type="button" className="button bp-go" disabled={!!busy} onClick={() => void download(true)}>
                <Download size={15} />사진 {items.length}장 모두 받기(ZIP)
              </button>
            )}
            {items.length > 0 && (
              <button type="button" className="button bp-go" disabled={!!busy} onClick={() => void sendToBatch()}>
                🖼 사진 일괄 손질로 보내기({items.length}장)
              </button>
            )}
            {items.length > 1 && tab !== "split" && <p className="bp-hint">아직 손대지 않은 사진은 자동 결과로 받거나 보냅니다.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

