import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { draftReport, matchDraftRevision, nextDraftReport, publicationFingerprint, naverPostUrl, staleWritingRun, writableDraft } from "@/lib/draftWriteGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 409) => json({ error }, status);

export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const user = await verifyExtensionToken(request);
  if (!user) return fail("유효한 본인 확장 연결이 필요합니다.", 401);
  const input = await request.json().catch(() => null);
  if (!input || !["claim", "arm", "published", "uncertain", "failed", "status"].includes(input.action)) return fail("지원하지 않는 발행 요청입니다.", 400);
  const { draftId } = await context.params;
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: row, error } = await db.from("naver_blog_seo_drafts").select("*")
    .eq("id", draftId).eq("user_id", user.userId).gte("created_at", cutoff)
    .not("extension_handoff_at", "is", null).maybeSingle();
  if (error) return fail("발행할 원고를 확인하지 못했습니다.", 500);
  if (!row) return fail("유효한 내 전송 원고를 찾지 못했습니다.", 404);
  const report = draftReport(row.seo_report);
  const current = draftReport(report.autoPublish);
  if (input.action === "status" && !staleWritingRun(current)) return json({ publication: current, title: row.title });
  const now = new Date().toISOString();
  let publication: Record<string, unknown>;
  if (input.action === "status") {
    publication = { ...current, state: "failed", error: "20분 넘게 입력이 끝나지 않아 실행을 끝냈습니다. 최종 발행 버튼은 누르지 않았습니다.", checkedAt: now };
  } else if (input.action === "claim") {
    if (input.fingerprint !== publicationFingerprint(row)) return fail("미리보기 이후 원고가 변경됐습니다. 목록에서 원고를 다시 불러와 확인해 주세요.");
    if (current.runId) return fail("이미 실행한 원고입니다. 결과를 먼저 확인하세요. 다시 쓰려면 새 원고로 복제해 주세요.");
    const blogId = String(input.blogId || "").trim();
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(blogId) || !["public", "private"].includes(input.visibility)) return fail("실제 블로그 ID와 공개 범위를 선택해 주세요.", 400);
    if (!row.title?.trim() || !row.body?.trim()) return fail("제목과 본문을 먼저 저장해 주세요.", 400);
    publication = { runId: randomUUID(), state: "writing", blogId, visibility: input.visibility, fingerprint: publicationFingerprint(row), startedAt: now };
  } else {
    if (typeof input.runId !== "string" || current.runId !== input.runId) return fail("현재 원고의 발행 실행이 아닙니다.");
    if (input.action === "published") {
      const url = naverPostUrl(input.url, String(current.blogId));
      if (!url) return fail("대상 블로그의 실제 게시 URL을 확인하지 못했습니다.", 400);
      if (current.state === "published") return current.url === url ? json({ publication: current, title: row.title }) : fail("이미 기록한 발행 URL과 다릅니다.");
      if (!["publishing", "uncertain"].includes(String(current.state))) return fail("발행을 시작한 실행만 게시 결과를 기록할 수 있습니다.");
      publication = { ...current, state: "published", url, publishedAt: now, error: null };
    } else if (input.action === "arm") {
      // Repeating an arm request never grants a second final click.
      if (current.state !== "writing" || publicationFingerprint(row) !== current.fingerprint) return fail("원고가 변경됐거나 이미 발행 단계입니다. 최종 버튼을 누르지 않습니다.");
      publication = { ...current, state: "publishing", armedAt: now };
    } else {
      if (current.state === "published") return json({ publication: current, title: row.title });
      if (!["writing", "publishing", "uncertain"].includes(String(current.state))) return fail("이미 종료한 발행 실행입니다.");
      const state = current.state === "writing" && input.action === "failed" ? "failed" : "uncertain";
      publication = { ...current, state, error: String(input.error || "발행 결과를 확인해 주세요.").slice(0, 500), checkedAt: now };
    }
  }
  let update = db.from("naver_blog_seo_drafts").update({ seo_report: nextDraftReport(report, { autoPublish: publication }), updated_at: now })
    .eq("id", draftId).eq("user_id", user.userId).gte("created_at", cutoff);
  update = input.action === "claim" ? writableDraft(update, report)
    : matchDraftRevision(update, report).eq("seo_report->autoPublish->>runId", current.runId).eq("seo_report->autoPublish->>state", current.state);
  const { data: saved, error: saveError } = await update.select("id").maybeSingle();
  if (saveError) return fail("발행 상태 저장에 실패했습니다. 최종 버튼을 다시 누르지 마세요.", 500);
  if (!saved) return fail("다른 편집/실행이 먼저 반영됐습니다. 원고와 발행 결과를 다시 확인해 주세요.");
  return json({ publication, title: row.title });
}
