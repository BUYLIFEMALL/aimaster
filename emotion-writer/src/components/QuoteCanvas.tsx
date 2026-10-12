"use client";

import { useEffect, useRef, useState } from "react";
import { renderQuote, canvasBlob } from "@/lib/studio/render";
import { ratioSize, type Ratio, type Design } from "@/lib/studio/config";
import { Download, Image as ImageIcon, Loader2 } from "lucide-react";

export function QuoteCanvas({
  image,
  quote,
  ratio,
  design,
  busy,
}: {
  image: string;
  quote: string;
  ratio: Ratio;
  design: Design;
  busy: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const identity = JSON.stringify([quote, ratio, design]);
  const [result, setResult] = useState({ identity: "", image: "", error: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!image || !quote) return;
    let cancelled = false;
    const draft = document.createElement("canvas");
    renderQuote(draft, image, quote, ratio, design)
      .then(() => {
        if (cancelled || !canvas.current) return;
        canvas.current.width = draft.width;
        canvas.current.height = draft.height;
        const ctx = canvas.current.getContext("2d");
        if (!ctx) throw new Error("미리보기 캔버스를 만들지 못했습니다.");
        ctx.drawImage(draft, 0, 0);
        setResult({ identity, image, error: "" });
      })
      .catch((e) => {
        if (!cancelled)
          setResult({
            identity,
            image,
            error:
              e instanceof Error ? e.message : "미리보기를 만들지 못했습니다.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [image, quote, ratio, design, identity]);

  const ready = Boolean(
    image &&
      quote &&
      result.identity === identity &&
      result.image === image &&
      !result.error,
  );
  const size = ratioSize(ratio);

  async function download(format: "png" | "jpeg") {
    if (!canvas.current || !ready || busy || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const blob = await canvasBlob(canvas.current, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `감성글귀-${ratio.replace(":", "x")}-${Date.now()}.${format === "jpeg" ? "jpg" : "png"}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "이미지 파일을 준비했습니다. 브라우저 다운로드 목록을 확인해 주세요.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "이미지를 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="preview-frame"
        style={{
          aspectRatio: ratio.replace(":", "/"),
          maxWidth: Math.min(420, (660 * size.width) / size.height),
        }}
      >
        <canvas
          ref={canvas}
          className={ready ? "quote-canvas" : "quote-canvas invisible"}
          aria-label="완성된 감성 글귀 이미지 미리보기"
        />
        {!ready && (
          <div className="preview-message">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-rose-400 mb-3 shadow-inner">
              {image && quote ? (
                <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <strong>
              {result.identity === identity &&
              result.image === image &&
              result.error
                ? result.error
                : image && quote
                  ? "글꼴과 이미지를 합성하고 있습니다…"
                  : "문구와 배경을 선택해 주세요"}
            </strong>
            <p>
              {image && quote
                ? "고해상도 캔버스에 렌더링 중입니다"
                : "선택한 문구를 아름다운 배경 위에 담아드립니다"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          {size.width} × {size.height}px
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {ratio} 비율
        </span>
      </div>

      <div className="button-row">
        <button
          className="primary flex items-center justify-center gap-2"
          disabled={!ready || busy || saving}
          onClick={() => download("png")}
        >
          <Download size={16} />
          <span>PNG 저장</span>
        </button>
        <button
          className="flex items-center justify-center gap-2"
          disabled={!ready || busy || saving}
          onClick={() => download("jpeg")}
        >
          <Download size={16} />
          <span>JPG 저장</span>
        </button>
      </div>

      {notice && (
        <p role="status" className="status-note centered">
          {notice}
        </p>
      )}
    </>
  );
}
