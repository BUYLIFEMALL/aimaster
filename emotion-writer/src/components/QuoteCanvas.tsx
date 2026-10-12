"use client";
import { useEffect, useRef, useState } from "react";
import { renderQuote, canvasBlob } from "@/lib/studio/render";
import { ratioSize, type Ratio, type Design } from "@/lib/studio/config";

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
    image && quote && result.identity === identity && result.image === image && !result.error,
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
            <span className="preview-icon">🎨</span>
            <strong>
              {result.identity === identity && result.image === image && result.error
                ? result.error
                : image && quote
                  ? "글꼴과 이미지를 준비하고 있습니다."
                  : "문구와 배경을 선택해 주세요."}
            </strong>
            <p>선택한 문구를 배경 위에 담아드립니다.</p>
          </div>
        )}
      </div>
      <p className="muted centered">
        {size.width} × {size.height}px · {ratio}
      </p>
      <div className="button-row">
        <button
          className="primary"
          disabled={!ready || busy || saving}
          onClick={() => download("png")}
        >
          PNG 저장
        </button>
        <button
          disabled={!ready || busy || saving}
          onClick={() => download("jpeg")}
        >
          JPG 저장
        </button>
      </div>
      {notice && (
        <p role="status" className="muted">
          {notice}
        </p>
      )}
    </>
  );
}
