"use client";
import { sceneVoices, type Bg, type ShortsScript } from "@/lib/script";
import { normalizeAudio } from "@/lib/voice";
import { FPS, H, LEAD, W, bgFor, loadFontsFor, normalizeDesign, renderFrame, segmentAt, timeline } from "@/lib/render/scene";
import { assertWebCodecs, encodeMp4, mixVoiceAndBgm, type ExportProgress, type VoiceClip } from "@/lib/render/mp4Encoder";

// 브라우저 안에서 MP4(1080×1920·30fps, H.264 + AAC/Opus) 만들기 — 서버 렌더 비용 없음.
// 화면은 미리보기와 같은 renderFrame으로 한 장씩 그리고, 소리 섞기·인코딩·파일 묶기는 공용 기준 코드 mp4Encoder.ts(`browser-mp4-encoder`)가 맡는다.
export type { ExportProgress };

/** 배경 영상 요소를 장면 안 시각으로 맞춘다(미리보기처럼 반복 재생) */
function seekVideo(v: HTMLVideoElement, t: number): Promise<void> {
  const d = v.duration; if (!d || !Number.isFinite(d)) return Promise.resolve();
  const target = t % d; if (Math.abs(v.currentTime - target) < 0.5 / FPS) return Promise.resolve();
  return new Promise((res) => { const done = () => { clearTimeout(to); v.removeEventListener("seeked", done); res(); }; const to = setTimeout(done, 3000); v.addEventListener("seeked", done); v.currentTime = target; });
}

/** 배경 영상을 미리 통째로 받아 로컬(blob) 영상으로 바꾼다 — 프레임마다 되감을 때 네트워크 범위 요청이 생기지 않아 MP4 만들기가 빨라진다.
 *  받지 못한 영상은 원래 요소를 그대로 쓴다(느리지만 결과는 같다). */
async function localVideos(s: ShortsScript, segs: ReturnType<typeof timeline>["segs"], media: (bg: Bg) => CanvasImageSource | null, onStatus: (t: string) => void) {
  const map = new Map<Bg, HTMLVideoElement>(); const urls: string[] = [];
  const vids = Array.from(new Set(segs.map((g) => bgFor(s, g)).filter((b): b is Bg => !!b))).map((b) => [b, media(b)] as const).filter((x): x is readonly [Bg, HTMLVideoElement] => x[1] instanceof HTMLVideoElement);
  for (let i = 0; i < vids.length; i++) {
    const [bg, el] = vids[i]; onStatus(`배경 영상 받는 중… (${i + 1}/${vids.length})`);
    try {
      const res = await fetch(el.currentSrc || el.src, { signal: AbortSignal.timeout(30000) }); if (!res.ok) continue;
      const url = URL.createObjectURL(await res.blob()); urls.push(url);
      const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto";
      await new Promise<void>((ok, bad) => { v.onloadeddata = () => ok(); v.onerror = () => bad(new Error("영상")); v.src = url; });
      map.set(bg, v);
    } catch { /* 원래 요소 사용 */ }
  }
  return { get: (bg: Bg) => map.get(bg), release: () => urls.forEach((u) => URL.revokeObjectURL(u)) };
}

/** 프레임마다 되감기(seek)는 한 번에 약 50ms가 걸려 느리다(2026-10-16 실측). 대신 배경 영상을 2배속으로 재생하며
 *  목표 시각에 닿을 때까지 기다렸다 그 장면을 쓴다. 너무 앞서면 잠시 멈추고, 뒤로 돌아가거나 크게 벗어날 때만 되감는다. */
async function syncVideo(v: HTMLVideoElement, t: number): Promise<void> {
  const d = v.duration; if (!d || !Number.isFinite(d)) return;
  const target = t % d; const diff = v.currentTime - target;
  if (diff > 1 || diff < -1.5) { v.pause(); await seekVideo(v, target); return; } // 반복 재생 처음으로·큰 차이
  if (diff > 0.1) { if (!v.paused) v.pause(); return; } // 영상이 앞섬 → 그 장면 유지하며 기다림
  if (v.paused) { v.muted = true; v.playbackRate = 2; await v.play().catch(() => undefined); }
  const start = performance.now();
  while (v.currentTime + 0.5 / FPS < target && !v.ended && performance.now() - start < 1500) await new Promise((r) => setTimeout(r, 2));
}

export async function exportMp4(o: {
  script: ShortsScript; media: (bg: Bg) => CanvasImageSource | null; audioUrls: Record<string, string>;
  onProgress: (p: ExportProgress) => void; signal: AbortSignal;
}): Promise<Blob> {
  assertWebCodecs();
  const s = o.script, d = normalizeDesign(s.design as never); const { segs, total } = timeline(s);
  const stop = () => { if (o.signal.aborted) throw new DOMException("취소", "AbortError"); };
  const urls = o.audioUrls;
  o.onProgress({ pct: 1, status: "글꼴·소리 준비 중…" });
  await loadFontsFor(s, d);
  // 내레이션은 장면 시작+LEAD에 놓는다
  const voices = sceneVoices(s).map((v, i) => (v.voice && urls[v.voice.path] ? { src: urls[v.voice.path], at: segs[i].start + LEAD, dur: v.voice.dur } : null)).filter((x): x is VoiceClip => !!x);
  const bgm = normalizeAudio(s.audio).bgm;
  const audio = await mixVoiceAndBgm({ total, voices, bgm: bgm && urls[bgm.path] ? { src: urls[bgm.path], volume: bgm.volume } : null, onStatus: (status) => o.onProgress({ pct: 3, status }) });
  stop();

  const touched = new Set<HTMLVideoElement>();
  const local = await localVideos(s, segs, o.media, (status) => o.onProgress({ pct: 4, status })); stop();
  const media = (bg: Bg) => local.get(bg) ?? o.media(bg);
  try {
    return await encodeMp4({
      width: W, height: H, fps: FPS, total, audio, pctFrom: 5, onProgress: o.onProgress, signal: o.signal,
      drawFrame: async (ctx, t) => {
        const seg = segmentAt(segs, t); const bg = bgFor(s, seg); const el = bg ? media(bg) : null;
        if (el instanceof HTMLVideoElement) {
          if (!touched.has(el)) { touched.forEach((x) => x.pause()); touched.add(el); el.pause(); await seekVideo(el, (t - seg.start) % (el.duration || 1)); } // 장면이 바뀌면 이전 영상은 멈춤
          await syncVideo(el, t - seg.start);
        }
        renderFrame(ctx, s, d, t, { media, final: true });
      },
    });
  } finally { touched.forEach((v) => { v.playbackRate = 1; if (v.src.startsWith("blob:")) v.pause(); else void v.play().catch(() => undefined); }); local.release(); } // 미리보기 재생 상태로 되돌림
}
