"use client";

import { useEffect, useRef } from "react";
import { mountCanvasPreview } from "@/lib/video/canvas-scene.mjs";
import type { ResolvedVideoOptions } from "@/lib/video/videoOptions";

// 실시간 미리보기 — 원본 boks-music mountCanvasPreview(MIT): 영상과 같은 장면 코드를 화면에서 재생하고,
// 첫 곡은 실제 소리를 풀어 스펙트럼을 그린다(가짜 스펙트럼 없음). 템플릿·설정만 바뀌면 다시 불러오지 않고 바꾼다.
export type PreviewTrack = { title: string; duration: number; cues: { start: number; end: number | null; text: string }[]; artUrl?: string | null; audioUrl?: string | null };

export function VideoPreview({ scene, options, tracks, backgroundUrl }: { scene: string; options: ResolvedVideoOptions; tracks: PreviewTrack[]; backgroundUrl: string | null }) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<ReturnType<typeof mountCanvasPreview> | null>(null);
  const mediaKey = JSON.stringify([tracks.map((t) => [t.title, t.duration, t.artUrl, t.audioUrl, t.cues.length]), backgroundUrl, options.width, options.height]);
  const latest = useRef({ scene, options });
  latest.current = { scene, options };

  // 곡·그림·크기가 바뀌면 새로 띄운다
  useEffect(() => {
    if (!host.current) return;
    const h = mountCanvasPreview(host.current, {
      scene: latest.current.scene,
      tracks: tracks.map((t) => ({ ...t })),
      options: { ...latest.current.options, fps: latest.current.options.fps },
      assets: { backgroundUrl },
    });
    handle.current = h;
    return () => {
      h.dispose();
      if (handle.current === h) handle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  // 템플릿·글자·스펙트럼만 바뀌면 그 자리에서 바꾼다
  useEffect(() => {
    handle.current?.update({ scene, options: { ...options } });
  }, [scene, options]);

  const portrait = options.height > options.width;
  return (
    <div className={`mx-auto overflow-hidden rounded-xl border border-slate-800 bg-black ${portrait ? "aspect-[9/16] max-h-[520px]" : "aspect-video w-full"}`}>
      <div ref={host} className="h-full w-full" />
    </div>
  );
}
