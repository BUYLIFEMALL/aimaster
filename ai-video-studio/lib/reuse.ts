// 「이 설정으로 다시 만들기」(v1.11) — 생성 기록 options에 남길 값 정리와, 기록 → 생성 화면 값 변환. 화면·서버 공용.
import { SAFETY } from "@/lib/promptPolish";

export interface ReuseOptions {
  idea?: string;
  styleId?: string;
  cameraId?: string;
  polishedPrompt?: string;
}

export interface ReuseForm {
  idea: string;
  styleId: string | null;
  cameraId: string | null;
  polishedPrompt: string | null;
  model: string;
  seconds: number;
  aspect: string | null;
  resolution: string | null;
  audio: boolean;
}

const ID = /^[a-z]{2,20}$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 요청 본문의 reuse 값 → options에 저장할 값(형식이 틀린 칸은 버린다) */
export function sanitizeReuse(v: unknown): ReuseOptions {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: ReuseOptions = {};
  const idea = text(o.idea, 1200);
  if (idea) out.idea = idea;
  if (typeof o.styleId === "string" && ID.test(o.styleId)) out.styleId = o.styleId;
  if (typeof o.cameraId === "string" && ID.test(o.cameraId)) out.cameraId = o.cameraId;
  const polished = text(o.polishedPrompt, 1200);
  if (polished) out.polishedPrompt = polished;
  return out;
}

/** 끝에 붙인 안전 문구를 뗀 설명 */
export function stripSafety(prompt: string): string {
  const p = prompt.trim();
  return (p.endsWith(SAFETY) ? p.slice(0, -SAFETY.length) : p).replace(/[.\s]+$/, "").trim();
}

/** 생성 기록 → 생성 화면 값. v1.10 이전 기록(idea 없음)은 최종 설명에서 안전 문구만 떼어 설명 칸에 넣는다 */
export function reuseFromGeneration(g: { prompt: string; model: string; duration_s: number; aspect_ratio: string | null; options?: Record<string, unknown> | null }): ReuseForm {
  const o = sanitizeReuse(g.options);
  const res = g.options?.resolution;
  const base = { model: g.model, seconds: g.duration_s, aspect: g.aspect_ratio, resolution: typeof res === "string" ? res : null, audio: g.options?.audio === true };
  if (!o.idea) return { ...base, idea: stripSafety(g.prompt).slice(0, 1200), styleId: null, cameraId: null, polishedPrompt: null };
  return { ...base, idea: o.idea, styleId: o.styleId ?? null, cameraId: o.cameraId ?? null, polishedPrompt: o.polishedPrompt ?? null };
}
