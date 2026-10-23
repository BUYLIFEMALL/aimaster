"use client";
import { useEffect, useRef, useState } from "react";
import { useStudio } from "./StudioContext";
import { drawFrame, ensureFonts, type DrawCache, type Scene } from "@/lib/render/draw";
import type { Preset } from "@/lib/design";
import type { LyricLine } from "@/lib/lyrics";

// 프리셋 카드의 작은 미리보기 — 실제 영상과 같은 drawFrame으로 그린다(지금 곡의 제목·가사·커버, 없으면 예시).
const SAMPLE: LyricLine[] = [
  { id: "s1", start: 0, end: 2.5, text: "어두워진 하늘 밑 바람이 불어와" },
  { id: "s2", start: 2.5, end: 6, text: "지금 부르는 줄이 이렇게 보입니다" },
  { id: "s3", start: 6, end: 9, text: "다음 줄은 조금 흐리게" },
];

export function PresetThumb({ preset }: { preset: Preset }) {
  const { scene } = useStudio();
  const ref = useRef<HTMLCanvasElement>(null), cache = useRef<DrawCache>({});
  const [fonts, setFonts] = useState(0);
  const portrait = preset.design.aspect === "portrait";
  const W = portrait ? 180 : 320, H = portrait ? 320 : 180;

  useEffect(() => { let alive = true; void ensureFonts(preset.design).then(() => alive && setFonts((n) => n + 1)); return () => { alive = false; }; }, [preset.design]);

  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext("2d"); if (!ctx) return;
    const own = scene.lines.length > 0;
    const lines = own ? scene.lines : SAMPLE;
    const mid = lines[Math.min(1, lines.length - 1)];
    const t = mid.start + (mid.end - mid.start) * 0.45; // 강조가 절반쯤 진행된 모습
    const s: Scene = { ...scene, title: scene.title || "곡 제목", artist: scene.artist || "아티스트", lines, duration: own && scene.duration ? scene.duration : 10, design: { ...preset.design, size: scene.design.size } };
    drawFrame(ctx, W, H, s, t, cache.current);
  }, [scene, preset, W, H, fonts]);

  return <canvas ref={ref} width={W} height={H} className={`preset-thumb ${portrait ? "portrait" : ""}`} aria-hidden />;
}
