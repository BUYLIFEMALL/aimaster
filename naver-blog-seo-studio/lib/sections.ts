// BLC-09 (2026-10-22): 「구간별로 쓰기」 순수 함수 — blog-workroom src/lib/actions/write.ts(outline·section·joinSections) 방식을 SEO 원고 형식에 맞춰 다시 구현.
// 구간마다 바로 저장하므로 중간에 멈추거나 실패해도 쓴 구간은 남고, 실패한 구간만 다시 쓴다.
import { createHash } from "node:crypto";

export type SectionStatus = "empty" | "done" | "failed";
export interface OutlineSection { heading: string; goal: string; body: string; status: SectionStatus; error?: string; updatedAt?: string }

const MIN_SECTIONS = 3;
const MAX_SECTIONS = 7;
const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** AI 목차 응답 → 제목 후보(최대 3)·구간(3~7, 첫 구간은 도입부 heading ""). 모자라면 null. */
export function normalizeOutline(raw: unknown): { titles: string[]; sections: OutlineSection[] } | null {
  const value = raw && typeof raw === "object" ? raw as { titles?: unknown; sections?: unknown } : {};
  const titles = (Array.isArray(value.titles) ? value.titles : []).map((t) => text(t, 80)).filter(Boolean).slice(0, 3);
  const sections = (Array.isArray(value.sections) ? value.sections : [])
    .map((s) => (s && typeof s === "object" ? s as { heading?: unknown; goal?: unknown } : {}))
    .map((s, i) => ({ heading: i === 0 ? "" : text(s.heading, 80), goal: text(s.goal, 200), body: "", status: "empty" as const }))
    .filter((s, i) => s.goal && (i === 0 || s.heading))
    .slice(0, MAX_SECTIONS);
  if (!titles.length || sections.length < MIN_SECTIONS) return null;
  return { titles, sections };
}

/** 구간 하나의 결과를 최신 구간 목록에 반영한다(다른 구간은 그대로 — 저장 직전 최신 행에 적용). */
export function applySection(sections: OutlineSection[], index: number, result: { body: string } | { error: string }, at = new Date().toISOString()): OutlineSection[] {
  return sections.map((s, i) => {
    if (i !== index) return s;
    if ("body" in result) return { heading: s.heading, goal: s.goal, body: result.body, status: "done", updatedAt: at };
    // 실패해도 이전에 쓴 본문은 지우지 않는다(다시 쓰기 실패가 쓴 구간을 날리지 않게).
    return { ...s, status: s.body ? s.status : "failed", error: result.error.slice(0, 300), updatedAt: at };
  });
}

export function outlineStatus(sections: OutlineSection[]): "outline" | "writing" | "written" {
  const done = sections.filter((s) => s.status === "done" && s.body.trim()).length;
  return done === 0 ? "outline" : done === sections.length ? "written" : "writing";
}

/** SEO 원고 본문 형식: 도입 문단 → 빈 줄 → 소제목 줄 → 빈 줄 → 본문 (마크다운 없음). */
export function joinSections(sections: OutlineSection[]): string {
  return sections.map((s) => (s.heading ? `${s.heading}\n\n${s.body.trim()}` : s.body.trim())).join("\n\n").trim();
}

/** 합칠 때의 구간 내용 지문 — 합친 뒤 구간을 다시 쓰면 달라진다. */
export function sectionsHash(sections: OutlineSection[]): string {
  return createHash("sha256").update(JSON.stringify(sections.map((s) => [s.heading, s.body]))).digest("hex");
}

/** 구간 본문 정리: 마크다운 기호·소제목 반복을 지우고 최소 길이를 확인한다. */
export function cleanSectionBody(raw: unknown, heading: string): string | null {
  let body = typeof raw === "string" ? raw : "";
  body = body.replace(/\r\n/g, "\n").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  if (heading && body.startsWith(heading)) body = body.slice(heading.length).trim();
  return body.replace(/\s/g, "").length >= 80 ? body.slice(0, 4000) : null;
}
