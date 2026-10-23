// BLC-08b (2026-10-22): 본인 문체 — 외부 호출 없는 순수 함수(서버·화면·시험 공용).
// 항목 구성은 blog-workroom StyleProfile(src/lib/types.ts)과 같다. 승인은 08a 근거 승인과 같은 지문 방식.
import { createHash } from "node:crypto";

export interface StyleProfile { summary: string; tone: string; sentence: string; structure: string; reader: string; expressions: string[]; avoid: string[]; strengths: string[]; cautions: string[] }
export interface StylePost { title: string; link: string; text: string }

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strArr = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

/** AI 응답을 정해진 길이의 문체 프로필로 다듬는다. 요약이 비면 null(실패로 처리). */
export function normalizeStyle(raw: unknown): StyleProfile | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const profile: StyleProfile = {
    summary: str(r.summary, 600), tone: str(r.tone, 300), sentence: str(r.sentence, 300), structure: str(r.structure, 300), reader: str(r.reader, 300),
    expressions: strArr(r.expressions, 8, 60), avoid: strArr(r.avoid, 5, 60), strengths: strArr(r.strengths, 4, 120), cautions: strArr(r.cautions, 4, 120),
  };
  return profile.summary ? profile : null;
}

/** 표본: 40자 이상만, 최대 10개, 각 8,000자까지 */
export function cleanSamples(raw: unknown): string[] {
  return (Array.isArray(raw) ? raw : []).map((s) => str(s, 8_000)).filter((s) => s.length >= 40).slice(0, 10);
}

/** 네이버 블로그 주소·ID에서 블로그 ID만 뽑는다(영문·숫자·_- 4~30자). 아니면 null */
export function parseBlogId(input: string): string | null {
  const value = input.trim();
  const fromUrl = value.match(/blog\.naver\.com\/([A-Za-z0-9_-]{4,30})/)?.[1];
  const id = fromUrl ?? (/^[A-Za-z0-9_-]{4,30}$/.test(value) ? value : null);
  return id ? id.toLowerCase() : null;
}

const PROFILE_KEYS: (keyof StyleProfile)[] = ["summary", "tone", "sentence", "structure", "reader", "expressions", "avoid", "strengths", "cautions"];

/** 지문은 정해진 항목 순서의 값 배열로 계산한다 — jsonb는 저장할 때 객체 키 순서를 바꾸므로 객체를 그대로 문자열로 만들면 안 된다 */
export function profileHash(profile: StyleProfile): string {
  return createHash("sha256").update(JSON.stringify(PROFILE_KEYS.map((key) => profile[key] ?? null))).digest("hex");
}

export function isStyleApproved(row: { profile?: unknown; approved_at?: string | null; approval_hash?: string | null }): boolean {
  const profile = row.profile && typeof row.profile === "object" ? row.profile as StyleProfile : null;
  return Boolean(profile?.summary && row.approved_at && row.approval_hash && row.approval_hash === profileHash(profile));
}

export function withStyleApproval<T extends { profile?: unknown; approved_at?: string | null; approval_hash?: string | null }>(row: T): T & { approval_valid: boolean } {
  return { ...row, approval_valid: isStyleApproved(row) };
}

// v1.87: 표본·글 본문의 평서문 끝맺음(「~요」 vs 「~니다」)을 AI 없이 센다. 질문형(?)은 제외.
// 한쪽이 3번 이상이고 다른 쪽의 2배 이상일 때만 정하고, 애매하면 null(지시를 넣지 않음).
export type StyleEnding = "haeyo" | "hamnida";
export function detectEnding(texts: string[]): StyleEnding | null {
  const all = texts.join("\n");
  const yo = (all.match(/요(?=[.!~]|\s*$)/gm) || []).length;
  const nida = (all.match(/니다(?=[.!]|\s*$)/gm) || []).length;
  if (yo >= 3 && yo >= nida * 2) return "haeyo";
  if (nida >= 3 && nida >= yo * 2) return "hamnida";
  return null;
}

// v1.88: 생성된 본문에서 목표 끝맺음이 차지하는 비율(평서문 ~요·~니다 중). 둘 다 없으면 1.
export function endingShare(text: string, ending: StyleEnding): number {
  const yo = (text.match(/요(?=[.!~]|\s*$)/gm) || []).length;
  const nida = (text.match(/니다(?=[.!]|\s*$)/gm) || []).length;
  if (!yo && !nida) return 1;
  return (ending === "haeyo" ? yo : nida) / (yo + nida);
}
