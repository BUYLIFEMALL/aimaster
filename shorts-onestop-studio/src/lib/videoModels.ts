// v1.23 AI 동영상 장면 — 모델·단가 목록(화면·서버 공용, 다른 모듈을 불러오지 않는 순수 파일: tests/videoModels.test.ts가 바로 읽는다).
// 기본은 회원이 이미 등록한 Gemini 키(주인님 지시 2026-10-22), fal·Replicate는 회원이 키를 등록하면 고를 수 있다.
// 단가는 2026-10-22 각 공식 가격표에서 확인한 값(Gemini API 가격 페이지 · fal.ai/pricing · replicate.com 모델 페이지).
// 가격이 바뀌면 이 표만 고친다. 화면에는 「약」으로 표시하고 실제 청구는 회원 계정 기준이라고 안내한다.
export type VideoProvider = "gemini" | "fal" | "replicate";

export interface VideoModel {
  id: string;
  provider: VideoProvider;
  name: string;
  /** 초당 단가(USD). 끝 화면을 쓰면 단가가 바뀌는 모델은 perSecEnd */
  perSec: number;
  perSecEnd?: number;
  /** 끝 화면(다음 장면과 이어 붙이기) 지원 */
  endFrame: boolean;
  /** v1.25 고를 수 있는 영상 길이(초). 업체 문서 기준: Seedance 4~12초, Kling O3 3~15초, Kling v2.1 5·10초.
   *  Gemini Omni는 길이 칸이 없어 지시문으로 요청(실제 길이는 시험으로 확인) */
  durations: readonly number[];
  note: string;
}

/** 기본 영상 길이(초) — 장면 길이를 모를 때 */
export const VIDEO_SECONDS = 5;
export const LENGTH_CHOICES = [5, 8, 10] as const;

/** 업체에서 만드는 중인 영상 작업(대본 배경에 저장 → 새로고침 뒤에도 이어서 확인) */
export interface VideoJob { provider: VideoProvider; model: string; id: string; statusUrl?: string; responseUrl?: string; withEnd: boolean; startedAt: string; seconds?: number }

export const VIDEO_MODELS: readonly VideoModel[] = [
  { id: "gemini-omni-1.1-flash", provider: "gemini", name: "Gemini Omni Flash", perSec: 0.1, endFrame: true, durations: [5, 8, 10], note: "기본 · 구글 키 그대로(결제 연결된 키 필요) · 720p" },
  { id: "bytedance/seedance-1-lite", provider: "replicate", name: "Seedance 1 Lite (Replicate)", perSec: 0.036, endFrame: true, durations: [5, 8, 10], note: "가장 저렴 · 720p" },
  { id: "kwaivgi/kling-v2.1", provider: "replicate", name: "Kling v2.1 (Replicate)", perSec: 0.05, perSecEnd: 0.09, endFrame: true, durations: [5, 10], note: "720p · 이어 붙이면 1080p(pro) 단가" },
  { id: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video", provider: "fal", name: "Seedance 1.5 Pro (fal)", perSec: 0.05, endFrame: true, durations: [5, 8, 10], note: "가성비 · 720p" },
  { id: "fal-ai/kling-video/o3/standard/image-to-video", provider: "fal", name: "Kling O3 Standard (fal)", perSec: 0.14, endFrame: true, durations: [5, 8, 10], note: "고품질" },
];

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].id;
export const PROVIDER_NAME: Record<VideoProvider, string> = { gemini: "Google Gemini", fal: "fal", replicate: "Replicate" };

export function findVideoModel(id: unknown): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

/** 장면 1개 예상 비용(USD). seconds를 안 주면 기본 5초 */
export function sceneCost(m: VideoModel, withEnd: boolean, seconds: number = VIDEO_SECONDS): number {
  const rate = withEnd && m.perSecEnd ? m.perSecEnd : m.perSec;
  return Math.round(rate * seconds * 1000) / 1000;
}

/** 영상 길이 고르기: choice가 숫자면 그 길이(모델이 못 받으면 가장 가까운 길이), "fit"이면 장면 길이보다 길거나 같은 가장 짧은 길이(없으면 최대) — 반복 재생 방지 */
export function pickSeconds(m: VideoModel, choice: "fit" | number, sceneSec?: number): number {
  const ds = [...m.durations].sort((a, b) => a - b);
  if (choice !== "fit") return ds.reduce((best, d) => (Math.abs(d - choice) < Math.abs(best - choice) ? d : best), ds[0]);
  const need = Number.isFinite(sceneSec) && (sceneSec ?? 0) > 0 ? (sceneSec as number) : VIDEO_SECONDS;
  return ds.find((d) => d >= need - 0.05) ?? ds[ds.length - 1];
}

/** 화면 표시용 「초당 $0.036 · 5초 약 $0.18」 */
export function priceLabel(m: VideoModel, withEnd = false): string {
  const rate = withEnd && m.perSecEnd ? m.perSecEnd : m.perSec;
  return `초당 $${rate.toFixed(Math.round(rate * 1000) % 10 ? 3 : 2)} · ${VIDEO_SECONDS}초 약 $${sceneCost(m, withEnd).toFixed(2)}`;
}

/** 원화 대략값(1달러 1,400원 기준, 안내용) */
export function wonLabel(usd: number): string {
  return `약 ${Math.round((usd * 1400) / 10) * 10}원`;
}

/** 영상이 움직일 방향을 알려 주는 짧은 영어 지시(모델 공통). 장면 설명이 있으면 앞에 붙인다. 글자·로고는 넣지 않는다 */
export function motionPrompt(scene: string, withEnd: boolean): string {
  const base = scene.trim().slice(0, 600);
  return [
    base,
    withEnd ? "Smoothly transition from the first frame to the last frame." : "Bring the still image to life with natural, subtle motion.",
    "Gentle cinematic camera movement, vertical 9:16 short-form video, no text, no captions, no logos.",
  ].filter(Boolean).join(" ");
}
