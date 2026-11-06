"use client";

import { useEffect, useRef } from "react";
import { renderSceneThumbnail } from "@/lib/video/canvas-scene.mjs";
import { templateModes, type VideoMode, type VideoOptions, type VideoTemplate } from "@/lib/video/videoOptions";

// 템플릿 고르기 — 원본 boks-music 템플릿 화면처럼 영상과 같은 그리기 코드로 한 장면을 그려 보여 준다(2026-11-06).
export type TemplateSample = { title: string; cues: { start: number; end: number | null; text: string }[]; art: ImageBitmap | null; background: ImageBitmap | null };

function Thumb({ t, options, sample }: { t: VideoTemplate; options: VideoOptions; sample: TemplateSample }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const portrait = !t.aspects.includes("16:9");
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const mode: VideoMode = templateModes(t).includes(options.mode) ? options.mode : templateModes(t)[0];
    const spectrum = t.spectra.includes(options.spectrum) ? options.spectrum : (t.recommendedSpectrum ?? t.spectra[0]);
    const ok = renderSceneThumbnail(canvas, {
      scene: t.scene,
      tracks: [{ title: sample.title, duration: 180, cues: sample.cues }],
      options: { ...options, mode, spectrum, fps: 30 },
      images: { background: sample.background, arts: [sample.art] },
      time: mode === "vocal" ? 5.4 : 6,
    });
    if (!ok) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0b0f18";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [t, options, sample]);
  return <canvas ref={ref} width={portrait ? 180 : 320} height={portrait ? 320 : 180} className={`w-full rounded-lg bg-slate-900 ${portrait ? "mx-auto aspect-[9/16] max-h-40 w-auto" : "aspect-video"}`} />;
}

export function TemplatePicker({ templates, value, options, sample, onPick }: { templates: VideoTemplate[]; value: string; options: VideoOptions; sample: TemplateSample; onPick: (t: VideoTemplate) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
      {templates.map((t) => {
        const active = t.id === value;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t)}
              aria-pressed={active}
              title={t.description}
              className={`w-full space-y-1.5 rounded-xl border p-1.5 text-left transition-all ${active ? "border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-400/30" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}
            >
              <Thumb t={t} options={options} sample={sample} />
              <span className="flex items-center gap-1 px-0.5">
                <span className="truncate text-[12px] font-bold text-slate-100">{t.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-slate-500">{templateModes(t).map((m) => (m === "vocal" ? "가사" : "연주")).join("·")}</span>
              </span>
              {t.requiresBackground && <span className="block px-0.5 text-[10px] text-amber-300/80">배경 사진 필요</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

