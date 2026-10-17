// [이미지 모델 교체 2026-10-17] 구형(gemini-nano-banana-2.1·gemini-nano-banana-2.1·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
export const MODES = { information: "정보 정리형", intent: "검색 의도형", answer: "질문 답변형", story: "경험 이야기형", solution: "문제 해결형" } as const;
export type Mode = keyof typeof MODES;
export interface Brief { inputType: "topic" | "rewrite"; topic: string; original: string; keyword: string; subkeywords: string; audience: string; tone: string; experience: string; mode: Mode; includeFaq: boolean; imageCount: number; sceneCount: number; targetLength: number }
export const DEFAULT_BRIEF: Brief = { inputType: "topic", topic: "", original: "", keyword: "", subkeywords: "", audience: "처음 알아보는 독자", tone: "친절하고 명확한 존댓말", experience: "", mode: "information", includeFaq: true, imageCount: 3, sceneCount: 0, targetLength: 2200 };
export interface Source { title: string; url: string; checkedAt: string }
export interface MediaPlan { id: string; kind: "image" | "scene-start" | "scene-end"; alt: string; prompt: string; placement: number }
export interface Draft { title: string; body: string; tags: string[]; summary: string; changeSummary: string; media: MediaPlan[]; sources: Source[]; social: { platform: string; content: string }[]; aiReview?: string[]; audit?: Audit }
export interface Settings { provider: "gemini" | "openai"; model: string; imageModel: string; search: boolean }
export const TEXT_MODELS = { gemini: ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-pro"], openai: ["gpt-4.1", "gpt-4.1-mini"] } as const;
export const IMAGE_MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image"] as const;
export const DEFAULT_SETTINGS: Settings = { provider: "gemini", model: "gemini-3.5-flash", imageModel: "gemini-nano-banana-2.1", search: false };
export interface Project { id: string; title: string; brief: Brief; current_revision_id: string | null; created_at: string; updated_at: string; expires_at: string }
export interface Revision { id: string; project_id: string; version: number; data: Draft; created_at: string }
export interface Asset { id: string; project_id: string; path: string; mime: string; bytes: number; alt: string; prompt: string; plan_id: string; placement: number; kind: string; url?: string }
export interface AuditItem { id: string; label: string; status: "pass" | "warn" | "review"; detail: string; source: "rule" | "member" }
export interface Audit { fingerprint: string; items: AuditItem[]; score: number; checkedAt: string; words: { word: string; count: number }[] }
export interface Workspace { projects: Project[]; project: Project | null; revisions: Revision[]; assets: Asset[]; settings: Settings; keys: Record<string, { hasKey: boolean; maskedKey: string | null }> }
