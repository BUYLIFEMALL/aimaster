"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, Undo2, X } from "lucide-react";

interface Stroke { size: number; pts: [number, number][] }

/** 지울 영역을 브러시로 칠하면 흑백 마스크 PNG(흰=지울 영역)를 만들어 돌려준다 */
export function MaskEditor({ src, onApply, onCancel, busy }: { src: string; onApply: (mask: Blob) => void; onCancel: () => void; busy: boolean }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [brush, setBrush] = useState(4); // 짧은 변 대비 %
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [count, setCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // [빠른 작업] 카드에서 열면 편집기는 위쪽 원본 카드 안이라 화면 밖일 수 있음 → 열릴 때 보이게 스크롤
  useEffect(() => { rootRef.current?.scrollIntoView?.({ block: "center" }); }, []);

  function onLoad() {
    const im = imgRef.current;
    if (im) setSize({ w: im.naturalWidth, h: im.naturalHeight });
  }

  const draw = (ctx: CanvasRenderingContext2D, color: string, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.fillStyle = color;
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      ctx.lineWidth = s.size;
      if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0][0], s.pts[0][1], s.size / 2, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  };

  const redraw = () => {
    const c = canvasRef.current;
    if (!c || !size) return;
    const ctx = c.getContext("2d");
    if (ctx) draw(ctx, "rgba(236,72,153,0.65)", size.w, size.h);
  };
  useEffect(() => { redraw(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [size, count]);

  const pos = (e: React.PointerEvent): [number, number] => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  const down = (e: React.PointerEvent) => {
    if (!size) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    current.current = { size: (Math.min(size.w, size.h) * brush) / 100, pts: [pos(e)] };
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!current.current) return;
    current.current.pts.push(pos(e));
    redraw();
  };
  const up = () => {
    if (current.current) { strokes.current.push(current.current); current.current = null; setCount(strokes.current.length); }
  };

  function apply() {
    if (!size || !strokes.current.length) return;
    const c = document.createElement("canvas");
    c.width = size.w; c.height = size.h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size.w, size.h);
    const layer = document.createElement("canvas");
    layer.width = size.w; layer.height = size.h;
    draw(layer.getContext("2d")!, "#fff", size.w, size.h);
    ctx.drawImage(layer, 0, 0);
    c.toBlob((b) => { if (b) onApply(b); }, "image/png");
  }

  return (
    <div className="bc-mask" ref={rootRef}>
      <div className="actions">
        <b>지울 영역을 브러시로 칠하세요</b>
        <label className="bc-inline">브러시 크기
          <input type="range" min={1} max={15} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
        </label>
        <button type="button" disabled={!count || busy} onClick={() => { strokes.current.pop(); setCount(strokes.current.length); }}><Undo2 size={14} />되돌리기</button>
        <button type="button" disabled={!count || busy} onClick={() => { strokes.current = []; setCount(0); }}><Eraser size={14} />모두 지우기</button>
      </div>
      <div className="bc-mask-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={src} alt="원본" onLoad={onLoad} crossOrigin="anonymous" />
        {size && (
          <canvas
            ref={canvasRef} width={size.w} height={size.h}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            aria-label="지울 영역 칠하기"
          />
        )}
      </div>
      <div className="actions">
        <button type="button" className="primary" disabled={!count || busy} onClick={apply}>{busy ? "지우는 중…" : "부분 삭제 실행"}</button>
        <button type="button" disabled={busy} onClick={onCancel}><X size={14} />취소</button>
      </div>
    </div>
  );
}
