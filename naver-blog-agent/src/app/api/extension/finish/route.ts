import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateProgramAccessForUser } from "@/lib/access";
import { readNaverExecutionMode } from "@/lib/naverPublishing";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const unavailable = () => reply({ error: "발행 결과 저장을 확인하지 못했습니다. 결과를 보관하고 다시 보고합니다." }, 503);
const resultColumns = "id,status,post_url,error_message,published_at";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
    if (!token) return reply({ error: "인증 토큰이 누락되었습니다." }, 401);
    const admin = createAdminClient() as any;
    const { data: tokenRecord, error: tokenError } = await admin
      .from("nba_extension_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();
    if (tokenError) return unavailable();
    if (!tokenRecord) return reply({ error: "인증 실패" }, 401);
    const access = await evaluateProgramAccessForUser(tokenRecord.user_id);
    if (!access.allowed) return reply({ error: access.error }, access.status);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.taskId !== "string" || !body.taskId.trim() ||
        typeof body.success !== "boolean" || (body.prepared !== undefined && typeof body.prepared !== "boolean") ||
        (body.postUrl != null && typeof body.postUrl !== "string") ||
        (body.error != null && typeof body.error !== "string")) {
      return reply({ error: "taskId와 올바른 발행 결과가 필요합니다." }, 400);
    }
    const { taskId, success } = body;
    const prepared = body.prepared === true;
    if (prepared && (success || body.error || body.postUrl)) return reply({ error: "준비 완료와 발행 완료를 함께 보고할 수 없습니다." }, 400);
    const { data: owned, error: ownerError } = await admin.from("nba_posts")
      .select("id,blog_id,research_summary").eq("id",taskId).eq("user_id",tokenRecord.user_id).maybeSingle();
    if (ownerError) return unavailable();
    if (!owned) return reply({ error: "본인 원고를 찾을 수 없습니다." }, 404);
    const mode = readNaverExecutionMode(owned.research_summary, owned.blog_id);
    if ((prepared && mode !== "prepare") || (success && mode === "prepare")) {
      return reply({ error: "원고에 저장된 진행 방식과 보고 결과가 다릅니다." }, 409);
    }
    const status = prepared ? "prepared" : success ? "published" : "failed";
    const postUrl = body.postUrl || null;
    const message = body.error || null;
    const now = new Date().toISOString();
    // Only a claimed task may change state. Preserve drafts cancelled before reporting.
    const { data: saved, error: saveError } = await admin.from("nba_posts").update({
      status, post_url: postUrl, error_message: message,
      published_at: success ? now : null, updated_at: now,
    }).eq("id", taskId).eq("user_id", tokenRecord.user_id).eq("status", "publishing")
      .select(resultColumns).maybeSingle();
    if (saveError) return unavailable();
    let confirmed = saved;
    if (!confirmed) {
      // Lost responses may be retried: acknowledge an identical committed result
      // without rewriting its original publication timestamp.
      const { data: existing, error: readError } = await admin.from("nba_posts")
        .select(resultColumns).eq("id", taskId).eq("user_id", tokenRecord.user_id).maybeSingle();
      if (readError) return unavailable();
      if (!existing) return reply({ error: "본인 원고를 찾을 수 없습니다." }, 404);
      confirmed = existing;
    }
    if (confirmed.id !== taskId || confirmed.status !== status ||
        (confirmed.post_url || null) !== postUrl || (confirmed.error_message || null) !== message ||
        (success && !confirmed.published_at)) {
      return reply({ error: "원고 상태와 보고 결과가 다릅니다. 보관된 결과와 원고를 확인해 주세요." }, 409);
    }
    // Preserve older clients' success/message fields; new clients verify this receipt.
    return reply({ success: true, persisted: true, taskId, status, message: "발행 결과가 정상 반영되었습니다." });
  } catch {
    return unavailable();
  }
}
