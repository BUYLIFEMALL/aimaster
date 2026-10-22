"use client";

import { useEffect, useRef, useState } from "react";
import { averageDiff, colorDiffPercent, containPoint, defaultSplit, percentAt, percentForKey, splitClip, toHex, type SplitMode } from "@/lib/dna/compare";
import { imageStudioLink } from "@/lib/dna/studioLink";
import { bestTrendIndex, promptPreview, sparklinePoints, sparklineXY, spotChange, type CheckSpot, type TrendPoint } from "@/lib/dna/checkSpots";

type Pixels = { data: Uint8ClampedArray; w: number; h: number; natW: number; natH: number };
type RGB = [number, number, number];

/** 색 집게용: 이미지를 최대 1024px로 줄여 픽셀을 한 번 읽어 둔다(원본 버킷·data URL 모두 crossOrigin으로 읽음) */
function usePixels(src: string): Pixels | null {
  const [px, setPx] = useState<{ src: string; px: Pixels } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      try {
        setPx({ src, px: { data: ctx.getImageData(0, 0, w, h).data, w, h, natW: img.naturalWidth, natH: img.naturalHeight } });
      } catch {
        // 다른 도메인 이미지를 읽을 수 없으면 색 집게만 숨긴다
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return px?.src === src ? px.px : null;
}

/** 틀 안 위치의 색(주변 5×5 평균). 그림 밖 여백이면 null */
function pick(px: Pixels | null, frameW: number, frameH: number, xPct: number, yPct: number): RGB | null {
  if (!px) return null;
  const p = containPoint(frameW, frameH, px.natW, px.natH, xPct, yPct);
  if (!p) return null;
  const cx = Math.floor((p.x * px.w) / px.natW);
  const cy = Math.floor((p.y * px.h) / px.natH);
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= px.w || y >= px.h) continue;
      const i = (y * px.w + x) * 4;
      r += px.data[i]; g += px.data[i + 1]; b += px.data[i + 2]; n++;
    }
  }
  return n ? [r / n, g / n, b / n] : null;
}

function Swatch({ label, rgb }: { label: string; rgb: RGB | null }) {
  const hex = rgb ? toHex(...rgb) : null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="h-7 w-7 shrink-0 rounded-lg border border-slate-300 shadow-2xs" style={{ background: hex ?? "transparent", backgroundImage: hex ? undefined : "repeating-linear-gradient(45deg,#cbd5e1 0 4px,transparent 4px 8px)" }} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <p className="font-mono text-xs font-black text-slate-900">{hex ?? "—"}</p>
      </div>
    </div>
  );
}

type Spot = { id: number; x: number; y: number; a: RGB | null; b: RGB | null };
const MAX_SPOTS = 8;

/**
 * F5(v1.27~): 원본과 생성 이미지를 같은 틀에 겹쳐 선을 끌어 비교한다(바나나 캔버스 Compare 참고).
 * 틀 비율은 원본을 따르고, 두 이미지 모두 잘리지 않게 틀 안에 맞춘다(object-contain).
 * v1.29: 동그라미 자리(선 위치·높이)의 원본·생성 색을 HEX와 차이(%)로 보여 주는 색 집게.
 * v1.31: 가로/세로 분할 전환(세로가 긴 원본은 처음부터 위아래), 점검 지점 최대 8곳 저장·평균 차이.
 * v1.32: 점검 지점을 분석 보관함에 저장(savedSpots·onSaveSpots), 다시 생성하면 같은 자리의 「이전 → 지금」 차이 비교.
 * v1.34: 새 결과마다 저장된 지점의 평균 차이를 한 번 기록(onTrend)하고 작은 추세 그래프로 보여 준다.
 * v1.35: 그래프의 점을 누르면 그 회차의 평균 차이와 그때 쓴 프롬프트를 보여 주고, 「🏆 최고 기록」(가장 낮은 차이) 표시·편집 칸으로 불러오기.
 */
export function CompareSlider({ before, after, maxHeight = 480, savedSpots = [], onSaveSpots, trend = [], onTrend, onLoadPrompt }: { before: string; after: string; maxHeight?: number; savedSpots?: CheckSpot[]; onSaveSpots?: (spots: CheckSpot[]) => Promise<void>; trend?: TrendPoint[]; onTrend?: (avg: number, n: number) => void; onLoadPrompt?: (prompt: string, round: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [posY, setPosY] = useState(50);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<SplitMode | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const nextId = useRef(1);
  const [saveMsg, setSaveMsg] = useState("");
  const [savingSpots, setSavingSpots] = useState(false);
  const beforePx = usePixels(before);
  const afterPx = usePixels(after);
  const split: SplitMode = mode ?? (size ? defaultSplit(size.w, size.h) : "horizontal");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrame({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moveTo = (clientX: number, clientY: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(percentAt(clientX, r.left, r.width));
    setPosY(percentAt(clientY, r.top, r.height));
  };

  const a = frame ? pick(beforePx, frame.w, frame.h, pos, posY) : null;
  const b = frame ? pick(afterPx, frame.w, frame.h, pos, posY) : null;
  const diffOf = (x: RGB | null, y: RGB | null) => (x && y ? colorDiffPercent(x, y) : null);
  const avg = averageDiff(spots.map((s) => diffOf(s.a, s.b)));
  const nowDiff = diffOf(a, b);

  // v1.32: 저장된 지점을 지금 결과에서 다시 재서 이전 차이와 비교
  const compared = frame
    ? savedSpots.map((sp) => {
        const now = diffOf(pick(beforePx, frame.w, frame.h, sp.x, sp.y), pick(afterPx, frame.w, frame.h, sp.x, sp.y));
        return { sp, now, change: spotChange(sp.diff, now) };
      })
    : [];
  const prevAvg = averageDiff(savedSpots.map((s) => s.diff));
  const nowAvg = averageDiff(compared.map((c) => c.now));
  const avgChange = spotChange(prevAvg, nowAvg);

  // v1.34: 결과(after)마다 한 번만 추세에 기록 — 두 이미지 픽셀을 다 읽은 뒤
  const recordedFor = useRef<string | null>(null);
  const measuredN = compared.filter((c) => c.now !== null).length;
  useEffect(() => {
    if (!onTrend || nowAvg === null || !beforePx || !afterPx || recordedFor.current === after) return;
    recordedFor.current = after;
    onTrend(nowAvg, measuredN);
  }, [onTrend, nowAvg, beforePx, afterPx, after, measuredN]);
  const trendValues = trend.map((t) => t.avg);
  const [pickedTrend, setPickedTrend] = useState<number | null>(null);
  const picked = pickedTrend !== null ? trend[pickedTrend] ?? null : null;
  const bestIdx = trendValues.length > 1 ? bestTrendIndex(trendValues) : -1;
  const trendChange = trendValues.length > 1 ? spotChange(trendValues[0], trendValues[trendValues.length - 1]) : null;

  const persist = async () => {
    if (!onSaveSpots || !spots.length) return;
    setSavingSpots(true);
    setSaveMsg("");
    try {
      const at = new Date().toISOString();
      await onSaveSpots(spots.map((s) => ({ x: s.x, y: s.y, diff: diffOf(s.a, s.b), at })));
      setSaveMsg(`보관함에 ${spots.length}곳을 저장했습니다. 프롬프트를 고쳐 다시 만들면 같은 자리를 비교해 드립니다.`);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSavingSpots(false);
    }
  };

  const loadSaved = () => {
    setSpots(savedSpots.map((sp) => ({ id: nextId.current++, x: sp.x, y: sp.y, a: frame ? pick(beforePx, frame.w, frame.h, sp.x, sp.y) : null, b: frame ? pick(afterPx, frame.w, frame.h, sp.x, sp.y) : null })));
  };

  const saveSpot = () => {
    if (spots.length >= MAX_SPOTS) return;
    setSpots((list) => [...list, { id: nextId.current++, x: pos, y: posY, a, b }]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-[11px] font-bold text-slate-500">나누기</span>
        {(["horizontal", "vertical"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={split === m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${split === m ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"}`}
          >
            {m === "horizontal" ? "◧ 좌우" : "⬒ 위아래"}
          </button>
        ))}
      </div>
      <div
        ref={box}
        className={`relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-crosshair"}`}
        // 틀은 원본 비율 그대로, 최대 높이를 넘지 않게 폭을 줄인다(폭만 꽉 채우면 원본이 가운데에만 작게 보여 같은 자리 비교가 안 됨)
        style={size ? { aspectRatio: `${size.w} / ${size.h}`, maxWidth: `min(100%, ${Math.round((maxHeight * size.w) / size.h)}px)` } : { aspectRatio: "1 / 1", maxWidth: `min(100%, ${maxHeight}px)` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); moveTo(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (dragging) moveTo(e.clientX, e.clientY); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="생성 이미지" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        <div className="absolute inset-0" style={{ clipPath: splitClip(split, pos, posY) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt="원본 이미지"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setSize({ w: i.naturalWidth, h: i.naturalHeight }); }}
          />
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-[11px] font-bold text-white">원본</span>
        <span className={`pointer-events-none absolute rounded-md bg-violet-700/80 px-2 py-0.5 text-[11px] font-bold text-white ${split === "vertical" ? "left-2 bottom-2" : "right-2 top-2"}`}>생성</span>
        {split === "vertical"
          ? <span className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.35)]" style={{ top: `${posY}%` }} />
          : <span className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.35)]" style={{ left: `${pos}%` }} />}
        {savedSpots.map((s, n) => (
          <span key={`saved-${n}`} data-saved-spot={n + 1} className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-sky-400" style={{ left: `${s.x}%`, top: `${s.y}%` }} />
        ))}
        {spots.map((s, n) => (
          <span key={s.id} data-spot={n + 1} className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-amber-500 text-[10px] font-black text-white shadow" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            {n + 1}
          </span>
        ))}
        <span
          role="slider"
          tabIndex={0}
          aria-label="원본과 생성 이미지 비교 위치"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={split === "vertical" ? posY : pos}
          onKeyDown={(e) => {
            const n = percentForKey(pos, e.key, e.shiftKey);
            if (n !== null) { e.preventDefault(); setPos(n); return; }
            const y = percentForKey(posY, e.key === "ArrowUp" ? "ArrowLeft" : e.key === "ArrowDown" ? "ArrowRight" : "", e.shiftKey);
            if (y !== null) { e.preventDefault(); setPosY(y); return; }
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); saveSpot(); }
          }}
          className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-violet-700 text-xs font-black text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          style={{ left: `${pos}%`, top: `${posY}%` }}
        >
          {split === "vertical" ? "⇅" : "⇆"}
        </span>
      </div>
      {(beforePx || afterPx) && (
        <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2" aria-label="색 집게">
          <Swatch label="원본 색" rgb={a} />
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500">색 차이</p>
            <p className="text-sm font-black text-slate-900">{nowDiff === null ? "—" : `${nowDiff}%`}</p>
          </div>
          <Swatch label="생성 색" rgb={b} />
          <button
            type="button"
            onClick={saveSpot}
            disabled={spots.length >= MAX_SPOTS}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            📍 이 자리 저장 ({spots.length}/{MAX_SPOTS})
          </button>
        </div>
      )}
      {spots.length > 0 && (
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2" aria-label="점검 지점">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-900">점검 지점 {spots.length}곳 · 평균 차이 <span data-avg>{avg === null ? "—" : `${avg}%`}</span></p>
            <div className="flex items-center gap-3">
              {onSaveSpots && (
                <button type="button" onClick={() => void persist()} disabled={savingSpots} className="text-[11px] font-bold text-sky-400 hover:underline disabled:opacity-50">
                  {savingSpots ? "저장 중…" : "💾 보관함에 저장"}
                </button>
              )}
              <button type="button" onClick={() => setSpots([])} className="text-[11px] font-bold text-slate-500 hover:underline">모두 지우기</button>
            </div>
          </div>
          <ul className="space-y-1">
            {spots.map((s, n) => {
              const d = diffOf(s.a, s.b);
              return (
                <li key={s.id} className="flex items-center gap-2 text-[11px] text-slate-900">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">{n + 1}</span>
                  <span className="font-mono">{s.a ? toHex(...s.a) : "—"}</span>
                  <span aria-hidden>→</span>
                  <span className="font-mono">{s.b ? toHex(...s.b) : "—"}</span>
                  <span className="ml-auto font-bold text-slate-900">{d === null ? "—" : `${d}%`}</span>
                  <button type="button" aria-label={`${n + 1}번 지점 지우기`} onClick={() => setSpots((list) => list.filter((x) => x.id !== s.id))} className="text-slate-400 hover:text-slate-700">✕</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {saveMsg && <p role="status" className="mx-auto max-w-md text-[11px] font-bold text-slate-900">{saveMsg}</p>}
      {savedSpots.length > 0 && (
        <div className="mx-auto max-w-md rounded-xl border border-sky-300 bg-white px-3 py-2" aria-label="이전 기록과 비교">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-900">
              이전 기록과 비교 · 평균 <span data-prev-avg>{prevAvg === null ? "—" : `${prevAvg}%`}</span> → <span data-now-avg>{nowAvg === null ? "—" : `${nowAvg}%`}</span>
              {avgChange && <TrendMark trend={avgChange.trend} delta={avgChange.delta} />}
            </p>
            <button type="button" onClick={loadSaved} className="shrink-0 text-[11px] font-bold text-sky-400 hover:underline">지점 불러오기</button>
          </div>
          {trendValues.length > 0 && (
            <div className="mb-2 flex items-center gap-3 rounded-lg border border-slate-200 px-2 py-1.5" aria-label="추세">
              <svg width="132" height="34" viewBox="0 0 132 34" className="shrink-0" role="group" aria-label="추세 회차 고르기">
                <polyline points={sparklinePoints(trendValues, 132, 34, 6)} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {sparklineXY(trendValues, 132, 34, 6).map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={pickedTrend === i ? 5 : i === bestIdx ? 4.5 : 3.5}
                    fill={pickedTrend === i ? "#f59e0b" : i === bestIdx ? "#22c55e" : "#38bdf8"}
                    stroke="#fff"
                    strokeWidth="1"
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`${i + 1}회차 ${trendValues[i]}%`}
                    data-trend-dot={i + 1}
                    onClick={() => setPickedTrend(pickedTrend === i ? null : i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPickedTrend(pickedTrend === i ? null : i); } }}
                  />
                ))}
              </svg>
              <p className="text-[11px] text-slate-900">
                추세 {trendValues.length}회 · 처음 <span data-trend-first>{trendValues[0]}%</span> → 최근 <span data-trend-last>{trendValues[trendValues.length - 1]}%</span>
                {trendChange && <TrendMark trend={trendChange.trend} delta={trendChange.delta} />}
                {bestIdx >= 0 && (
                  <button type="button" data-trend-best={bestIdx + 1} onClick={() => setPickedTrend(bestIdx)} className="ml-2 font-bold text-emerald-400 hover:underline">
                    🏆 최고 기록 {bestIdx + 1}회차 {trendValues[bestIdx]}%
                  </button>
                )}
                <span className="block text-[10px] opacity-80">선이 올라갈수록 원본 색에 가까워진 것입니다. 점을 누르면 그때 쓴 프롬프트를 보여 드립니다.</span>
              </p>
            </div>
          )}
          {picked && (
            <div className="mb-2 rounded-lg border border-amber-400/60 px-2 py-1.5 text-[11px] text-slate-900" data-trend-picked>
              <b>{(pickedTrend ?? 0) + 1}회차{pickedTrend === bestIdx ? " 🏆" : ""}</b> · {new Date(picked.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · 평균 차이 <b>{picked.avg}%</b> ({picked.n}곳)
              <p className="mt-0.5 break-words font-mono text-[10px] opacity-90">{picked.prompt ? `「${promptPreview(picked.prompt)}」` : "이 회차는 프롬프트가 기록되지 않았습니다(v1.35 이전 기록)."}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {picked.prompt && onLoadPrompt && (
                  <button type="button" data-load-prompt onClick={() => onLoadPrompt(picked.prompt!, (pickedTrend ?? 0) + 1)} className="font-bold text-sky-400 hover:underline">
                    ✏ 이 프롬프트를 편집 칸으로 불러오기
                  </button>
                )}
                {/* v1.35: 검증된 회차의 프롬프트로 AI 이미지 자동화에서 본 작업 이미지 — 글자만 넘기고 자동 생성 없음 */}
                {picked.prompt && imageStudioLink(picked.prompt) && (
                  <a
                    href={imageStudioLink(picked.prompt)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-studio-link
                    title="이 회차 프롬프트를 AI 이미지 스튜디오 프롬프트 칸에 채워 엽니다 — 엔진·모델을 고른 뒤 직접 [생성]을 누르세요"
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-300 hover:bg-amber-500/20"
                  >
                    <span aria-hidden>🎨</span>
                    <span>이미지 스튜디오에서 생성</span>
                  </a>
                )}
              </div>
            </div>
          )}
          <ul className="space-y-1">
            {compared.map(({ sp, now, change }, n) => (
              <li key={n} className="flex items-center gap-2 text-[11px] text-slate-900">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-sky-400 text-[9px] font-black text-slate-900">{n + 1}</span>
                <span>{new Date(sp.at).toLocaleDateString("ko-KR")} 저장</span>
                <span className="ml-auto font-mono">{sp.diff === null ? "—" : `${sp.diff}%`}</span>
                <span aria-hidden>→</span>
                <span className="font-mono font-bold text-slate-900">{now === null ? "—" : `${now}%`}</span>
                {change ? <TrendMark trend={change.trend} delta={change.delta} /> : <span className="w-12" />}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-slate-900 opacity-80">점선 동그라미가 저장된 자리입니다. 차이가 줄면(↓) 원본 색에 더 가까워진 것입니다.</p>
        </div>
      )}
      <p className="text-[11px] text-slate-500">틀을 누르거나 끌면 선과 동그라미가 그 자리로 옵니다. 동그라미 자리의 원본·생성 색을 비교하고 「📍 이 자리 저장」(또는 동그라미에서 Enter)으로 여러 곳을 모아 평균 차이를 보세요. 키보드: ←/→ 좌우, ↑/↓ 위아래. 「—」는 그 자리에 그림이 없는 여백입니다.</p>
    </div>
  );
}

/** v1.32: 변화 표시 — 줄면 좋아짐(↓), 늘면 나빠짐(↑), 0.5%p 안쪽은 같음 */
function TrendMark({ trend, delta }: { trend: "better" | "worse" | "same"; delta: number }) {
  const cls = trend === "better" ? "text-emerald-400" : trend === "worse" ? "text-rose-400" : "text-slate-900";
  const mark = trend === "better" ? "↓" : trend === "worse" ? "↑" : "=";
  return <span data-trend={trend} className={`ml-1 w-12 shrink-0 text-right font-black ${cls}`}>{mark} {Math.abs(delta)}%p</span>;
}
