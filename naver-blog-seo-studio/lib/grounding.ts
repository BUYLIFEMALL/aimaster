// BLC-08a (2026-10-22): 「자료부터 집필」 근거 규칙 — 외부 호출 없는 순수 함수(서버·화면·시험 공용).
// quoteInText·copiesSource는 blog-workroom/src/lib/logic.ts의 사본이다(검증된 판정 규칙을 그대로 사용).
// 인용 확인은 "그 구절이 실제 자료에 있는가"만 본다 — 전체 사실 확인이나 표절 판정이 아니다.
import { createHash } from "node:crypto";

export type ResearchSourceKind = "blog" | "news" | "url" | "memo";
export interface ResearchSource { n: number; kind: ResearchSourceKind; title: string; link: string; text: string; ok: boolean }
export interface GroundPoint { text: string; source: number; quote: string; kept: boolean }

const norm = (s: string) => s.replace(/\s+/g, "").replace(/["'“”‘’「」]/g, "");

/** 근거 구절이 해당 자료 원문에 실제로 있는지(4자 이상) */
export function quoteInText(quote: string, text: string): boolean {
  const q = norm(quote);
  return q.length >= 4 && norm(text).includes(q);
}

/** 원문과 지나치게 같은 문장인지(공백 제외 연속 25자 이상 그대로면 같은 문장으로 본다) */
export function copiesSource(sentence: string, sources: string[], run = 25): boolean {
  const s = norm(sentence);
  if (s.length < run) return false;
  const src = sources.map(norm);
  for (let i = 0; i + run <= s.length; i += 5) {
    const piece = s.slice(i, i + run);
    if (src.some((t) => t.includes(piece))) return true;
  }
  return false;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** AI가 낸 근거 후보 중 ①출처 번호가 실제 자료이고 ②인용이 그 자료 원문에 있고 ③원문을 그대로 베끼지 않은 것만 남긴다 */
export function filterPoints(raw: unknown, sources: ResearchSource[], max = 24): { points: GroundPoint[]; dropped: number } {
  const list = Array.isArray(raw) ? raw.slice(0, max) : [];
  const texts = sources.map((s) => s.text);
  let dropped = 0;
  const points: GroundPoint[] = [];
  for (const item of list) {
    const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const text = str(p.text, 300), quote = str(p.quote, 120);
    const source = Number(p.source);
    const src = sources.find((s) => s.n === source);
    if (!text || !src || !quoteInText(quote, src.text) || copiesSource(text, texts)) { dropped++; continue; }
    points.push({ text, source, quote, kept: true });
  }
  return { points, dropped };
}

/** 승인 지문: 남긴 근거(내용·출처·인용)만으로 계산 — 승인 뒤 내용이 바뀌면 지문이 달라져 생성이 거절된다 */
export function approvalHash(points: GroundPoint[]): string {
  const kept = points.filter((p) => p.kept).map((p) => [p.text, p.source, p.quote]);
  return createHash("sha256").update(JSON.stringify(kept)).digest("hex");
}

export function isApproved(research: { points?: unknown; approved_at?: string | null; approval_hash?: string | null }): boolean {
  const points = Array.isArray(research.points) ? research.points as GroundPoint[] : [];
  return Boolean(research.approved_at && research.approval_hash && points.some((p) => p.kept) && research.approval_hash === approvalHash(points));
}
