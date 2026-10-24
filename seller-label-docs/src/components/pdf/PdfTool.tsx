"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { ArrowLeft, ArrowRight, Download, RotateCw, Scissors, Trash2 } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { Dropzone } from "@/components/ui/Dropzone";
import { buildFromPages, imagesToPdf, parsePageRange, splitEvery, type PagePick } from "@/lib/pdf/ops";
import { moveItem } from "@/lib/rename";
import { saveBlob } from "@/lib/download";
import { ACCEPT_IMAGES, fileToImageInput } from "@/lib/browser/imageInput";
import { openPdf, pdfErrorMessage } from "@/lib/browser/pdfPreview";

const today = () => new Date().toISOString().slice(0, 10);

/* ── 사진 → PDF ── */
function ImagesToPdf() {
  const [files, setFiles] = useState<{ id: string; file: File; url: string }[]>([]);
  const [mode, setMode] = useState<"a4" | "original">("a4");
  const [margin, setMargin] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  function add(list: File[]) {
    const imgs = list.filter((f) => f.type.startsWith("image/"));
    setError(imgs.length < list.length ? "사진이 아닌 파일은 빼고 넣었습니다." : null);
    setFiles((p) => [...p, ...imgs.map((file, i) => ({ id: `${Date.now()}-${i}`, file, url: URL.createObjectURL(file) }))]);
  }

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const inputs = [];
      for (const f of files) inputs.push(await fileToImageInput(f.file));
      saveBlob(`사진모음_${today()}.pdf`, await imagesToPdf(inputs, mode, margin), "application/pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF를 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="slw-card space-y-3 p-4 lg:self-start">
        <Dropzone accept={ACCEPT_IMAGES} label="사진을 끌어 놓거나 눌러서 고르세요" hint="JPG·PNG·WEBP · 넣은 순서가 페이지 순서" onFiles={add} />
        <label className="block">
          <span className="slw-label">페이지 크기</span>
          <select className="slw-field" value={mode} onChange={(e) => setMode(e.target.value as "a4" | "original")}>
            <option value="a4">A4에 맞춤(가로 사진은 가로 페이지)</option>
            <option value="original">사진 크기 그대로</option>
          </select>
        </label>
        {mode === "a4" && (
          <label className="block">
            <span className="slw-label">여백: {Math.round(margin / 2.835)}mm</span>
            <input type="range" min={0} max={72} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-teal-700" />
          </label>
        )}
        <button type="button" className="slw-primary w-full" disabled={!files.length || busy} onClick={() => void make()}>
          <Download size={15} /> {busy ? "PDF 만드는 중…" : `${files.length}장 → PDF 저장`}
        </button>
        {error && <Notice tone="warn">{error}</Notice>}
      </section>
      <section className="slw-card p-4">
        <p className="mb-3 text-sm font-extrabold text-slate-900">페이지 순서 ({files.length}장)</p>
        {files.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">사진을 넣으면 여기서 순서를 바꿀 수 있습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {files.map((f, i) => (
              <div key={f.id} className="rounded-xl border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="aspect-[3/4] w-full rounded-md bg-slate-50 object-contain" />
                <p className="mt-1 truncate text-[12px] text-slate-600">{i + 1}. {f.file.name}</p>
                <div className="mt-1 flex justify-between">
                  <button type="button" aria-label="앞으로" className="slw-btn !min-h-0 !px-2 !py-1" disabled={i === 0} onClick={() => setFiles((p) => moveItem(p, i, i - 1))}><ArrowLeft size={14} /></button>
                  <button type="button" aria-label="빼기" className="slw-btn !min-h-0 !px-2 !py-1" onClick={() => { URL.revokeObjectURL(f.url); setFiles((p) => p.filter((x) => x.id !== f.id)); }}><Trash2 size={14} /></button>
                  <button type="button" aria-label="뒤로" className="slw-btn !min-h-0 !px-2 !py-1" disabled={i === files.length - 1} onClick={() => setFiles((p) => moveItem(p, i, i + 1))}><ArrowRight size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── PDF 페이지 정리 ── */
interface Tile extends PagePick {
  id: string;
  thumb: string | null;
  label: string;
}

const MAX_PAGES = 400;

function PdfPages() {
  const [sources, setSources] = useState<{ name: string; bytes: Uint8Array }[]>([]);
  const sourcesRef = useRef<{ name: string; bytes: Uint8Array }[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [range, setRange] = useState("");
  const [splitN, setSplitN] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(list: File[]) {
    setError(null);
    const pdfs = list.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (pdfs.length < list.length) setError("PDF가 아닌 파일은 뺐습니다. 사진은 「사진 → PDF」 탭을 쓰세요.");
    for (const file of pdfs) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let preview;
      try {
        preview = await openPdf(bytes);
      } catch (e) {
        setError(pdfErrorMessage(e, file.name));
        continue;
      }
      const srcIndex = sourcesRef.current.length;
      sourcesRef.current = [...sourcesRef.current, { name: file.name, bytes }];
      setSources(sourcesRef.current);
      const count = Math.min(preview.pageCount, MAX_PAGES);
      if (preview.pageCount > MAX_PAGES) setError(`「${file.name}」은 앞 ${MAX_PAGES}쪽만 불러왔습니다.`);
      const fresh: Tile[] = Array.from({ length: count }, (_, page) => ({ id: `${srcIndex}-${page}-${Date.now()}`, src: srcIndex, page, rotate: 0, thumb: null, label: `${file.name.replace(/\.pdf$/i, "")} · ${page + 1}쪽` }));
      setTiles((prev) => [...prev, ...fresh]);
      // 미리보기는 하나씩 천천히 그린다(큰 PDF에서 화면이 멈추지 않게)
      for (const t of fresh) {
        const thumb = await preview.render(t.page, 160).catch(() => null);
        setTiles((prev) => prev.map((x) => (x.id === t.id ? { ...x, thumb } : x)));
      }
      preview.destroy();
    }
  }

  function applyRange() {
    try {
      const keep = parsePageRange(range, tiles.length);
      setTiles((prev) => keep.map((i) => prev[i]));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "범위를 읽지 못했습니다.");
    }
  }

  async function saveOne() {
    setBusy("save");
    try {
      saveBlob(`정리한문서_${today()}.pdf`, await buildFromPages(sources.map((s) => s.bytes), tiles), "application/pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF를 만들지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function saveSplit() {
    setBusy("split");
    try {
      const whole = await buildFromPages(sources.map((s) => s.bytes), tiles);
      const parts = await splitEvery(whole, splitN);
      const zip = new JSZip();
      parts.forEach((p, i) => zip.file(`나눈문서_${String(i + 1).padStart(2, "0")}.pdf`, p));
      saveBlob(`나눈문서_${parts.length}개_${today()}.zip`, await zip.generateAsync({ type: "blob" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "나누지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="slw-card space-y-3 p-4 lg:self-start">
        <Dropzone accept="application/pdf,.pdf" label="PDF를 끌어 놓거나 눌러서 고르세요" hint="여러 개를 넣으면 넣은 순서대로 이어집니다" onFiles={(f) => void add(f)} />
        <p className="text-[12px] text-slate-600">불러온 파일: {sources.map((s) => s.name).join(", ") || "없음"}</p>
        <label className="block">
          <span className="slw-label">남길 페이지만 고르기(지금 순서 기준, 예: 1-3, 5)</span>
          <div className="flex gap-2">
            <input className="slw-field" value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3, 5" />
            <button type="button" className="slw-btn shrink-0" disabled={!range.trim() || !tiles.length} onClick={applyRange}>적용</button>
          </div>
        </label>
        <button type="button" className="slw-primary w-full" disabled={!tiles.length || !!busy} onClick={() => void saveOne()}>
          <Download size={15} /> {busy === "save" ? "만드는 중…" : `${tiles.length}쪽을 PDF 하나로 저장`}
        </button>
        <div className="flex items-end gap-2">
          <label className="block flex-1">
            <span className="slw-label">몇 쪽씩 나눌까요</span>
            <input type="number" min={1} className="slw-field" value={splitN} onChange={(e) => setSplitN(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <button type="button" className="slw-btn" disabled={!tiles.length || !!busy} onClick={() => void saveSplit()}>
            <Scissors size={14} /> {busy === "split" ? "나누는 중…" : "나눠서 ZIP"}
          </button>
        </div>
        <button type="button" className="slw-btn w-full" disabled={!tiles.length} onClick={() => { setTiles([]); sourcesRef.current = []; setSources([]); }}>
          <Trash2 size={14} /> 모두 비우기
        </button>
        {error && <Notice tone="warn">{error}</Notice>}
        <Notice>ℹ 아래 페이지 카드에서 순서를 옮기고, 돌리고, 빼면 그대로 저장됩니다. 합치기·추출·삭제·순서 바꾸기가 한 화면에서 끝납니다.</Notice>
      </section>
      <section className="slw-card p-4">
        <p className="mb-3 text-sm font-extrabold text-slate-900">페이지 ({tiles.length}쪽)</p>
        {tiles.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">PDF를 넣으면 페이지가 카드로 보입니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {tiles.map((t, i) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-2">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-slate-50">
                  {t.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.thumb} alt="" className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `rotate(${t.rotate ?? 0}deg) scale(${(t.rotate ?? 0) % 180 ? 0.72 : 1})` }} />
                  ) : (
                    <span className="text-[12px] text-slate-500">그리는 중…</span>
                  )}
                </div>
                <p className="mt-1 truncate text-[12px] text-slate-600" title={t.label}>{i + 1}. {t.label}</p>
                <div className="mt-1 flex justify-between">
                  <button type="button" aria-label="앞으로" className="slw-btn !min-h-0 !px-2 !py-1" disabled={i === 0} onClick={() => setTiles((p) => moveItem(p, i, i - 1))}><ArrowLeft size={14} /></button>
                  <button type="button" aria-label="돌리기" className="slw-btn !min-h-0 !px-2 !py-1" onClick={() => setTiles((p) => p.map((x) => (x.id === t.id ? { ...x, rotate: ((x.rotate ?? 0) + 90) % 360 } : x)))}><RotateCw size={14} /></button>
                  <button type="button" aria-label="빼기" className="slw-btn !min-h-0 !px-2 !py-1" onClick={() => setTiles((p) => p.filter((x) => x.id !== t.id))}><Trash2 size={14} /></button>
                  <button type="button" aria-label="뒤로" className="slw-btn !min-h-0 !px-2 !py-1" disabled={i === tiles.length - 1} onClick={() => setTiles((p) => moveItem(p, i, i + 1))}><ArrowRight size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PdfTool() {
  const [tab, setTab] = useState<"pages" | "images">("pages");
  return (
    <div>
      <PageHeader emoji="📄" title="PDF 정리" description="사진을 PDF로 만들고, 여러 PDF를 합치거나 필요한 페이지만 뽑아 순서를 바꿉니다." />
      <div className="mb-4 flex gap-2">
        <button type="button" className={tab === "pages" ? "slw-primary" : "slw-btn"} onClick={() => setTab("pages")}>📑 PDF 합치기·나누기·추출</button>
        <button type="button" className={tab === "images" ? "slw-primary" : "slw-btn"} onClick={() => setTab("images")}>🖼 사진 → PDF</button>
      </div>
      {tab === "pages" ? <PdfPages /> : <ImagesToPdf />}
    </div>
  );
}
