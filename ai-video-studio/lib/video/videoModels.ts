// [공용 기준 코드 `ai-video-client` — 기준: ai-video-studio/lib/video/(2026-10-23 ai-image-studio에서 이전), 사본: ai-image-studio/lib/video/·shorts-onestop-studio/src/lib/·shots/src/lib/video/·music-video-studio/src/lib/video/. 사본은 직접 고치지 말고
//  기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 처음 만든 곳: AI 쇼츠 원스톱 v1.23~v1.25(2026-10-22)]
// AI 동영상 — 모델·단가·길이 목록(화면·서버 공용, 다른 모듈을 불러오지 않는 순수 파일: 원스톱 tests/video.test.ts가 바로 읽는다).
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
  /** 2026-10-23 fal 입력 칸 규칙(모델마다 이름·형식이 달라 표로 적는다). 없으면 예전 방식(image_url·duration 문자·generate_audio:false) */
  fal?: FalInputSpec;
  /** 해상도별 초당 단가(USD) — 있으면 perSec 대신 고른 해상도 단가 */
  perSecByRes?: Readonly<Record<string, number>>;
  /** 2026-10-23 소리를 켰을 때 초당 단가(USD) — 없으면 소리를 켜도 같은 단가(fal 가격 페이지 확인) */
  perSecAudio?: number;
}

/** fal 모델 입력 칸 규칙 — 공식 llms.txt(입력 명세) 기준. 소리는 기본으로 끈다(비용 절감) — 회원이 고르면 켠다(2026-10-23) */
export interface FalInputSpec {
  image: "image_url" | "start_image_url";
  /** 길이 형식: "5"(문자) · 5(숫자) · "5s" */
  duration: "string" | "int" | "s";
  /** 소리 켜고 끄는 칸 이름(없으면 보내지 않음) */
  audio?: "generate_audio" | "audio";
  /** 비율 칸(aspect_ratio)을 받는 모델 */
  aspect?: boolean;
  /** 해상도 칸(resolution) 값 목록, 첫 값이 기본 */
  resolutions?: readonly string[];
  /** 2026-10-23 사진 없이 글만으로 만드는 주소(같은 모델의 text-to-video). 길이·소리·해상도 칸은 같고 비율 칸(aspect_ratio)을 받는다 */
  t2v?: string;
}

/** 기본 영상 길이(초) — 장면 길이를 모를 때 */
export const VIDEO_SECONDS = 5;
export const LENGTH_CHOICES = [5, 8, 10] as const;

/** 업체에서 만드는 중인 영상 작업(대본 배경에 저장 → 새로고침 뒤에도 이어서 확인) */
export interface VideoJob { provider: VideoProvider; model: string; id: string; statusUrl?: string; responseUrl?: string; withEnd: boolean; startedAt: string; seconds?: number }

export const VIDEO_MODELS: readonly VideoModel[] = [
  { id: "gemini-omni-1.1-flash", provider: "gemini", name: "Gemini Omni Flash", perSec: 0.1, endFrame: true, durations: [5, 8, 10], note: "기본 · 구글 키 그대로(결제 연결된 키 필요) · 720p" },
  // 2026-10-22 Shots v1.33: 끝 화면(last_frame_image)을 넣으면 E006으로 2회 거절(같은 사진 끝 화면 없이 성공) — 이어 붙이기 끔
  { id: "bytedance/seedance-1-lite", provider: "replicate", name: "Seedance 1 Lite (Replicate)", perSec: 0.036, endFrame: false, durations: [5, 8, 10], note: "가장 저렴 · 720p · 이어 붙이기 없음" },
  { id: "kwaivgi/kling-v2.1", provider: "replicate", name: "Kling v2.1 (Replicate)", perSec: 0.05, perSecEnd: 0.09, endFrame: true, durations: [5, 10], note: "720p · 이어 붙이면 1080p(pro) 단가" },
  { id: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video", provider: "fal", name: "Seedance 1.5 Pro (fal)", perSec: 0.05, endFrame: true, durations: [5, 8, 10], note: "가성비 · 720p" },
  { id: "fal-ai/kling-video/o3/standard/image-to-video", provider: "fal", name: "Kling O3 Standard (fal)", perSec: 0.14, endFrame: true, durations: [5, 8, 10], note: "고품질" },
];

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].id;

/** 2026-10-23 AI 영상 스튜디오 1차-나 — fal 최신 모델(입력 칸 규칙 `fal` 사용). 다른 프로그램 선택 목록(VIDEO_MODELS)에는 넣지 않는다.
 *  단가는 2026-10-23 fal 모델 페이지(소리 끔 기준). Seedance 2.0은 토큰 과금(480p는 계산값). */
export const STUDIO_EXTRA_MODELS: readonly VideoModel[] = [
  { id: "fal-ai/kling-video/v3/standard/image-to-video", provider: "fal", name: "Kling 3.0 Standard (fal)", perSec: 0.084, endFrame: true, durations: [5, 10], perSecAudio: 0.126, note: "최신 Kling · 사진 비율 따름", fal: { image: "start_image_url", duration: "string", audio: "generate_audio", t2v: "fal-ai/kling-video/v3/standard/text-to-video" } },
  { id: "bytedance/seedance-2.0/image-to-video", provider: "fal", name: "Seedance 2.0 (fal)", perSec: 0.3034, perSecByRes: { "480p": 0.135, "720p": 0.3034, "1080p": 0.682 }, endFrame: true, durations: [4, 5, 8, 10], note: "최상위 품질 · 비용 큼 · 실사 인물 사진은 업체가 거절", fal: { image: "image_url", duration: "string", audio: "generate_audio", aspect: true, resolutions: ["720p", "480p", "1080p"], t2v: "bytedance/seedance-2.0/text-to-video" } },
  { id: "fal-ai/veo3.1/image-to-video", provider: "fal", name: "Veo 3.1 (fal)", perSec: 0.2, endFrame: false, durations: [4, 6, 8], perSecAudio: 0.4, note: "Google Veo · 소리를 켜면 초당 $0.40", fal: { image: "image_url", duration: "s", audio: "generate_audio", aspect: true, resolutions: ["720p", "1080p"], t2v: "fal-ai/veo3.1" } },
  { id: "minimax/h3/image-to-video", provider: "fal", name: "MiniMax H3 (fal)", perSec: 0.06, perSecByRes: { "768P": 0.06, "2K": 0.13 }, endFrame: true, durations: [5, 10], note: "구 Hailuo · 저렴 · 사진 비율 따름", fal: { image: "image_url", duration: "int", resolutions: ["768P", "2K"] } },
  { id: "alibaba/wan-3.0/image-to-video", provider: "fal", name: "Wan 3.0 (fal)", perSec: 0.1, perSecByRes: { "480p": 0.05, "720p": 0.1, "1080p": 0.2 }, endFrame: true, durations: [5, 10], note: "가성비 · 해상도 선택", fal: { image: "start_image_url", duration: "int", audio: "audio", aspect: true, resolutions: ["720p", "480p", "1080p"], t2v: "alibaba/wan-3.0/text-to-video" } },
];

/** AI 영상 스튜디오 전체 목록(기존 + 최신) */
export const STUDIO_VIDEO_MODELS: readonly VideoModel[] = [...VIDEO_MODELS, ...STUDIO_EXTRA_MODELS];

export function findStudioVideoModel(id: unknown): VideoModel | undefined {
  return STUDIO_VIDEO_MODELS.find((m) => m.id === id);
}

/** 고른 해상도의 초당 단가(해상도별 단가가 없으면 perSec) */
export function ratePerSec(m: VideoModel, resolution?: string | null): number {
  return (resolution && m.perSecByRes?.[resolution]) || m.perSec;
}
export const PROVIDER_NAME: Record<VideoProvider, string> = { gemini: "Google Gemini", fal: "fal", replicate: "Replicate" };

export function findVideoModel(id: unknown): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

/** 장면 1개 예상 비용(USD). seconds를 안 주면 기본 5초. audio: 소리를 켜면 perSecAudio(있을 때) */
export function sceneCost(m: VideoModel, withEnd: boolean, seconds: number = VIDEO_SECONDS, resolution?: string | null, audio = false): number {
  const rate = audio && m.perSecAudio ? m.perSecAudio : withEnd && m.perSecEnd ? m.perSecEnd : ratePerSec(m, resolution);
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
