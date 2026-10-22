// BLC-09 (2026-10-22): 구간별 쓰기 API가 쓰는 근거·문체 불러오기. /api/drafts/generate와 같은 확인(본인 소유·승인·지문)을 한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { factRule, groundingSection, type DraftGrounding } from "./ai/groundingPrompt";
import { getExplicitYears } from "./ai/freshness";
import type { SectionRules } from "./ai/sectionPrompt";
import { styleSection } from "./ai/stylePrompt";
import { isApproved, type GroundPoint, type ResearchSource } from "./grounding";
import { detectEnding, isStyleApproved, type StyleEnding, type StyleProfile, type StylePost } from "./style";

export const OUTLINE_COLUMNS = "id, research_id, style_id, keyword, title, titles, sections, status, draft_id, joined_hash, strategy, persona_id, custom_persona, created_at, updated_at";

type Fail = { error: string; status: number; code?: string };

export async function loadGrounding(supabase: SupabaseClient, userId: string, researchId: unknown): Promise<Fail | { grounding: DraftGrounding; record: Record<string, unknown> }> {
  const id = typeof researchId === "string" ? researchId : "";
  const { data: research } = id ? await supabase.from("naver_blog_seo_research").select("id, keyword, sources, points, angle, approved_at, approval_hash")
    .eq("id", id).eq("user_id", userId).maybeSingle() : { data: null };
  if (!research) return { error: "선택한 내 자료를 찾지 못했습니다. 자료가 30일이 지나 삭제됐을 수 있습니다.", status: 404 };
  if (!isApproved(research)) return { code: "RESEARCH_NOT_APPROVED", error: "근거를 승인한 뒤 바뀌었거나 아직 승인하지 않았습니다. 「자료부터 집필」에서 근거를 다시 승인해주세요.", status: 409 };
  const byN = new Map((research.sources as ResearchSource[]).map((s) => [s.n, s]));
  const points = (research.points as GroundPoint[]).filter((p) => p.kept).map((p) => ({ text: p.text, source: p.source, quote: p.quote, title: byN.get(p.source)?.title ?? "", link: byN.get(p.source)?.link ?? "" }));
  return {
    grounding: { keyword: research.keyword, angle: research.angle ?? undefined, points },
    record: { researchId: research.id, keyword: research.keyword, approvalHash: research.approval_hash, approvedAt: research.approved_at, points },
  };
}

export async function loadStyle(supabase: SupabaseClient, userId: string, styleId: unknown): Promise<Fail | { style?: { name: string; profile: StyleProfile; ending: StyleEnding | null }; record?: Record<string, unknown> }> {
  if (styleId === undefined || styleId === null || styleId === "") return {};
  const id = typeof styleId === "string" ? styleId : "";
  const { data: row } = id ? await supabase.from("naver_blog_seo_styles").select("id, name, profile, samples, posts, approved_at, approval_hash")
    .eq("id", id).eq("user_id", userId).maybeSingle() : { data: null };
  if (!row) return { error: "선택한 내 문체를 찾지 못했습니다. 30일이 지나 삭제됐을 수 있습니다.", status: 404 };
  if (!isStyleApproved(row)) return { code: "STYLE_NOT_APPROVED", error: "내 문체를 승인한 뒤 바뀌었거나 아직 승인하지 않았습니다. 「내 문체」에서 다시 승인해주세요.", status: 409 };
  const ending = detectEnding([...((row.samples as string[] | null) ?? []), ...(((row.posts as StylePost[] | null) ?? []).map((p) => p.text))]);
  return {
    style: { name: row.name, profile: row.profile as StyleProfile, ending },
    record: { styleId: row.id, name: row.name, approvalHash: row.approval_hash, ending },
  };
}

export const isFail = (value: object): value is Fail => "error" in value;

/** 구간별 쓰기 프롬프트 규칙 — 문체는 말투·구성만(끝맺음 필수 규칙 없음, v1.91 교훈), 사실은 승인 근거만. */
export function sectionRules(grounding: DraftGrounding, style: { name: string; profile: StyleProfile } | undefined): SectionRules {
  return { style: styleSection(style && { name: style.name, profile: style.profile }), facts: `${factRule([...getExplicitYears(grounding.keyword)], true)}${groundingSection(grounding)}` };
}
