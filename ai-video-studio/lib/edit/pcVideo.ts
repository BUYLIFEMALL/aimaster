// 영상 합치기 ↔ 「AIMaster 내 PC 고속 변환」(실행기 1.30 이상) 명령 만들기 — v1.17.
// 실행기는 정해진 낱말·숫자만 받는다(video-to-gif/local-renderer/host의 normalize·compress). 값 범위는 실행기와 같게 둔다.
import { FPS } from "@/lib/edit/timeline";

export type ShrinkQuality = "high" | "balanced" | "small";
export const SHRINK_QUALITIES: { id: ShrinkQuality; label: string }[] = [
  { id: "balanced", label: "균형(추천)" },
  { id: "high", label: "고화질 유지(조금 줄임)" },
  { id: "small", label: "작게(많이 줄임)" },
];

/** 실행기 진행률용 길이: 0.05~36000초, 소수 셋째 자리. 모르면 넣지 않는다. */
function durationValue(seconds: number): number | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.round(Math.min(36000, Math.max(0.05, seconds)) * 1000) / 1000;
}

/** 넣는 영상 형식 맞추기 — 합치기 화면과 같은 fps, 긴 변 1920(완성본 최대 1080p) */
export function normalizeCommand(seconds: number) {
  return { type: "normalize", fps: FPS, maxSide: 1920, duration: durationValue(seconds) };
}

/** 완성 MP4 용량 줄이기 */
export function compressCommand(quality: ShrinkQuality, seconds: number) {
  if (!SHRINK_QUALITIES.some((q) => q.id === quality)) throw new Error("알 수 없는 품질입니다.");
  return { type: "compress", quality, duration: durationValue(seconds) };
}

export const toMb = (bytes: number) => Math.round(bytes / 104857.6) / 10;

// v1.18 작업 결과 갤러리 카드 「⚡ 내 PC로」 — 렌더러에 이미 있는 명령만 쓴다(GIF = `encode` 1.00부터, 작게 = `compress`+`maxSide` 1.30부터)
export const GALLERY_GIF = { width: 480, fps: 10, colors: 128, maxSeconds: 6 }; // 6초·10fps — 움직임 많은 1280×720 영상 기준 약 5MB(상세페이지 권장 8MB 안)
export const GALLERY_SMALL_SIDE = 720;

/** 갤러리 영상 → GIF(앞 6초 안, 가로 480·10fps·128색) */
export function galleryGifCommand(seconds: number) {
  const len = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, GALLERY_GIF.maxSeconds) : GALLERY_GIF.maxSeconds;
  return { type: "encode", width: GALLERY_GIF.width, fps: GALLERY_GIF.fps, colors: GALLERY_GIF.colors, start: 0, duration: durationValue(len) };
}

/** 갤러리 영상 → 긴 변 720·「균형」 품질 MP4(2026-10-24 주인님 결정: 「작게」보다 화질 우선) */
export function gallerySmallCommand(seconds: number) {
  return { ...compressCommand("balanced", seconds), maxSide: GALLERY_SMALL_SIDE };
}

/** 내려받을 파일 이름: ai-video-<생성 id 앞 8자>-<붙임말>.<확장자> */
export function galleryFileName(id: string, kind: "gif" | "small") {
  const base = `ai-video-${String(id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "clip"}`;
  return kind === "gif" ? `${base}.gif` : `${base}-small.mp4`;
}
