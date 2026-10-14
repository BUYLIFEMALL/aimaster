"use client";
import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { BALLOON_COLORS, BALLOON_SHAPES, MAX_ROTATION, SCALE, applyDrag, normalizeBalloon } from "@/lib/comic/balloon";
import type { Balloon } from "@/lib/comic/balloon";
import { drawBalloon } from "@/lib/comic/draw";

type Mode = "move" | "resize" | "tail";

/**
 * 컷 1장의 말풍선 편집기. 그림 위 투명 캔버스에 말풍선을 그리고, 주황 점(편집용, 저장 그림에는 안 들어감)을
 * 마우스·터치로 끌어 이동·크기·꼬리를 바꾼다. 끄는 동안은 화면 안에서만 바꾸고, 손을 떼면 onCommit으로 확정한다.
 */
export function BalloonEditor(props: {
  index: number; image: string; text: string; balloon: Balloon; busy: boolean;
  onCommit: (b: Balloon) => void; onReset: () => void; onRelayout?: () => void; onClose: () => void;
}) {
  const { index, image, text, balloon, busy, onCommit, onReset, onRelayout, onClose } = props;
  const [draft, setDraft] = useState(balloon);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ mode: Mode; x: number; y: number; start: Balloon } | null>(null);

  useEffect(() => { setDraft(balloon); }, [balloon]);

  // 미리보기 다시 그리기(화면 크기가 바뀌어도 따라감)
  useEffect(() => {
    const el = stage.current;
    const c = canvas.current;
    if (!el || !c) return;
    const paint = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      drawBalloon(ctx, c.width, c.height, draft, text);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    return () => ro.disconnect();
  }, [draft, text]);

  function commit(next: Balloon) { setDraft(next); onCommit(next); }

  const down = (mode: Mode) => (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: draft };
  };
  function move(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    const el = stage.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    setDraft(applyDrag(d.start, d.mode, ((e.clientX - d.x) / r.width) * SCALE, ((e.clientY - d.y) / r.height) * SCALE));
  }
  function up() {
    if (!drag.current) return;
    drag.current = null;
    onCommit(draft);
  }
  function key(e: React.KeyboardEvent) {
    const step = 10;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const a = arrows[e.key];
    if (!a) return;
    e.preventDefault();
    commit(applyDrag(draft, e.shiftKey ? "resize" : "move", a[0], a[1]));
  }

  const pct = (v: number) => `${v / 10}%`;
  const handlers = { onPointerMove: move, onPointerUp: up, onPointerCancel: up };

  return (
    <section className="cc-editor" aria-label={`${index + 1}컷 말풍선 편집`}>
      <div className="cc-editor-head">
        <b>{index + 1}컷 말풍선 편집</b>
        <small className="muted">상자를 끌어 옮기고, 오른쪽 아래 점으로 크기, 꼬리 끝 점으로 방향을 바꿉니다. 키보드: 화살표 이동, Shift+화살표 크기. 주황 점은 저장 그림에 들어가지 않습니다.</small>
      </div>
      <div className="cc-stage" ref={stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`${index + 1}컷 그림`} draggable={false} />
        <canvas ref={canvas} aria-hidden="true" />
        <div
          className="cc-box" role="button" tabIndex={0} aria-label="말풍선 위치(끌어서 이동)"
          style={{ left: pct(draft.x), top: pct(draft.y), width: pct(draft.w), height: pct(draft.h), transform: `rotate(${draft.rotation}deg)` }}
          onPointerDown={down("move")} onKeyDown={key} {...handlers}
        >
          <span className="cc-handle cc-resize" aria-label="크기 조절" onPointerDown={down("resize")} {...handlers} />
        </div>
        {draft.tail && (
          <span className="cc-handle cc-tail" aria-label="꼬리 끝(끌어서 방향 조절)" style={{ left: pct(draft.tail.x), top: pct(draft.tail.y) }} onPointerDown={down("tail")} {...handlers} />
        )}
      </div>
      <div className="cc-editor-tools">
        <div>
          <b className="cc-label">모양</b>
          <div className="chips">
            {BALLOON_SHAPES.map((s) => (
              <button key={s.id} type="button" className={`chip${draft.shape === s.id ? " on" : ""}`} onClick={() => commit({ ...draft, shape: s.id })}>{s.name}</button>
            ))}
            <button type="button" className={`chip${draft.tail ? " on" : ""}`} aria-pressed={!!draft.tail}
              onClick={() => commit(normalizeBalloon({ ...draft, tail: draft.tail ? null : { x: draft.x + draft.w / 2, y: Math.min(SCALE, draft.y + draft.h + 120) } }, draft))}>
              꼬리 {draft.tail ? "있음" : "없음"}
            </button>
          </div>
        </div>
        <label>회전 {draft.rotation}°
          <input type="range" min={-MAX_ROTATION} max={MAX_ROTATION} step={1} value={draft.rotation}
            onChange={(e) => setDraft({ ...draft, rotation: Number(e.target.value) })} onPointerUp={() => onCommit(draft)} onKeyUp={() => onCommit(draft)} />
        </label>
        <div>
          <b className="cc-label">테두리 색</b>
          <div className="cc-swatches">
            {BALLOON_COLORS.map((c) => (
              <button key={c} type="button" className={`cc-swatch${draft.color === c ? " on" : ""}`} style={{ background: c }} aria-label={`테두리 색 ${c}`} aria-pressed={draft.color === c} onClick={() => commit({ ...draft, color: c })} />
            ))}
          </div>
        </div>
        <div className="actions">
          {onRelayout && <button type="button" onClick={onRelayout} disabled={busy}><Sparkles size={14} />{busy ? "AI가 배치하는 중..." : "AI 다시 배치"}</button>}
          <button type="button" onClick={onReset} disabled={busy}><RotateCcw size={14} />기본 위치로</button>
          <button type="button" className="primary" onClick={onClose}><Check size={14} />편집 완료</button>
        </div>
      </div>
    </section>
  );
}
