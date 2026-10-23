import "server-only";
import { randomUUID } from "node:crypto";
import type { BlogViralCandidate } from "@/types/collector";
import { sourceBundle, validSource, type SourceBundle } from "./sourceBundle";
import { normalizeSourceMaterial } from "./ai/sourceGrounding";

export class SourceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function saveCollected(admin: any, userId: string, candidates: BlogViralCandidate[]) {
  if (!candidates.length) throw new SourceError("수집한 글감이 없습니다.");
  const now = Date.now();
  const rows = candidates.map((candidate, index) => {
    const id = randomUUID();
    const source = sourceBundle(id, userId, candidate, candidate.source_urls || [], now - index);
    const data = {...candidate, id, created_at: source.collectedAt, source, status: "ready", is_archived: false};
    return {id, user_id: userId, created_at: source.collectedAt, expires_at: source.expiresAt, candidate: data};
  });
  const {data, error} = await admin.from("nba_collected_materials").insert(rows).select("*");
  if (error || data?.length !== rows.length) throw new SourceError("글감의 서버 저장을 확인하지 못했습니다. 다시 수집하기 전에 목록을 확인해 주세요.", 503);
  return data.map(publicCandidate);
}
export function publicCandidate(row: any): BlogViralCandidate {
  return {...row.candidate, id: row.id, created_at: row.created_at, revision: row.updated_at};
}
export async function loadCollected(admin: any, userId: string, id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new SourceError("서버에 저장한 글감을 다시 선택해 주세요.");
  const {data, error} = await admin.from("nba_collected_materials").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new SourceError("글감 원문을 조회하지 못했습니다.", 503);
  if (!data || !validSource(data.candidate?.source, userId) || Date.parse(data.expires_at) <= Date.now()) throw new SourceError("본인의 유효한 글감을 찾을 수 없습니다. 만료된 자료는 다시 수집해 주세요.", 410);
  const candidate = publicCandidate(data);
  const bundle = candidate.source!;
  // 회원이 요약을 길게 고쳐도 원문과 출처가 프롬프트에서 밀려나지 않는다.
  const material = normalizeSourceMaterial(`[수집 시각] ${bundle.collectedAt}\n[출처 주소] ${bundle.urls.join("\n").slice(0, 600) || "주소 확인 불가"}\n[수집 원문 일부]\n${bundle.text.slice(0, 2800)}\n[편집한 글감 요약 — 별도 사실 근거가 아님]\n${candidate.content.slice(0, 400)}`);
  return {candidate, bundle, material};
}
/** 처음 저장한 출처는 원고를 편집해도 교체하거나 수명을 늘릴 수 없다. */
export async function validateSourcePost(admin: any, userId: string, payload: Record<string, any>, current: any): Promise<SourceBundle | undefined> {
  const existing = current?.research_summary?.source_bundle as SourceBundle | undefined;
  if (existing) {
    if (!validSource(existing, userId)) throw new SourceError("원고 근거 자료의 보관 기간이 만료됐습니다.", 410);
    if (payload.source_id !== undefined && payload.source_id !== existing.id) throw new SourceError("처음 저장한 출처는 바꿀 수 없습니다. 새 원고로 작성해 주세요.", 409);
    return existing;
  }
  if (current && payload.source_id) throw new SourceError("기존 원고에 다른 출처를 덧씌울 수 없습니다. 새 원고로 작성해 주세요.", 409);
  if (payload.source_id) return (await loadCollected(admin, userId, payload.source_id)).bundle;
  return undefined;
}
