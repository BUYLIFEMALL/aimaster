"use client";

// v1.25: 생성된 섹션 이미지 위 문구(가격·행사 날짜 등)를 브라우저 안에서 고친다. AI 호출 없음.
// 고칠 부분을 사각형으로 지정 → 주변 색으로 덮기 → 새 문구 쓰기. 여러 곳을 차례로 고칠 수 있고,
// 결과는 기존 「직접 등록」과 같은 길로 새 버전으로 저장된다(원본은 버전 목록에 남음).
import { useEffect, useRef, useState } from "react";
import { imageSrc } from "@/lib/imageSrc";

type Rect = { x: number; y: number; w: number; h: number };
type TextEdit = Rect & {
  fill: string;
  text: string;
  size: number;
  color: string;
  bold: boolean;
  align: "left" | "center" | "right";
};

const FONT_FAMILY = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

/** 사각형 테두리 바로 바깥 픽셀의 평균색 — 덮기 색 기본값 */
function sampleBorderColor(ctx: CanvasRenderingContext2D, r: Rect): string {
  const { width, height } = ctx.canvas;
  const pts: [number, number][] = [];
  const step = Math.max(1, Math.floor(Math.max(r.w, r.h) / 40));
  for (let x = r.x; x <= r.x + r.w; x += step) pts.push([x, r.y - 2], [x, r.y + r.h + 2]);
  for (let y = r.y; y <= r.y + r.h; y += step) pts.push([r.x - 2, y], [r.x + r.w + 2, y]);
  let rs = 0, gs = 0, bs = 0, n = 0;
  for (const [x, y] of pts) {
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    rs += d[0]; gs += d[1]; bs += d[2]; n++;
  }
  if (!n) return "#ffffff";
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(rs)}${hex(gs)}${hex(bs)}`;
}

function drawEdit(ctx: CanvasRenderingContext2D, e: TextEdit) {
  ctx.fillStyle = e.fill;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  if (!e.text.trim()) return;
  ctx.fillStyle = e.color;
  ctx.font = `${e.bold ? 800 : 500} ${e.size}px ${FONT_FAMILY}`;
  ctx.textAlign = e.align;
  ctx.textBaseline = "middle";
  const lines = e.text.split("\n");
  const lineHeight = e.size * 1.25;
  const top = e.y + e.h / 2 - ((lines.length - 1) * lineHeight) / 2;
  const x = e.align === "left" ? e.x + e.size * 0.2 : e.align === "right" ? e.x + e.w - e.size * 0.2 : e.x + e.w / 2;
  lines.forEach((line, i) => ctx.fillText(line, x, top + i * lineHeight, e.w));
}

export function ImageTextEditor({
  imageUrl,
  sectionName,
  onCancel,
  onSave,
}: {
  imageUrl: string;
  sectionName: string;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<ImageBitmap | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edits, setEdits] = useState<TextEdit[]>([]);
  const [draft, setDraft] = useState<TextEdit | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 원본 이미지 불러오기(우리 저장소 주소 → 서명 주소로 받아 캔버스에 그림)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(imageSrc(imageUrl));
        if (!res.ok) throw new Error(`이미지를 불러오지 못했습니다(${res.status}).`);
        const bitmap = await createImageBitmap(await res.blob());
        if (cancelled) return;
        baseRef.current = bitmap;
        const canvas = canvasRef.current!;
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "이미지를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // 원본 + 적용한 수정 + 작성 중인 수정(점선 테두리)을 다시 그린다
  useEffect(() => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(base, 0, 0);
    for (const e of edits) drawEdit(ctx, e);
    if (draft) {
      drawEdit(ctx, draft);
      ctx.save();
      ctx.setLineDash([Math.max(6, canvas.width / 120), Math.max(4, canvas.width / 180)]);
      ctx.lineWidth = Math.max(2, canvas.width / 300);
      ctx.strokeStyle = "#2563eb";
      ctx.strokeRect(draft.x, draft.y, draft.w, draft.h);
      ctx.restore();
    }
  }, [edits, draft]);

  function toImagePoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, ((e.clientX - box.left) / box.width) * canvas.width)),
      y: Math.max(0, Math.min(canvas.height, ((e.clientY - box.top) / box.height) * canvas.height)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!baseRef.current || isSaving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = toImagePoint(e);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragStart.current;
    if (!start) return;
    const p = toImagePoint(e);
    const rect = {
      x: Math.round(Math.min(start.x, p.x)),
      y: Math.round(Math.min(start.y, p.y)),
      w: Math.round(Math.abs(p.x - start.x)),
      h: Math.round(Math.abs(p.y - start.y)),
    };
    setDraft((prev) => ({
      ...rect,
      fill: prev?.fill ?? "#ffffff",
      text: prev?.text ?? "",
      size: Math.max(12, Math.round(rect.h * 0.6)),
      color: prev?.color ?? "#111111",
      bold: prev?.bold ?? true,
      align: prev?.align ?? "center",
    }));
  }

  function onPointerUp() {
    dragStart.current = null;
    setDraft((prev) => {
      if (!prev || prev.w < 8 || prev.h < 8) return null;
      // 덮기 색은 원본 이미지에서 고른다(이미 적용한 수정과 섞이지 않게 원본만 그린 임시 캔버스 사용)
      const base = baseRef.current!;
      const tmp = document.createElement("canvas");
      tmp.width = base.width;
      tmp.height = base.height;
      const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
      tctx.drawImage(base, 0, 0);
      return { ...prev, fill: sampleBorderColor(tctx, prev) };
    });
  }

  function applyDraft() {
    if (!draft) return;
    setEdits((prev) => [...prev, draft]);
    setDraft(null);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || edits.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    // 저장 이미지에는 점선이 들어가지 않도록 작성 중인 수정은 빼고 다시 그린다
    setDraft(null);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(baseRef.current!, 0, 0);
    for (const e of edits) drawEdit(ctx, e);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) {
      setIsSaving(false);
      setSaveError("이미지를 만들지 못했습니다.");
      return;
    }
    try {
      await onSave(new File([blob], `edited-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장하지 못했습니다.");
      setIsSaving(false);
    }
  }

  const set = <K extends keyof TextEdit>(key: K, value: TextEdit[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-4 sm:p-5 space-y-3 my-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">✏️ 문구 고치기 · {sectionName}</h3>
          <button type="button" onClick={onCancel} disabled={isSaving} className="text-xs font-bold text-slate-500 hover:text-slate-800 shrink-0">
            ✕ 닫기
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          ① 이미지에서 고칠 글자 위를 끌어 사각형으로 지정 → ② 새 문구·크기·색을 정하고 「이 부분 적용」 → 여러 곳을 반복한 뒤 「새 버전으로 저장」.
          덮는 색은 사각형 주변 색으로 자동으로 고르며 바꿀 수 있습니다. 원래 이미지는 버전 목록에 그대로 남습니다.
        </p>

        {loadError ? (
          <p className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200">{loadError}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50 cursor-crosshair touch-none"
            />
            <div className="space-y-2 text-xs">
              {draft ? (
                <>
                  <label className="block font-bold text-slate-700">
                    새 문구
                    <textarea
                      value={draft.text}
                      onChange={(e) => set("text", e.target.value)}
                      rows={3}
                      placeholder="예: 오늘만 19,900원"
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="font-bold text-slate-700">
                      글자 크기
                      <input type="number" min={8} max={400} value={draft.size} onChange={(e) => set("size", Number(e.target.value) || 12)} className="mt-1 w-full rounded-lg border border-slate-200 p-1.5 font-normal" />
                    </label>
                    <label className="font-bold text-slate-700">
                      정렬
                      <select value={draft.align} onChange={(e) => set("align", e.target.value as TextEdit["align"])} className="mt-1 w-full rounded-lg border border-slate-200 p-1.5 font-normal">
                        <option value="left">왼쪽</option>
                        <option value="center">가운데</option>
                        <option value="right">오른쪽</option>
                      </select>
                    </label>
                    <label className="font-bold text-slate-700">
                      글자 색
                      <input type="color" value={draft.color} onChange={(e) => set("color", e.target.value)} className="mt-1 block w-full h-8 rounded border border-slate-200" />
                    </label>
                    <label className="font-bold text-slate-700">
                      덮는 색
                      <input type="color" value={draft.fill} onChange={(e) => set("fill", e.target.value)} className="mt-1 block w-full h-8 rounded border border-slate-200" />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 font-bold text-slate-700">
                    <input type="checkbox" checked={draft.bold} onChange={(e) => set("bold", e.target.checked)} />
                    굵게
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={applyDraft} className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold py-2">
                      이 부분 적용
                    </button>
                    <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-slate-200 px-3 font-bold text-slate-600">
                      취소
                    </button>
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-slate-600 leading-relaxed">
                  이미지 위를 끌어 고칠 부분을 지정해 주세요. 휴대폰에서는 손가락으로 끌면 됩니다.
                </p>
              )}
              <div className="flex items-center justify-between text-slate-500 pt-1">
                <span>적용한 수정 {edits.length}곳</span>
                <button
                  type="button"
                  onClick={() => setEdits((prev) => prev.slice(0, -1))}
                  disabled={edits.length === 0 || isSaving}
                  className="font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                >
                  ↶ 마지막 수정 되돌리기
                </button>
              </div>
              <button
                type="button"
                onClick={() => void save()}
                disabled={edits.length === 0 || isSaving || Boolean(draft)}
                title={draft ? "작성 중인 부분을 먼저 적용하거나 취소해 주세요" : undefined}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-2.5 disabled:opacity-40"
              >
                {isSaving ? "저장 중..." : "💾 새 버전으로 저장"}
              </button>
              {saveError && <p className="font-semibold text-rose-700">{saveError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
