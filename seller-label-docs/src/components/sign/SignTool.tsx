"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { SignatureMaker, type SignatureImage } from "@/components/sign/SignatureMaker";
import { clampPlace } from "@/lib/sign/alpha";
import { parsePageRange, stampPng } from "@/lib/pdf/ops";
import { saveBlob } from "@/lib/download";
import { openPdf, pdfErrorMessage, type PdfPreview } from "@/lib/browser/pdfPreview";

type Place = { x: number; y: number; w: number; h: number };

interface Doc {
  name: string;
  kind: "pdf" | "image";
  bytes: Uint8Array;
  mime: string;
  pageCount: number;
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(",")[1] ?? "");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export default function SignTool() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [page, setPage] = useState(0);
  const [bg, setBg] = useState<string | null>(null);
  const [bgAspect, setBgAspect] = useState(1.414);
  const [sig, setSig] = useState<SignatureImage | null>(null);
  const [place, setPlace] = useState<Place>({ x: 0.62, y: 0.82, w: 0.25, h: 0.06 });
  const [scope, setScope] = useState<"current" | "all" | "range">("current");
  const [range, setRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<PdfPreview | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; start: Place } | null>(null);

  useEffect(() => () => previewRef.current?.destroy(), []);

  // 서명 비율이 바뀌면 상자 높이를 서명 모양에 맞춘다(가로 기준 유지)
  useEffect(() => {
    if (!sig) return;
    setPlace((p) => clampPlace({ ...p, h: (p.w * (sig.height / sig.width)) / bgAspect }));
  }, [sig, bgAspect]);

  async function openDoc(file: File | undefined) {
    if (!file) return;
    setError(null);
    previewRef.current?.destroy();
    previewRef.current = null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      try {
        const pv = await openPdf(bytes);
        previewRef.current = pv;
        setDoc({ name: file.name, kind: "pdf", bytes, mime: "application/pdf", pageCount: pv.pageCount });
        setPage(0);
      } catch (e) {
        setError(pdfErrorMessage(e, file.name));
      }
      return;
    }
    if (file.type.startsWith("image/")) {
      setDoc({ name: file.name, kind: "image", bytes, mime: file.type === "image/png" ? "image/png" : "image/jpeg", pageCount: 1 });
      setPage(0);
      return;
    }
    setError("PDF나 사진(JPG·PNG)을 넣어 주세요.");
  }

  // 배경(지금 페이지) 그리기
  useEffect(() => {
    if (!doc) return setBg(null);
    let alive = true;
    void (async () => {
      if (doc.kind === "pdf" && previewRef.current) {
        const size = await previewRef.current.size(page);
        const url = await previewRef.current.render(page, 900);
        if (alive) {
          setBgAspect(size.height / size.width);
          setBg(url);
        }
      } else {
        const url = URL.createObjectURL(new Blob([doc.bytes as BlobPart], { type: doc.mime }));
        const img = new Image();
        img.onload = () => alive && setBgAspect(img.naturalHeight / img.naturalWidth);
        img.src = url;
        if (alive) setBg(url);
      }
    })();
    return () => {
      alive = false;
    };
  }, [doc, page]);

  function onPointerDown(e: React.PointerEvent, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: place };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.sx) / box.width;
    const dy = (e.clientY - d.sy) / box.height;
    if (d.mode === "move") setPlace(clampPlace({ ...d.start, x: d.start.x + dx, y: d.start.y + dy }));
    else {
      const w = Math.max(0.04, d.start.w + dx);
      const ratio = sig ? (sig.height / sig.width) / bgAspect : d.start.h / d.start.w;
      setPlace(clampPlace({ ...d.start, w, h: w * ratio }));
    }
  }

  async function save() {
    if (!doc || !sig) return;
    setBusy(true);
    setError(null);
    try {
      const png = dataUrlBytes(sig.dataUrl);
      const base = doc.name.replace(/\.[^.]+$/, "");
      if (doc.kind === "pdf") {
        const pages = scope === "all" ? undefined : scope === "current" ? [page] : parsePageRange(range, doc.pageCount);
        if (pages && !pages.length) throw new Error("서명을 넣을 페이지를 골라 주세요.");
        saveBlob(`${base}_서명.pdf`, await stampPng(doc.bytes, png, place, pages), "application/pdf");
      } else {
        const bmp = await createImageBitmap(new Blob([doc.bytes as BlobPart], { type: doc.mime }), { imageOrientation: "from-image" });
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        bmp.close();
        const s = await createImageBitmap(new Blob([png as BlobPart], { type: "image/png" }));
        ctx.drawImage(s, place.x * c.width, place.y * c.height, place.w * c.width, place.h * c.height);
        s.close();
        const type = doc.mime === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, 0.93));
        if (!blob) throw new Error("사진을 저장하지 못했습니다.");
        saveBlob(`${base}_서명.${type === "image/png" ? "png" : "jpg"}`, blob);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader emoji="✍" title="문서 서명" description="손글씨·서명 사진·이름 글자를 PDF나 사진 위 원하는 자리에 넣고 저장합니다." />
      <div className="mb-4">
        <Notice tone="warn">
          ⚠ 이 기능은 문서에 서명 <b>그림</b>을 얹는 것으로, <b>법적 효력이 있는 전자서명(공동·금융인증서 등)이 아닙니다.</b> 계약 효력이 필요한 문서는 상대방이 정한 전자서명 서비스를 이용하세요.
        </Notice>
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="slw-card space-y-3 p-4">
            <h2 className="text-sm font-extrabold text-slate-900">① 문서 넣기</h2>
            <label className="slw-btn w-full cursor-pointer">
              <FileUp size={15} /> {doc ? `바꾸기 (${doc.name})` : "PDF 또는 사진 고르기"}
              <input type="file" accept="application/pdf,.pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { void openDoc(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {doc?.kind === "pdf" && (
              <div className="flex items-center justify-between gap-2 text-[13px] text-slate-700">
                <button type="button" className="slw-btn" disabled={page <= 0} onClick={() => setPage(page - 1)}>이전 쪽</button>
                <span>{page + 1} / {doc.pageCount}쪽</span>
                <button type="button" className="slw-btn" disabled={page >= doc.pageCount - 1} onClick={() => setPage(page + 1)}>다음 쪽</button>
              </div>
            )}
          </section>
          <section className="slw-card space-y-3 p-4">
            <h2 className="text-sm font-extrabold text-slate-900">② 서명 만들기</h2>
            <SignatureMaker onChange={setSig} />
          </section>
          <section className="slw-card space-y-3 p-4">
            <h2 className="text-sm font-extrabold text-slate-900">③ 넣을 페이지 · 저장</h2>
            {doc?.kind === "pdf" ? (
              <div className="space-y-2 text-[13px] text-slate-700">
                <label className="flex items-center gap-2"><input type="radio" checked={scope === "current"} onChange={() => setScope("current")} /> 지금 보는 쪽만({page + 1}쪽)</label>
                <label className="flex items-center gap-2"><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> 모든 쪽 같은 자리</label>
                <label className="flex items-center gap-2"><input type="radio" checked={scope === "range"} onChange={() => setScope("range")} /> 고른 쪽만</label>
                {scope === "range" && <input className="slw-field" value={range} onChange={(e) => setRange(e.target.value)} placeholder="예: 1, 3-5" />}
              </div>
            ) : (
              <p className="text-[13px] text-slate-600">사진은 한 장에 넣습니다.</p>
            )}
            <button type="button" className="slw-primary w-full" disabled={!doc || !sig || busy} onClick={() => void save()}>
              <Download size={15} /> {busy ? "저장 중…" : doc?.kind === "image" ? "서명한 사진 저장" : "서명한 PDF 저장"}
            </button>
            {!sig && <p className="text-[12px] text-slate-600">② 에서 서명을 먼저 만들어 주세요.</p>}
            {error && <Notice tone="warn">{error}</Notice>}
          </section>
        </div>

        <section className="slw-card p-4 lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-sm font-extrabold text-slate-900">서명 위치 — 상자를 끌어 옮기고, 오른쪽 아래 점으로 크기를 바꾸세요</p>
          {!bg ? (
            <p className="rounded-xl bg-slate-50 p-10 text-center text-sm text-slate-600">문서를 넣으면 여기에 보입니다.</p>
          ) : (
            <div ref={boxRef} className="relative mx-auto w-full max-w-[720px] select-none overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ aspectRatio: `1 / ${bgAspect}` }} onPointerMove={onPointerMove} onPointerUp={() => (drag.current = null)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bg} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
              <div
                className="absolute cursor-move touch-none rounded border-2 border-dashed border-teal-600 bg-teal-50/20"
                style={{ left: `${place.x * 100}%`, top: `${place.y * 100}%`, width: `${place.w * 100}%`, height: `${place.h * 100}%` }}
                onPointerDown={(e) => onPointerDown(e, "move")}
              >
                {sig ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sig.dataUrl} alt="서명" className="pointer-events-none h-full w-full object-fill" draggable={false} />
                ) : (
                  <span className="flex h-full items-center justify-center text-[11px] font-bold text-teal-800">서명 자리</span>
                )}
                <span className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-teal-700 shadow" onPointerDown={(e) => onPointerDown(e, "resize")} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
