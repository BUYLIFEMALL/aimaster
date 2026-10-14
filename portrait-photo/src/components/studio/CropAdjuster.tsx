"use client";
import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { controlsFromCrop, cropFromControls, evaluateHead, maxHeightFrac } from "@/lib/portrait/post";
import type { CropRect, SizePreset } from "@/lib/portrait/post";

// 저장 전 자르기 영역 미리보기·수동 조정. 왼쪽은 원본 위의 잘리는 영역, 오른쪽은 실제 저장될 모습이다.
export function CropAdjuster({ url, srcW, srcH, preset, initial, recommended, measure, mirrored, onSave, onClose, busy }: {
  url: string; srcW: number; srcH: number; preset: SizePreset; initial: CropRect; recommended: CropRect;
  measure: { crownY: number; chinY: number } | null; mirrored: boolean;
  onSave: (crop: CropRect) => void; onClose: () => void; busy: boolean;
}) {
  const aspect = preset.width / preset.height;
  const maxH = maxHeightFrac(srcW, srcH, aspect);
  const [c, setC] = useState(() => controlsFromCrop(initial, srcW, srcH));
  const dragging = useRef(false);
  const crop = useMemo(() => cropFromControls(c, srcW, srcH, aspect), [c, srcW, srcH, aspect]);

  function pointToCenter(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width);
    const y = ((e.clientY - r.top) / r.height);
    setC((cur) => ({ ...cur, centerX: Math.max(0, Math.min(1, x)), centerY: Math.max(0, Math.min(1, y)) }));
  }

  const left = (crop.sx / srcW) * 100;
  const top = (crop.sy / srcH) * 100;
  const w = (crop.sw / srcW) * 100;
  const h = (crop.sh / srcH) * 100;
  const px = srcW - crop.sw > 0 ? (crop.sx / (srcW - crop.sw)) * 100 : 0;
  const py = srcH - crop.sh > 0 ? (crop.sy / (srcH - crop.sh)) * 100 : 0;
  const zoom = srcW / crop.sw;
  const upscaled = crop.sw < preset.width;

  let headLine = "";
  let headOk: boolean | null = null;
  if (measure) {
    const ratio = ((measure.chinY - measure.crownY) * srcH) / crop.sh;
    const cropsHead = measure.crownY * srcH < crop.sy || measure.chinY * srcH > crop.sy + crop.sh;
    headLine = `머리 높이 약 ${Math.round(ratio * 100)}%`;
    if (preset.headRange) {
      const ev = evaluateHead(ratio, preset.headRange);
      headOk = ev.status === "ok" && !cropsHead;
      headLine += ` (기준 ${Math.round(preset.headRange[0] * 100)}~${Math.round(preset.headRange[1] * 100)}%) · ${ev.status === "ok" ? "범위 안" : ev.status === "small" ? "작음" : "큼"}`;
    }
    if (cropsHead) headLine += " · 머리가 잘립니다";
  }

  return (
    <div className="ca">
      <div className="ca-grid">
        <div>
          <b className="ca-title">원본에서 잘리는 영역</b>
          <div
            className="ca-src"
            style={{ aspectRatio: `${srcW} / ${srcH}` }}
            onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pointToCenter(e); }}
            onPointerMove={(e) => { if (dragging.current) pointToCenter(e); }}
            onPointerUp={() => { dragging.current = false; }}
            role="application"
            aria-label="자르기 영역 위치(끌어서 이동)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="원본 사진" draggable={false} />
            <div className="ca-frame" style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }} />
            {measure && (
              <>
                <i className="ca-line" style={{ top: `${measure.crownY * 100}%` }} title="정수리(추정)" />
                <i className="ca-line chin" style={{ top: `${measure.chinY * 100}%` }} title="턱(추정)" />
              </>
            )}
          </div>
          <small className="muted">사진 위를 끌면 영역이 움직입니다. 가는 선은 AI가 추정한 정수리·턱 위치입니다.</small>
        </div>
        <div>
          <b className="ca-title">저장될 모습 ({preset.width}×{preset.height}px)</b>
          <div
            className="ca-out"
            style={{
              aspectRatio: `${preset.width} / ${preset.height}`,
              backgroundImage: `url(${url})`,
              backgroundSize: `${(srcW / crop.sw) * 100}% auto`,
              backgroundPosition: `${px}% ${py}%`,
              transform: mirrored ? "scaleX(-1)" : undefined,
            }}
            role="img"
            aria-label="저장 미리보기"
          />
          {headLine && <p className={headOk === true ? "notice head-ok" : headOk === false ? "notice warning" : "notice"}>{headLine}</p>}
          {upscaled && <small className="muted">원본보다 확대돼 선명도가 낮아질 수 있습니다.</small>}
        </div>
      </div>

      <div className="ca-controls">
        <label className="slider"><span>확대</span>
          <input type="range" min={1} max={Math.max(1.01, 1 / 0.2)} step={0.05} value={Math.min(5, Math.max(1 / maxH, 1 / c.heightFrac))}
            onChange={(e) => setC((cur) => ({ ...cur, heightFrac: Math.min(maxH, 1 / Number(e.target.value)) }))} aria-label="확대 배율" />
          <b>{zoom.toFixed(1)}×</b>
        </label>
        <label className="slider"><span>가로</span>
          <input type="range" min={0} max={100} value={Math.round(c.centerX * 100)} onChange={(e) => setC((cur) => ({ ...cur, centerX: Number(e.target.value) / 100 }))} aria-label="가로 위치" />
          <b>{Math.round(c.centerX * 100)}</b>
        </label>
        <label className="slider"><span>세로</span>
          <input type="range" min={0} max={100} value={Math.round(c.centerY * 100)} onChange={(e) => setC((cur) => ({ ...cur, centerY: Number(e.target.value) / 100 }))} aria-label="세로 위치" />
          <b>{Math.round(c.centerY * 100)}</b>
        </label>
      </div>

      <div className="actions">
        <button type="button" className="primary" disabled={busy} onClick={() => onSave(crop)}><Download size={14} />이 영역으로 규격 저장</button>
        <button type="button" onClick={() => setC(controlsFromCrop(recommended, srcW, srcH))}>추천 영역으로 되돌리기</button>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
